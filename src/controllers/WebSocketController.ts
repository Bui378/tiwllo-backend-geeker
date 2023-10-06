import { Request, Response, NextFunction } from 'express';
import WebSocket, { IWebSocket } from '../models/WebSocket';
import Job, { IJob } from '../models/Job';
import User from '../models/User';
import InvalidRequestError from '../errors/InvalidRequestError';
var myModule = require('../app');
import { sendSearchEmail,sendScheduleEmail,dynamicEmail,customerIsWaiting ,technicianAcceptJob,customerDeclinedTheTechnician, sendEmailForTechAcceptJobToManagementTeamMembers, sendEmailToManagmentTeamForCustDeclinedTech} from "../services/MailService";
import * as JobService from "../services/JobService";
import * as TextService from "../services/TextService";
import Random from 'meteor-random-universal';
import Notifications, { INotfication } from '../models/Notifications'
import {  getProgrameName } from "../services/Schedule";
import { postGTMTag } from "../utils"
import {  JOB_TYPE, JOB_STATUS  } from '../constant';
import Stakeholder  from '../models/Stakeholders';
const fs = require('fs');
var request = require('request');


let logger = require('../../winston_logger');
logger = logger("WebSocketController.ts");

export async function create(req:Request,res:Response,next:NextFunction){
	try {
		// console.log('WebSocketController create>>>>>>>>>>>>')


		let full_data = req.body.data
		let new_dict  = {
			'user': req.body.user,
			'job': req.body.job,
			'socketType': req.body.socketType,
			'userType': req.body.userType,

		}
		if(req.body.hitFromCustomerSide != undefined){
			new_dict['hitFromCustomerSide'] = req.body.hitFromCustomerSide
		}

		if(req.body.hitFromTechnicianSide != undefined){
			new_dict['hitFromTechnicianSide'] = req.body.hitFromTechnicianSide
		}
		
		const response = {message:"successfully Created!!!!"}
		const websocket = new WebSocket(new_dict);
		await websocket.save();
		
		if(req.body.socketType == 'meeting-closed'){
			// meeting_closed_emails(full_data)	 	
			let meeting_end_time = new Date()

			// commented total cost by manibha on 4 match 22 due to second meeting cost null issue
			await JobService.updateJob(full_data.jobId, {
				status:'Completed',
				total_time:full_data.total_time,
				total_seconds:full_data.total_seconds, 
				// total_cost:full_data.total_cost,
				// free_session_total:full_data.free_session_total, 
				is_free_job:full_data.is_free_job,
				meeting_end_time:meeting_end_time
			});

			// console.log('websocket>>>>>>>>>>>',websocket)
			full_data['web_socket_id'] = websocket['_id']
			myModule.io.to(full_data.jobId).emit("hangup-all",full_data)
		}
		
		response['websocket_details'] = websocket
		return res.json(response);

	}
	catch (err){
		console.log("WebSocket create error::",err)
	}
}



export async function update(req: Request, res: Response, next: NextFunction) {
	try {
				console.log('WebSocketController update>>>>>>>>>>>>')

		const {id}: { id: string } = req.params as any;
		const web_socket: IWebSocket = await WebSocket.findById(id);

		if (!web_socket) {
			throw new InvalidRequestError('web_socket does not exist.');
		}

		WebSocket.updateOne({ "_id": id },req.body,
			function(err, response) {
			}
		)

		res.json(web_socket);
	} catch (err) {

		console.log("error in update websocket :::: ")
		res.json({'success':false});
	}
}




export async function customer_declined_the_technician(req: Request, res: Response, next: NextFunction){
	const user = (req as any).user;
	try {
		console.log('WebSocketController customer_declined_the_technician>>>>>>>>>>>>')

	 
		let job = req.body;
		let data_to_send = {}
			try{
					myModule.io.emit("refresh-notifications")
					if(job.job.web_socket_id != undefined){
						data_to_send = {response:job.tech,websocket_id:job.job.web_socket_id}
						myModule.io.emit("decline-technician",{res:job.tech,websocket_id:job.job.web_socket_id})
					}else{
						data_to_send = {response:job.tech}
						myModule.io.emit("decline-technician",{res:job.tech})
					}
					let updatedNotifiedTechs =[];
					
					for(const k in job.job.notifiedTechs){
						let jobStatus = job.job.notifiedTechs[k]['jobStatus'];
						let notifyEndAt = (job.job.notifiedTechs[k]['notifyEndAt'])?job.job.notifiedTechs[k]['notifyEndAt']:new Date();
						if(job.job.notifiedTechs[k]['techId'] == job.tech.id){
							jobStatus = "client-decline";
							notifyEndAt = new Date();
						}
						updatedNotifiedTechs[k] = {
							'techId' :  job.job.notifiedTechs[k]['techId'],
							'techStatus':  job.job.notifiedTechs[k]['techStatus'],
							'notifyAt' : job.job.notifiedTechs[k]['notifyAt'],
							'jobStatus' : jobStatus,
							'notifyEndAt' : notifyEndAt,
						}

					}
					console.log(">>>>>>>>>> updatedNotifiedTechs", updatedNotifiedTechs);
					await JobService.updateJob(job.jobId, { 'notifiedTechs':updatedNotifiedTechs});
					
				// let subject = "Request Rejected"
				// let email = job.job.technician.user.email
				// console.log("step :: 1")
				let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:job.job.technician.user.timezone};
				//  console.log("step :: 2")
				// let text  = `<p>Customer declined your request for a job of  ${job.job.software.name} you applied recently. </p>

				// <p>Following are the  job details:</p>
				// <p>  <b>Software</b> : ${job.job.software.name}</p>
				//  <p><b>Issue Description</b> : ${job.job.issueDescription}</p>
				//  <p><b>Created At</b> : ${new Date(job.job.createdAt).toLocaleString("en", DATE_OPTIONS)}</p>
				//  <p><b>Customer  Name</b> : ${job.job.customer.user.firstName}</p>
				// `
				let programeName = await getProgrameName(job.job)
				let businessName = await getBusinessName(job.job.customer);
				let businessPart = businessName ? ', ' + businessName : '';
				await customerDeclinedTheTechnician({
					email:job.job.technician.user.email,
					programeName:programeName,
					jobDescription:job.job.issueDescription,
					createdAt:new Date(job.job.createdAt).toLocaleString("en", DATE_OPTIONS),
					firstName:job.job.customer.user.firstName,
					businessName:businessPart,
				})
				let custName= job.job.customer.user.firstName +" " + job.job.customer.user.lastName;
				await informStakeholdersCustomerDeclinedTech(job,custName)
				
				let wb_socket = WebSocket.updateOne({"_id":job.job.web_socket_id},{"socketType":"decline-technician",'dataVariable':JSON.stringify(data_to_send)}, function(err, response) {
					console.log("response :::::::::::::: ",response.err)

						})
				let previewtext = 'Request Rejected'
				 console.log("step :: 3")
				//  dynamicEmail({email,subject,text,previewtext})


				// sending text message code by manibha starts
				try{
					let toggle = job.job.technician.profile.alertPreference.settings.Job.Text.toggle
					let number = job.job.technician.profile.alertPreference.settings.Job.Text.value
					if(number != undefined && number != '' && toggle){
						try{
							TextService.sendSmsToNumber(number,'Geeker - Customer '+job.job.customer.user.firstName+businessPart +' declined your request for a job of '+job.job.software.name+' you applied recently.',job.job.id)
						}
						catch(err){
							logger.error("customer_declined_the_technician: text message not sent: ",{
								'err':err,
								'jobId':job.job.id,
							});
						}
					}
				}catch(err){
					console.log('no phone number found to send text.')
				}
				// sending text message code by manibha ends


				await JobService.updateTechnician(job.tech.id, { status: 'Available' });

				logger.info("customer_declined_the_technician : Socket type decline-technician: ",
					{
						'body':job.job.web_socket_id,
						'userId':(user)?user.id:null,
						'jobId':job.job.id
					}
				);
				 return res.json({'success':true});

				}
			catch(err){
				console.log("socket in technician-declined :::::::::: ",err)
				console.log("webSocketId ::::::::::: ",job.job.web_socket_id)
				let wb_socket = WebSocket.updateOne({"_id":job.job.web_socket_id},{"socketType":"decline-technician","errorMessage":err.message,'dataVariable':JSON.stringify(data_to_send)}, function(err, response) {
					console.log("response :::::::::::::: ",response)
						})

				let error_dict = {'error':err.message,'socket_type': 'technician-declined','job':job.job.id,'message':'socket error'} 
				logger.error("customer_declined_the_technician : Catch error: Socket type decline-technician: ",
						{
							'body':job.job.web_socket_id,
							'err':error_dict,
							'userId':(user)?user.id:null,
							'jobId':job.job.id
						}
					);
				send_logs_to_new_relic(JSON.stringify(error_dict))

				return res.json({'success':false});
			}
		
	} catch (err) {
		console.error('ERROR: customer_declined_the_technician::', err);
		logger.error("customer_declined_the_technician : Catch error: in customer_declined_the_technician: ",
						{
							'body':req.body.job.web_socket_id,
							'err':err,
							'userId':(user)?user.id:null,
							'jobId':req.body.job.id
						}
					);
		next(err);
	}
};

const getBusinessName = async (customerData) => {
	let businessName = "";
  
	if (customerData && customerData.user) {
	  if (customerData.user.roles[0] === 'owner' && customerData.user.isBusinessTypeAccount) {
		businessName = customerData.user.businessName;
		console.log("business with businessName>>>>>>>>>>", businessName);
	  } else {
		if (customerData.user.roles[0] === 'admin' || customerData.user.roles[0] === 'user') {
		  let ownerInfo = await User.findById(customerData.user.ownerId);
		  console.log("Business information owner >>>>>", ownerInfo);
  
		  if (ownerInfo.isBusinessTypeAccount) {
			businessName = ownerInfo.businessName;
			console.log("Business information owner info>>>", ownerInfo, businessName);
		  }
		}
	  }
	}
  
	return businessName;
};
/**
 * following function send email to stakeholder that customer declined tech
 * @param:job
 * @author: Mamta
 */
 
 const informStakeholdersCustomerDeclinedTech = async(job,custName)=>{
   try{
   	console.log("informStakeholdersCustomerDeclinedTech>>>>>>>>>>>>>>", job)
   	let techName= job.tech.user.firstName + " "+ job.tech.user.lastName;
	logger.info('informStakeholders customer declined tech', {jobId:job.jobId, jobType:job.job.customer.customerType})
	if(job.job.customer.customerType === JOB_TYPE.LIVE){
	    let jobType = 'Regular';
	    if(job.job.status === JOB_STATUS.ACCEPTED){
	        logger.info("informStakeholders, customer declined the technician",{jobId:job.jobId})
	          jobType= job.job.status;
	    }
	    //Fetching emails of all the stakeholders
	    const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
	    logger.info("informStakeholders Preparing to send Email to stake holders ",{stakeholderData:stakeholderData});
	    
	   Promise.all(
	      stakeholderData.map((stakeholder)=>{
	          try{
	              if(stakeholder.job_flow === 'active'){
					  //alert on email
	                logger.info("informStakeholders about to send email to", {email:stakeholder.email, "job_id":job.jobId})
					  if ((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')) {
						  sendEmailToManagmentTeamForCustDeclinedTech(stakeholder, job, jobType, techName, custName);
					  }
					  //alert on phone number
					let message = "Hi Stakeholder " + stakeholder.name + ", Customer " + custName + " declined Technician " + techName + " for the job (" + job.job.JobId + ") of " + job.job.software.name + "."
					  if ((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')) {
						  TextService.sendSmsToNumber(
							  stakeholder.phone,
							  message,
							  job.jobId
						  )
					  }
	              }
	          }catch(error){
	           logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping ", {error:error, stakeholder:stakeholder, jobId:job.jobId})        	 		
	          }
	      })
	     )
	}
   }catch(error){
   	logger.error("Error in informStakeholdersCustomerDeclinedTech ", {error})
 		console.log('Error in informStakeholdersCustomerDeclinedTech ', error)
   }
 }




export async function technician_accepted_job(req: Request, res: Response, next: NextFunction){
	const user = (req as any).user;
	let requestBody = req.body
	console.log("User ::::::::", user);
	console.log("My console for requestBody", requestBody);
	try{
		logger.info('Pushing Technician Accepted tag for ASAP job with job id'+requestBody.mainJob.id,{
			'job':requestBody.mainJob,
			'tagName' : "Technician Accepted"
		})
		postGTMTag(requestBody.mainJob, "technicianAccepted")
		console.log('WebSocketController technician_accepted_job>>>>>>>>>>>>')
		let fromMobile = requestBody.fromMobile
		let newAppointmentRequestStats = {
				receiver: requestBody.customer,
				job: requestBody.jobId,
				technician:requestBody.technician,
				web_socket_id:requestBody.web_socket_id
			}
		let updatedNotifiedTechs = [];
		myModule.io.emit("new-appointment-request", newAppointmentRequestStats);
		logger.info("technician_accepted_job : Technician accept job emit socket new-appointment-request: ",
				{
					'body':req.body.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':requestBody.mainJob.id
				}
			);
		

		try{
			//updated notifiedTechs object with technician who appected the job and update job status to search-finished
			updatedNotifiedTechs = await scheduleUpdatedNotifiedTechs(requestBody, updatedNotifiedTechs)

			await JobService.updateJob(requestBody.jobId, { technician: requestBody.technician,status:'Accepted', 'notifiedTechs':updatedNotifiedTechs});
			console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> updatedNotifiedTechs", updatedNotifiedTechs);
			let mailEndpoint = `<a style="color:white;" href=${process.env.mailEndpoint}>Connect Now</a>`
			let firstName = `${requestBody.mainJob.customer.user.firstName}`
			await technicianAcceptJob({
				email:requestBody.mainJob.customer.user.email,
				mailEndpoint:mailEndpoint,
				firstName:firstName,
			})
			const customerName = requestBody.mainJob.customer.user.firstName + " " + requestBody.mainJob.customer.user.lastName 
			await informStakeholders(requestBody, customerName)
			

			//notification/sms related code
			await scheduleJobAlerts(req, user, requestBody)
			//socket related code
			await scheduleJobSockets(req, user, requestBody, newAppointmentRequestStats)

			return res.json({'success':true});
		}catch(err){
			console.log("webSocketId ::::::::::: ",requestBody.web_socket_id)
			let wb_socket = WebSocket.updateOne({"_id":requestBody.web_socket_id},{"errorMessage":err.message,'dataVariable':JSON.stringify(newAppointmentRequestStats)}, function(err, response) {
				console.log("response :::::::::::::: ",response)
					})


			let error_dict = {'error':err.message,'socket_type': 'new-appointment-request','job':requestBody.mainJob.id,'message':'socket error'}		    
			
			logger.error("technician_accepted_job : socket type new-appointment-request : ",
					{
						'body':requestBody.web_socket_id,
						'userId':(user)?user.id:null,
						'jobId':requestBody.mainJob.id,
						'err':error_dict,
					}
				);
			send_logs_to_new_relic(JSON.stringify(error_dict))		
			return res.json({'success':false});
		}
		
	}
	catch(err){
		logger.error("technician_accepted_job : error in technician_accepted_job : ",
				{
					'body':req.body.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':req.body.JobId,
					'err':err.message,
				}
			);
		console.log("error in technician_accepted_job :::")
	}
}


/**
 * Following function is for sending email to management team for job accpted by tech
 * @response : {void}
 * @params: data
 * @author: Mamta 
 */
  const informStakeholders = async (data,custName) => {
  	//  console.log("res>>>>>>>>>>>>>>>informStakeholders", data)
  	 try{
  	 	logger.info('informStakeholders', {jobId:data.mainJob.id, jobType:data.mainJob.customer.customerType})
  	 	if(data.mainJob.customer.customerType === JOB_TYPE.LIVE){
  	 		let jobType = "Regular"
  	 		if(data.mainJob.status === JOB_STATUS.ACCEPTED){
  	 			logger.info("informStakeholders, Job is accepted By technician",{jobId:data.mainJob.id})
  	 			jobType= data.mainJob.status;
  	 		}
  	 		//Fetching emails of all the stakeholders
			 const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
	         logger.info("informStakeholders Preparing to send Email to stake holders ",{stakeholderData:stakeholderData});
          
           Promise.all(
          	 stakeholderData.map((stakeholder)=>{
          	 	try{
          	 		if(stakeholder.job_flow === 'active'){
						//alert on email
          	 		  logger.info("informStakeholders about to send email to", {email:stakeholder.email, "job_id":data.mainJob.id})
						if ((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')) {
							sendEmailForTechAcceptJobToManagementTeamMembers(stakeholder, data, jobType, custName);
						}
						//alert on phone number
					    let message = "Hi Stakeholder " + stakeholder.name + ", job (" + data.mainJob.JobId + ") of " + data.mainJob.software.name + " is accepted by " + data.technicianName + "."
					    // console.log("informStakeholders after accepted message",message);
						if ((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')) {
							TextService.sendSmsToNumber(
								stakeholder.phone,
								message,
								data.mainJob.id
							)
						}
          	 		//   console.log("stakeholder>>>>>>>>>>>>>>>>>>>>>>>>>>>", stakeholder, "data", data, "jobType", jobType,)
          	 		}
          	 	}catch(error){
                    logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping ", {error:error, stakeholder:stakeholder, jobId:data.mainJob.id})        	 		
          	 	}
          	 })
          	)
  	 	}
  	 }catch(err){
  	 	logger.error("informStakeholders Error occured : ", {err:err, jobId:data.mainJob.id})
  	 }
  }
 

/**
* This function update notifiedTechs object for tech who accpeted the job with job status "search-finished"
* @response : data, updatedNotifiedTechs
* @author : Ridhima Dhir
*/
export async function scheduleUpdatedNotifiedTechs(data, updatedNotifiedTechs){
	for(const k in data.mainJob.notifiedTechs){
		let jobStatus = (data.mainJob.notifiedTechs[k]['jobStatus'])?data.mainJob.notifiedTechs[k]['jobStatus']:"search-finished";
		let notifyEndAt = (data.mainJob.notifiedTechs[k]['notifyEndAt'])?data.mainJob.notifiedTechs[k]['notifyEndAt']:new Date();
		if(data.mainJob.notifiedTechs[k]['techId'] == data.technician){
			jobStatus = "accepted";
			notifyEndAt = new Date();
		}
		updatedNotifiedTechs[k] = {
			'techId' :  data.mainJob.notifiedTechs[k]['techId'],
			'techStatus':  data.mainJob.notifiedTechs[k]['techStatus'],
			'notifyAt' : data.mainJob.notifiedTechs[k]['notifyAt'],
			'jobStatus' : jobStatus,
			'notifyEndAt' : notifyEndAt,
		}
	}
	return updatedNotifiedTechs
}

/**
* This function send scheduleJobAlerts by text and save notification in notifications table
* @response : data, updatedNotifiedTechs
* @author : Ridhima Dhir
*/
export async function scheduleJobAlerts(req, user, data){
	// sending text message to customer by manibha starts
	let correctedNumber = data.mainJob.customer.phoneNumber
	TextService.sendSmsToNumber(correctedNumber,'Hi '+data.mainJob.customer.user.firstName+'. Technician - '+data.technicianName+' has accepted your job of '+data.softwareName+'. Please start the call to solve your problem',data.mainJob.id)
	// sending text message to customer by manibha ends


	let notificationData = {
		"user":data.mainJob.customer.user.id,
		"job":data.mainJob.id,
		"actionable":true,
		"title":"We found a Technician for your Job",
		"type":"Scheduled Job ",
		"read":false
						}
	let notiFy = new Notifications(notificationData)
	try{
		await notiFy.save()
		logger.info("technician_accepted_job : Technician accept job notifications saved: ",
			{
				'body':req.body.web_socket_id,
				'userId':(user)?user.id:null,
				'jobId':data.mainJob.id,
				'info':notificationData
			}
		);
	}catch(err){
		console.log("notification not saved :::: ")
		logger.error("technician_accepted_job : scheduleJobAlerts:  Technician accept job notification not saved, socket type new-appointment-request: ",
			{
				'body':req.body.web_socket_id,
				'userId':(user)?user.id:null,
				'jobId':data.mainJob.id,
				'err':err.message
			}
		);
		let error_dict = {'error':err.message,'socket_type': 'new-appointment-request','job':data.mainJob.id,'message':'socket error'}		    
		send_logs_to_new_relic(JSON.stringify(error_dict))		
	}
}

/**
* This function will emit sockets refresh-notifications, update-dashboard-status, set-join-on-dashboard and update tech status to busy
* @response : req, user, data, dataToSend
* @author : Ridhima Dhir
*/
export async function scheduleJobSockets(req, user, data, dataToSend){
	try{
		myModule.io.emit("refresh-notifications")
		logger.info("technician_accepted_job : Technician accept job socket emit refresh-notifications: ",
				{
					'body':req.body.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':data.mainJob.id,
				}
			);
		// dynamicEmail({email,subject,text,previewtext})
		let allJobs = []
		myModule.io.emit("update-dashboard-status")
		logger.info("technician_accepted_job : Technician accept job socket emit update-dashboard-status: ",
				{
					'body':req.body.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':data.mainJob.id,
				}
			);

		myModule.io.emit("set-join-on-dashboard",{allJobs:[],jobId:data.mainJob.id,tech:data.mainJob.technician})
		logger.info("technician_accepted_job : Technician accept job socket emit set-join-on-dashboard: ",
				{
					'body':req.body.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':data.mainJob.id,
				}
			);
		
		let wb_socket = WebSocket.updateOne({"_id":data.web_socket_id},{'dataVariable':JSON.stringify(dataToSend)}, function(err, response) {
			console.log("response :::::::::::::: ",response)
		})
		logger.info("technician_accepted_job : Update websocket dataVariable column value: ",
				{
					'body':req.body.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':data.mainJob.id,
					'info':{
						receiver: data.customer.id,
						job: data.jobId,
						technician:data.technician.id,
						web_socket_id:data.web_socket_id
					}
				}
			);

		await JobService.updateTechnician(data.technician, { status: 'Busy' });
		logger.info("technician_accepted_job : Update status of technician to busy who has accept the job : ",
				{
					'body':req.body.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':data.mainJob.id,
				}
			);
	}catch(err){
		let error_dict = {'error':err.message,'socket_type': 'new-appointment-request','job':data.mainJob.id,'message':'socket error'}		    
			
		logger.error("technician_accepted_job: scheduleJobSockets : socket type new-appointment-request : ",
				{
					'body':data.web_socket_id,
					'userId':(user)?user.id:null,
					'jobId':data.mainJob.id,
					'err':error_dict,
				}
			);
		send_logs_to_new_relic(JSON.stringify(error_dict))
	}
}

export function send_logs_to_new_relic(dataString) {
		console.log('WebSocketController send_logs_to_new_relic>>>>>>>>>>>>')

	if(process.env.SERVER_TYPE == 'production'){

		var options = {
				url: process.env.RELIC_END_POINT,
				method: 'POST',
				body: dataString
		};

		function callback(error, response, body) {
				if (!error && response.statusCode == 200) {
						console.log(body);
				}
		}
		console.log('options>>>>>>>>>>>>>>>>>>>>>>>>>',options)
		request(options, callback);
	 }
}



export async function customer_start_call(req: Request, res: Response, next: NextFunction){
		const user = (req as any).user;
		// console.log('WebSocketController customer_start_call>>>>>>>>>>>>')

		let job = req.body
		myModule.io.to(job.id).emit("accept-job", job);
		try{
			const updateJobInfo = await Job.findById(job.id)
			// console.log('updated job info--------------', updateJobInfo)
			let start_call_date_time = new Date()
			let queryConditions = {}
			if(updateJobInfo.status === "Scheduled" || updateJobInfo.status === "Accepted" ){
				queryConditions['start_call_time'] = start_call_date_time
				queryConditions["status"] = "Inprogress"
			}else if(updateJobInfo.status === "Inprogress" && !updateJobInfo.start_call_time){
				queryConditions['start_call_time'] = start_call_date_time
			}
				await JobService.updateJob(job.id, queryConditions);
				logger.info("customer_start_call : Customer start the call : ",{
					'body':req.body.id,
					'userId':(user)?user.id:null,
					'jobId':job.id,
					'info':{'start_call_date_time':start_call_date_time},
				});
				// await JobService.updateJob(job.id, {"status": "Inprogress","start_call_time":start_call_date_time});
			
			// const responseforCall =  await CallService.conferenceCall(job.id);
			
			let notificationData = {
					user:job.technician.user.id,
					job:job.id,
					read:false,
					actionable:true,
					customer:job.customer.id,
					title:"Customer is waiting for you, Please join the meeting.",
					type:"meeting_notifcation"
				}
				let wb_socket = WebSocket.updateOne({"_id":job.web_socket_id},{'dataVariable':JSON.stringify(job)}, function(err, response) {
				// console.log("response :::::::::::::: ",response)
				})

				if(job.schedule_accepted_on != undefined ){
					let lastName = `${job.technician.user.lastName}`
					let firstName = `${job.technician.user.firstName}`
					await customerIsWaiting({
						email:job.technician['user']['email'],
						jobData: job,
						firstName:firstName,
						lastName:lastName,
					})
					// dynamicEmail({
					// 	email: job.technician.user.email,
					// 	subject :'Customer is waiting.',
					// 	text:`<p style="font-size:26px;font-weight:bold;text-align:center">Hello ${job.technician.user.firstName} ${job.technician.user.lastName}</p>
					// 				<p style="text-align:center;font-size:15px;">Customer is waiting for you to join the meeting .
					// 					Please login into the system if not already logged in and join your scheduled meeting.</p> 
					// 				<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
					// 					<p style="font-weight:bold;text-align:center;font-size:15px;">Case Summary</p>
					// 					<p style="text-align:center;font-size:15px;">${job.issueDescription}</p>
					// 				</div>`,
					// 	previewtext :'Customer is waiting for you',
					// });
					logger.info("customer_start_call : Customer waiting email : ",
						{
							'body':req.body.id,
							'userId':(user)?user.id:null,
							'jobId':job.id,
							'info':{'start_call_wait_email_time':new Date()},
						}
					);


				}
					


				let notify = new Notifications(notificationData)
				notify.save()
				myModule.io.emit("set-join-on-dashboard",{allJobs:[],jobId:job.id,tech:job.technician})
				logger.info("customer_start_call : Customer start the call socket emit set-join-on-dashboard : ",
						{
							'body':req.body.id,
							'userId':(user)?user.id:null,
							'jobId':job.id,
							'info':{'start_call_wait_email_time':new Date()},
						}
					);

				myModule.io.emit('refresh-notifications')
				logger.info("customer_start_call : Customer start the call socket emit refresh-notifications : ",
						{
							'body':req.body.id,
							'userId':(user)?user.id:null,
							'jobId':job.id,
						}
					);

				// sending text message code by manibha starts
				try{
					let toggle = job.job.technician.profile.alertPreference.settings.Job.Text.toggle					
					let number = job.technician.profile.alertPreference.settings.Job.Text.value
					if(number != undefined && number != '' && toggle){
						try{
							TextService.sendSmsToNumber(number,'Geeker - Customer '+job.customer.user.firstName+' is waiting for you, Please join the meeting.',job.id)
						}
						catch(err){
							logger.error("technician-not-joined: socket text message not sent: ",{
								'err':err,
								'jobId':job.id,
							});
						}
					}
				}catch(err){
					console.log('no phone number found to send text.')
				}
				// sending text message code by manibha ends


				return res.json({'success':true});
		}
		catch(err){

			console.log("webSocketId ::::::::::: ",job.web_socket_id)
			let wb_socket = WebSocket.updateOne({"_id":job.web_socket_id},{"errorMessage":err.message,'dataVariable':JSON.stringify(job)}, function(err, response) {
				console.log("response :::::::::::::: ",response)

				})

			let error_dict = {'error':err.message,'socket_type': 'accept-job','job':job.id,'message':'socket error'}		    
			send_logs_to_new_relic(JSON.stringify(error_dict))
			logger.error("customer_start_call : Catch error: WebSocket update errorMessage and dataVariable values : ",
						{
							'body':job.id,
							'userId':(user)?user.id:null,
							'jobId':job.id,
							'err':error_dict,
						}
					);
			return res.json({'success':false});
		}
			
}

export async function polling_for_customer (req: Request, res: Response, next: NextFunction){
		console.log('WebSocketController polling_for_customer>>>>>>>>>>>>')
	
	let responseToSend = {'success':true,"meetingStarted":false}
	try{
			let data = req.body
			let job_id = data.job_id
			let socket_id = data.socket_id
			let web_socket_query = WebSocket.findOne({"_id":socket_id})
			let web_socket_obj = await web_socket_query
			let job_query  = await Job.findOne({"_id":job_id})
			let job_main = await job_query
			
			// console.log("web_socket_obj :::: ",web_socket_obj)
			if(web_socket_obj != undefined){
				// console.log("job_main ::::: ",job_main)
				if(web_socket_obj['hitFromCustomerSide'] != true){
					let dataToSend = {

						"customerId":job_main['customer'],
						"issueDesc":job_main['issueDescription'],
						"socketId":Random.id()
					}
				myModule.io.emit("notificationToCustomer",dataToSend)

				// }
			}
			if(job_main.status === "Accepted"){
				let dataToSend = {

						"customerId":job_main['customer'],
						"issueDesc":job_main['issueDescription'],
						"socketId":Random.id()
					}
				myModule.io.emit("notificationToCustomer",dataToSend)
			}
			if(job_main.status === "Inprogress"){
				responseToSend['success'] =true
				responseToSend['technician_id'] = job_main['technician']
				responseToSend['job_id'] = job_main['_id']
				responseToSend['meetingStarted'] = true

			}

		}
	}
	catch(err){
		responseToSend['success']=false
		console.log("error in polling_for_customer :: ",err)
	}
	return res.json(responseToSend);
}
