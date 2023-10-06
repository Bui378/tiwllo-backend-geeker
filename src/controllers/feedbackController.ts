import { Request, Response, NextFunction } from 'express';
import Feedback, { IFeedback } from '../models/Feedback';
import InvalidRequestError from '../errors/InvalidRequestError';
import {findJobById} from '../services/JobService';
import {FetchSoftwareByParams} from '../services/SettingService';
import moment from 'moment';
import EarningDetails, { IEarningDetails } from '../models/EarningDetails';
import Job, { IJob } from '../models/Job';
import User, { IUser } from '../models/User';
import Technician, { ITechnician } from '../models/Technician';
import Customer, { ICustomer } from '../models/Customer';
import { sendIssueNotSolvedEmail } from "../services/MailService";
import BillingDetails,{IBillingDetails} from '../models/BillingDetails';
import PayCycle from "../models/PayCycle";

let logger = require('../../winston_logger');
logger = logger("FeedbackController.ts");

export async function create(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {
		console.log('FeedbackController create>>>>>>>>>>>>',req.body)

		const feed = new Feedback(req.body);
		await feed.save();
		logger.info("create : feedback successfully created : ",
			{
				'body':req.body,
				'userId':(user)?user.id:null
			}
		);

		if(req.body.userType == 'customer' && req.body.is_solved == false ){
			sendIssueNotSolvedEmail(req.body)
		}	

		res.status(201).json();
	} catch (err) {
		logger.info("create : Catch error : while saving feedback ",
			{
				'body':req.body,
				'userId':(user)?user.id:null,
				'err':err
			}
		);
		next(err);
	}
}


export async function fetchByJobId(req: Request, res: Response, next: NextFunction) {
	try {
		console.log('FeedbackController fetchByJobId>>>>>>>>>>>>',req.body);

	const {jobId}: { jobId: string } = req.params as any;
	const feedData = Feedback.find({job:jobId});

	const feeds: IFeedback[] = await feedData
		.populate('user').populate({path:"to",model:"User"}).exec()

	if (!feeds) {
		throw new InvalidRequestError('Feedback does not exist.');
	}

	res.json(feeds);
	} catch (err) {
	next(err);
	}
}

export async function checkIfFeedbackAlreadyGiven(req:Request,res:Response,next:NextFunction){
	let {userId,jobId} = req.body
	try{
		let feedBack = await Feedback.find({"user":userId,"job":jobId})
		if (feedBack.length > 0){
			res.json({"success":true,"haveFeedback":true, "feedBack": feedBack})
		}
		else{
			res.json({"success":true,"haveFeedback":false})
		}
	}
	catch(err){
		logger.info("create : feedback successfully created : ",
			{
				'body':req.body,
				'userId':userId,
				'jobId':jobId,
				'error':err,
			}
		);
		res.json({"success":false,"haveFeedback":false})
	}
}

export async function earningsDetails(req:Request,res:Response,next:NextFunction)
{

	console.log('FeedbackController earningsDetails>>>>>>>>>>>>')
	const user = (req as any).user;

	let response = {};
	response['total_time'] = 0
	response['total_time_seconds'] = 0
	response['totalEarnings'] = 0
	response['jobs_data'] = []
	response['monthEarnings'] = 0
	response['monthlyHours'] = 0
	response['monthlySeconds'] = 0
	response['overAllRatings'] = 0
	try
	{
		const data = req.body;
		// console.log(">>>>>>>>>>>Data>>>>>>>>>>>>>>>>>>>>data >>>>>>>>>>>>>>>>>>",data)
		let ratings = []
		if('user' in data){
			// console.log(data,"i am the data")
			let newData = {'to':data['user']}
			// console.log(newData)
			ratings = await Feedback.find(newData, {rating:1, _id:0})
		}
		else{
			 ratings = await Feedback.find(data, {rating:1, _id:0})
		}
		// console.log("ratings::",ratings)
		let totalEarnings = 0
		let total_time = 0
		let total_time_seconds = 0
		let jobs_data = []
		let monthEarnings = 0
		let monthlyHours = 0
		let monthlySeconds = 0
		let userInfo = {}
		let userParam = {}
		if('user' in data){
			userParam['_id'] = data['user']
		}else{
			userParam['_id'] = data['to']
		}
		const userData: IUser = await User.findById(userParam);

		// console.log("userData>>>",userData)
		if(userData){


			if(userData['userType'] == 'technician'){
				let techData = await Technician.find({user:userData['_id']});
				userInfo = (techData.length > 0 ? techData[0] : {})
			}
			if(userData['userType'] == 'customer'){
				let custData = await Customer.find({user:userData['_id']});
				userInfo = (custData.length > 0 ? custData[0] : {})
			}

			if(userInfo){

				let queryParam = {}
				queryParam['status'] = 'Completed';

				if(userData['userType'] == 'technician'){
					queryParam['technician'] = userInfo['_id'];
				}
				if(userData['userType'] == 'customer'){
					queryParam['customer'] = userInfo['_id'];
				}
				// queryParam['status'] == "completed"


				const query = Job.find(queryParam);

				if(userData['userType'] == 'technician'){
					// console.log('data[user]>>>>>',userData['_id'])
					const latestPayout = await PayCycle.findOne({}).sort({ To: -1 });
					// console.log("latest payload: ", latestPayout,latestPayout.From,latestPayout.To);
					const fromPayout = latestPayout.From.toISOString().substring(0, 10);
					const toPayout = latestPayout.To.toISOString().substring(0, 10);
					// console.log("earning from to from",fromPayout,toPayout);
					const earn_data = await EarningDetails.aggregate([{$match : {"technician_user_id" : userData['_id']}},{$group: { '_id':null, totalValue: {$sum: "$amount_earned"}}}])

					if(earn_data.length > 0 ){
							totalEarnings = earn_data[0]['totalValue']
					}
					
					// var firstDay = moment(fromPayout).startOf('month').format("YYYY-MM-DD")
					// var lastDay = moment(toPayout).endOf("month").format("YYYY-MM-DD")
					var firstTime = fromPayout +"T00:00:00.000Z"
					var lastTime = toPayout +"T23:59:59.000Z"
					
					const earn_monthly_data = await EarningDetails.aggregate([{$match : {"technician_user_id" : userData['_id'],"createdAt": {"$gte":new Date(firstTime), "$lt":new Date(lastTime)}}},{$group: { '_id':null, totalValue: {$sum: "$amount_earned"}}}])
					if(earn_monthly_data.length > 0 ){
							monthEarnings = earn_monthly_data[0]['totalValue']
					}

				}
				
				if(userData['userType'] == 'customer'){
					const earn_data = await BillingDetails.aggregate([{$match : {"customer_user_id" : userData['_id']}},{$group: { '_id':null, totalValue: { $sum: {
						$cond: 
							{ if: { $gte: [ "$is_stripe_called", true] }, then: '$total_amount', else: 0 }
					}}}}])
					if(earn_data.length > 0 ){
							console.log('earn_data>>>>>>customer',earn_data)

						totalEarnings = earn_data[0]['totalValue']
					}
				}

				let jobs: IJob[] = await query
					.populate('software')
					.populate({
					 path : 'subSoftware',
					 populate:'software'
					})
					.exec();
				// console.log("Total jobs",jobs.length)
				if(jobs.length > 0){
					let c = 0;
					for(const k in jobs){
						// let jobData = {}			
						let result = jobs[k]

						const hms = result.total_time
						if(hms != undefined && (result['createdAt'] > new Date(firstTime) && result['createdAt'] < new Date(lastTime))){
							const [hours, minutes, seconds] = hms.split(':');
							const totalSeconds = (+hours) * 60 * 60 + (+minutes) * 60 + (+seconds);
							if(isNaN(totalSeconds) ==  false){
								monthlySeconds = monthlySeconds + totalSeconds
							}
							let hr = totalSeconds/3600
							if(isNaN(hr) == false){
								monthlyHours = monthlyHours +  hr
							}
						}
						else{
							monthlyHours = monthlyHours + 0
						}
					
						
						// jobData['technician'] = "";
						// jobData['customer'] = "";
						// if(result['technician'] != undefined && result['technician']['user'] != undefined){
						// 	jobData['technician'] = result['technician']['user']['firstName']+' '+result['technician']['user']['lastName'];
						// }
						// if(result['customer'] != undefined && result['customer']['user'] != undefined){
						// 	jobData['customer'] = result['customer']['user']['firstName']+' '+result['customer']['user']['lastName'];
						// }
						// jobData['date'] = new Date(result.meeting_start_time)
						// jobData['Amount'] = (result.total_cost ? result.total_cost.toFixed(2) : 0) 
						// jobData['trans_type'] = "Credit"
						// jobData['Status'] = "Processing...."
						// console.log("reaching")
						// jobs_data.push(jobData)
						// const hms = result.total_time
						if(hms != undefined){
							// console.log('hms ::',hms)
							const [hours, minutes, seconds] = hms.split(':');
							const totalSeconds = (+hours) * 60 * 60 + (+minutes) * 60 + (+seconds);
							if(isNaN(totalSeconds) ==  false){
								total_time_seconds = total_time_seconds + totalSeconds;
							}
							// console.log('total_time_seconds',total_time_seconds)
							let hr = totalSeconds/3600
							if(isNaN(hr) == false){
								total_time = total_time + hr
								// jobData['time'] = hr
							}
							// else{
							// 	jobData['time'] = 0
							// }
							
							

						}
						// else{
						// 	 jobData['time'] = 0
						// }
						c = c+1
						if(c >= jobs.length){
							if(Number.isNaN(totalEarnings)){
								totalEarnings = 0
							}
							if(Number.isNaN(total_time)){
								total_time = 0
							}
							if(Number.isNaN(monthEarnings)){
								monthEarnings = 0
							}
							if(Number.isNaN(monthlyHours)){
								monthlyHours = 0
							}
	
	
							// console.log(total_time,">>>total_time>>>>")
							response['total_time'] = total_time.toFixed(5)
							response['total_time_seconds'] = total_time_seconds.toFixed(2)
							response['totalEarnings'] = totalEarnings.toFixed(2)
							// response['jobs_data'] = jobs_data
							response['monthEarnings'] = monthEarnings.toFixed(2)
							response['monthlyHours'] = monthlyHours.toFixed(5)
							response['monthlySeconds'] = monthlySeconds.toFixed(2)
							response['overAllRatings'] = computeRatings(ratings)
							let logRes = response;
							// delete logRes['jobs_data'];
							logger.info("earningsDetails : Fetching Tech detals like, jobs , earning etc: ",
								{
									'body':{'total_jobs':jobs.length},
									'userId':(user)?user.id:null,
									'info':logRes
								}
							);
							return res.json(response);
						}
					}
					
				}

				else{
					logger.info("earningsDetails : If no job found: ",
							{
								'body':req.body,
								'userId':(user)?user.id:null,
								'info':response
							}
						);
					return res.json(response);  
				}
			}else{
				logger.info("earningsDetails : Earnings Details: User info not found: ",
							{
								'body':req.body,
								'userId':(user)?user.id:null,
								'info':response
							}
						);
				return res.json(response);
			}
		}else{
			logger.info("earningsDetails : Earnings Details: User Data not found: ",
							{
								'body':req.body,
								'userId':(user)?user.id:null,
								'info':response
							}
						);
			return res.json(response);
		}
	}
	
		catch(err){
		logger.error("earningsDetails : Catch error while calculation total earning: ",
				{
					'body':req.body,
					'userId':(user)?user.id:null,
					'err':err
				}
			);
	}
}

export async function subscribeEmail(req: Request, res: Response, next: NextFunction) {
	try {

	 console.log('FeedbackController subscribeEmail>>>>>>>>>>>>')

	console.log("req.body",req.body)
	/*const {jobId}: { jobId: string } = req.params as any;
	const feedData = Feedback.find({job:jobId});


	const feeds: IFeedback[] = await feedData
		.populate('user').populate({path:"to",model:"User"}).exec()


	if (!feeds) {
		throw new InvalidRequestError('Feedback does not exist.');
	}*/
	let feeds = {}
	res.json(feeds);
	} catch (err) {
	next(err);
	}
}

export async function update(req: Request, res: Response, next: NextFunction) {

	try {
	 console.log('FeedbackController update>>>>>>>>>>>>')	
	const {id}: { id: string } = req.params as any;

	const feedBack: IFeedback = await Feedback.findById(id);

	if (!feedBack) {
		throw new InvalidRequestError('Feedback does not exist.');
	}

	feedBack.set(req.body);

	await feedBack.save();

	res.json(feedBack);
	} catch (err) {
	next(err);
	}
}


export function computeRatings(feedBacks){
	let avgSum = 0
	let overAllRatings = 0
	const ratings = feedBacks
	const rateFilter = {}

	for(const j in ratings){
		if(ratings[j].rating !== undefined && ratings[j].rating !== '' && ratings[j].rating !== 0){
		if(!rateFilter[ratings[j].rating.toString()]){
			rateFilter[ratings[j].rating.toString()] = 1
		}
		else{
			rateFilter[ratings[j].rating.toString()] = rateFilter[ratings[j].rating.toString()] +1
		}
		}
		
	}
 

	let totalSum = 0;
	for(var g in rateFilter){

		avgSum += parseInt(g)*rateFilter[g.toString()]
		totalSum += rateFilter[g.toString()]
	}

	overAllRatings = avgSum/totalSum;

	if(Number.isNaN(overAllRatings)){
		overAllRatings = 0
	}

	return overAllRatings.toFixed(2)
}
