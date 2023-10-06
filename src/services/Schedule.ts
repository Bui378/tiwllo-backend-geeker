import { CronJob } from 'cron';
import {getAllJobs,findTechniciansBySkill,updateJob,findJobById} from './JobService';
import * as CallService from './CallService';
import { foundTechInThirty,notFoundTechInThirty,dynamicEmail,scheduleJobAlertTechnician, technicianAcceptJobIn10, noTechnicianFound, 
	techincianNotFound, sendScheduleEmail, scheduleCancelJobAlertCustomer, acceptJobEmail} from "./MailService";

import Technician from '../models/Technician';
import Job ,{IJob} from '../models/Job';
import WebSocket,{IWebSocket}  from '../models/WebSocket';
import User from '../models/User';
import Notifications, { INotfication } from '../models/Notifications';
import ActiveUser from '../models/Activeusers';
import BillingDetails, { IBillingDetails } from '../models/BillingDetails';
import Customer,{ICustomer} from '../models/Customer';
import * as TextService from "./TextService";
import Software, { ISoftware } from '../models/Software';
const stripe = require('stripe')(process.env.STRIPE_KEY)
var myModule = require('../app');
const moment = require('moment');
let logger = require('../../winston_logger');
logger = logger("Schedule.ts");
const fetch = require('node-fetch');
import { track } from './klaviyo';
import {sendStripInfoToStakeholders} from '../utils'

function diff_hours(dt2, dt1) 
 {
  var diff =(new Date(dt2).getTime() - new Date(dt1).getTime()) / 1000;
  diff /= (60 * 60);
  return Math.abs(Math.round(diff));
  
 }

function configDecider(dayDiff,hourDiffernce){
	let timeConfig = "minuteWise"
	let percent = 50 
	if(dayDiff > 2){
		timeConfig = "dayWise"
		percent = 80
	}
	else if (dayDiff == 2){
		timeConfig = "dayWise"
		percent = 50
	}
	else if ((hourDiffernce < 24 || hourDiffernce == 24) && (hourDiffernce !=1 && hourDiffernce != 0)){
		timeConfig = "hourWise"
		percent = 50
	}
	else if (hourDiffernce == 1){
		timeConfig = "minuteWise"
		percent = 50
	}


	return {"timeConfig":timeConfig,"percent":percent}
}

export const NotifiedUsers = async(jobData)=>{
	let jobNotifiedTechs = [];
	if(jobData.notifiedTechs.length > 0){
		
		for(var k in jobData.notifiedTechs){
			let jobStatus = "cron-job-expried";
			let notifyEndAt = new Date();
			if(jobData.notifiedTechs[k]['jobStatus'] == "accepted" || jobData.notifiedTechs[k]['jobStatus'] == "tech-decline" || jobData.notifiedTechs[k]['jobStatus'] == "client-decline"){
				jobStatus = jobData.notifiedTechs[k]['jobStatus'];
				notifyEndAt = new Date()
			}

			jobNotifiedTechs[k] = {
				'techId' : jobData.notifiedTechs[k]['techId'],
				'techStatus': jobData.notifiedTechs[k]['techStatus'],
				'notifyAt' : jobData.notifiedTechs[k]['notifyAt'],
				'jobStatus' : jobStatus,
				'notifyEndAt' : notifyEndAt,
			}
			
		}
		
	}
	return jobNotifiedTechs;
}


export const scheduleChecker = async (io)=>{
	let cronJob = new CronJob('1 * * * * *', function(){
		let filters = {status : { "$in": ["Accepted", "Pending","Waiting","Scheduled" ]}}
		let res = getAllJobs(filters)
		res.then(async function(result){
			try{
				for (var k in result){
				if(result[k]['createdAt'] != null){
					 if(result[k].customer && result[k].customer['user']){
						let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:result[k].customer['user']['timezone']};
						 let job_created = new Date(result[k]['createdAt']).toLocaleTimeString('en-US', DATE_OPTIONS)
						 let half_hour_time = new Date(new Date(result[k]['createdAt'] + 1.8e+6))
						  let mytime = new Date().toLocaleTimeString('en-US', DATE_OPTIONS)
						  let jobDate = new Date(half_hour_time.setMinutes(half_hour_time.getMinutes()+30) ).toLocaleString('en-US',DATE_OPTIONS)
						  /**
						   * Logic that expires a job if customer not started the call or no technician found
						   **/
						 if((result[k].status== "Waiting" || result[k].status== "Pending" || result[k].status== "Accepted" ) &&  (mytime == jobDate)  )
						 {

							let notificationData = {
								"user":"",
								"job":result[k].id,
								"actionable":false,
								"title":`No technician found for your job  regarding ${result[k].software['name']}`,
								"type":"job_cancelled",
							}
							notificationData["user"] = result[k].customer['user']['_id']
							let notify = new Notifications(notificationData)
							notify.save()
							let notified = await NotifiedUsers(result[k]);
							updateJob(result[k].id,{'status': "Expired",'reasons':"technician not found", "notifiedTechs":notified});    
						 }
					 }
					 
				}
				// break

				if (result[k].status=="Scheduled"){
					//all variables
					let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:result[k].customer['user']['timezone']};
					let mytime = new Date().toLocaleTimeString('en-US', DATE_OPTIONS)
					let primarytime = new Date(result[k].primarySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
					let secondrytime = new Date(result[k].secondrySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
					let timeStart = new Date(mytime).getTime();
					
					let NotifiedDate = new Date(result[k].primarySchedule)
					let selectedTime;
					let selectedSchedule ;
					
					//all variables
					if(result[k].schedule_accepted){
						if(result[k].schedule_accepted_on === 'primary' ){
							selectedTime = primarytime
							selectedSchedule = result[k].primarySchedule
						}
						else{
							selectedTime = secondrytime
							 selectedSchedule = result[k].secondrySchedule
						}
					}

					let secondDate = new Date(result[k].primarySchedule) //used to get 50% of primary time
					let seconTimeEnd = new Date(selectedTime).getTime();
					let timeEnd = new Date(selectedTime).getTime();

					let primarytimeEnd = new Date(result[k].primarySchedule).getTime();
					let primaryHourDiff = primarytimeEnd - timeStart
					let primaryminDiff = primaryHourDiff/60/1000 
					let primaryhourDiffernce = Math.round(primaryminDiff/60)
					let primarydayDiff = Math.round(primaryminDiff/60/24)
					var hourDiff = timeEnd - timeStart; //in ms
					var seconHourDiff = seconTimeEnd - timeStart
					var minDiffofPrimaryEmail = minDiffofPrimaryEmail
					var minDiff = hourDiff / 60 / 1000; //in minutes
					var seconMinDiff = seconHourDiff /60/100
					let hourDiffernce = Math.round(minDiff/60)
					let dayDiff = Math.round(minDiff/60/24)
					
					let {timeConfig,percent} = configDecider(dayDiff,hourDiffernce)
					let dayVal = dayDiff - Math.round((percent/100) *dayDiff)
					let hourVal =  Math.round((percent/100) *hourDiffernce)
					let MinVal = 30
					
					let dayValForSecondDate = dayDiff - Math.round((50/100) *primarydayDiff)
					let hourValForSecondDate = Math.round((percent/100) *primaryhourDiffernce)
					let MinValForSecondDate = Math.round((20/100) *primaryminDiff)
					if((primaryminDiff < 60 && primaryminDiff > 30) || primaryminDiff == 60 ){
						MinValForSecondDate = 30
					}
					if((primaryminDiff < 60 && primaryminDiff < 30)){
						 MinValForSecondDate = 15
					}
					
					if(timeConfig == "dayWise"){
						secondDate.setDate(new Date(result[k].primarySchedule).getDate() - dayValForSecondDate)
					}
					if(timeConfig == "hourWise"){
						secondDate.setHours(new Date(result[k].primarySchedule).getHours() - hourValForSecondDate)
					}
					if(timeConfig == "minuteWise"){
						secondDate.setMinutes(new Date(result[k].primarySchedule).getMinutes() - MinValForSecondDate)
					}
					// console.log("primaryHourDiff :::: ",primaryHourDiff)
					// console.log("MinValForSecondDate :::: ",MinValForSecondDate,":::::::: jobID:::::",result[k].id)
					// console.log("minDiff :: ",minDiff)
					// console.log("dayDiff ::",dayDiff)
					// console.log("hourDiff :: ",hourDiffernce)
					// console.log("mytime :::::: ",mytime)
					// console.log("primaryminDiff :::: ",primaryminDiff)
					// console.log("secondDateToSendEmail ::::: ",secondDate.toLocaleTimeString('en-US', DATE_OPTIONS),"timeConfig ::: ",timeConfig)
					// console.log("selectedTime ::::: ",selectedTime)
					// console.log("primarytime ::::: ",primarytime)
					// console.log("mytime :::: ",mytime)
					// console.log("*******************************************")

					/**
					 * Logic that sends email to the technicians with secondry time if no technician  has accepted the job on primary time  
					 **/
					if(mytime === secondDate.toLocaleTimeString('en-US', DATE_OPTIONS)  && primaryminDiff > 1){
						console.log("in primarytime :: logic ::: ")
						if(!result[k].schedule_accepted){
							const usersReq = findTechniciansBySkill(result[k].id)
							usersReq.then((res)=>{
							let usersForEmail = res.activeUsers
							 const userIds = usersForEmail.map((item) => item['_id']);
							 let softwarename = '';
							 let programName;
							 if(result[k].software && result[k].software !== ''){
								programName =  Software.findById({_id:result[k].software});
								softwarename = programName.name;								
							 }
							 try{
								 for(var g in usersForEmail)
									 {
										 acceptJobEmail({
											firstName:usersForEmail[g]['firstName'],
											Jobuser:usersForEmail[g],
											email: usersForEmail[g]['email'],
											jobId :result[k].id,
											primaryDate:result[k].secondrySchedule,
											secondaryDate:result[k].secondrySchedule,
											issueDesc:result[k].issueDescription,
											programName:softwarename
										});
									}
								console.log("emails sent")
							 }
							 catch(err){
								console.log("error in for loop",err)
							 }
						 })
						}
					}


					/**
					 *  Logic which send notification to the customer that no technician has accepted your schedule job
					 **/
					// console.log(":::::::(!result[k].schedule_accepted && primaryminDiff > 1):::::::::::::::::::::::",(!result[k].schedule_accepted && primaryminDiff > 1))
					// console.log("::::::::::::::result[k].schedule_accepted:::::::::::::::::::",result[k].schedule_accepted)
					// console.log("::::::::::::::primaryminDiff[k].:::::::::::::::::::",primaryminDiff)
					if (!result[k].schedule_accepted && primaryminDiff > 1){
						if(timeConfig == "dayWise"){
							NotifiedDate.setDate(new Date(result[k].primarySchedule).getDate() - dayVal)
						}
						if(timeConfig == "hourWise"){
							NotifiedDate.setHours(new Date(result[k].primarySchedule).getHours() - hourVal)
						}
						if(timeConfig == "minuteWise"){
							NotifiedDate.setMinutes(new Date(result[k].primarySchedule).getMinutes() - MinVal)
						}
						// let previewtext = ''
						// console.log("::::::::::::::(mytime === NotifiedDate.toLocaleTimeString('en-US', DATE_OPTIONS)):::::::::::",(mytime === NotifiedDate.toLocaleTimeString('en-US', DATE_OPTIONS)))
						// console.log(":::::::::::mytime:::::::::::",mytime)
						// console.log(":::::::::::NotifiedDate.toLocaleTimeString:::::::::::",NotifiedDate.toLocaleTimeString)
						if(mytime === NotifiedDate.toLocaleTimeString('en-US', DATE_OPTIONS)){
							let notificationData = {
								"user":"",
								"job":result[k].id,
								"actionable":false,
								"title":`No technician found for your job  regarding ${result[k].software['name']} which is scheduled on ${primarytime}`,
								"type":"job_cancelled",
							}
							notificationData["user"] = result[k].customer['user']['_id']
							// console.log(":::::::::::notificationData[user] :::::::::::",notificationData["user"] )
							let notify = new Notifications(notificationData)
							// console.log("::::::::::::::::::::notify::::::::::::::::::",notify)
							notify.save()
							await noTechnicianFound({
								email:result[k].technician['user']['email'],
								jobData: result[k],
								techName:result[k].technician['user']['firstName'],
								timer:selectedTime.toLocaleTimeString('en-US', DATE_OPTIONS)
							})
							// await dynamicEmail({
							//     email: result[k].customer['user']['email'],
							//     subject :'No technician found',
							//     text:`  <h3> Hello ${result[k].customer['user']['firstName']}</h3>
							//             <p> This email is sent you to notify that no technician has been found for following Scheduled Job :</p> 
							//             <p> Job description -> ${result[k].issueDescription}</p>                                                                                                      
							//             <p>Schedule Time :: ${selectedTime.toLocaleTimeString('en-US', DATE_OPTIONS)}</p>
							//              `,
							//     previewtext : 'No technician found'         
							// });
							io.emit("refresh-notifications")
						}
					}
						
					/**
					 * Logic that expires the job if no technician found and primary time is passed 
					 * */
					 if(mytime === secondrytime && !result[k].schedule_accepted){
						let notified = await NotifiedUsers(result[k]);
						track({
							event: 'Scheduled Job Expired',
							email: result[k].customer['user'].email,
							properties: {
								$first_name: result[k].customer['user'].firstName,
								$last_name: result[k].customer['user'].lastName,
								$job: result[k].id,
								$software_name: result[k].software['name'],
								$primary_schedule: result[k].primarySchedule,
								$secondry_schedule: result[k].secondrySchedule
							}
						});
						updateJob(result[k].id,{'status': "ScheduledExpired",'reasons':"technician not found","notifiedTechs":notified});
					 }
					 

					/**
					 *  Logic that send the notification both to customer and technician before 10 minutes 
					 * */
					 // console.log("minDiff :::: ",minDiff)
					 // console.log("result[k] ::::: ",result[k].issueDescription)
					if((minDiff == 10) && result[k].technician != undefined){    
						io.emit("ten-min-meeting",{"customer":result[k].customer,"technician":result[k].technician,"job":result[k]})  
						// console.log('technician found sending email to customer  >>>>')  
						let notificationData = {
								"user":"",
								"job":result[k].id,
								"actionable":true,
								"title":"Scheduled job of "+result[k].software['name']+" in 10 mins",
								"type":"10_mins_left",

							}
							// console.log("10 min notify :::: ",result[k].customer['user']['_id'])
							notificationData["user"] = result[k].technician['user']['_id']
							let notify = new Notifications(notificationData)
							notify.save()
							 notificationData["user"] = result[k].customer['user']['_id']
							 notify = new Notifications(notificationData)
						   
							notify.save()

						io.emit("refresh-notifications")
						let dashboardLink = `<a href="${process.env.mailEndpoint}dashboard?checkJobId=${result[k].id}">Click here to view job.</a>`
						await dynamicEmail({
							email: result[k].customer['user']['email'],
							subject :'Meeting in 10 Minutes',
							text:`  <h3> Hello ${result[k].customer['user']['firstName']}</h3>
									<p>Technician has been found for your scheduled job.</p> 
									<p> Job description -> ${result[k].issueDescription}</p>
									<p>The meeting with technician will start in 10 minutes. Please be online on the platform to avoid any problems regarding joining the meeting.</p>
									<p> We hope your purpose for using our site gets fullfilled.</p>
									<p>${dashboardLink}<p>
									`,
						 previewtext : 'Meeting in 10 Minutes'   
						}); 
						console.log('technician found sending email to technician >>>>')


						// sending text message code by manibha starts
						try{
							let toggle = result[k].technician['profile']['alertPreference']['settings']['Job']['Text']['toggle']
							let number = result[k].technician['profile']['alertPreference']['settings']['Job']['Text']['value']
							if(number != undefined && number != '' && toggle){
								try{
									let helpName = (result[k].subOption)?result[k].software['name']+ ' '+result[k].subOption:result[k].software['name'];

									TextService.sendSmsToNumber(number,'Geeker - Scheduled Meeting with customer '+result[k].customer['user']['firstName']+' for '+helpName+' will start in 10 minutes.',result[k].id)
								}
								catch(err){
									logger.error("Meeting in 10 Minutes: text message not sent: ",{
										'err':err,
										'jobId':result[k].id,
									});
								}
							}
						}catch(err){
							console.log('no phone number found to send text.')
						}
						// sending text message code by manibha ends

						// sending text message to customer by manibha starts
						let correctedNumber = result[k].customer['phoneNumber']
						TextService.sendSmsToNumber(correctedNumber,'Hi '+result[k].customer['user']['firstName']+', Your scheduled job is going to start in 10 minutes. Please login in geeker to solve your problem.',result[k].id)

						// sending text message to customer by manibha ends

						if(! result[k].technician['user']['blocked']){
							await technicianAcceptJobIn10({
								email:result[k].technician['user']['email'],
								jobData: result[k],
								techName:result[k].technician['user']['firstName'],
								dashboardLink:dashboardLink
							})
						
						}

					}

					/**
					 * Logic which send the email to customer if the technician is not found before 10 minutes  
					 **/
					if(primaryminDiff == 10 && !result[k].schedule_accepted ) {     
						await updateJob(result[k].id,{'posted': "Expired",'reasons':"technician not found"}); 
					//    await dynamicEmail({
					//         email: result[k].customer['user']['email'],
					//         subject :'Technician not found',
					//         text:`  <h3> Hello ${result[k].customer['user']['firstName']}</h3>
					//                 <p>Sorry to inform that your scheduled job has not been accepted by any technician.</p> 
					//                 <p> Job description -> ${result[k].issueDescription}</p>
					//                 <p>You can try improving the description or login on our platform and try reposting the job.</p>
					//                 <p> We hope your purpose for using our site gets fullfilled.</p>
					//                 `,
					//         previewtext : 'Technician not found'
					//     }); 
					await techincianNotFound({
						email:result[k].technician['user']['email'],
						firstName: result[k].customer['user']['firstName'],
						jobDescription:result[k].issueDescription,
					})
					}
					/**
					 * Logic that sends socket when the technician has accepted the job and their meeting time matches
					 * */
					if((result[k].schedule_accepted == true  && mytime == selectedTime) && (result[k].status=="Scheduled")  ){
						if(result[k].technician){
							console.log("signal sent to Customer ")
							io.emit("scheduled-call-alert", {
								receiver: result[k].customer['_id'],
								job: result[k],
								allJobs:result,
							});
							// sending text message to customer by manibha starts
							let correctedNumber = result[k].customer['phoneNumber']
							TextService.sendSmsToNumber(correctedNumber,'Hi '+result[k].customer['user']['firstName']+', Its time to solve your problem. Please login in geeker to start the meeting.',result[k].id)

							// sending text message to customer by manibha ends
						}

						
					}    
				}
			}
		}
		catch(err){
			// console.log("error in schedule cron ",err)
		}    
			})
		
	})
	cronJob.start()
}


export const scheduleThirty = async(io)=>{
	// console.log('scheduleThirty>>>>>>>',data)
	console.log("done ")
	// let cronJob = new CronJob('1 * * * * *', async function(){
	//     console.log("scheduleThirty :::::: ")
	//     const all_jobs = await Job.find({ "status": 'Waiting',"createdAt":{$gt:new Date(Date.now() - 1.8e+6)}})
	//     // const awaited_jobs = await Job.find({ "status": 'Waiting',"createdAt":{$gt:new Date(Date.now() + 1.8e+6)}})
	//     // findTechniciansBySkill
	//     for(let j in all_jobs){
	//         console.log("all_jobs[j]['_id'] ::::: ",all_jobs[j]['_id'])
	//       const userIds =  findTechniciansBySkill(all_jobs[j]['_id'])
	//       console.log("userIds ::: ",userIds)
	//       userIds.then((res)=>{
	//         console.log("res:::",res)
	//         for(var k in res)
	//           {
	//             console.log("sending Socket to this user :::: ",res[k])
	//             io.emit("new-job-alert", {
	//                 receiver: res,
	//                 job: all_jobs[j],
	//                 user_id : res[k]
	//                 });
	//             }
	//       })
		  

	//     }
	//     console.log("all_jobs ::::::",all_jobs)


	// })
	// cronJob.start()
}


export const ReChangeTheStatus = async(io)=>{
	console.log("Status change cron working*******************************************")
	 let cronJob = new CronJob('1 * * * * *', async function(){
	 let jobs = await Job.find( 
		{
			$and:[
				{ technician: { $exists: true, $nin: [ "",null ] } },
				{
					"createdAt": 
					{
						$gte: new Date((new Date().getTime() - (1 * 24 * 60 * 60 * 1000)))
					}
				}
			]
		}) //by manibha and karun sir to reduce the query size.
		 let technicians = await Technician.find({"status":"Busy"})
		 for (var k in technicians){
			if(technicians[k].status === "Busy"){
					let jobItem = jobs.find((job)=>{ 
						if(job.technician!= undefined)
							{ return job.technician['_id'] === technicians[k].id}
					})
					console.log("jobItem ::::: ",jobItem)
					if(jobItem!= undefined && jobItem.status != "Inprogress"){
						console.log("Inside loop :::::::::")
					  Technician.updateOne({"_id":technicians[k].id}, {$set: { status: 'Available' }}, {upsert: true}, function(err){console.log("not updated error",err)})
					}
			
				if(jobItem == undefined){
					Technician.updateOne({"_id":technicians[k].id}, {$set: { status: 'Available' }}, {upsert: true}, function(err){console.log("not updated error",err)})
				}
			}

		 }
	 })
	 cronJob.start()

}



export const findInActiveUsers = async(io)=>{
	let listOfActiveUsers = []
	 console.log("Cron which handle Activeusers is working")
	 let cronJob = new CronJob('1 * * * * *', async function(){
	 const all_users = await ActiveUser.find({})
	 listOfActiveUsers = all_users.map(item => item.user)
	 const randNum = Math.floor(Math.random() * (1000 - 5 + 1) + 5)
	 
	 await ActiveUser.deleteMany({})
	 console.log("")
	 io.emit("checkingForusers",{activeUsers : listOfActiveUsers,random:randNum})
	 })
	 cronJob.start()

}


export const meetingEndSocketHit = async(io)=>{
	// let listOfActiveUsers = []     
	 let cronJob = new CronJob('*/20 * * * * *', async function(){
		try{
			let job = {}
			let data = await WebSocket.find(
				{"$or":[{'hitFromCustomerSide':false},{'hitFromTechnicianSide':false}],
			   "createdAt": {$gte: new Date((new Date().getTime() - (12 * 24 * 60 * 60 * 1000)))}
			})
			
		// console.log("data: ::",data)
			for (var k in data){
				let new_dict = {}
				job =   Job.findById(data[k]['job'])
						  .populate('software')
						  .populate('expertise')
						  .populate({
							path: 'customer',
							populate: 'user',
						  })
						  .populate({
							path: 'technician',
							populate: 'user',
						  });
			if(data[k].socketType == "meeting-closed"){
				chargeMoneyIfNotCharged(job,data[k])
			}
			if (data[k].dataVariable != undefined && !data[k].retryExpired){
				let socketName = data[k]['socketType']
				let retries = data[k]['retried']
				let soc_id = data[k]['_id']
				console.log("Retrying this socket ::: ",socketName,`for the ${retries} time :::: `,data[k]['issueDescription'])
				let data_orig = JSON.parse(data[k].dataVariable)

				let data_to_send = data = JSON.parse(data[k].dataVariable)
				if(retries <= 3){
					retries = retries + 1
					 WebSocket.updateOne({ "_id": soc_id },{'retried':retries},function(err, response) {console.log("response ::::::")} )
					if(socketName == "accept-job"){
						console.log("schedule job accepted :job ::::: ")
						io.to(data_to_send['id']).emit(socketName,data_to_send)
					}
					else{
						io.emit(socketName,data_to_send)
					}
					
				}
				else{
					 WebSocket.updateOne({ "_id": soc_id },{'retryExpired':true},function(err, response) {console.log("response ::::::")} )
				}
			   
			}

			}
		}
		catch(err){
			console.log("Some issue in meeting end socket function :::: ")
		}
	   
		
	 })
	 cronJob.start()

}

export const DeleteInActiveUsers = async(io)=>{
	let cronJob = new CronJob("*/50 * * * * * ",async ()=>{
		io.emit("clearUsers")
	})
	cronJob.start()
}




async function chargeMoneyIfNotCharged(jobData,webSocketData){
	try{
		if(jobData.total_cost > 0 && (jobData.payment_id == undefined || jobData.payment_id == '')){
		let total_cost = jobData.total_cost
		let cost_in_cents = total_cost * 100
		let actual_cost = Math.round(cost_in_cents)
		// console.log('chargeMoneyIfNotCharged actual_cost ::',actual_cost)

		const charge = await stripe.charges.create({
		amount: actual_cost,
		currency: 'usd',
		customer: jobData.customer.stripe_id,
		});

		// console.log('chargeMoneyIfNotCharged charge_id::',charge['id'])
		const job: IJob = await Job.findById(jobData.id);

		Job.updateOne({ "_id": jobData.id },{'payment_id':charge['id']},
		function(err, response) {}
		)

		const bd = await BillingDetails.find({job_id:jobData.id})
		const billingDetails: IBillingDetails = await  BillingDetails.findById(bd[0]['_id']);
		if(billingDetails){
			let dataToSave = {}
			if(charge['payment_method_details'] && charge['payment_method_details']['card']){
				dataToSave['transaction_type'] = capitalizeFirstLetter(charge.payment_method_details.card.brand)
			}
			dataToSave['transaction_status'] = capitalizeFirstLetter(charge.status);
		   BillingDetails.updateOne({ "_id": billingDetails['_id'] }, dataToSave,function(err, response) {});
		}

		const web_socket: IWebSocket = await WebSocket.findById(webSocketData['_id']);
		WebSocket.updateOne({ "_id": webSocketData['_id'] },{'hitFromCustomerSide':true},function(err, response) {} )
		}
	}
	catch(err){
		let new_response = {};
		new_response['message'] = err.raw.message
		new_response['status'] = 'Error in chargeMoneyIfNotCharged'
		await sendStripInfoToStakeholders({status:new_response['message'],reason:new_response['status'],stripe_id:jobData.customer.stripe_id,jobId:jobData.id})
	}
	

}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


export const checkSubscriptionPaymentStatus = async(io)=>{
	console.log('checkSubscriptionPaymentStatus called')
	let cronJob = new CronJob(process.env.CHECK_SUBSCRIPTION_PAYMENT_STATUS_CRON_JOB,async ()=>{
		// console.log('helloooooooooooooooo checkSubscriptionPaymentStatus')
		let all_customers = await Customer.find({'subscription_history.0': { $exists:true }})

		for(var single_cust in all_customers){
			// console.log('all_customers.>>>>>>>>',all_customers[single_cust]['subscription_history'].length)
			var all_subs = all_customers[single_cust]['subscription_history']

			for( var sub in all_subs){
				if(all_subs[sub]['status'] == 'Pending'){
					const invoice = await stripe.invoices.retrieve(all_subs[sub]['invoice_id'])
					console.log('invoice[status]>>>>>>>>',invoice['status'])
					if(invoice['status'] == 'paid'){
						const customer: ICustomer = await Customer.findById(all_customers[single_cust]['id']);
						let new_plan = all_subs[sub]
						new_plan['status'] = 'active'
						
						let sub_history = []
						for (var sub_twice in all_subs){
							if(all_subs[sub_twice]['invoice_id'] != all_subs[sub]['invoice_id']){
								sub_history.push(all_subs[sub_twice])
							}
							
						}
						customer.set({'subscription':new_plan,'subscription_history':sub_history});
						await customer.save();

					}else if(invoice['status'] != 'paid'){
						var nowDate = new Date()
						var newDateObj = new Date(all_subs[sub]['plan_purchased_date'].getTime() + 30*60000);
						// console.log('nowDate>>>>>>>',nowDate)
						// console.log('newDateObj>>>>>>>>',newDateObj)
						if(nowDate >= newDateObj){
							console.log('cancelled as 30 min are over>>>>>>>>>>>',all_subs[sub]['invoice_id'])
							const customer = await Customer.findById(all_customers[single_cust]['id']);
							all_subs[sub]['status'] = 'Cancelled'
							customer.set({'subscription_history':all_subs});
							await customer.save();
						}   
					}
				}
			}
		}

	})
	cronJob.start()
}


/**
* Deleting the test users from klaviyo.
* @params = no params
* @response : no response
* @author : Manibha
*/
export const deleteTestUsersFromKlaviyo = async()=>{
	try{
		console.log('deleteTestUsersFromKlaviyo cron started>>>>>>>>>>>>>>>')
		let waiting = 1000
		let cronJob = new CronJob(process.env.KLAVIYO_DELETION_TIME,async ()=>{
			let all_customers = await Customer.find({'customerType':'test'}).sort({createdAt:-1})
			let deleted_emails = []
			if(all_customers.length  > 0){
				for(var single_cust in all_customers){
					await sleep(waiting);
					let singleUser = await User.findOne({ '_id': all_customers[single_cust]['user'] });
					if(singleUser){
						console.log('singleUser.email>>>>>>>>>',singleUser.email)
						deleted_emails.push(singleUser.email)
						const url = 'https://a.klaviyo.com/api/v2/data-privacy/deletion-request?api_key='+process.env.KLAVIYO_PRIVATE_TOKEN;
						const options = {
							method: 'POST',
							headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
							body: JSON.stringify({email:singleUser.email})
						};

						fetch(url, options)
						  .then(res => res.json())
						  .then(async function checking(json) {
								  console.log('inside deleteTestUsersFromKlaviyo then function:::',json)                                 	
									if(json['detail'] != undefined && json['detail'].includes("throttled")){
										console.log('bigger sleep required>>>>>>>>>>>>>')
										var text = json['detail']
										var thenum = parseInt(text.match(/[0-9]+/)[0], 10);
										var milliseconds = thenum * 1000
										console.log('milliseconds>>>>>>>>',milliseconds)
										waiting = milliseconds
									}else{
										waiting = 1000
									}
								})                                
						  .catch(err => logger.error("deleteTestUsersFromKlaviyo: Error ",{
								'err':err,
								'email':singleUser.email,
							}));
					}
					   
				}

				logger.info("deleteTestUsersFromKlaviyo customers deleted: ",{
				  'info':{"deletedUsers":deleted_emails},
				});
			}
		})
		cronJob.start()
	}
	catch(func_err){
		logger.error("deleteTestUsersFromKlaviyo: function error ",{
						'err':func_err,
					})
	}
}


/**
* This function is used to wait for ms no of milliseconds
* @params = ms which is milliseconds in number
* @response : returns resolved promise
* @author : Manibha
*/
function sleep(ms) {
  return new Promise((resolve) => {
	setTimeout(resolve, ms);
  });
}

/**
* This function is used send alert on email and on phonenumber 
* @params = job(type:object), programeName(type:string), DATE_OPTIONS(type:object)
* @author : Ridhima Dhir
*/
export const customerJobAlert = async(job, programeName, DATE_OPTIONS)=>{
	try{
		//alert on phone number
		let phoneNumber = job.phoneNumber
		let message = 'Hi '+job.customerName+', Your job is scheduled on Geeker. We will let you know as soon as we found a technician for your job.';
		TextService.sendSmsToNumber(
			phoneNumber,
			message,
			job.jobId)
		logger.info("customerJobAlert: text message and email info",{
			'email':job.customerEmail, 
			'primaryTime':new Date(job.primaryTime).toLocaleString("en", DATE_OPTIONS),
			'secondryTime':new Date(job.secondryTime).toLocaleString("en", DATE_OPTIONS),
			'jobDescription':job.jobObj.issueDescription,
			'programeName':programeName,
			'name':job.customerName,
		})
		//alert on email
		await sendScheduleEmail({
			email:job.customerEmail,
      name:job.customerName,
			programeName:programeName,
			jobDescription:job.jobObj.issueDescription,
			primaryTime:new Date(job.primaryTime).toLocaleString("en", DATE_OPTIONS),
			secondaryTime:new Date(job.secondryTime).toLocaleString("en", DATE_OPTIONS),
		})
	}catch(err){
		logger.error("customerJobAlert: catch error ",{'err':err, 'jobId':job.id})
	}
}


/**
* This function is used save notification and update notifiedTechs field in jobs table
* @params = io(Type:Object) : For socket emit,
*	availTechs(Type:Object): object of availTechs for the job, 
*	job(Type:Object): Job details
* @author : Ridhima Dhir
*/
export const sendScheduleWebNotificationsToTechs = async(io, availTechs, job) => {
	try{
		console.log("sendScheduleWebNotificationsToTechs :::::::::: ",availTechs, job.id)
		let notifiedTechs = job.notifiedTechs;
		const notificationData = {
			"job":job.id,
			"actionable":true,
			"title":"There’s a new job/request waiting for you!",
			"type":"Scheduled Job",
			"read":false
		}  
		availTechs.forEach((tech) => {
			notifiedTechs.push({
				'techId' : tech.techId,
				'techStatus': tech.techStatus,
				'notifyAt' : new Date(),
				'jobStatus' : "",
				'notifyEndAt' : "",
			})
			notificationData["user"] = tech.userId;
			
			let notify = new Notifications(notificationData)
				notify.save()
		})
		console.log("notifiedTechs :::::::::: ",notifiedTechs)
		logger.info("sendScheduleWebNotificationsToTechs: notifiedTechs :: ",{
			'notifiedTechs':notifiedTechs,
		})
		//update jobs table : technicians who recive notifications 
		await updateJob(job.id, {"notifiedTechs":notifiedTechs});

		io.emit("refresh-notifications")
		
	}catch(err){
		logger.error("sendScheduleWebNotificationsToTechs: catch error ",{
						'err':err,
					})
	}
}

/**
* This function is used send schedule Job email Alert to Technician 
* @params = programeName(Type:String), 
*	availTechs(Type:Object), 
*	job(Type:Object), 
*	DATE_OPTIONS(Type:Object)
* @author : Ridhima Dhir
*/
export const sendScheduleEmailToTechs = async(programeName,availTechs, job, DATE_OPTIONS,businessName) => {
	try{
		let sentScheduleEmails=[]
		Promise.all(
			availTechs.map(async(tech,index) => {
				DATE_OPTIONS = { ...DATE_OPTIONS, timeZone:tech['timezone']};
				let primaryDate  =  new Date(job.primaryTime).toLocaleTimeString('en-US', DATE_OPTIONS) 
				// let secondryDate  =  new Date(job.secondryTime).toLocaleTimeString('en-US', DATE_OPTIONS)
				let sendMail = await  thirtySecPromise(index,1000)
				if(sendMail && !sentScheduleEmails.includes(tech['email']+"_"+job.jobId) ){
					sentScheduleEmails.push(tech['email']+"_"+job.jobId)
					console.log("sentScheduleEmails :::",sentScheduleEmails)
					scheduleJobAlertTechnician({
						name:job.customerName,
						firstName:tech['firstName'],
						email: tech['email'],
						primaryDate:primaryDate,
						secondryDate:primaryDate,
						issueDesc:job.jobObj.issueDescription,
						JobId:job['jobId'],
						programName:programeName,
						
					});
				}
			})
		)
	}catch(err){
		logger.error("sendScheduleEmailToTechs: catch error ",{
						'err':err,
					})
	}
}

const thirtySecPromise = (index,time=30000)=>{
	// console.log(index,"technician signal")

	if(index == 0){
		return true
	}
	else{
		const myPromise = new Promise((resolve, reject) => {
			setTimeout(() => {
			resolve(true);
			}, time);
		});
			return myPromise

	}

}

/**
* This function is used to send text alert on tech phone number
* @params = technicianPhoneNumbers(Type:Object): list of techs phonenumber, 
*		jobId(Type:String): Job id,
*		message(Type:String) : message for mobile number
* @author : Ridhima Dhir
*/
export const sendScheduleSmsToTechs = async(technicianPhoneNumbers, job, message, technicianTimezones) => {
	try{
		let jobId = job.jobId
		//send alert on vaild phonenumbers
		logger.info("sendScheduleSmsToTechs: technicianPhoneNumbers :: ",{
			'technicianPhoneNumbers':technicianPhoneNumbers,
			"technicianPhoneNumbersLength":technicianPhoneNumbers.length,
			"technicianTimezones":technicianTimezones,
			"technicianTimezonesLength": technicianTimezones.length,
			"jobId":job.jobId
		})
		technicianPhoneNumbers.forEach((phoneNumber, index) => {
			let finalMessage = message
			console.log('++++technician send schedule message+++++++++++',phoneNumber, phoneNumber.toString().length, index, finalMessage)
			let techTimezone = "America/New_York"
			if(technicianTimezones[index]){
				techTimezone = technicianTimezones[index]
			}
			let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:techTimezone};
			console.log("My console to chk DATE_OPTIONS", DATE_OPTIONS)
			let scheduleJobTime = new Date(job.jobObj.primarySchedule).toLocaleString("en", DATE_OPTIONS);
			if(!message.includes("Reason")){
				finalMessage = message + scheduleJobTime
			}
			if(phoneNumber && phoneNumber.toString().length >= 10 ){				
				TextService.sendSmsToNumber(
					phoneNumber,
					finalMessage,
					jobId
				)
			}
		});
	}catch(err){
		logger.error("sendScheduleEmailToTechs: catch error ",{'err':err, 'jobId':job.jobId})
	}
	
}

/**
* This function is used to send text alert on tech phone number
* @params = technicianPhoneNumbers(Type:Object): list of techs phonenumber, 
*		jobId(Type:String): Job id,
*		message(Type:String) : message for mobile number
* @author : Ridhima Dhir
*/
export const sendCancelMailToCustomer = async(data) => {
	try{
		let notificationData = {
			"user":data.customerUserId,
			"job":data.jobId,
			"actionable":true,
			"title":"You Cancelled the job. Reason: " + data.reason,
			"type":"Cancelled Job",
			"read":false
		}
		let notify = new Notifications(notificationData)
		notify.save()
		logger.info("sendCancelMailToCustomer: Notifications :: ",{
			'data':data,
			'notificationData':notificationData,
		})
		//Send Email
		if(data.email){
			scheduleCancelJobAlertCustomer({
				email: data.email,
				firstName:data.firstName,
				reason:data.reason,
				programName: data.programeName
			});
		}
	}catch(err){
		logger.error("sendScheduleEmailToTechs: catch error ",{'err':err, 'jobId':data.jobId})
	}
	
}

/**
* In update case we get software id only not full object. So we check if software name is not set then find software detail by id.
* but in new job we have full software object.
* @params = job(Type:Object): detail of job
* return software name with suboption
* @author : Ridhima Dhir
*/
export const getProgrameName = async(job) => {
	let programeName = '';
	if(job.software && job.software.name){
		programeName = `${job.software.name}`
		console.log("programeName :::::::::::::1", programeName);
	}
	
	if(job.software && !job.software.name){
		let softwareName =  await Software.findById({_id:job.software}).select('name')
		programeName = softwareName.name
		console.log("programeName :::::::::::::2", programeName, softwareName);
	}
	
	//ProgrameName update with sub software name. if subsoftware is not empty
	if(job.subSoftware && !job.subSoftware.name){
		let subSoftwareName =  await Software.findById({_id:job.subSoftware}).select('name')
		programeName = subSoftwareName.name
		console.log("programeName :::::::::::::3", programeName, subSoftwareName);
	}
	if(job.subSoftware && job.subSoftware.name){
		programeName = `${job.subSoftware.name}`
	}

	programeName += (job.subOption ? " "+job.subOption : "")
	return programeName
}
