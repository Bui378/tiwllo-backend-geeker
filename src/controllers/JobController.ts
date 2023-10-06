import { Request, Response, NextFunction } from 'express';
import Job, { IJob } from '../models/Job';
import BillingDetails, { IBillingDetails } from '../models/BillingDetails';
import EarningDetails, { IEarningDetails } from '../models/EarningDetails';
import Software, { ISoftware } from '../models/Software';
import InvalidRequestError from '../errors/InvalidRequestError';
import * as JobService from '../services/JobService';
import * as TextService from '../services/TextService';
import * as MailService from '../services/MailService';
import * as Services from '../services/SettingService'
import JobNotificationHistory ,{ jobNotificationHistorySchema } from '../models/JobNotificationHistory';
import { getProgrameName } from '../services/Schedule';
import {scheduleExpiredMinutes,TECHNICIAN_NOTIFICATION_LIMIT} from '../constant';
var request = require('request');
import { roleStatus } from "../utils";
import Customer,{ICustomer} from '../models/Customer';
import User from '../models/User';
import * as CustomerFunctions from './CustomerController';
import { date } from 'joi';
let logger = require('../../winston_logger');
logger = logger("JobController.ts");
var myModule = require('../app');
// const { ObjectId } = require('mongodb');
import { scheduleLookingForTechnician } from "../services/MailService";
import { getMaxListeners } from 'process'; 
import PromoCode,{IPromoCode} from '../models/PromoCode';
//logger.logs("JobController");
//import logger from 'src/logger';

export async function list(req: Request, res: Response, next: NextFunction) {
	try {
		
			console.log('JobController list>>>>>>>>>>>>')

		let { page, pageSize } = req.params;
	 
		page = parseInt(page, 10);
		pageSize = parseInt(pageSize, 10);
		console.log("req.paramas ::::: ",req.params)
		const query = Job.find().sort({createdAt:-1});

		const totalCount = await Job.countDocuments(query);
		const jobs: IJob[] = await query
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.populate('software')
			.populate({
			 path : 'subSoftware',
			 populate:'software'
			})
			.populate({
			 path : 'parent',
			 populate:'software'
			})
			.populate('expertise')
			.populate({

				path: 'customer',
				model: 'user',
				populate: {
				path: 'offers',
				model: 'Offer'
				}

			})
			.populate({
				path: 'technician',
				populate: 'user',
			})
			.exec();

		return res.json({
			data: jobs,
			totalCount
		});
	} catch (err) {
		next(err);
	}
}

const fetchNotificationByJobId = async (tehnicianId: string) => {
	try {
		const notificationResponse = await JobNotificationHistory.find({ technician: tehnicianId }).sort({ createdAt: -1 }).limit(TECHNICIAN_NOTIFICATION_LIMIT)
		if (notificationResponse.length > 0) {
			const jobIds = notificationResponse.map(notification => notification.job);
			return jobIds;
		}
		return []
	} catch (error) {
		console.log("error while finding notification response", error)
		return []

	}
}

export async function listByParams(req:Request,res:Response,next:NextFunction){
	try{
			// console.log('JobController listByParams>>>>>>>>>>>>', req.body)

		// consolelog("I am running this ",req ) .
		// console.log("req.query ::: :",req.query)
		const data  = req.body 
		let { page, pageSize ,userType, id} = req.query;
		const {software , ...remainigData} = data
		let formattedFilteredData = data;
		if(id !='' && userType){
		const jobIdLists =  await fetchNotificationByJobId(id);
		formattedFilteredData = {
				"$or": [
					{
						"$and": [
							{ "_id": { "$in": jobIdLists } },
							{ "status": "Pending" },
						],
					},
					{
						"$and": [
							{
								software: data.software
							},
							remainigData
						]
					}
				]
		}
	}
		page = parseInt(page, 10);
		pageSize = parseInt(pageSize, 10);
		// console.log("page ::: ",page)
		// console.log("Data ::: ",data)
		// console.log("pageSize :: ",pageSize)
		// console.log((page - 1) * pageSize,">>>>>>>")
		let query = Job.find(formattedFilteredData).sort({createdAt:-1});


		if (data.customer) {
			const customer: any = await Customer.findById({ _id: data.customer },{customerType:0,offers:0,
				alternatives:0, createdAt:0, updatedAt:0,__v:0,_id:0
			}).populate("user",{ roles: 1, parentId: 1, ownerId : 1});
			
			const user = (customer && customer.user) ? customer.user : {}
	
			const { roles, parentId ,ownerId, _id} = user
			if (typeof roles !== "undefined" && roles && (roles.includes(roleStatus.ADMIN) || roles.includes(roleStatus.OWNER))) {
				let userIds = [];
				let customerIds = [];
				
				if (parentId || ownerId) {
					if (ownerId) {
						userIds = await User.distinct("_id", { ownerId });
						for (var uId in userIds) {

							let tempUserIds = await User.distinct("_id", { ownerId: userIds[uId] });
							userIds = [...userIds.concat(tempUserIds)]
						}
						customerIds = await Customer.distinct("_id", { user: { $in: userIds } });
					} else {
						userIds = await User.distinct("_id", { parentId });
						// console.log("customerIds ?>>>>>>>>>>>>>>>>>>>>>>>>>",customerIds)
						for (var uId in userIds) {
							// console.log("UID >>>>>>>>",userIds[uId])
							let tempUserIds = await User.distinct("_id", { parentId: userIds[uId] });
							// console.log("tempUserIds ::::::::::::::",tempUserIds)
							userIds = [...userIds.concat(tempUserIds)]
							// console.log("userIds>>>>>>>.",userIds)
						}
						customerIds = await Customer.distinct("_id", { user: { $in: userIds } });
					}

				} else {
					userIds = await User.distinct("_id", { ownerId : _id });
					userIds.push(_id);
					// console.log("iserods>>>>>>>.",userIds)
					for(var uId in userIds){
						// console.log("UID >>>>>>>>",userIds[uId])
						let tempUserIds = await User.distinct("_id", { ownerId : userIds[uId] });
						// console.log("tempUserIds ::::::::::::::",tempUserIds)
						userIds = [...userIds.concat(tempUserIds)]
						// console.log("userIds>>>>>>>.",userIds)
					}
					customerIds = await Customer.distinct("_id", { user: { $in: userIds } });
				}
				query = Job.find({...formattedFilteredData, customer : { $in : customerIds }}).sort({createdAt:-1});     
			}
			
		}else{
			

			if (userType) {
				query.where({
			  		"customer": {
						$in: await Customer.find({ customerType: userType }, "_id")
			  		}
				});
		  	}
		}
		let totalCount = await Job.countDocuments(query);
		const jobs: IJob[] = await query
		.skip((page - 1) * pageSize)
		.limit(pageSize)
		.populate('software')
			.populate({
			 path : 'subSoftware',
			 populate:'software'
			})
			.populate({
				path:'expertise',
				populate:'expertise'
			})
			.populate({
				path:'experiences',
				populate:'experiences'
			})
			.populate({
				path: 'customer',
				populate: 'user',
			})
			.populate({
				path: 'technician',
				populate: 'user',
			})
			.exec();
			let jobIssueDesc = jobs.map(item=>item.issueDescription)	
			// console.log("filterjobs>>>>>>>>",jobs,totalCount);
			// let filteredJobs = []
			// if(req.query.userType){
			// 	let userType = req.query.userType
			// 	filteredJobs = jobs.filter(job => job.customer['customerType'] === userType)
			// 	totalCount = filteredJobs.length
			// }
			return res.json({
				data: jobs,
				totalCount:totalCount
			});
	}
	catch(err){
		console.log("i am in catch",err)
		next(err);
	}
}

export async function listAllJobsByParams(req:Request,res:Response,next:NextFunction){
	try{
		console.log('JobController listAllJobsByParams>>>>>>>>>>>>')
		const data  = req.body 
		let query = Job.find(data).sort({createdAt:-1});

		
		const totalCount = await Job.countDocuments(query);
		const jobs: IJob[] = await query
		.populate('software')
			.populate({
			 path : 'subSoftware',
			 populate:'software'
			})
			.populate({
				path:'expertise',
				populate:'expertise'
			})
			.populate({
				path:'experiences',
				populate:'experiences'
			})
			.populate({
				path: 'customer',
				populate: 'user',
			})
			.populate({
				path: 'technician',
				populate: 'user',
			})
			.exec();
			let jobIssueDesc = jobs.map(item=>item.issueDescription)
			return res.json({
				data: jobs,
				totalCount:totalCount
			});
	}
	catch(err){
		console.log("i am in catch",err)
		next(err);
	}
}

export async function create(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	let userId = (user)? user.id:null;
	try {
		console.log('JobController create>>>>>>>>>>>>')
		/*if ( user.roles.includes(roleStatus.USER))
		{
			return res.status(403).json({ status:false , message:"Forbidden"});
		}*/
		const job = new Job(req.body);
		await job.save();
		logger.info("New job created: ",{'body':req.body, 'userId':userId, 'jobId':job.id});
		res.status(201).json((await JobService.findJobById(job._id)));
	} catch (err) {
		logger.error("create : Error while creating job: ",{'body':req.body,'err':err, 'user':userId});
		next(err);
	}
}

/*export async function retrieve(req: Request, res: Response, next: NextFunction) {
	try {
		const { id }: { id: string } = req.params as any;

		const job: IJob = await JobService.findJobById(id);

		if (!job) {
			throw new InvalidRequestError('Job does not exist.');
		}
		//console.log("send jobData from here...",job)
		res.json(job);
	} catch (err) {
		next(err);
	}
}*/

export async function retrieve(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {

			// console.log('JobController retrieve>>>>>>>>>>>>')

		/*console.log('req.params ::',req.params)
		const { id }: { id: string } = req.params as any;

		const job: IJob = await JobService.findJobById(id);*/

		let excludeTechNotified = req.query.excludeTechNotified;

		if ( excludeTechNotified === 'undefined' || excludeTechNotified === '') {	
			excludeTechNotified = 'no'; // set default value to false
		}
		let query;
		if( excludeTechNotified === 'yes'){
			 query = Job.find({_id:req.params.id}).select("-notifiedTechs")
			logger.info("retrieve: fetch job detail by job id without the notify field : ",{'userId':(user)?user.id:null, 'jobId':req.params.id,'excludeTechNotified':req.query.excludeTechNotified});
		}else{
			query = Job.find({_id:req.params.id})
		}

		const jobs: IJob[] = await query
			.populate('software')
			.populate('expertise')
			.populate({
				path: 'customer',
				populate: 'user',
			})
			.populate({
				path: 'technician',
				populate: 'user',
			})
			.populate({
			 path : 'subSoftware',
			 populate:'software'
			})

			.populate({
			 path : 'schedule_accepted_by_technician',
			 populate:'user'
			})

			.exec();

		let jobData = {}
		if(jobs && jobs.length > 0){
			jobData = jobs[0]
			logger.info("retrieve: fetch job detail by job id: ",{'body':req.body, 'userId':(user)?user.id:null, 'jobId':req.params.id});
		}
		if (!jobData) {
			logger.info("retrieve: No record found by job id: ",{'body':req.body, 'userId':(user)?user.id:null, 'jobId':req.params.id});
			throw new InvalidRequestError('Job does not exist.');
		}
		
		res.json(jobData);
	} catch (err) {
		logger.error("retrieve: Catch error while fetching job by job id: ",{'body':req.body, "err":err,'userId':(user)?user.id:null, 'jobId':req.params.id});
		next(err);
	}
}

export async function update(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {
		const {id}: { id: string } = req.params as any;
		const job: IJob = await Job.findById(id);
		if (!job) {
			logger.info("update : Job does not exist: ",{'body':req.body,'userId':(user)?user.id:null,'jobId':id});
			throw new InvalidRequestError('Job does not exist.');
		}
		Job.updateOne({ "_id": id },req.body,
			function(err, response) {
					// handling
					// console.log('err>>>>>>>>> in update job',err)
					// console.log('response>>>>>>> in update job ',response)
			}
		)
		// console.log("req.body.hour_history_obj::::",req.body.hour_history_obj)
		if(req.body.hour_history_obj_id && req.body.extra_hours_submission === "accepted" ){
			let data = await Job.update({ "_id": id , "hour_history._id": req.body.hour_history_obj_id},{$set:{"hour_history.$.extra_hours_submission":req.body.extra_hours_submission}})
		}else if(req.body.hour_history_obj_id && req.body.extra_hours_submission === "rejected"){
			let data = await Job.update({ "_id": id , "hour_history._id": req.body.hour_history_obj_id},{$set:{"hour_history.$.extra_hours_submission":req.body.extra_hours_submission}})
		}

		const updatedJob: IJob = await Job.findById(id);

		logger.info("update: update job by body params: ",{'body':req.body, 'userId':(user)?user.id:null, 'jobId':id});

		res.json(updatedJob);
		 
	} catch (err) {
		logger.error("update: Catch error while update job: ",{'body':req.body, "err":err,'userId':(user)?user.id:null, 'jobId':req.params.id});
		next(err);
	}
}

export async function remove(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {
		console.log('JobController remove>>>>>>>>>>>>')
		const {id}: { id: string } = req.params as any;
		const job:IJob = await Job.findById(id).populate("customer").lean();

		//  Below code will check if deleted Job has any payment hold or not and if yes then it will refund the payment hold amount and 
		//  change the status of hold_payment_status to canceled and then delete the job from the database.
		const haveMultipleHoldedPayments = job && job.customer_holded_payments && job.customer_holded_payments.length > 0
		if (haveMultipleHoldedPayments) {
			const stripeReqObj = {
				"params": {
					"stripe_id": job.customer['stripe_id'],
					'liveUser': job.customer['customerType'] === 'live' ? "true" : "false",
					'jobId': id,
				}
			}
			let stripe = await Services.getStripeObject(stripeReqObj);
			const holdedPyaments = job.customer_holded_payments
			const refundStatus = await CustomerFunctions.refundOrDefuctMoneyFromHoldedArray(holdedPyaments, "cancelling_holded_payments", stripe, 0,id,job.customer['stripe_id'])
			logger.info("holded payment is refunded now :", { 'userId': (user) ? user.id : null, 'jobId': id, 'refundStatus': refundStatus });
		}

		await Job.deleteOne({_id: id});
		await BillingDetails.deleteMany({"job_id":id})
		await EarningDetails.deleteMany({"job_id":id})
		logger.info("remove: job removed successfully: ",{'body':req.params, 'userId':(user)?user.id:null, 'jobId':id});
		res.json({deleted: true});
	} catch (err) {
		logger.error("remove: job removed successfully: ",{'body':req.params, 'err':err,'userId':(user)?user.id:null, 'jobId':req.params.id});
		next(err);
	}
}

export async function sendAcceptEmail(req: Request, res: Response, next: NextFunction) {
	try {

			console.log('JobController sendAcceptEmail>>>>>>>>>>>>')

		const { id } = req.params;
		const job = await Job.findById(id);

		if (!job) {
			throw new InvalidRequestError('Job does not exist.');
		}

		/**
		 *  We'll send email here
		 */

		res.json(job);
	} catch (err) {
		next(err);
	}
}



export async function sendZohoInvitation(req: Request, res: Response, next: NextFunction) {
	try {
			console.log('JobController sendZohoInvitation>>>>>>>>>>>>')
			
		const { email } = req.params;
		var client_access_token = process.env.ZOHO_CLIENT_ACCESS_TOKEN
		var headers = {
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				'Authorization': 'Zoho-oauthtoken '+client_access_token
		};

		var dataString = 'customer_email='+email+'&type=rs';

		var options = {
				url: 'https://assist.zoho.com/api/v2/session',
				method: 'POST',
				headers: headers,
				body: dataString
		};



		function callback(error, response, body) {
			console.log('sendZohoInvitation::response',response.body)
				if (!error && response.statusCode == 200) {
						 res.json(body);

				}else{
					console.log('not working >>>>>>>>>>>>>>',body)
						
						const refresh_token = process.env.ZOHO_REFRESH_TOKEN;
						const client_id = process.env.ZOHO_CLIENT_ID;
						const client_secret = process.env.ZOHO_CLIENT_SECRET

						var options = {
											method: 'POST',
											url: 'https://accounts.zoho.com/oauth/v2/token?refresh_token='+refresh_token+'&client_id='+client_id+'&client_secret='+client_secret+'&grant_type=refresh_token',             
										}
										
						console.log('options>>>>>>>>>>>',options)
						request(options,function (error, response) {

							if(error){
								console.log('error in refeshing token',error)
							}else{
								console.log('refeshing token response>>>>>>>>>',response.body)
								 var new_data = JSON.parse(response.body)
								 var new_token = new_data['access_token']
								 console.log('data>>>>>>>>>>..',new_data['access_token'])
									process.env['ZOHO_CLIENT_ACCESS_TOKEN'] = new_data['access_token']

									var headers = {
												'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
												'Authorization': 'Zoho-oauthtoken '+new_token
										};

										var dataString = 'customer_email='+email+'&type=rs';

										var options_two = {
												url: 'https://assist.zoho.com/api/v2/session',
												method: 'POST',
												headers: headers,
												body: dataString
										};               

										request(options_two, callback);
							}           
						
						});
				 }
		}

		request(options, callback);
		
		 } catch (err) {
		next(err);
	}
}



/** Function will return all the completed jobs **/
export async function getTotalJobs(req: Request, res: Response, next: NextFunction) {
	try {

		// console.log('JobController getTotalJobs>>>>>>>>>>>>')
		// console.log("req.params",req.body)
		const totalJobs = await Job.count({'customer':req.body.customer,'status':'Completed'})
		res.json(totalJobs);

	} catch (err) {
		next(err);
	}
}

/** Function will return all the inprogress jobs **/
export async function getTotalInprogressJobs(req: Request, res: Response, next: NextFunction) {
	try {
		
		const { id } = req.body;
		const count = await Job.count({ 'customer':id, status: 'Inprogress' });
		console.log(`Total in-progress jobs for customer ${id}: ${count}`);
		res.json(count);

	} catch (err) {
		next(err);
	}
}
/** Function will return all the inprogress jobs **/
export async function getLatestJobForCustomer(req: Request, res: Response, next: NextFunction) {
	try {
		
		console.log('Getting latest job', req.body);
		const jobs = await Job.find({
			customer: req.body.customer,
			status: { $in: ["Inprogress", "long-job","Scheduled","Accepted","Pending","Waiting"] }
		  });
		console.log(`Latest job for customer`, jobs);
		res.json(jobs);
	} catch (err) {
		next(err);
	}
}

/** Function will return all the completed jobs **/
export async function getPendingJobs(req: Request, res: Response, next: NextFunction) {
	try {

		console.log('JobController getPendingJobs>>>>>>>>>>>>')
		console.log("req.params getPendingJobs",req.body)
		// const totalJobs = await Job.count({'customer':req.body.customer,'status':'Completed'})
		const pendingJobs = await Job.count({customer:req.body.id,  $or: [ {"status": "Pending"},{"status": "Inprogress"},{"status": "Scheduled"},{"status": "long-job"},{"status":"Waiting"},{"status":"Accepted"} ]} )
		logger.info(` job count in getPendingJobs`, { customer:req.body.id, Jobcount: pendingJobs})
		res.json(pendingJobs);

	} catch (err) {
		logger.error(`Catch error for getPendingJobs`, { customer:req.body.id, Error:err })
		next(err);
	}
}

/** Function will return all the completed jobs of Technician **/
export async function getTotalJobsTechnician(req: Request, res: Response, next: NextFunction) {
	try {

		console.log('JobController getTotalJobs>>>>>>>>>>>>')
		console.log("req.params",req.body)
		const totalJobs = await Job.count({'technician':req.body.technician,'status':'Completed'})
		res.json(totalJobs);

	} catch (err) {
		next(err);
	}
}

/** Function will return all the completed jobs of Technician without authentication **/
export async function getTotalWithoutAuthenticateJobsTechnician(req: Request, res: Response, next: NextFunction) {
	try {
		const totalJobs = await Job.count({'technician':req.body.technician,'status':'Completed'})
		res.json(totalJobs);

	} catch (err) {
		next(err);
	}
}
/** Function will return all the completed and paid jobs **/
export async function getTotalPaidJobs(req: Request, res: Response, next: NextFunction) {
	try {
		console.log("req.params",req.body)
		const totalPaidJobs = await Job.count({'customer':req.body.customer,'meetingStarted': true})
		res.json(totalPaidJobs);

	} catch (err) {
		next(err);
	}
}

export async function generateTotalCost (req:Request,res:Response,next:NextFunction){
	const user = (req as any).user;

	try
	{	
		console.log('generateTotalCost?>>>>>>>>>')
		let data = req.body
		let jobId = data.jobId
		let customerId = data.customerId
		let job = await Job.findOne({"_id":jobId})
		console.log('job>>>>>>>>>',job)
		let firstJob = false;
		let ContinuedHisFirstMeeting = job.customerContiuedHisFirstMeeting
		let seconds = job.total_seconds
		let totalCost = 0;
		let softwareId = job.software
		let minutes = 0;
		let softwareObj = await Software.findOne({"_id":softwareId})
		let rateOfSoftware = softwareObj.rate
		let freeSessionCost = 0;
		let mainMinutes = 0;
		let new_and_discounted_cost = []
		let totalCountOfConfirmedJobs = await Job.count({"customer":customerId,"meetingStarted":true})
		const customer: ICustomer = await Customer.findById(customerId);

		console.log('totalCountOfConfirmedJobs>>>>>',totalCountOfConfirmedJobs)
		if(totalCountOfConfirmedJobs <= 1){
				firstJob = true
		}
		console.log('firstJob>>>>>>>>',firstJob)
		if(seconds){
				mainMinutes =  Math.ceil(seconds/60)
				minutes = Math.ceil(seconds/60)
				console.log("minutes :::::::: ",minutes)
				console.log("type of ",typeof(minutes))
				console.log("rateOfSoftware ::::::",rateOfSoftware)
				// let perSixMinTime = minutes/6
				let perSixMin = Math.ceil(minutes/6)
				// code update by karun and manibha 4 march 2022 for job id 3757
				// if(perSixMinTime > perSixMin ){
				// 	perSixMinTime =  perSixMin + 1 
				// }
				// console.log("perSixMinTime :::::::::::",perSixMinTime)
				// if(perSixMinTime <= 0){
				// 	totalCost = (perSixMinTime+1) * rateOfSoftware
				// }
				// else{
				// 	totalCost = perSixMinTime * rateOfSoftware
				// }
				totalCost = perSixMin * rateOfSoftware
		}
		if(firstJob){
				if(customer.stripe_id != null && customer.stripe_id != undefined && customer.stripe_id != ''){
					minutes = minutes - job.freeMinutes
					let perSixMinFreeSessionTime = Math.ceil(minutes/6)
					console.log("perSixMinFreeSessionTime :::::::::::",perSixMinFreeSessionTime)
					// code update by karun and manibha 4 march 2022 for job id 3757
					// if(perSixMinFreeSessionTime <= 0){
					// 	freeSessionCost = (perSixMinFreeSessionTime+1) * rateOfSoftware
					// }
					// else{
					// 	freeSessionCost = perSixMinFreeSessionTime * rateOfSoftware
					// }	

					freeSessionCost = perSixMinFreeSessionTime * rateOfSoftware

					if(job.freeMinutes > mainMinutes){
						freeSessionCost = 0
					}
					logger.info("generateTotalCost: After first job logic: ",
						{
							'body':req.body, 
							'userId':(user)?user.id:null,
							'jobId':jobId,
							'info':{
								"freeSessionCost":freeSessionCost,
								"perSixMinFreeSessionTime":perSixMinFreeSessionTime, 
								"rateOfSoftware":rateOfSoftware
							}
						}
					);
					
				}else{
					freeSessionCost = 0
         			logger.info("generateTotalCost: After first job logic else part:  ",
						{
							'body':req.body, 
							'userId':(user)?user.id:null,
							'jobId':jobId,
							'info':{
								"freeSessionCost":freeSessionCost,
								"rateOfSoftware":rateOfSoftware
							}
						}
					);
				}
				
		}


		console.log('totalCost>>>>>>>>>>>>>',totalCost)
		console.log('freeSessionCost>>>>>>',freeSessionCost)
		// discount calculated by manibha starts here
		// functionality of discounted cost is commented as currently we don't want to give any discount even when subscription minutes are
		// over : Jagroop
		// if(firstJob){
		// 	new_and_discounted_cost =  await check_for_discount_and_subscriptions(freeSessionCost,job.customer)
		// }else{
		// 	new_and_discounted_cost =  await check_for_discount_and_subscriptions(totalCost,job.customer)
		// }

		console.log('new_and_discounted_cost>>>>',new_and_discounted_cost)
		// discount calculated by manibha ends here

		let updateCost = await Job.updateOne({"_id":jobId},{"total_cost":totalCost,"free_session_total":freeSessionCost,'discounted_cost':new_and_discounted_cost[0],'discount_percent': new_and_discounted_cost[1],"discount":new_and_discounted_cost[2]})

		console.log("the loggers :::::::::::::::::::: ",{"success":true,"message":"Cost Calculated Successfully","total_cost":totalCost,"free_session_total":freeSessionCost,'updateCost':updateCost})
    	logger.info("generateTotalCost: Cost Calculated Successfully:  ",
						{
							'body':req.body, 
							'userId':(user)?user.id:null,
							'jobId':jobId,
							'info':{
								"seconds":seconds,"total_cost":totalCost,"free_session_total":freeSessionCost
							}
						}
					);
		res.json({"success":true,"message":"Cost Calculated Successfully","total_cost":totalCost,"free_session_total":freeSessionCost,'updateCostResponse':updateCost})

	}
	catch(err){
    	logger.error("generateTotalCost: Catch error in cost calculation:  ",
						{
							'body':req.body, 
							'userId':(user)?user.id:null,
							'jobId':req.body.jobId,
							'err':err.message,
						}
					);
		next(err);
	}
}

export async function updateTimer (req:Request,res:Response,next:NextFunction){
	const user = (req as any).user;
	try{
		let data = req.body
		let timing = data.sample
		let jobId = data.jobId
		// console.log("timing :::::",timing)
		let updateTime = await Job.updateOne({"_id":jobId},{"total_seconds":timing})
    	logger.info("updateTimer: Update total second of meeting:  ",
						{
							'body':req.body, 
							'userId':(user)?user.id:null,
							'jobId':jobId,
						}
					);
		return res.json({"success":true,"message":"sample Api working"})
	}
	catch(err){
		console.log('updateTimer error>>>>>>>',err)
		logger.error("updateTimer: Catch error: while Updateing total second of meeting:  ",
				{
					'body':req.body, 
					'userId':(user)?user.id:null,
					'jobId':req.body.jobId,
					'err':err
				}
			);
    }
}


export async function fetchTimer (req:Request,res:Response,next:NextFunction){
	const user = (req as any).user;
	try{
		let {jobId} = req.body.data
		console.log("jobId :::::::: ",jobId)
		let updateTime = await Job.findOne({"_id":jobId})
		let theMainTime = updateTime.total_seconds
		logger.info("fetchTimer: fetch total second of meeting:  ",
				{
					'body':req.body.data, 
					'userId':(user)?user.id:null,
					'jobId':jobId,
					'info':{"success":true,"sampleFetch":theMainTime}
				}
			);
		return res.json({"success":true,"sampleFetch":theMainTime})
	}
	catch(err){
		console.log('fetchTimer error>>>>>>>',err)
		logger.error("fetchTimer: Catch error: Catch error: while fetching total second of meeting:  ",
				{
					'body':req.body.data, 
					'userId':(user)?user.id:null,
					'jobId':req.body.data.id,
					'err':err
				}
			);

	}
}


export async function check_for_discount_and_subscriptions(Cost,CustomerId){
	try{
		let discounted_cost = 0
		let discount_percent = 0
		let discount = 0
		console.log('check_for_discount_and_subscriptions>>>>>>>>>>>>>')
		const customer: ICustomer = await Customer.findById(CustomerId);
		const user_dict = await User.findById(customer.user);
		let subscription_data = await get_subscription_data(customer,user_dict)
		// console.log('subscription_data>>>>>>',subscription_data)
		if(subscription_data.status == 'active' || subscription_data.status == 'paid'){
			if(subscription_data.time_used >= subscription_data.total_seconds){
				discount_percent = subscription_data.discount
				discount = (Cost*discount_percent)/100
				discounted_cost = Cost - discount
				// console.log('Cost>>>>>>',typeof(Cost),Cost,typeof(subscription_data.discount),subscription_data.discount,discounted_cost)
			}
		}
		return [discounted_cost,discount_percent,discount]
	}catch(err){
		console.log('check_for_discount_and_subscriptions error>>>>>>>',err)
		return [0,0,0]
	}
	
}



export async function get_subscription_data(customer,user_dict){
	try{
		let found = false

		if (customer.subscription != undefined && Object.keys(customer.subscription).length !== 0){
			console.log('customer itself has subscription>>>>>>>>>>>>>check_for_discount_and_subscriptions')
			found = true
			return customer.subscription
		}

		if(user_dict.roles.includes("user") || user_dict.roles.includes("admin")){
			let get_parent_id  = user_dict.ownerId ? user_dict.ownerId : user_dict.parentId
			let check_answer = await CustomerFunctions.check_if_parent_has_subscription(get_parent_id)

			// console.log('check_answer>>>>>>>>>>>',check_answer[0])
			if(check_answer[0]){
				found = true
				console.log('parent has subscription>>>>>>>>>>>>>>>>>>>>>>>>>>check_for_discount_and_subscriptions')
				return check_answer[1]
			}
		}

		if(user_dict.roles.includes('owner')){
			let got_admin = await CustomerFunctions.find_all_admins_from_owner(user_dict['id'])
			// console.log('1111111111111111111111',got_admin)
			console.log('admin hassssssss>>>>>>>>check_for_discount_and_subscriptions')
			if(got_admin[0]){
				found = true
				return got_admin[1]
			}
		}

		if(found == false){
			console.log('no subscription found>>>>>>>>>>check_for_discount_and_subscriptions')
			return false
		}
	}catch(err){
		console.log('get_subscription_data error>>>>>>>',err)
		return false
	}
	
}


export async function checkLastJobFeedback(req: Request, res: Response, next: NextFunction) {
	try {
		const lastJob = await  Job.findOne({'technician':req.body.technician,'status':'Completed','is_long_job':false}).sort({createdAt:-1});
		console.log('lastJob>>>>>>>>>>',lastJob.technician_charged_customer)
		if(!lastJob.adminReview && (lastJob.technician_charged_customer == undefined || lastJob.technician_charged_customer == '')){
			return res.json({
				'job_id':lastJob._id ,
				'success':true
			});
		}else{
			return res.json({
				'success':true
			});
		}
		
	} catch (err) {
		console.log('get_subscription_data error>>>>>>>',err)
		return res.json({
			'success':false
		});
	}
}


/**
 * Send long job submission message to customer
 * @params : req, res, next
 * @response : no response
 * @author : Manibha
 */
 export async function sendTextForJobSubmission(req: Request, res: Response, next: NextFunction) {
	const { customerNumber,jobId ,customerName,techName,softwareName} = req.body

	try {
		
		TextService.sendSmsToNumber(customerNumber,'Hi '+customerName+' , Technician - '+techName+' has submit your long job of '+softwareName+'. Please review your problem and approve or reject it accordingly.',jobId)
		
		res.json({})
	} catch (err) {
		logger.error(`Catch error while sendTextForJobSubmission`, { customerNumber: customerNumber, err: err,jobId:jobId })
		next(err)
	}
}

/**
 * Send long job submission email to customer
 * @params : req, res, next
 * @response : no response
 * @author : Kartik
 */
export async function sendEmailForJobSubmission(req: Request, res: Response, next: NextFunction) {
	const { email, firstName, lastName } = req.body

	try {
		MailService.technicianSubmitLongJob({ email: email, firstName: firstName, lastName: lastName })
		res.json({})
	} catch (err) {
		logger.error(`Catch error while sendEmailForJobSubmission`, err)
		next(err)
	}
}

/**
 * Send long job approval email to technician
 * @params : req, res, next
 * @response : no response
 * @author : Kartik
 */
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
export async function sendEmailForJobApproval(req: Request, res: Response, next: NextFunction) {

	const { email, firstName, lastName, date, JobId } = req.body
	const job = await Job.findOne({'JobId': JobId}).populate({ path: 'customer', populate: 'user' });
	let businessName = await getBusinessName(job.customer)
	
	console.log("update job sendEmailForJobApproval",job,email, firstName, lastName, date, JobId,businessName)

	try {
		MailService.customerApproveLongJob({ email: email, firstName: firstName, lastName: lastName, date: date, JobId: JobId,businessName: businessName})
		res.json({})
	} catch (err) {
		logger.error(`Catch error while sendEmailForJobApproval`, err)
		next(err)
	}
}

/**
 * Send long job rejection email to technician
 * @params : req, res, next
 * @response : no response
 * @author : Kartik
 */
export async function sendEmailForJobRejection(req: Request, res: Response, next: NextFunction) {
	const { email, firstName, date } = req.body

	try {
		MailService.customerRejectLongJob({ email: email, firstName: firstName, date: date })
		res.json({})
	} catch (err) {
		logger.error(`Catch error while sendEmailForJobRejection`, err)
		next(err)
	}
}

/**
* This function sends notification as sms to customer if technician declines scheduled call after accepting it.
* @response : no response
* @author : Manibha
*/
export async function sendSmsForScheduledDeclinedJob(req: Request, res: Response, next: NextFunction) {
	try {
		const jobData = await  Job.findOne({'_id':req.body.jobId});
		if(jobData.status === 'Scheduled' && jobData.technician !== undefined){
			const customerData = await  Customer.findOne({'_id':jobData.customer});
			const UserData = await  User.findOne({'_id':customerData.user});
			// sending text message to customer by manibha starts
			let correctedNumber = customerData.phoneNumber
			TextService.sendSmsToNumber(correctedNumber,'Hi '+UserData.firstName+'. Technician - '+req.body.technicianName+' has declined your scheduled job on Geeker.',jobData.id)
			// sending text message to customer by manibha ends
		}

		res.json({})

	} catch (err) {
		console.log('get_subscription_data error>>>>>>>',err)
		return res.json({
			'success':false
		});
	}
}

/**
* This function will check schedule job Availabity by primary and secondry time and update field scheduleDetails.
* @response : object with sucess and scheduleDetails(Type:Object)
* @author : Ridhima Dhir
*/
export async function checkScheduleJobAvailability(req: Request, res: Response, next: NextFunction) {
	const jobId = req.params.id;
	const user = (req as any).user;
	try{
		const job = await Job.findOne({'_id':jobId}).populate({path: 'customer', populate: 'user'}).populate('software');
		// console.log("_id :::: ", job.id);
		let now = new Date()
		let scheduleDetails= job.scheduleDetails
		
		// First check job not expired
		if(new Date(job.scheduleDetails['scheduleExpiredAt']) <= now){
			if(!job.technician && !job.schedule_accepted_by_technician){
			 scheduleDetails['scheduleExpired'] = true;
			 scheduleDetails['primaryTimeAvailable'] = false;
			}
		}
		logger.info("checkSchedule Job Availability before: ",{'scheduleDetails':job.scheduleDetails, 'jobId':jobId, 'userId':user.id});
		//Is primary time grater then scheduleExpiredMinutes 
		scheduleDetails = await checkPrimaryTimeAvailability(job, scheduleDetails)
	
		//Is secondary time grater then scheduleExpiredMinutes
		// scheduleDetails = await checkSecondaryTimeAvailability(job, scheduleDetails)
		// console.log("scheduleDetails ::", scheduleDetails);
		let ifExpired = job.status;
		if(!scheduleDetails['primaryTimeAvailable'] && !job.technician && !job.schedule_accepted_by_technician){
			ifExpired="ScheduledExpired";	
		}
		await Job.updateOne({ "_id": jobId },{'scheduleDetails':scheduleDetails,status:ifExpired})
		logger.info("checkSchedule Job Availability after: ",{'scheduleDetails':scheduleDetails, 'jobId':jobId, 'userId':user.id});
		// console.log("scheduleDetails ::", scheduleDetails, job.customer['user']['firstName'], job.software['name']);
		return res.json({
			'scheduleDetails':scheduleDetails,
			'success':true
		});

	}catch(err){
		logger.error(`Catch error while checkScheduleJobAvailability`, { jobId: jobId, err: err.essage, 'userId':user.id})
		next(err)
	}
	
}

/**
* Check primary time with given mintus, primary time is not expired have no value && job is not expired.
* @response : scheduleDetails(Type:Object)
* @author : Ridhima Dhir
*/
async function checkPrimaryTimeAvailability(job, scheduleDetails){
	const now = new Date()
	// Check primary time with given mintus, primary time is not expired have no value && job is not expired.
	let primaryMin = getMinutesBetweenDates(now, new Date(job.primarySchedule))
	if(primaryMin <= scheduleExpiredMinutes && !scheduleDetails['primaryTimeExpiredAt'] && !scheduleDetails['scheduleExpired']){
		if(!job.technician && !job.schedule_accepted_by_technician){
			scheduleDetails['primaryTimeAvailable'] = false
			scheduleDetails['scheduleExpired'] = true
			scheduleDetails['primaryTimeExpiredAt'] = now
			const programName = await getProgrameName(job)
			// await scheduleLookingForTechnician({
			// 	email:job.customer['user']['email'],
			// 	firstName:job.customer['user']['firstName'],
			// 	programName:programName
			// })
			await myModule.io.emit("send-schedule-alerts",{
				jobId: job.id,
				customerTimezone: job.customer['user']['timezone'],
				jobObj: job,
				primaryTime:job.primarySchedule,
				secondryTime:job.secondrySchedule,
				phoneNumber:job.customer['phoneNumber'],
				customerEmail:job.customer['user']['email'],
				customerName:job.customer['user']['firstName'],
			})
		}
	}
	console.log(new Date(job.primarySchedule), "primaryMin :::: ", primaryMin, scheduleDetails);
	logger.info("primary time availability: ",{
				'primaryMin':primaryMin,
				'scheduleDetails':job.scheduleDetails, 
				'jobId':job.id,
		});
	return scheduleDetails;
}


/**
* This function will return total number of pending jobs of the customer
* @response : object
* @author : Nafees
*/
export async function getLatestPendingJobs(req: Request, res: Response, next: NextFunction) {
	try {

		console.log('JobController getPendingJobs :::')
		console.log("req.params",req.body)
		const totalPendingJobs = await Job.count({
			'customer': req.body.customer,
			'status': {
				$in: ['Pending', 'Scheduled']
			}
		})
		logger.info(`get totalnumber of pending jobs`, { 'totalPendingJobs': totalPendingJobs})

		let lastPendingJob = {}
		if (totalPendingJobs > 0) {
			 lastPendingJob = await Job.findOne({
				'customer': req.body.customer,
				'status': { $in: ['Pending', 'Scheduled'] }
			}).sort({ createdAt: -1 })
			  .populate({
				  path: 'software',
				  populate: 'software'
			  });
			
		}
		logger.info(`get the details of  lastPendingJob`, { 'lastPendingJob': lastPendingJob})
		return res.json({
			'total_pending_jobs':totalPendingJobs,
			'last_pending_job':lastPendingJob
		});

	} catch (err) {
		logger.error(`Catch error while getLatestPendingJobs`, { 'body': req.body, err: err.message})
		next(err);
	}
}
/**
* Check secondary time with given mintus, secondry time is not expired have no value and job is not expired
* @response : scheduleDetails(Type:Object)
* @author : Ridhima Dhir
*/
// function checkSecondaryTimeAvailability(job, scheduleDetails){
// 	const now = new Date()
// 	// Check secondary time with given mintus, secondry time is not expired have no value and job is not expired
// 	let secondryMin = getMinutesBetweenDates(now, new Date(job.secondrySchedule))
// 	if(secondryMin <= scheduleExpiredMinutes && !scheduleDetails['secondaryTimeExpiredAt'] && !scheduleDetails['scheduleExpired']){
// 		scheduleDetails['secondaryTimeAvailable'] = false
// 		scheduleDetails['secondaryTimeExpiredAt'] = now
// 		scheduleDetails['scheduleExpired'] = (!job.technician && !job.schedule_accepted_by_technician)?true:false;
// 	}
// 	console.log(new Date(job.primarySchedule), "secondryMin :::: ", secondryMin, scheduleDetails);
// 	logger.info("Secondry time availability: ",{
// 				'secondryMin':secondryMin,
// 				'scheduleDetails':job.scheduleDetails, 
// 				'jobId':job.id,
// 		});
// 	return scheduleDetails
// }

/**
* This function will return time in minutes
* @response : object
* @author : Ridhima Dhir
*/
function getMinutesBetweenDates(startDate, endDate) {
	try{
		var diff = endDate.getTime() - startDate.getTime();
		logger.info(`get minutes from two dates`, { 'startDate': startDate, 'endDate': endDate, 'diff':diff, 'mintus':(diff / 60000)})
		return (diff / 60000);
	}catch(err){
		logger.error(`getMinutesBetweenDates`, { 'startDate': startDate, 'endDate': endDate})
	}
}


/**
* This function cancel schedule job by customer or technician
* @response : success true
* @author : Ridhima Dhir
*/
export async function scheduleJobCalcellation(req: Request, res: Response, next: NextFunction) {
	try{
		const jobData = await Job.findOne({'_id':req.params.id});
		const calcellationReason = req.body.reason;
		const calcellationBy = req.body.calcellationBy;
		if(calcellationBy == "Customer"){
			jobData.custCancellation['reason'] = calcellationReason
			jobData.custCancellation['cancellationDate'] = new Date()
		}
		if(calcellationBy == "Technician"){
			let techCancellations = []
			techCancellations = jobData.techCancellation; 
			let techCancellation = {
				'technician':req.body.user.technician.id,
				'reason':calcellationReason,
				'cancellationDate':new Date()
			}
			techCancellations.push(techCancellation)
			jobData.techCancellation = techCancellations
		}
		jobData.save()
		return res.json({'success':true});

	}catch(err){
		logger.error(`Catch error while scheduleJobCalcellation`, { jobId: req.params.id, err: err})
		next(err)
	}
	
}
