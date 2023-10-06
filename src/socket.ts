import * as JobService from "./services/JobService";
import * as CallService from "./services/CallService";
import * as TextService from "./services/TextService";
import * as Services from './services/SettingService'
import { config } from "./config/env.config";
import {filteredTags} from './services/DynamicEmailService';
import { sendSearchEmail,scheduleJobAlertTechnician,acceptJobEmail,dynamicEmail,sendScheduleAlertToCustomer,sendScheduleEmail,
	customerNotJoinedEmail,scheduleJobAcceptTechnician,customerDeclinedJobEmail, scheduleCancelJobAlertTechnician, 
	scheduleCancelByTechJobAlertCustomer, adminReviewJob, adminReviewJobCustomerAlert, adminReviewRefundCustomerAlert,
	adminReviewDontChargeCustomerAlert, dontChargeWithoutReview, updatedScheduleJobAcceptedTechnician, 
	scheduleJobUpdatedByTechnicianToCustomer, mobileTabletJobPostEmail, sendJobAlertEmail, additionalHourLongJobEmailCustomer, 
	sendUserReviewEmailAdmin,sendJobAlertEmailToExpert,customerApproveAdditionalHours,customerRejectAdditionalHours,
	sendJobAlertEmailForSameTech, sendEmailToManagementTeamMember, sendEmailToaAdminForBusinessInfo, sendEmailToaAdminForLeavingUser,sendJobAlertEmailToAllTech,sendEmailToStakeholderTechDeclinedSchJob,stakeHolderMailTechnicianChargeNo } from "./services/MailService";
import Job from './models/Job';
import { scheduleChecker,scheduleThirty,findInActiveUsers,DeleteInActiveUsers,ReChangeTheStatus,
	meetingEndSocketHit,checkSubscriptionPaymentStatus,deleteTestUsersFromKlaviyo, customerJobAlert, 
	sendScheduleWebNotificationsToTechs, sendScheduleEmailToTechs, sendScheduleSmsToTechs, sendCancelMailToCustomer, 
	getProgrameName } from "./services/Schedule";
import Cookie from 'js-cookie';
import Notifications, { INotfication ,notificationSchema } from './models/Notifications';
import mongoose, { Document, Model, Schema } from 'mongoose';
import Technician from './models/Technician';
import ActiveUser from './models/Activeusers';
import UserLifeCycle from './models/UserLifeCycle';
import User, { IUser } from './models/User';
import Experience from './models/Experience';
import Feedback from './models/Feedback';
import * as billingDetailsService from "./services/BillingDetailsService";
import * as earningDetailsService from "./services/EarningDetailsService";
import moment from 'moment';
import Log from './models/Log';
import {computeRatings} from "./controllers/feedbackController";
import {refundOrDefuctMoneyFromHoldedArray, takeChargeFromCustomerFromSocket} from "./controllers/CustomerController";
import {retrieve} from "./controllers/JobController";
import Software, { ISoftware } from './models/Software';
// import {transferPayoutToTechnicians} from './controllers/StripeAccountControlller'
import jobRouter from "./routes/jobRouter";
import {jobTags, management_team_technicians_emails, JOB_STATUS, secondsToWaitBeforeRunningTechSearchAgain, numberOfTimesToRunTechSearchLoop, TECHNICIAN_REGISTRATION_STATUS, ALERT_TYPE, blastAwaitTime, JOB_TYPE} from './constant';
import axios from "axios";
import * as JobTagService from "./services/JobTagService";
import Customer, { ICustomer } from './models/Customer';
import EarningDetails from "./models/EarningDetails";
import BillingDetails from "./models/BillingDetails"
import { getCountryCodeCommissions} from "./services/SettingService";
import {cutCommissionCharges} from "./controllers/CustomerController"
import {jobCancelByCustomer, sendEmailToManagementTeamForJobCancelledByCustomer} from '../src/services/MailService';
import { postGTMTag, moveArrElementWitinArr, postGTMTagForAnEvent, postGTMTagForTechOnboard } from './utils'
import JobNotificationHistory  from './models/JobNotificationHistory';
import Stakeholder  from './models/Stakeholders';
import TwilioChat from "./models/TwilioChat";

let scheduleTime = 0
let logger = require('../winston_logger');
logger = logger("socket.ts");
var nr = require('newrelic')
export default function socketServer() {
	let recursionIndex = 1
	let runTechSearchCounter = {}
	let alreadyNotifiedTechs = {}
	let declinedTechs = {}
	var count = 0;
	var loggedInUsers = []
	var $ipsConnected = [];
	// let usrArr = {}
	let alreadyGetNotify = {}
	let liveUsers = []
	let decline_arr = []
	let email_verified = {}
	let MONGO_URI = `mongodb://${process.env.MONGO_HOSTNAME}/${process.env.MONGO_DB}`;
	var myModule = require('./app');
	let sentEmails = []

	/**
	* It's the major function to look for technician(s) for the given job
	* @params : data(Type:Object)
	* @response : null
	* @author : Vinit
	**/

	const startSearchingForTech = async (data) => {
		
		//Declaring few variables and, making necessary changes to data when needed from line no. 77 to 96
		logger.info("data received by socket search-for-tech", {data})
		runTechSearchCounter[data.jobData.id] = 0
		await JobService.updateJob(data.jobData.id, { tech_search_update_min:new Date()});
		//To prevent emptying the the already notified techs key-value pair
		if(!alreadyNotifiedTechs[data.jobData.id]){
			alreadyNotifiedTechs[data.jobData.id] = []

			// Fetching all the techs which are notified already.
			const alreadyNotified = await JobNotificationHistory.find({job:data.jobData.id},{_id:0, technician:1})
			if(alreadyNotified.length > 0){
				alreadyNotified.forEach((element)=>{
					alreadyNotifiedTechs[data.jobData.id].push(element.technician)
				})
			}
		}
		
		//To prevent emptying the the already declined techs key-value pair
		if(!declinedTechs[data.jobData.id]){
			declinedTechs[data.jobData.id] = data.jobData.tech_declined_ids ? data.jobData.tech_declined_ids : []
		}
		
		//Checking if job is Scheduled job or in desired format
		if(data.jobData.status === JOB_STATUS.SCHEDULED || 
			typeof data.jobData.software === "string" ||
			typeof data.jobData.customer === "string"
			){
			//Getting data in the desired format for schedule job / id needed
			data = await formatData(data)
			logger.info("data formatted for schedule job / desired data", {data})
		}
		
		try {
			//Posting GA4 tag - marketing needs
			postGTMTag(data.jobData, "jobPosted")
			
			//Updating job object that GA4 tag is sent and job posted time
			await JobService.updateJob(data.jobData.id, {GA4_job_posted_tag_sent : true, job_posted_at:new Date()});
		} catch (error) {
			logger.error("startSearchingForTech -> postGTMTag : err", {error:error, jobId: data.jobData.id})
		}

		try {
			//Sending an email to all Geeker stakeholders whenever a job is posted
			informStakeholders( data.jobData)
		} catch (error) {
			logger.error("startSearchingForTech -> informStakeholders : err", {error:error, jobId: data.jobData.id})
		}
		
		try {
			//Search for best eligible tech for the given job. 
			searchTechAndSendNotification(data)
		} catch (error) {
			logger.error("startSearchingForTech -> searchTechAndSendNotification : err", {error:error, jobId: data.jobData.id})
		}
	}

	/**
	* this function is to rearrange the data in the desired format
	* @params : data(Type:Object)
	* @response : data(Type:Object)
	* @author : Vinit
	**/	
	const formatData = async (data) => {
		try {	
			logger.info("jobData object in data recieved from schedule job ",{data})
			const job = await Job.findOne({_id:data.jobData.id}).populate("software").populate({
				path : 'customer',
				populate : {
					path : 'user'
				}
			})
			data.jobData = job
			logger.info("formatted data",{data})
			return data
		} catch (error) {
			logger.error("formatData : err ", {error:error, jobId:data.jobData.id})
		}
	}

 	/**
	 * this function send email alerts to all the members of management team
	 * @params : job : Object
	 * @response : {void}
	 * @author : Vinit
	 **/	
	const informStakeholders = async (job) => {
		try {
			logger.info('Step-2 informStakeholders', {jobId:job.id, jobType:job.customer.customerType})
			
			//sending emails to stakeholders only for live jobs
			if(job.customer.customerType === JOB_TYPE.LIVE){
				let jobType = "Regular"
				if(job.status === JOB_STATUS.SCHEDULED){
					logger.info("informStakeholders, It's a Schedule job",{jobId:job.id})
					jobType = job.status
				}

				//Fetching emails of all the stakeholders
				const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
				//Sending SMS & Email alert to Geeker statkeholders.
				logger.info("informStakeholders Preparing to send SMS and Email to stake holders ",{stakeholderData:stakeholderData} )
				Promise.all(
					stakeholderData.map((stakeholder)=>{
						try {
							if(stakeholder.job_flow === "active"){
								logger.info("informStakeholders about to send email to", {email:stakeholder.email, "job_id":job.id})
								//alert on email
								if ((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')) {
									sendEmailToManagementTeamMember(stakeholder, jobType, job)
								}
								//alert on phone number
								logger.info("informStakeholders About to send SMS to", {phone_number:stakeholder.phone, "job_id":job.id})
								
								let message = "Hi Stakeholder " + stakeholder.name + ", A new " + (jobType === JOB_STATUS.SCHEDULED ? "Schedule" : "Regular") + " job (" + job.JobId + ") of " + job.software.name + " is posted by " + job.customer.user.firstName + " "+ job.customer.user.lastName + "."
								  if((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')){
									TextService.sendSmsToNumber(
										stakeholder.phone,
										message,
										job.id
									)
								}

							}else{
								logger.info("Not to informStakeholders about to send email to", {email:stakeholder.email, "job_id":job.id})
							}
						} catch (error) {
							logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping ", {error:error, stakeholder:stakeholder, jobId:job.id})
						}
					})
				)	
			}
		} catch (error) {
			logger.error("informStakeholders Error occured : ", {error:error, jobId:job.id})
		}
	}

	/**
	* this function is called when socket search-for-tech is hit to find eligible techs
	* @params : data: Object
	* @response : null
	* @author : Vinit
	**/	
	const searchTechAndSendNotification = async (data) => {
		try {
			runTechSearchCounter[data.jobData.id] = runTechSearchCounter[data.jobData.id] + 1
			logger.info("searchTechAndSendNotification() called with data for " + runTechSearchCounter[data.jobData.id] + " time(s)",{data})

			//Checking job type and acting accordingly.
			if(data.jobData.status === JOB_STATUS.PENDING || data.jobData.status === JOB_STATUS.WAITING){
				processForASAPJob(data)
			}else if(data.jobData.status === JOB_STATUS.SCHEDULED){
				processForScheduleJob(data)
			}
		} catch (error) {
			logger.error("Some error occured in searchTechAndSendNotification", {error:error, jobId:data.jobData.id})
		}
	}

	/**
	* Following function is to search for techs and send notifications to techs regarding ASAP job
	* @params : data: Object, allEligibleTechncians: Object
	* @response : null
	* @author : Vinit
	**/

	const processForASAPJob = async (data) => {
		try {	
			//ASAP job posted with same tech
			if(data.searchSameTech){

				logger.info("Step-3.1 processForASAPJob : start searching for same Tech", {"job_id":data.jobData.id, "tech_user_id": data.technicianId})
				
				let technicianObj = {}

				//Fetching same tech object from db
				technicianObj = await findSameTech(data.technicianId)

				try {
					if(technicianObj && technicianObj['id']){
						
						//Checking if tech blocked by admin or not
						if(!technicianObj['user'].blocked){
							alreadyNotifiedTechs[data.jobData.id].push(technicianObj['id'])

							//Sending notifications to same tech
							sendNotificationToTech(data, technicianObj)
							io.emit("refresh-notifications", {type:"new_job_notification", techId:technicianObj['id']})
						}else{
							logger.info("Tech with tech_id " + technicianObj['id']+ " is blocked for job with same tech with job id"+ data.jobData.id, {data:data})
						}
					}else{
						logger.info("processForASAPJob : technicianObj not found", {"job_id":data.jobData.id, techId:data.technicianId})	
					}
				} catch (error) {
					logger.error("processForASAPJob -> if -> sendNotificationToTech : err occured ", {error:error, jobId: data.jobData.id})
				}
			}
			//Regular ASAP job posted
			else{
				logger.info("Step-3.2 processForASAPJob : start searching for eligible tech ", {"job_id":data.jobData.id})

				let bestEligibleTechnicians = []
				let sendNotificationToSingleTech = false

				try {
					//Looking for best eligible technician for job
					bestEligibleTechnicians = await findBestTech(data)
					logger.info(bestEligibleTechnicians.length + " eligible techs found for " + data.jobData.id + " at " + runTechSearchCounter[data.jobData.id] + " time")
				} catch (error) {
					logger.error("processForASAPJob -> else -> findBestTech : err ", {error:error, jobId:data.jobData.id})
				}
					
				//When customer chooses to keep searching for tech.
				if(data.keepSearching){
					if(bestEligibleTechnicians.length > 0){
						logger.info("Blast notifications to all techs after keep searching", {jobId:data.jobData.id, keepSearching:data.keepSearching})
						// Blast notifications to all techs in the array
						blastNotificationsToAllTechs(data, bestEligibleTechnicians)
						delete alreadyNotifiedTechs[data.jobData.id]
						delete declinedTechs[data.jobData.id]
					}
				}else{
					try {
						//Check if job posted less than 3 minutes ago
						sendNotificationToSingleTech = await jobPostedTimeCheck(data.jobData)
						logger.info("Job posted recently",{sendNotificationToSingleTech:sendNotificationToSingleTech, jobId:data.jobData.id})
					} catch (error) {
						logger.error("processForASAPJob -> else -> jobPostedTimeCheck : err ", {error:error, jobId:data.jobData.id})
					}

					try {
						if(sendNotificationToSingleTech && 
						   runTechSearchCounter[data.jobData.id] < numberOfTimesToRunTechSearchLoop){
							
							// Send notification to the tech at index 0
							if(bestEligibleTechnicians.length > 0){
								logger.info("Calling sendNotificationToTech() for a single tech regarding job",{
									"tech":bestEligibleTechnicians[0].id,
									"techEmail": bestEligibleTechnicians[0].user.email,
									"jobId":data.jobData.id
								})
								alreadyNotifiedTechs[data.jobData.id].push(bestEligibleTechnicians[0].id)
								sendNotificationToTech(data, bestEligibleTechnicians[0])
								io.emit("refresh-notifications", {type:"new_job_notification", techId:bestEligibleTechnicians[0].id})
							}else{
								logger.info("No eligible tech found for job ", {jobId: data.jobData.id})
							}
						}
					} catch (error) {
						logger.error("processForASAPJob -> else -> sendNotificationToTech : err ", {error:error, jobId:data.jobData.id})
					}

					try {
						logger.info("runTechSearchCounter value is ", {"runTechSearchCounter":runTechSearchCounter[data.jobData.id]})
						//Checking to call searchTechAndSendNotification() again or not.
						if(runTechSearchCounter[data.jobData.id] < numberOfTimesToRunTechSearchLoop){
							logger.info("Calling searchTechAndSendNotification() for " + runTechSearchCounter[data.jobData.id] + " time", {jobId:data.jobData.id})
							const updatedJob = await getUpdatedJob(data.jobData.id)
							logger.info("latest job data", {updatedJob:updatedJob, jobId:data.jobData.id})
							declinedTechs[data.jobData.id] = updatedJob.tech_declined_ids
							setTimeout(()=>{
								if(updatedJob.status === JOB_STATUS.WAITING || updatedJob.status === JOB_STATUS.PENDING){
									searchTechAndSendNotification(data)
								}
							},secondsToWaitBeforeRunningTechSearchAgain)
						}else{
							if(bestEligibleTechnicians.length > 0){
								logger.info("Blast notifications to all techs", {jobId:data.jobData.id})
								// Blast notifications to all techs in the array
								blastNotificationsToAllTechs(data, bestEligibleTechnicians)
								delete alreadyNotifiedTechs[data.jobData.id]
								delete declinedTechs[data.jobData.id]
							}
						}
					} catch (error) {
						logger.error("processForASAPJob -> else -> searchTechAndSendNotification : err ", {error:error, jobId:data.jobData.id})
					}
				}
			}
		} catch (error) {
			logger.error("Err occured in processForASAPJob()", {error:error, jobId:data.jobData.id})	
		}
	}

	/**
	* Following function is to search for techs and send notifications to techs regarding Schedule job
	* @params : data: Object, allEligibleTechncians: Object
	* @response : null
	* @author : Vinit
	**/

	const processForScheduleJob = async (data) => {
		try {
			//Schedule job posted with same tech
			if(data.technicianId){
				logger.info("Step-3.1 processForScheduleJob : Schedule job with job_id " + data.jobData.id + " posted with same tech with user_id " + data.technicianId,{data})
				let technicianObj = {}

				try {
					//Fetching same tech object from db
					technicianObj = await findSameTech(data.technicianId)
				} catch (error) {
					logger.error("processForScheduleJob -> if -> findSameTech : err ", {error:error, jobId:data.jobData.id})
				}
				
				try {
					//Checking if tech blocked by admin or not
					if(technicianObj && technicianObj['id']){
						if(!technicianObj['user'].blocked){

							//Sending notification to same tech
							sendNotificationToTech(data, technicianObj)
							io.emit("refresh-notifications", {type:"new_job_notification", techId:technicianObj['id']})
						}else{
							logger.info("Tech with tech_id " + technicianObj['id']+ " is blocked for schedule job with same tech with job id"+ data.jobData.id, {data:data})
						}
					}else{
						logger.info("processForScheduleJob : technicianObj not found", {"job_id":data.jobData.id, techId:data.technicianId})	
					}
				} catch (error) {
					logger.error("processForScheduleJob -> if -> blastNotificationsForScheduleJob : err ", {error:error, jobId:data.jobData.id})
				}
			}
			//Regular Schedule job posted
			else{
				logger.info("Step-3.2 Schedule job posted with job_id " + data.jobData.id, {data})

				let allEligibleTechncians = []

				// delete alreadyNotifiedTechs array
				delete alreadyNotifiedTechs[data.jobData.id]

				try {
					//Fetching all the eligible techs
					allEligibleTechncians = await findAllEligibleTechnicians(data)
					logger.info(allEligibleTechncians.length + " eligible techs found for schedule job " + data.jobData.id)
				} catch (error) {
					logger.error("processForScheduleJob -> else -> findAllEligibleTechnicians : err ", {error:error, jobId:data.jobData.id})
				}
				
				try {
					//Blast notifications to all the eligible and non-blocked techs
					blastNotificationsToAllTechs(data, allEligibleTechncians)
				} catch (error) {
					logger.error("processForScheduleJob -> else -> blastNotificationsForScheduleJob : err ", {error:error, jobId:data.jobData.id})
				}
			}

			try {
				//Sending Email for schedule job to customer
				sendScheduleJobEmailToCustomer(data)
			} catch (error) {
				logger.error("processForScheduleJob -> sendScheduleJobEmailToCustomer : err ", {error:error, jobId:data.jobData.id})
			}

			try {
				//Sending SMS for schedule job to customer
				sendScheduleJobSMSToCustomer(data)
			} catch (error) {
				logger.error("processForScheduleJob -> sendScheduleJobSMSToCustomer : err ", {error:error, jobId:data.jobData.id})
			}

		} catch (error) {
			logger.info("Err occured in processForScheduleJob() ", {error:error, jobId:data.jobData.id})
		}
	}

	/**
	* this function is to send SMS alert to customer for schedule job
	* @params : data:Object
	* @response : null
	* @author : Vinit
	**/

	const sendScheduleJobEmailToCustomer = async (data) => {
		try {
			logger.info("Step-4.5 Going to send email to customer reagarding it's schedule job", {jobId:data.jobData.id})
			let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:data.jobData.customer.user.timezone};
			//alert on email
			await sendScheduleEmail({
				email:data.customerEmail,
				name:data.customerName,
				programeName:data.jobData.software.name,
				jobDescription:data.jobData.issueDescription,
				primaryTime:new Date(data.primaryTime).toLocaleString("en", DATE_OPTIONS),
				secondaryTime:""
			})
		} catch (error) {
			logger.info("Err in sendScheduleJobEmailToCustomer()", {error:error, jobId:data.jobData.id})
		}
	}	

	/**
	* this function is to send SMS alert to customer for schedule job
	* @params : data:Object
	* @response : null
	* @author : Vinit
	**/
	
	const sendScheduleJobSMSToCustomer = async(data)=>{
		try{
			let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:data.jobData.customer.user.timezone};
			//alert on phone number
			let phoneNumber = data.jobData.customer.phoneNumber
			let message = 'Hi ' + data.jobData.customer.user.firstName + ', Your job is scheduled on Geeker. We will let you know as soon as we found a technician for your job.';
			TextService.sendSmsToNumber(
				phoneNumber,
				message,
				data.jobId)
			logger.info("Step-4.4 customerJobAlert: text message and email info",{
				'email':data.jobData.customer.user.email, 
				'primaryTime':new Date(data.primaryTime).toLocaleString("en", DATE_OPTIONS),
				'jobDescription':data.jobData.issueDescription,
				'programeName':data.jobData.software.name,
				'name':data.jobData.customer.user.firstName,
				'jobId': data.jobData.id
			})
			
		}catch(error){
			logger.error("Error in sendScheduleJobSMSToCustomer()",{error, 'job_id':data.jobData.id})
		}
	}

	/**
	* this function is to send Email alert to technicians for schedule job
	* @params : job:Object, techs:arr of objects
	* @response : null
	* @author : Vinit
	**/

	const sendScheduleJobEmailToTechs = async(data, tech) => {
		try{
			logger.info("Going to send schedule job email alert to techs", {jobId:data.jobData.id})

			let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:tech.user.timezone};

			let primaryDate  =  new Date(data.primaryTime).toLocaleTimeString('en-US', DATE_OPTIONS) 

			scheduleJobAlertTechnician({
				name:data.jobData.customer.user.firstName,
				firstName:tech.user.firstName,
				email: tech.user.email,
				primaryDate:primaryDate,
				secondryDate:primaryDate,
				issueDesc:data.jobData.issueDescription,
				JobId:data.jobId,
				programName:data.jobData.software.name,
		
			});

			return {status:true, emailSentAt: new Date(), emailsentTo: tech.user.email}
		}catch(error){
			logger.error("Some error occured in sendScheduleJobEmailToTechs",{error:error, jobId:data.jobData.id})
			return {status:false, emailSentAt: new Date(), emailsentTo: ""}
		}
	}

	/**
	 * this function will fetch the latest job object
	 * @params : jobId : String
	 * @response : job : Object
	 * @author : Vinit
	 **/

	const getUpdatedJob = async (jobId) => {
		try {	
			logger.info("Fetching updated job object for job with id " + jobId)
			const latestJobObj = await Job.findOne({_id:jobId})
			return latestJobObj
		} catch (error) {
			logger.info("Some error occured in getUpdatedJob", {error:error, jobId:jobId})
		}
	}

	/**
	 * this function will get technician object for same tech search
	 * @params : tech_user_id : String
	 * @response : technician_object : Object
	 * @author : Vinit
	 **/
	
	const findSameTech = async (tech_user_id) => {
		let technician = {}
		try {
			logger.info("Step-4 Going to fetch technician for same tech search", {tech_user_id})
			technician = await Technician.findOne({user: tech_user_id}).populate("user")
			// logger.info("Found tech for same tech search", {technician})
			return technician
		} catch (error) {
			logger.info("Error in findSameTech()", {error:error, techUserId: tech_user_id})
			return technician
		}
	}

	/**
	 * this function is responsible to blast notifications to all the eligible techs provided
	 * @params : data: Object
	 * @response : null
	 * @author : Vinit
	 **/	
	
	const blastNotificationsToAllTechs = (data, techArr) => {
		try {
			for(let x in techArr){
				logger.info("blastNotificationsToAllTechs() Calling sendNotificationToTech() for tech regarding job with id " + data.jobData.id,{"tech":techArr[x].id})
				try {
					sendNotificationToTech(data, techArr[x])
					io.emit("refresh-notifications", {type:"new_job_notification", techId:techArr[x].id})
				} catch (error) {
					logger.error("blastNotificationsToAllTechs -> sendNotificationToTech : err ", {jobId:data.jobData.id, techEmail:techArr[x].user.email})
				}
			}
		} catch (error) {
			logger.info("Error in blastNotificationsToAllTechs()", {error:error, jobId:data.jobData.id})
		}
	}

	/**
	 * this function is responsible to business name for admin and owner
	 * @params : data: Object
	 * @response : null
	 * @author : Nafees
	 **/
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
	 * this function is responsible to find an eligible technician for the given job
	 * @params : data: Object
	 * @response : null
	 * @author : Vinit
	 **/	
	const sendNotificationToTech = async (data, tech) => {
		try {
			logger.info("sendNotificationToTech() called", {"jobId":data.jobData.id, tech_id:tech.id})
			let webNotificationStatus = {}
			let emailAlertStatus = {}
			let smsAlertStatus = {}
			
			const searchSameTech = data.hasOwnProperty('searchSameTech') && data.searchSameTech === true
			console.log("searchSameTech ====== sendNotificationToTech ")

			let businessName = await getBusinessName(data.jobData.customer); // Call the function to get business name
			console.log("businessName>>>>>>>>>>>>>787887", businessName);
			
			try {
				//Sending web notification to tech
				webNotificationStatus = await sendWebNotification(data.jobData, tech.user,searchSameTech,businessName)
			} catch (error) {
				logger.error("sendNotificationToTech : sendWebNotification", {error:error, jobId:data.jobData.id})
			}
			
			try {
				const sendSMSAlert = await checkToSendAlertToTech(ALERT_TYPE.SMS, tech)
				smsAlertStatus = {status:false, smsSentAt:new Date(), smsSentTo:""}
				logger.info("Send SMS alert to technician or not",{sendSMSAlert:sendSMSAlert, jobId: data.jobData.id, techId: tech.id})
				if(sendSMSAlert.status && sendSMSAlert.phoneNumber !== ""){
					//Sending text message to technician
					smsAlertStatus = await sendSmsAlertToTech(data.jobData,tech,sendSMSAlert.phoneNumber,searchSameTech,businessName)
				}
			} catch (error) {
				logger.error("sendNotificationToTech : sendSmsAlertToTech", {error:error, jobId:data.jobData.id})
			}
			
			try {
				const sendEmailAlert = await checkToSendAlertToTech(ALERT_TYPE.EMAIL, tech)
				emailAlertStatus = {status:false, emailSentAt: new Date(), emailsentTo:""}
				logger.info("Send Email alert to technician or not",{sendEmailAlert:sendEmailAlert, jobId:data.jobData.id, techId: tech.id})
				if(sendEmailAlert.status && sendEmailAlert.email !== ""){
					//Sending email to technician
					if(data.jobData.status === JOB_STATUS.PENDING || data.jobData.status === JOB_STATUS.WAITING){
						emailAlertStatus = await sendASAPJobEmailAlertToTech(data, tech, sendEmailAlert.email,searchSameTech)
					}
					else if(data.jobData.status === JOB_STATUS.SCHEDULED){
						emailAlertStatus = await sendScheduleJobEmailToTechs(data, tech)
					}
				}
			} catch (error) {
				logger.error("sendNotificationToTech : sending email alert to tech", {error:error, jobId:data.jobData.id})
			}

			try {
				logger.info("logging all notifications response", {webNotificationStatus:webNotificationStatus, emailAlertStatus:emailAlertStatus, jobId:data.jobData.id, techId: tech.id})
				callSaveJobNotificationHistory(webNotificationStatus, emailAlertStatus, smsAlertStatus, data, tech)
			} catch (error) {
				logger.error("sendNotificationToTech : callSaveJobNotificationHistory", {error:error, jobId:data.jobData.id})
			}
			
		} catch (error) {
			logger.error("Error occured in sendNotificationToTech", {error:error, jobId: data.jobData.id})
		}
	 }

	 /**
	 * this function is to save job notification history
	 * @param : webNotificationSent:(Type:Object), emailAlertSent(Type:Object), smsAlertSent(Type:Object)
	 * @response : null
	 * @author : Vinit
	 **/

	const callSaveJobNotificationHistory = (webNotificationSent, emailAlertSent, smsAlertSent, data, tech) => {
		try { 
			logger.info("callSaveJobNotificationHistory() called", {
				webNotificationSent:webNotificationSent, 
				emailAlertSent:emailAlertSent, 
				smsAlertSent:smsAlertSent,
				jobId:data.jobData.id
			})

			let jobType = "Regular"
			if(data.jobData.status === JOB_STATUS.SCHEDULED){
				jobType = "Schedule"
			}

			let jobNotificationHistoryData = {
				job:data.jobData.id, 
				jobType:jobType,
				technician:tech.id, 
				browser_notification_sent:webNotificationSent.status,
				browser_notification_sent_at:webNotificationSent.webNotificationSentAt,
				email:emailAlertSent.emailsentTo,
				email_sent:emailAlertSent.status,
				email_sent_at:emailAlertSent.emailSentAt,
				sms_phone_number:smsAlertSent.smsSentTo,
				sms_sent:smsAlertSent.status,
				sms_sent_at:smsAlertSent.smsSentAt
			}
			logger.info("Saving all the job ntifications", {jobNotificationHistoryData:jobNotificationHistoryData, jobId:data.jobData.id, techId:tech.id})
			let saveJobNotificationHistory = new JobNotificationHistory(jobNotificationHistoryData)
			saveJobNotificationHistory.save()
		} catch (error) {
			logger.info("Err occured in callSaveJobNotificationHistory()", {error:error, jobId:data.jobData.id})
		}
	}

	 /**
	 * this function checks if to send SMS/EMAIL alert to technician
	 * @param : alertType:String, tech:Object
	 * @response : null
	 * @author : Vinit
	 **/
	 const checkToSendAlertToTech = async (alertType, tech) => {
		try {
			logger.info("Going to check if send " + alertType + " alert to tech", {tech_id:tech.id})

			const activeTech = await ActiveUser.find({user:tech.user.id})
			// logger.info("activeTech",{activeTech})

			//Checking if tech is online or not
			if(activeTech.length > 0){
				logger.info("Tech is active",{numberOfActiveTechs:activeTech.length})
				if(alertType === ALERT_TYPE.SMS){
					if(tech.profile &&
						tech.profile.alertPreference &&
						tech.profile.alertPreference.settings &&
						tech.profile.alertPreference.settings.Job &&
						tech.profile.alertPreference.settings.Job.Text &&
						tech.profile.alertPreference.settings.Job.Text.toggle
						){
							//Add "+" sign in front of phone number if not present already.
							if(tech.profile.alertPreference.settings.Job.Text.value && 
							  	tech.profile.alertPreference.settings.Job.Text.value.includes("+")
							  ){
									return {"status":tech.profile.alertPreference.settings.Job.Text.toggle, "phoneNumber": tech.profile.alertPreference.settings.Job.Text.value};
								}else{
									logger.info("Adding + sign to phn number for tech " + tech.id)
									return {"status":tech.profile.alertPreference.settings.Job.Text.toggle, "phoneNumber": "+"+tech.profile.alertPreference.settings.Job.Text.value};
							}
					}else{
						return {"status":false, "phoneNumber":""}
					}
				}else if(alertType === ALERT_TYPE.EMAIL){
					if(tech &&
						tech.profile &&
						tech.profile.alertPreference &&
						tech.profile.alertPreference.settings && 
						tech.profile.alertPreference.settings.Job &&
						tech.profile.alertPreference.settings.Job.Email &&
						tech.profile.alertPreference.settings.Job.Email.toggle
						){
							return {"status": tech.profile.alertPreference.settings.Job.Email.toggle, "email":tech.profile.alertPreference.settings.Job.Email.value}
					}else{
						return {"status":false, "email":""}
					}
				}
			}else{
				logger.info("Tech is inactive",{numberOfActiveTechs:activeTech.length})
				if(alertType === ALERT_TYPE.SMS){
					if(tech &&
						tech.profile &&
						tech.profile.alertPreference &&
						tech.profile.alertPreference.settings &&
						tech.profile.alertPreference.settings.Techs &&
						tech.profile.alertPreference.settings.Techs.Text &&
						tech.profile.alertPreference.settings.Techs.Text.toggle
						){
							//Add "+" sign in front of phone number if not present already.
							if(tech.profile.alertPreference.settings.Techs.Text.value && 
								tech.profile.alertPreference.settings.Techs.Text.value.includes("+")
							  ){
								return {"status":tech.profile.alertPreference.settings.Techs.Text.toggle, "phoneNumber": tech.profile.alertPreference.settings.Techs.Text.value};
							}else{
								logger.info("Adding + sign to phn number for tech " + tech.id)
								return {"status":tech.profile.alertPreference.settings.Techs.Text.toggle, "phoneNumber": "+"+tech.profile.alertPreference.settings.Techs.Text.value};
							}
					}else{
						return {"status":false, "phoneNumber":""}
					}
				}else if(alertType === ALERT_TYPE.EMAIL){
					if(tech &&
						tech.profile &&
						tech.profile.alertPreference &&
						tech.profile.alertPreference.settings &&
						tech.profile.alertPreference.settings.Techs &&
						tech.profile.alertPreference.settings.Techs.Email &&
						tech.profile.alertPreference.settings.Techs.Email.toggle
					){
						return {"status":tech.profile.alertPreference.settings.Techs.Email.toggle, "email": tech.profile.alertPreference.settings.Techs.Email.value};
					}else{
						return {"status":false, "email":""}
					}
				}
			}
		} catch (error) {
			logger.error("Error in checkToSendAlertToTech()",{error, techId:tech.id})	
			if(alertType === "SMS"){
				return {"status":false, "phoneNumber":""}
			}else if(alertType === "EMAIL"){
				return {"status":false, "email":""}
			}
		}
	 }

	 /**
	 * this function send email alerts to technicians 
	 * @param : data:Object, tech:Object, emailTo: String
	 * @response : null
	 * @author : Vinit
	 **/

	const sendASAPJobEmailAlertToTech = async (data,tech,emailTo,searchSameTech)=>{
		try{
			// console.log("searchSameTech ========== sendASAPJobEmailAlertToTech",searchSameTech)
			logger.info("Going to send email alert to technician at " + tech.user.email, {jobId:data.jobData.id} )
			// console.log("job is transfer case",data.jobData);
			if(!sentEmails.includes(tech.user.email + "_"+ data.jobData.id)){
				try{
					
					//Replaceing user's default email with the email in settings of technician
					tech.user.email = emailTo

					const emailParams = {
						userData: tech.user,
						jobData : data.jobData,
						redirectURL: `${config.appEndpoint}/job-details?jobID=${data.jobData.id}`
					}

					if(data.jobData.hire_expert && data.jobData.is_transferred ){
						console.log("transferred sendJobAlertEmailToExpert")
						sendJobAlertEmailToExpert(emailParams);	
					}else if(data.jobData.is_transferred){
						console.log("transferred sendJobAlertEmailToAllTech")
						sendJobAlertEmailToAllTech(emailParams);	
					}
					else if(searchSameTech){
						console.log("searchSameTech ========== sendJobAlertEmailForSameTech",searchSameTech)
						sendJobAlertEmailForSameTech(emailParams);
					}
					else{
						console.log("transferred sendJobAlertEmail")
						sendJobAlertEmail(emailParams);
					}
					sentEmails.push(tech.user.email + "_"+ data.jobData.id)
					logger.info(`Email sent to technician ${tech.user.email}`,{
						'jobId':data.jobData.id,
						'technicianEmailId':tech.user.email
					});
					return {status:true, emailSentAt: new Date(), emailsentTo: tech.user.email}
				}
				catch(error){
					logger.info("Some err occured in internal try of sendASAPJobEmailAlertToTech()", {error:error, jobId:data.jobData.id})
					return {status:false, emailSentAt: new Date(), emailsentTo: ""}
				}
			}else{
				return {status:false, emailSentAt: new Date(), emailsentTo: ""}
			}
		}
		catch(error){
			logger.error("Error while sending Email ",{
				"error":error,
				"job_id":data.jobData.id,
				"technician_user_id":tech.user.id,
				"email":tech.user.email
			})
			return {status:false, emailSentAt: new Date(), emailsentTo: ""}
		}
	}

	/**
	* this function send sms alerts to the user given in params
	* @params : job:Object, tech:Object
	* @param : phoneNumber(Type:Number) , userId(Type:String),softwareDate(Type:Object)
	* @response : null
	* @author : Vinit
	**/

	const sendSmsAlertToTech = async(job,tech,phoneNumber,searchSameTech,businessName)=>{
		try{
			logger.info("Going to send SMS alert to tech at " + phoneNumber,{"job_id":job.id, "tech_id":tech.id})

			let message = ""

			try {
				//Preparing message for SMS alert
				message = await prepareMessageForAlerts(ALERT_TYPE.SMS, job, tech.user,searchSameTech,businessName)
				logger.info("Message prepared for SMS" + {techId:tech.id, jobId: job.id, message:message})

				//In case of schedule job adding job time to message.
				if(job.status === JOB_STATUS.SCHEDULED){
					let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:tech.user.timezone};
					message = message + String(new Date(job.primarySchedule).toLocaleString("en", DATE_OPTIONS))
				}
			} catch (error) {
				logger.error("sendSmsAlertToTech -> prepareMessageForAlerts ", {error:error, jobId:job.id})
			}

			console.log("My console for final message", message)

			TextService.sendSmsToNumber(phoneNumber,message,job.id)
			logger.info("Sms sent to phone number " + phoneNumber,{
				'technician_user_id':tech.user.id, 
				"job_id":job.id,
				"technician_phoneNumber":phoneNumber
			});
			return {status:true, smsSentAt:new Date(), smsSentTo:phoneNumber}
		}
		catch(error){
			logger.error("error in sendSmsAlerts :::: ",{
				"error":error,
				"job_id":job.id,
				"user_id":tech.user.id,
				"phone_number":tech.profile.confirmId.phoneNumber,
				"software_data":job.software,
			})
			return {status:false, smsSentAt:new Date(), smsSentTo:""}
		}
	}

	 /**
	 * Following function is to send web notifications to techs
	 * @param : job:Object, technicianUser:Object
	 * @response : null
	 * @author : Vinit
	 **/

	const sendWebNotification = async (job,user,searchSameTech,businessName)=>{
		try{
			// Todo: Prepare notification msg 
			logger.info("Going to send web notification to tech " + user.email,{"jobId":job.id})
			
			let title = ""

			//Preparing message to send in web notification
			title = await prepareMessageForAlerts(ALERT_TYPE.WEB_NOTIFICATION, job, user,searchSameTech,businessName)
			logger.info("sendWebNotification : prepareMessageForAlerts ", {title:title, jobId:job.id})
			
			let estimate_earning = await getEstEarning(job.software);
			
			let notificationData = {}
			try {
				//Preparing data for web notification
				notificationData = prepareDataForNotification(ALERT_TYPE.WEB_NOTIFICATION, job, user)
				notificationData["title"] = title
				notificationData["estimate_earning"] = estimate_earning
				logger.info("sendWebNotification : prepareDataForNotification ", {notificationData:notificationData, jobId:job.id})
			} catch (error) {
				logger.error("sendWebNotification -> prepareDataForNotification : err ", {error:error, jobId:job.id})
			}
			
			logger.info("Sent web notification to technician " + user.email,{
				'notificationData':notificationData,
				'jobId':job.id
			});
			let notifyTech = new Notifications(notificationData)
			notifyTech.save()
			return {status:true, webNotificationSentAt:new Date()}
		}
		catch(error){
			logger.error("Error while sending notifications ",{
				"error":error,
				"job_id":job.id,
				"technician_user_id":user.id,
			})
			return {status:false, webNotificationSentAt:new Date()}
		}
	}

	/**
	 * this function is responsible to find an eligible technician for the given job
	 * @params : data: Object
	 * @response : {void}
	 * @author : Vinit
	 **/	
	const findBestTech = async (data) => {
		try {
			let allEligibleTechncians = []
			let activeTechs = []

			try {
				//Get all the eligible technicians for this job from technician table.
				allEligibleTechncians = await findAllEligibleTechnicians(data)
				logger.info(allEligibleTechncians.length + " eligible techs found for job " + data.jobData.id)
			} catch (error) {
				logger.error("findBestTech -> findAllEligibleTechnicians : err ", {error:error, jobId:data.jobData.id})
			}
			
			try {
				//Sort techs by live tech table.
				activeTechs = await lookForActiveTechs(allEligibleTechncians, data)
			} catch (error) {
				logger.error("findBestTech -> lookForActiveTechs : err ", {error:error, jobId:data.jobData.id})
			}
			return activeTechs
			
		} catch (error) {
			logger.error("findBestTech : Error ", {error:error, jobId:data.jobData.id})
			return []
		}
	}

	/**
	 * this function check which technicians are online currently
	 * @params : Filtered already notified techs: Arr of Object
	 * @response : All eligible techs: Arr of objects
	 * @author : Vinit
	 **/	
	const lookForActiveTechs = async (techArr, data) => {
		try {
			let activeUsers = await ActiveUser.find({userType:"technician"}).sort({"ratings":-1})
			logger.info("All active users",{activeUsers: activeUsers, jobId:data.jobData.id})

			if(activeUsers.length > 0){
				try {
					//Moving freelancers at the beginning of activeUsers arr.
					for(let x in activeUsers){
						if(activeUsers[x].technicianType && activeUsers[x].technicianType === 'freelancer'){
							const indexOfFreeLancerInActiveUserArr = Number(x)
							// logger.info("Index of freeLancersInActiveUsers current element",{
							// 	"index":indexOfFreeLancerInActiveUserArr,
							// 	"freeLancersInActiveUsersElement":activeUsers[x],
							// 	jobId:data.jobData.id
							// })
							if(indexOfFreeLancerInActiveUserArr !== -1){
								activeUsers = moveArrElementWitinArr(activeUsers, indexOfFreeLancerInActiveUserArr, 0, data.jobData.id)
								break
							}
						}
					}
				} catch (error) {
					logger.error("lookForActiveTechs : freelancer loop", {error:error, jobId:data.jobData.id})
				}

				try {
					//Moving active techs at the top of techArr
					activeUsers.forEach((user)=>{
						for(let x in techArr){
							let indexOfArr = Number(x)

							// if(techArr[indexOfArr].user && techArr[indexOfArr].user !== null && techArr[indexOfArr].user.id){
							// 	logger.info("Checking for tech in active users ", {"tech_user_id":techArr[indexOfArr].user.id, jobId: data.jobData.id})
							// }
							
							if(techArr[indexOfArr].user && techArr[indexOfArr].user !== null && techArr[indexOfArr].user.id && user.user && techArr[indexOfArr].user.id === user.user){

								logger.info("Match found at index " + indexOfArr, {userId:user.user})
								
								if(indexOfArr !== 0){
									techArr = moveArrElementWitinArr(techArr, indexOfArr, 0, data.jobData.id)
									break
								}
							}
						}
					})
				} catch (error) {
					logger.error("lookForActiveTechs : move active and freelancer to top of arr ", {error:error, jobId: data.jobData.id})
				}
				return techArr
			}else{
				logger.info("No techs are active currently",{jobId:data.jobData.id})
				return techArr
			}
		} catch (error) {
			logger.error("Some error occured in lookForActiveTechs", {error:error, jobId:data.jobData.id})
			return techArr
		}
	}

	/**
	 * this function will check if job is posted under 3 minutes from now or not
	 * @params : : job: Object
	 * @response : Boolean
	 * @author : Vinit
	 **/	
	const jobPostedTimeCheck = (job) => {
		try {
			logger.info("Step-4.5 jobPostedTimeCheck() called", {
				"job_id":job.id, 
				"techSearchStartsAt":job.tech_search_start_at
			})
			const techSearchStartsAt = new Date(job.tech_search_start_at).getTime()
			const currentTime = new Date().getTime()
			const timeSinceJobPosted = currentTime - techSearchStartsAt
			logger.info("Checking if job posted 3 minutes ago", {
				techSearchStartsAt:techSearchStartsAt, 
				currentTime:currentTime, 
				timeSinceJobPosted:timeSinceJobPosted,
				jobId:job.id
			})
			if(timeSinceJobPosted < blastAwaitTime){
				logger.info("Job posted less than 3 minutes ago from inside the function",{jobId:job.id})
				return true
			}else{
				logger.info("Job posted more than 3 minutes ago",{jobId:job.id})
				return false
			}
		} catch (error) {
			logger.info("Err in jobPostedTimeCheck()", {error:error, jobId:job.id})
		}
	}

	/**
	 * this function is to get all the eligible technician for the given job wrt registrationStatus, technicianType & expertise
	 * @params : data: Object
	 * @response : all eligible technicians: Arr of objects
	 * @author : Vinit
	 **/	
	const findAllEligibleTechnicians = async (data) => {
		let technicians = []
		let blockedTechsUserIds = []
		// let geekerTechsIds = []
		try {
			logger.info("Step-4.1 findAllEligibleTechnicians : Going to get all the eligible techs", {jobId:data.jobData.id})

			try {
				//Fetching all the techs which are blocked.
				blockedTechsUserIds = await getBlockedTechsUserIds()
				logger.info("findAllEligibleTechnicians : User id's of all the blocked technicians in an arr ", {
					blockedTechsUserIds:blockedTechsUserIds, 
					jobId:data.jobData.id
				})
			} catch (error) {
				logger.error("findAllEligibleTechnicians -> getBlockedTechsUserIds : err", {error:error, jobId:data.jobData.id})
			}
			
			//Fetching all the tech id's of Geeker's tech to exclude from query
			// geekerTechsIds = await getGeekersTechsIds(management_team_technicians_emails)
			// logger.info("All the tech id's of geekerstech",{geekerTechsIds:geekerTechsIds, jobId:data.jobData.id})

			//Query to search for an eligible tech.
			let techQueryObj = {
				//Fetching techs with registration status "incomplete_profile" & "complete"
				$or:[
					{registrationStatus:TECHNICIAN_REGISTRATION_STATUS.INCOMPLETE_PROFILE},
					{registrationStatus:TECHNICIAN_REGISTRATION_STATUS.COMPLETE},
				],

				//Fetching live tech for live cust and similar with test. 
				technicianType:data.jobData.customer.customerType,

				//Fetching techs for a specific software in the given job
				expertise:{
					$elemMatch:{
						'software_id':data.jobData.software.id,
					}
				},

				//Excluding allready notified, declined techs and geeker techs
				$and: [
					{ _id: { $nin: declinedTechs[data.jobData.id] } }, 
					{ _id: { $nin: alreadyNotifiedTechs[data.jobData.id] } },
					// { _id: { $nin: geekerTechsIds } }
				],

				//Excluding blocked techs.
				user: {$nin:blockedTechsUserIds},
			}

			//Query to search for an eligible and expert tech for Tier-2 jobs.
			let expertTechQueryObj = {
				//Fetching techs with registration status "incomplete_profile" & "complete"
				$or:[
					{registrationStatus:TECHNICIAN_REGISTRATION_STATUS.INCOMPLETE_PROFILE},
					{registrationStatus:TECHNICIAN_REGISTRATION_STATUS.COMPLETE},
				],

				//Fetching live tech for live cust and vice-versa with test. 
				technicianType:data.jobData.customer.customerType,

				//Fetching Tier-2 techs for a specific software in the given job
				expertise:{
					$elemMatch:{
						'software_id':data.jobData.software.id,
						'two_tier_value': "expert"
					}
				},

				//Excluding allready notified, declined techs and geeker techs
				$and: [
					{ _id: { $nin: declinedTechs[data.jobData.id] } }, 
					{ _id: { $nin: alreadyNotifiedTechs[data.jobData.id] } },
					// { _id: { $nin: geekerTechsIds } }
				],

				//Excluding blocked techs.
				user: {$nin:blockedTechsUserIds},
			}

			try {
				if(data.jobData.is_transferred_hire_expert){
					logger.info("query for hire expert tech", {expertTechQueryObj:expertTechQueryObj, jobId:data.jobData.id})
					technicians = await Technician.find(expertTechQueryObj).populate({
						path:"user",
					}).sort({"ratings":-1})
				}else{
					logger.info("query for tech", {techQueryObj:techQueryObj, jobId:data.jobData.id})
					technicians = await Technician.find(techQueryObj).populate({
						path:"user",
					}).sort({"ratings":-1})
				}
			} catch (error) {
				logger.error("findAllEligibleTechnicians -> Technician.find query : err", {error:error, jobId:data.jobData.id})
			}
			return technicians
		} catch (error) {
			logger.error("Error occured in findAllEligibleTechnicians()", {error:error, jobId:data.jobData.id})
			return technicians
		}
	}

	/**
	 * this function is to get all the blocked techs user id's
	 * @params : null
	 * @response : all tech user id's: array
	 * @author : Vinit
	 **/

	const getBlockedTechsUserIds = async () => {
		let blockedTechsUserIds = []
		try {
			const blockedTechs = await User.find({blocked:true, userType:"technician"},{_id:1})
			
			//Getting userId's of all blocked techs in "blockedTechsUserIds" arr.
			blockedTechsUserIds = blockedTechs.map((blockedTech)=>{return blockedTech.id})
			return blockedTechsUserIds
		} catch (error) {
			logger.error("getBlockedTechsUserIds : error ", {error:error})
			return blockedTechsUserIds
		}
	}

	/**
	 * this function is to prepare data to send with notification
	 * @params : alertType : String, Job : Object, user : Object
	 * @response : dataObjectForNotification : Object
	 * @author : Vinit
	 **/

	const prepareDataForNotification = (alertType, job, user) => {
		let dataObjectForNotification = {}
		try{
			if(alertType === ALERT_TYPE.WEB_NOTIFICATION){
				dataObjectForNotification['job'] = job.id
				dataObjectForNotification['user'] = user.id
				dataObjectForNotification['customer'] = job.customer.id
				dataObjectForNotification['actionable'] = true
				dataObjectForNotification['read'] = false
				dataObjectForNotification['type'] = job.status === JOB_STATUS.SCHEDULED ? "Scheduled Job" : "new_job"
			}
			return dataObjectForNotification
		}catch(error){
			logger.error("prepareDataForNotification : err ", {error:error, jobId: job.id})
			return dataObjectForNotification
		}
	}

	/**
	 * this function is to prepare message/title
	 * @params : alertType : String, Job : Object, user : Object
	 * @response : message : String
	 * @author : Vinit
	 **/

	const prepareMessageForAlerts =  async(alertType, job, user,searchSameTech,businessName) => {
		let message = ""
		let softwareName = job.software.name
		let customersFirstName = job.customer.user.firstName
	
		try {
			if(alertType === ALERT_TYPE.WEB_NOTIFICATION){

				if(job.status === JOB_STATUS.PENDING || job.status === JOB_STATUS.WAITING){
					if(job.hire_expert || job.is_transferred_hire_expert){
						message = user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + ', a new job of '+ softwareName +' is waiting for you. This is a 2 tier job. Click "Details" to learn more.'
					}else if(searchSameTech){
						message = user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + ', New Direct Request for '+ softwareName +' is waiting for you.Click "Details" to learn more.'
					}
					
					else{
						message = user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + ', a new job of '+ softwareName +' is waiting for you! Click "Details" to learn more.'
					}	
				}else{
					message = "There’s a new job/request of "+ job.software.name +" waiting for you!"
				}
			}else if(alertType === ALERT_TYPE.SMS){
				if(job.status === JOB_STATUS.PENDING || job.status === JOB_STATUS.WAITING){
					if(job.hire_expert || job.is_transferred_hire_expert){
						message  = 'Geeker - New 2 tier job of '+ softwareName +' posted by customer '+customersFirstName +(businessName ? ', ' + businessName : '') + '.';
					}
					else if(searchSameTech){
						message = 'Geeker - New Direct Request for ' + user.firstName + ' by ' + job.customer.user.firstName +' '+ job.customer.user.lastName +(businessName ? ', ' + businessName : '') + ' for ' +softwareName+ ' please respond or reschedule within 5 min.'
					}
					else{
						message  = 'Geeker - New job of '+ softwareName +' posted by customer '+customersFirstName +(businessName ? ', ' + businessName : '') + '.';
					}
				}else{
					message = 'Geeker - New scheduled job of ' + softwareName + ' posted by customer ' + customersFirstName + (businessName ? ', ' + businessName : '') + '. Scheduled time - '
				}
				console.log("Buiness name in message posted: ", message)
			}
			return message
		} catch (error) {
			logger.error("prepareMessageForAlerts : err", {error:error, jobId:job.id})
			return message
		}
	}

	/**
	 * this function is to get all the tech id's of Geeker's own techs
	 * @params : geekerTechsEmails: array
	 * @response : all tech id's: array
	 * @author : Vinit
	 **/

	const getGeekersTechsIds = async (geekerTechsEmails) => {
		const geekerTechUser = await User.find({email:geekerTechsEmails}, {_id:1})
		const geekerTechUserIds= geekerTechUser.map((item)=>{return item._id})
		
		let geekerTechsIds = []
		const geekerTechs = await Technician.find({user: { "$in" : geekerTechUserIds}}, {_id:1})
		geekerTechsIds = geekerTechs.map((item)=>{return item._id})
		return geekerTechsIds
	}

 	/**
	 * this function send notification and email alerts to the user given in params
	 * @params : allAvailableTechs(Type:List) , techPhoneNumbersObj(Type:Object) , softwareData(Type:Object) , data(Type:Object)
	 * @response : {void}
	 * @author : Sahil
	 * @description : Emails sent to only those technicians who had clicked on emailAlertPreference
	 **/
   	const handleAlertBlast = async (allAvailableTechs,techPhoneNumbersObj,jobInfo,softwareData,techEmail)=>{
   		try{
			console.log("technicianUser ::: ",techPhoneNumbersObj,techEmail)
				   logger.info('ActiveUser Info inside Blast: Phone Number and Email',{
					"Active-InactivePhoneNumber":techPhoneNumbersObj,
					"Active-InactiveEmail":techEmail,
					'jobId':jobInfo.jobData.id,
					'userData':alreadyGetNotify
				})
				// usrArr[data.jobData.id].push(userIds[k]+"_"+data.jobData.id)

   			// console.log("handling the blast ::::::: starts here ")
   			for(var index in allAvailableTechs){
				const latestJobCancel = await  JobService.findJobById(jobInfo.jobData.id)
				if(latestJobCancel.status == "Declined"){
					break;
				}
   				let technicianUser = allAvailableTechs[index]
   				// let isAlreadyNotified = usrArr[jobInfo.jobData.id].includes(technicianUser.id+"_"+jobInfo.jobData.id)
   				 let isAlreadyNotified = alreadyGetNotify[jobInfo.jobData.id].includes(technicianUser.id+"_"+jobInfo.jobData.id)

   				if(!isAlreadyNotified){
					logger.info('AlreadyNotifyTechData:Blast Alert process start for '+technicianUser.email+'  and userID '+ technicianUser.id,{
						'userinfo':technicianUser,
						'jobId':jobInfo.jobData.id,
						'alreadyNotifiedUsedId':alreadyGetNotify,
						'NotificationSentToUser':technicianUser.id
					})
					//  usrArr[jobInfo.jobData.id].push(technicianUser.id+"_"+jobInfo.jobData.id)
					alreadyGetNotify[jobInfo.jobData.id].push(technicianUser.id+"_"+jobInfo.jobData.id)
   					if(jobInfo.jobData.hire_expert){
						// sendEmailAlerts(technicianUser,jobInfo,true)	
					}else{
						console.log('techEmail>>>>>>',techEmail['inActive'][technicianUser.id])
						if(techEmail['inActive'][technicianUser.id]!== '' &&  techEmail['inActive'][technicianUser.id]!== undefined){
							// sendEmailAlerts(technicianUser,jobInfo)
						}
							
					}
   					let phoneNumber = techPhoneNumbersObj['inActive'][technicianUser.id]
   					console.log("phoneNumber :::: ",phoneNumber)
   					if(phoneNumber){
   						console.log("sending Sms Alerts ::: ")
   						sendSmsAlerts(jobInfo,phoneNumber,technicianUser.id,softwareData)
   					}
   					console.log("handling the blast ::::::: starts here ")
   					//sendBellIconNotifications
   					console.log("Bell Notifications :::: 3")
					if(jobInfo.jobData.hire_expert){
						sendNotifications(jobInfo,technicianUser.id,softwareData,true)
					}else{
						sendNotifications(jobInfo,technicianUser.id,softwareData)
					}

   					//adding the entry in job table for notified techs
					sendWebNotificationAlerts(technicianUser.id, jobInfo.jobData)

				}
   			}
   		}
   		catch(err){
   			logger.error("Error while handling alert blasts ",{
				error:err,
				jobId:jobInfo.jobData.id,
			})
   			console.log("error in handleAlertBlast :::: ",err)
   		}
   		
   	}

   	/**
	 * Function that will decide for how much time find technician login will run
	 * @params : userIds(Type:Array) 
	 * @params : jobId (Type:String)
	 * @response : Integer value
	 * @author : Sahil
	 **/

	async function decideRecursionMinutes(userIds,jobId){
		let runningMins = 1
		try{
			// Dynamic running mins according to users length and it will run 1 min extra.
			runningMins = Math.ceil(userIds.length/2) + 1
			// Active technicians will be find for max 10 minutes only
			if (runningMins > 10){
				runningMins = 10
			}
			
		}
		catch(err){
			runningMins = 1
			logger.error("error while finding runningMins",{
				"runningMins":runningMins,
				"userIdsLength":userIds.length,
				"jobId":jobId
			})
		}
		return runningMins
	}



	/**
	 * this function send notification alerts to the user given in params
	 * @param : jobInfo(Type:Object) 
	 * @param : userId(Type:String) : technician user id 
	 * @param : softwareData(Type:Object) : all software information from software table in database
	 * @response : {void}
	 * @author : Sahil
	 **/

	const sendNotifications = async (jobInfo,userId,softwareData,expertJob=false,sameTechSearch= false)=>{
		try{
			let user = await (User.findOne({ '_id': userId }))
			let helpName = (jobInfo.jobData.subOption)?softwareData.name+ ' '+jobInfo.jobData.subOption:softwareData.name;
			let title = user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + ', a new job is waiting for you! Click "Details" to learn more.'
			if(expertJob){
				title = user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + ', a new job is waiting for you. This is a 2 tier job. Click "Details" to learn more.  '
			}
			if(sameTechSearch){
				title = 'Geeker - New Direct Request for ' + user.firstName + ' by ' + jobInfo.jobData.customer.user.firstName + ' '+ jobInfo.jobData.customer.user.lastName +' for ' +helpName+ ' please respond or reschedule within 5 min.'
			}
			// title += (jobInfo.jobData.software ? jobInfo.jobData.software.name : "")
			// title += (jobInfo.jobData.subOption ? " "+jobInfo.jobData.subOption : "")
			// title += (jobInfo.jobData.subSoftware ? " ("+jobInfo.jobData.subSoftware.name+")" : "")
			let estimate_earning = await getEstEarning(softwareData);
			let notificationData = {
				"user":userId,
				"job":jobInfo.jobData.id,
				"actionable":true,
				"title":title,
				"type":"new_job",
				"estimate_earning":estimate_earning				
			}

			logger.info("RecursiveTech: Web notification sent to technician "+user.email,{
				'notificationData':notificationData,
				'jobId':jobInfo.jobData.id
			});

			//commented by this code by Nafees
			// const previousNotification = await Notifications.find({$and: [{"job": jobInfo.jobData.id}, {"user": userId}]}).exec()
			// console.log("My console for previous notification", previousNotification)
			// if(previousNotification.length <= 0){
				let notiFy = new Notifications(notificationData)
				notiFy.save()
			// }
		}
		catch(err){
			logger.error("Error while sending notifications ",{
				error:err,
				jobId:jobInfo.jobData.id,
				technicianUserId:userId,
			})
			console.log("error in sendNotifications :::: ",err)
		}
	}
	
	

	/**
	 * this function send email alerts to the user given in params
	 * @param : jobInfo(Type:Object) the data which we are receving from the frontend 
	 * @param : user(Type:Object) : all user jobInfo from user table
	 * @response : {void}
	 * @author : Sahil
	 **/
	// const sendEmailAlerts = (user,jobInfo,hire_expert=false,sameTechSearch=false)=>{
	// 	try{
	// 		if(!sentEmails.includes(user.email + "_"+ jobInfo.jobData.id)){
	// 			try{
	// 				if(hire_expert){
	// 					sendJobAlertEmailToExpert({
	// 						userData: user,
	// 						jobData : jobInfo.jobData,
	// 						redirectURL: `${config.appEndpoint}/job-details?jobID=${jobInfo.jobData.id}`

	// 					});
							
	// 				}
	// 				else if(sameTechSearch){
	// 					sendJobAlertEmailForSameTech({
	// 						userData: user,
	// 						jobData : jobInfo.jobData,
	// 						redirectURL: `${config.appEndpoint}/job-details?jobID=${jobInfo.jobData.id}`
	// 						});
	// 				}
	// 				else{
	// 					sendJobAlertEmail({
	// 						userData: user,
	// 						jobData : jobInfo.jobData,
	// 						redirectURL: `${config.appEndpoint}/job-details?jobID=${jobInfo.jobData.id}`
	// 					});
	// 				}
	// 			}
	// 			catch(errors){
	// 				console.log("sendJobAlertEmail :: error :: ",errors)
	// 			}
	// 			sentEmails.push(user.email + "_"+ jobInfo.jobData.id)
	// 			logger.info(`Email sent to technician ${user.email}`,{
	// 				'jobId':jobInfo.jobData.id,
	// 				'technicianEmailId':user.email
	// 			});
	// 		}
							
	// 	}
	// 	catch(err){

	// 		logger.error("Error while sending Email ",{
	// 			error:err,
	// 			jobId:jobInfo.jobData.id,
	// 			technicianUserId:user.id,
	// 			email:user.email
	// 		})

	// 		console.log("error in sendEmailAlerts :::: ",err)
	// 	}
	// }

	/**
	 * this function send sms alerts to the user given in params
	 * @params : jobInfo(Type:Object)
	 * @param : phoneNumber(Type:Number) , userId(Type:String),softwareDate(Type:Object)
	 * @response : {void}
	 * @author : Sahil
	 **/

	const sendSmsAlerts = async(jobInfo,phoneNumber,userId,softwareData,sameTechSearch=false )=>{
		try{
			let user = await (User.findOne({ '_id': userId }))
			let helpName = (jobInfo.jobData.subOption)?softwareData.name+ ' '+jobInfo.jobData.subOption:softwareData.name;
			let message  = 'Geeker - New job of '+ helpName +' posted by customer '+jobInfo.jobData.customer.user.firstName+'.'
			if(jobInfo.jobData.hire_expert){
				message  = 'Geeker - New 2 tier job of '+ helpName +' posted by customer '+jobInfo.jobData.customer.user.firstName+'.'
			}
			if(sameTechSearch){
				message  = 'Geeker - New Direct Request for ' + user.firstName + ' by ' + jobInfo.jobData.customer.user.firstName + ' '+ jobInfo.jobData.customer.user.lastName +' for '+ helpName +', please respond or reschedule within 5 min.'	
			}
			TextService.sendSmsToNumber(phoneNumber,message,jobInfo.jobData.id)
			logger.info("Sms sent to phone number "+phoneNumber,{
				'technicianUserId':userId, 
				"jobID":jobInfo.jobData.id,
				"technicianPhoneNumber":phoneNumber
			});
		}
		catch(err){
			logger.error("error in sendSmsAlerts :::: ",{
				error:err,
				jobID:jobInfo.jobData.id,
				userId:userId,
				phoneNumber:phoneNumber,
				softwareData:softwareData,
			})
			console.log("error in send",err)
		}
	}

	/**
	 * it creates estimated earnings for technician which is shown in his notification
	 * @params : softwareData(Type:Object) it is an jobInfo of software coming from softwares table in database
	 * @return : value in String
	 * @author : Karan
	 **/

	const getEstEarning = (softwareData) => {User
		try{
			const time1 = parseInt(softwareData.estimatedTime.split("-")[0])
			const time2 = parseInt(softwareData.estimatedTime.split("-")[1])
			let price_Arr = softwareData.estimatedPrice? softwareData.estimatedPrice.split("-"): []

			if(price_Arr.length > 0){
				let initPriceToShow = (time1/6)*parseInt(price_Arr[0])
				let finalPriceToShow = (time2/6)*parseInt(price_Arr[1])
				return '$'+ Math.floor(initPriceToShow) +'-' + Math.floor(finalPriceToShow)
			}else{
				return '';
			}
		}
		catch(err){
			logger.error("error in getEstEarning:::",{
				error:err,
				softwareData:softwareData,
			})
			return ''
		}
	}

	/**
	 * Save userlifecycle details
	 * @param user_id 
	 * @param userType 
	 * @param actionType 
	 */
	function saveUserLifeCycle(user_id, userType, actionType){
		try{
			const userLifeCycleStates = {}
			userLifeCycleStates['user'] = user_id;
			userLifeCycleStates['userType'] = userType;
			userLifeCycleStates['actionType']= actionType
			console.log("UserLifeCYcle ::::: user_id, userType, actionType", user_id, userType, actionType);
			const userLifeCycle = new UserLifeCycle(userLifeCycleStates)
			userLifeCycle.save()
			logger.info("Userlifecycle saved :::: ",{
				"userLifeCycleStates":userLifeCycleStates
			})
		}
		catch(err){
			logger.error("Userlifecycle catch ::::", {
				'err':err,
				'user_id':user_id, 
				'userType':userType,
				'actionType':actionType,
			});
		}
	}
	/**
	 * this function add minutes to the given time
	 * @param : date(Type:Date Object) javascript date object
	 * @param : minutes(Type:Integer) 
	 **/
	function addMinutes(date, minutes) {
		return new Date(date.getTime() + minutes*60000);
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
	 * this function will check if the technician is already notified or not
	 * @param: userId(Type:String) user id of technician
	 * @param : jobInformation(Type:Object) jobInfo of job with all fields present in database of job table
	 * @response : boolean
	 * @author : Sahil
	 **/
	const checkIfTechnicianIsAlreadyNotified = async (userId,jobInformation)=>{
		try{
			let technicianNotificationCount = await Notifications.count({"user":userId,"job":jobInformation.jobData.id,"type":"new_job"})
			if(technicianNotificationCount == 0){
				return true
			}
			else{
				return false
			}
		}
		catch(err){
			logger.error("error in checkIfTechnicianIsAlreadyNotified ::: ",{
				"error":err,
				"userId":userId,
				"jobInformation":jobInformation
			})
			console.log("error in checkIfTechnicianIsAlreadyNotified ::: ",err)
		}
	}


	/**
	 * this add entries of technician in the database who are notified
	 * userId : User id of technician (Type:String) 
	 * jobData : jobInfo of job coming from the database (Type:Object)
	 **/

	const sendWebNotificationAlerts = async(userId, jobData)=>{

		try{
			let jobdetail = await JobService.findJobById(jobData.id);
			// console.log("jobdetail ::::::::::::::::::::::::::::::::::::::: ",jobdetail)
			// let savedNotifiedTechs = (jobdetail.notifiedTechs && jobdetail.notifiedTechs.length == 0 )?jobData.notifiedTechs:jobdetail.notifiedTechs;
			const technician = await Technician.find({ user:userId});
			let notifiedTech = {
				'techId' : technician[0]['_id'],
				'techStatus': technician[0]['status'],
				'notifyAt' : new Date(),
				'jobStatus' : "",
				'notifyEndAt' : "",
			}
			// savedNotifiedTechs.push(notifiedTech);
			await JobService.updateJob(jobData.id, {$push: {"notifiedTechs":notifiedTech}});
		}
		catch(err){
			logger.info("Error in Notified Users :::: ",{
				"error":err,
				"jobId":jobData.id
			})
		}
	}
	
	/**
	 * Following function to send email to managment team for job cancelled by customer
	 * @params:data
	 * @author:Mamta
 	*/
 	const informStakeholdersJobCancelled = async(data)=>{
 		try{
 			console.log("informStakeholdersJobCancelled>>>>>>>>>>", data)
 			logger.info('informStakeholdersJobCancelled', {jobId:data.id, jobType:data.customer.customerType});
 			let customerName = data.customer.user.firstName + " "+ data.customer.user.lastName;
 			if(data.customer.customerType === JOB_TYPE.LIVE){
 				let jobType ='Regular';
 				if(data.status === JOB_STATUS.DECLINED){
	  	 			logger.info("informStakeholders, Job is Cancelled By Customer",{jobId:data.id})
	  	 			jobType= data.status;
  	 		    }
  	 		    //Fetching emails of all the stakeholders
				const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
		        logger.info("informStakeholders Preparing to send Email to stake holders ",{stakeholderData:stakeholderData});
 			
 			Promise.all(
          	 stakeholderData.map((stakeholder)=>{
          	 	try{
          	 		if(stakeholder.job_flow === 'active'){
          	 		  logger.info("informStakeholders about to send email to", {email:stakeholder.email, "job_id":data.id})
                        //alert on email
						 if((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')){
							sendEmailToManagementTeamForJobCancelledByCustomer(stakeholder, data,customerName);
						}
						//alert on phone number
						 let message = "Hi Stakeholder " + stakeholder.name + ", A new " + (jobType === JOB_STATUS.SCHEDULED ? "Schedule" : "Regular") + " job (" + data.JobId + ") of " + data.software.name + " is cancelled by customer " + customerName + "."
						 console.log("informStakeholdersJobCancelled message",message);
						 if((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')){
							TextService.sendSmsToNumber(
								stakeholder.phone,
								message,
								data.id
							)
						}

          	 		}
          	 	}catch(error){
                    logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping ", {error:error, stakeholder:stakeholder, jobId:data.id})        	 		
          	 	}
          	 })
          	)
 		  }
 		}catch(error){
 			logger.info("Error in informStakeholdersJobCancelled ", {error});
 			console.log("Error in informStakeholdersJobCancelled ", error);
 		}
 	} 
 	

 		
 /**
  * Following function for inform stakeholder for sch job cancelled by customer
  * @params:job, reason
  * @author:Mamta
  */
  const informStakeholdersScheduledJobCancelledByCustomer=async(job,reason)=>{
  	try{
  		if(job.customer.customerType === JOB_TYPE.LIVE){
  			const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
		     logger.info("informStakeholders Preparing to send Email to stake holders ",{stakeholderData:stakeholderData});
 			Promise.all(
          	 stakeholderData.map((stakeholder)=>{
          	 	try{
          	 		if(stakeholder.job_flow === 'active'){
          	 		  logger.info("informStakeholders about to scheduled job cancelled email send to", {email:stakeholder.email, "job_id":job.id})
          	 		}
          	 	}catch(error){
                    logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping in schjob cancelled by customer", {error:error, stakeholder:stakeholder, jobId:job.id})        	 		
          	 	}
          	 })
          	)
  		}
  	}catch(error){
  		console.log("Error in informStakeholdersScheduledJobCancelledByCustomer ", error)
  	}
  }
 	
 	
 	/**
 	 * Following function for informing stakeholders for sch_accepted job cancelled by customer
 	 * @params:object
 	 * @author:Mamta
  	*/
  	
  	const informStakeholdersSchAcceptedJobCancelledByCustomer= async(job,reason)=>{
  		try{
  			if(job.customer.customerType === 'live'){
  				const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
		        logger.info("informStakeholders Preparing to send Email to stake holders ",{stakeholderData:stakeholderData});
 			Promise.all(
          	 stakeholderData.map((stakeholder)=>{
          	 	try{
          	 		if(stakeholder.job_flow === 'active'){
          	 		  logger.info("informStakeholders about to accepted sch job cancelled by customer email to", {email:stakeholder.email, "job_id":job.id})
          	 		}
          	 	}catch(error){
                    logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping in accepted schjob cancelled by customer", {error:error, stakeholder:stakeholder, jobId:job.id})        	 		
          	 	}
          	 })
          	)
  			}
  		}catch(error){
  			console.log("Error in informStakeholdersSchAcceptedJobCancelledByCustomer ", error)
  		}
  	}

	async function getTwilioUnreadMessageResponse(twilioChatId, userId) {
		try {
			logger.info('twilioChatId :::::', {twilioChatId})
			const URL = `https://conversations.twilio.com/v1/Conversations/${twilioChatId}/Participants`;
			// const basicAuth = 'Basic ' + btoa(TWILIO_ACCOUNT_SID_CHAT + ':' + TWILIO_AUTH_TOKEN_CHAT);
			const basicAuth = {username:process.env.TWILIO_ACCOUNT_SID_CHAT, password:process.env.TWILIO_AUTH_TOKEN_CHAT}

			const twilioChatResponse = await axios.get(URL, {auth:basicAuth});
			// console.log('twilioChatResponse ::::::::::::::::::::', twilioChatResponse.data)
			logger.info('twilioChatResponse ::::::::::::::::::::', {chatParticipantsInfo:twilioChatResponse.data})
			const haveValidParticipant = twilioChatResponse && twilioChatResponse.data && twilioChatResponse.data.participants
			if (haveValidParticipant) {
				const participants = twilioChatResponse.data.participants
				let maxCount = -Infinity;
				// Loop through the array to find the maximum count
				for (const participant of participants) {
					const currentCount = participant.last_read_message_index;
					// if (currentCount > maxCount || currentCount == null) {
					if (currentCount > maxCount) {
						maxCount = currentCount;
					}
				}
				logger.info("maxCount",maxCount)
				if (maxCount > 0 && maxCount != null) {
					const filtered = participants.filter((item) => item.last_read_message_index < maxCount).map((item) => item)
					logger.info("maxCount filtered",filtered)
					const currentUsersUnreadMessages = filtered.filter((item) => item.identity === userId).map((item) => item)
					logger.info("maxCount currentUser",currentUsersUnreadMessages)
					if(currentUsersUnreadMessages.length > 0){
						return (maxCount - currentUsersUnreadMessages[0].last_read_message_index);
					}else{
						return 0
					}
				}
				else if(maxCount == null) {
					const filtered = participants.filter((item) => item.last_read_message_index >= 0).map((item) => item)
					logger.info("maxCount filtered from else if",filtered)
					const currentUsersUnreadMessages = filtered.filter((item) => item.identity === userId).map((item) => item)
					logger.info("maxCount currentUser from else if",currentUsersUnreadMessages)
					let bothNull = filtered.every(ele => ele.last_read_message_index === null)
					if(bothNull){
						return 0
					}else{
						if(currentUsersUnreadMessages.length > 0){
							return (currentUsersUnreadMessages[0].last_read_message_index + 1)
						}
					}
				} 
				else {
					const filtered = participants.filter((item) => item.last_read_message_index >= 0).map((item) => item)
					logger.info("maxCount filtered from else",filtered)
					const currentUsersUnreadMessages = filtered.filter((item) => item.identity === userId).map((item) => item)
					logger.info("maxCount currentUser from else",currentUsersUnreadMessages)
					if(currentUsersUnreadMessages.length > 0 && currentUsersUnreadMessages[0].last_read_message_index === null){
						logger.info("returning maxCount + 1", maxCount)
						return (maxCount+1)
					}else{
						logger.info("returning 0")
						return 0
					}
				}
				
			} else {
				logger.info("returning 0 again")
				return 0
			}
		} catch (error) {
			logger.error("Error retrieving Twilio chat:", {error});
			return false;
		}
	}

	const RecursiveTech = async(data,sameTechSearch=false,technicianId=false)=>{

		// try {
		// 	logger.info('********************* Finally RecursiveTech called *********************',{
		// 		'data':data,
		// 		'sameTechSearch':sameTechSearch,
		// 		'technicianId':technicianId,
		// 		'jobId':data.jobData.id
		// 	})

		// 	let excludeTech = []
		// 	recursionIndex += 1
		// 	let currentDate = new Date()
		// 	// console.log("usrArr (socket.ts) :::",usrArr)
		// 	const { activeUsers,latestUpdatedJob,techPhoneNumbersObj,availableUsers,techEmailsObj} = await JobService.findTechniciansBySkill(data.jobData.id,technicianId);
		// 	const userIds = activeUsers.map((item) => item['_id']);
		// 	let minutesRecursionWorks =  await decideRecursionMinutes(userIds,data.jobData.id)
		// 	logger.info('ActiveUser Info: Phone Number and Email',{
		// 		"ActivePhoneNumber":techPhoneNumbersObj['active'],
		// 		"ActiveEmail":techEmailsObj['active'],
		// 		"InactivePhoneNumber":techPhoneNumbersObj['inactive'],
		// 		"InactiveEmail":techEmailsObj['inactive'],
		// 		'jobId':data.jobData.id
		// 	})
		// 	//this if condition works in case of  by customer.
		// 	if(data.runMins != undefined){
		// 		minutesRecursionWorks = data.runMins
		// 	}
		// 	//this if condition will work if customer post agains with same technician
		// 	if(data.jobData.post_again_reference_technician != undefined){
		// 		minutesRecursionWorks = 0
		// 	}
		// 	logger.info('Search will run for '+minutesRecursionWorks.toString()+' minutes',{
		// 		'jobId':data.jobData.id
		// 	})
		// 	let postedDate = addMinutes(new Date(data.postedTime),minutesRecursionWorks)
		// 	// logger.info('Posted date of job ('+data.jobData.id +') is '+postedDate)
		// 	let softwareData = (typeof(data.jobData.subSoftware) == 'string' ? await Software.findById(data.jobData.subSoftware) : data.jobData.software)
			
		// 	for(const k in userIds ){
		// 		const latestJobCancel = await  JobService.findJobById(data.jobData.id)
		// 		if(latestJobCancel.status == "Declined"){
		// 			break; 
		// 		}
		// 		console.log('outside RecursiveTech for LOOP',latestJobCancel.status)

		// 		let techUserObj = activeUsers.find(item=>item._id === userIds[k]) //it finds the object from activeUsers array by its id
				
		// 		var sendReq = await  thirtySecPromise(k)
		// 		// let expression = usrArr[data.jobData.id].includes(userIds[k]+"_"+data.jobData.id)
		// 		let expression = alreadyGetNotify[data.jobData.id].includes(userIds[k]+"_"+data.jobData.id)

		// 		if(sendReq && !expression) {
		// 			logger.info('Alert process start for '+techUserObj.email,{
		// 				'userinfo':techUserObj,
		// 				'alreadyGetNotify':alreadyGetNotify
		// 			})
		// 			io.emit("new-job-alert", {
		// 				receiver: userIds,
		// 				job: data,
		// 				user_id : techUserObj._id,
		// 				user_email : techUserObj.email
		// 			});
		// 			// sending text message code by manibha starts
		// 			//  console.log("techPhoneNumbersObj :::::::",techPhoneNumbersObj)
		// 			//  console.log("techPhoneNumbersObj[userIds[k]]",techPhoneNumbersObj['active'][userIds[k]])
		// 			// console.log("softwareData ::::::: ",softwareData)
					
		// 			// else{
		// 			// 	logger.error("RecursiveTech: error While sending new job sms",{
		// 			// 		'PhoneNumber':techPhoneNumbersObj[userIds[k]], 
		// 			// 		'softwareData':softwareData,
		// 			// 		'jobId':data.jobData.id,
		// 			// 	});
		// 			// }
		// 			// sending text message code by manibha ends

		// 			if(!decline_arr.includes(userIds[k]+"_"+data.jobData.id)){
		// 				let notAlreadyNotified  = await checkIfTechnicianIsAlreadyNotified(userIds[k],data)
		// 				// console.log(`latestUpdatedJob.hire_expert ::::: ${latestUpdatedJob._id}`,latestUpdatedJob.hire_expert)
		// 				logger.info('userIds[k]::::: ',{"usrArrData":alreadyGetNotify})
		// 				try{
		// 					if(notAlreadyNotified) {
		// 						sendNotifications(data,userIds[k],softwareData,latestUpdatedJob.hire_expert,sameTechSearch)
		// 						// usrArr[data.jobData.id].push(userIds[k]+"_"+data.jobData.id)
		// 						alreadyGetNotify[data.jobData.id].push(userIds[k]+"_"+data.jobData.id)
		// 						sendWebNotificationAlerts(userIds[k], data.jobData)
								
		// 						if(techPhoneNumbersObj['active'][userIds[k]] && softwareData){
		// 							sendSmsAlerts(data,techPhoneNumbersObj['active'][userIds[k]],userIds[k],softwareData,sameTechSearch)
		// 						}
									
		// 						if(techEmailsObj['active'][userIds[k]] !== '' && techEmailsObj['active'][userIds[k]] !== undefined)
		// 						{ 	
		// 							sendEmailAlerts(techUserObj,data,latestUpdatedJob.hire_expert)
		// 						}
		// 						// else{
		// 							// 	sendEmailAlerts(techUserObj,data,latestUpdatedJob.hire_expert)
		// 							// }
		// 							logger.info("AlreadyNotifyTechData: Notification and message send To UserId "+userIds[k]+' and Email '+ techUserObj.email ,{
		// 								'alreadyGetNotify':alreadyGetNotify,
		// 								'jobData':data.jobData.id,
		// 								'NotificationSentToUser':userIds[k]
		// 							})
		// 						}
		// 					else{
		// 						let updatedNotification = {
		// 							"read":false,
		// 							"shownInBrowser":false,
		// 							"updatedAt": moment()
		// 						}
		// 						if(data.jobData.hire_expert){
		// 							let user = await (User.findOne({ '_id': userIds[k] }))
		// 							updatedNotification["title"] = user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + ', a new job is waiting for you. This is a 2 tier job. Click "Details" to learn more.  '
		// 						}
		// 						await Notifications.update({"user":userIds[k],"job":data.jobData.id,"type":"new_job"},updatedNotification)
		// 					}
		// 				}
		// 				catch(err){
		// 					logger.error("Error in saving notification :: ",{
		// 						"jobId":data.jobData.id,
		// 						"error":err
		// 					})
		// 				}
		// 			}
		// 		}
					
		// 		io.emit("refresh-notifications-technicians")
		// 	}
			
		// 	let timeForRecursionEnd = new Date (postedDate).getTime() //value of stopping the recursin in milliseconds
		// 	let currentTimeValue = new Date (currentDate).getTime() //current time value in milliseconds

		// 	/**
		// 	 * if Condtion explanation
		// 	 * @timeForRecursionEnd : it is the time  of posted job after adding the timer of recursion
		// 	 * @currentTimeValue : current time value in milliseconds
		// 	 * this if condtion checks if the current time is greater than the time which for recursion should run
		// 	 * */
			
		// 	if(timeForRecursionEnd > currentTimeValue && latestUpdatedJob.status !== 'Declined' && (latestUpdatedJob.status == "Pending" || latestUpdatedJob.status == "Waiting")){
		// 		logger.info("RecursiveTech: Recursion pending minutes are "+((timeForRecursionEnd - currentTimeValue)/60),{
		// 			'timeForRecursionEnd':timeForRecursionEnd, 
		// 			'currentTimeValue':currentTimeValue,
		// 			'jobId':data.jobData.id,
		// 			'userNotified':userIds,
		// 			'latestUpdatedJob':latestUpdatedJob
		// 		});
		// 		let doneWaiting = await thirtySecPromise(recursionIndex) //waiting for 30 seconds to run the cron
		// 		if(doneWaiting){
		// 			if (sameTechSearch){
		// 				RecursiveTech(data,sameTechSearch,technicianId)
		// 			}
		// 			else{
		// 				RecursiveTech(data)
		// 			}
		// 		}
				
				
		// 	}
		// 	else{
				
		// 		const latestJob = await  JobService.findJobById(data.jobData.id)
		// 		logger.info("RecursiveTech: Recursion time is over.",{
		// 			'jobId':data.jobData.id,
		// 			'latestjob':latestJob,
		// 			'userData':alreadyGetNotify
		// 		});
		// 		if(data.runMins != undefined){
					
		// 			if(latestJob.status == "Waiting"){
		// 				await JobService.updateJob(data.jobData.id, {status:'Declined',tag:'TechnicianNotFound' });
		// 				await JobTagService.createJobTags({"Tag": jobTags.JOB_DECLINED_AFTER_KEEP_SEARCHING, "JobId":data.jobData.id })
		// 				let notificationData = {
		// 								"user":data.jobData.customer.user.id,
		// 								"job":data.jobData.id,
		// 								"actionable":true,
		// 								"title":"No technician found for your following job so the job is declined ",
		// 								"type":"Declined Job",
		// 								"read":false
		// 						}
		// 				let notiFy = new Notifications(notificationData)
		// 				notiFy.save()
		// 				io.emit("refresh-notifications")
		// 			}
		// 		}

		// 		let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone: 'UTC' };
				
			

		// 		if(latestJob.status != "Accepted"){
		// 			logger.info("RecursiveTech: Recursion is over but job is still Not Accepted. Now ready for ***BLAST***",{
		// 				'body':postedDate, 
		// 				'jobId':data.jobData.id,
		// 				'userNotified':userIds,
		// 				'latestJob':latestJob,
		// 				'userData':alreadyGetNotify
		// 			});
					
		// 			if(technicianId){
		// 				console.log("No need to do anything here if tech id is available..")
		// 				if(data.jobData.post_again_reference_technician != undefined && activeUsers.length === 0){

		// 					sendWebNotificationAlerts(data.jobData.post_again_reference_technician,data.jobData)

		// 					let notificationData = {
		// 						"user":data.jobData.post_again_reference_technician,
		// 						"job":data.jobData.id,
		// 						"actionable":true,
		// 						"title":'Post, a new job is waiting for you! Click "Details" to learn more.',
		// 						"type":"new_job",
		// 						"read":false
		// 				    }
		// 						let notiFy = new Notifications(notificationData)
		// 						notiFy.save()
		// 				}
		// 			}else{
		// 				handleAlertBlast(availableUsers,techPhoneNumbersObj,data,softwareData,techEmailsObj)
		// 			}				
		// 		}

		// 	}
		
		// 	// logger.info("RecursiveTech: finding techs for the jobs: ",{
		// 	// 	'body':postedDate, 
		// 	// 	'jobId':data.jobData.id,
		// 	// 	'userNotified':userIds,
		// 	// });

		// }
		// catch (err){
		// 	console.log("error in err",err)
		// 	logger.error("RecursiveTech: Catch error while finding techs: ",{
		// 		'jobId':data.jobData.id,
		// 		'err':err,
		// 	});
		// }
	}





	const io = myModule.io
	// scheduleChecker(io) 
	// scheduleThirty(io)
	// findInActiveUsers(io)
	// ReChangeTheStatus(io)
	meetingEndSocketHit(io)
	// transferPayoutToTechnicians(io)
	// DeleteInActiveUsers(io)
	// checkSubscriptionPaymentStatus(io)
	// deleteTestUsersFromKlaviyo()
	io.on("connection", async(socket) => {
		socket.on('ping', function (data) {
			nr.startWebTransaction('/websocket/ping', function transactionHandler() {
				// Ended automatically after synchronously returning
				socket.emit('pong')
			})
		})
		// let NotifyModel = Notifications
		// let conn =  mongoose.createConnection(MONGO_URI)
		// // let dbl = client.db("tetch").collection("notifications")
		// let stream =  conn.model('Notifications', notificationSchema).watch();
		// stream.on('insert',()=>{
		//   console.log("changed InDatabase ::")
		// })
		// console.log(">>>>>>>>>socket.conn.remoteAddress>>>>>",socket.conn.remoteAddress)
		var $ipAddress = socket.id;
		// console.log($ipAddress,"this is my ip address")
		if (!$ipsConnected.hasOwnProperty($ipAddress)) {
			$ipsConnected[$ipAddress] = 1;
			count++;
			socket.emit('counter', {count:count});
			// console.log(count,"connected")

		}

		socket.on("calculate-unread-twiio-messages", (data)=>{
			nr.startWebTransaction('/websocket/calculate-unread-twiio-messages', async function transactionHandler() {
				logger.info("calculate-unread-twiio-messages", {data:data})
				let queryParam;
				if (data.user.userType === 'technician') {
					queryParam = { 'technician.id': data.user.id };
				} else {
					queryParam = { 'customer.id': data.user.id };
				}
				const chatDocuments = await TwilioChat.find(queryParam).sort({ createdAt: -1 });
				logger.info("chatDocuments", {chatDocuments})

				// Now, filter the chatDocuments array to remove items where chat_id starts with 'job'
				const filteredData = chatDocuments.filter(item => !item['chat_id'].startsWith('job'));
				
				if(filteredData && filteredData.length > 0){
					logger.info("filteredData", {filteredData})
					let totalUnreadMessagesCount = 0
					for (let i = 0; i < filteredData.length; i++) {
						let sid = filteredData[i].twilio_chat_service.sid
						logger.info('sid ::::::',sid)
						const unreadMessagesFromSinglechat = await getTwilioUnreadMessageResponse(sid, data.user.id)
						logger.info('unreadMessagesFromSinglechat ------------ ::::::',{unreadMessagesFromSinglechat})
						if (unreadMessagesFromSinglechat) {
							totalUnreadMessagesCount += Number(unreadMessagesFromSinglechat)
						}
						logger.info("Unread messages between participants: ", {totalUnreadMessagesCount});
						io.emit("send-unread-twiio-messages",{totalUnreadMessagesCount, userId:data.user.id})
					}
				}
			})
		})


		socket.on("refresh-twilio-unread-messages",({customerUserId,technicianUserId})=>{
			nr.startWebTransaction('/websocket/refresh-twilio-unread-messages', function transactionHandler() {
				logger.info("refresh-twilio-unread-messages", {customerUserId,technicianUserId})
				io.emit("refresh-twilio-unread-messages-frontend",{customerUserId,technicianUserId})
        	})
		})

		socket.on("send-GTM-tag-tech-onboard",(data)=>{
			nr.startWebTransaction('/websocket/send-GTM-tag-tech-onboard', function transactionHandler() {
				logger.info("send-GTM-tag-tech-onboard", {data:data})
				postGTMTagForTechOnboard(data)
			})
		})

		socket.on("send-GTM-data",(data)=>{
			nr.startWebTransaction('/websocket/send-GTM-data', function transactionHandler() {
				logger.info("send-GTM-data for event", {data:data})
				postGTMTagForAnEvent(data.dataToSend)
			})
		})
		
		socket.on("meeting-started-by-customer",(data)=>{
			nr.startWebTransaction('/websocket/meeting-started-by-customer', function transactionHandler() {
				// logger.info("meeting-started-by-customer", {data:data})
				if(data.jobData && data.jobData.technician && data.jobData.technician.id && data.jobData.technician.user){
					io.emit("update-job-technician",{techId:data.jobData.technician.id, techUserId:data.jobData.technician.user.id})		
				}else{
					logger.error("URGENT ERROR :::: Technician data is missing while socket emit of `meeting-started-by-customer` : ",{
						'data':data
					});
				}
			})
		})

		socket.on("meeting-started-by-technician",(data)=>{
			nr.startWebTransaction('/websocket/meeting-started-by-technician', function transactionHandler() {
				// logger.info("meeting-started-by-technician", {data:data})
				if(data.jobData && data.jobData.customer && data.jobData.customer.id && data.jobData.customer.user){
					io.emit("update-job-customer",{cusId:data.jobData.customer.id, cusUserId:data.jobData.customer.user.id})		
				}else{
					logger.error("URGENT ERROR :::: Customer data is missing while socket emit of `meeting-started-by-technician` : ",{
						'data':data
					});
				}				
			})
		})

		socket.on('technician:assigned',(data)=>{
			io.to(data.job).emit("new-appointment-request",{technician:data.technician,job:data.job,singleCustomer:true})
			io.emit("technician:assigned",data)
		})
		socket.on("notifications-updated",()=>{
			nr.startWebTransaction('/websocket/notifications-updated', function transactionHandler() {
				console.log("notification socket received")
				io.emit("refresh-notifications")
			})
		})

		socket.on("ten-min-meeting",(data)=>{
			nr.startWebTransaction('/websocket/ten-min-meeting', function transactionHandler() {
				io.emit("ten-min-meeting",data)
			})
		})

		socket.on("scheduled-call-alert",(data)=>{
			nr.startWebTransaction('/websocket/scheduled-call-alert', function transactionHandler() {
				io.emit("scheduled-call-alert",data)
			})
		})

		socket.on("unread-messages-notification",(data)=>{
			nr.startWebTransaction('/websocket/unread-messages-notification', function transactionHandler() {
				console.log("unread-message-notification-send",data)
				io.emit("unread-messages-notification",data)
			})
		})
		// socket.on("unread-messages-notification", async (data) => {
		// 	console.log("unread-message-notification-send",data)
		// 	io.emit('unread-messages-notification',data)
		// });

		socket.on("checkingForusers",(data)=>{
			logger.info('LiveUser:ActiveUser-Information',{
				'UserId':data.activeUsers
			})		
			nr.startWebTransaction('/websocket/checkingForusers', function transactionHandler() {
				io.emit("checkingForusers",data)
			})
		})
		socket.on("clearUsers",(data)=>{
			nr.startWebTransaction('/websocket/clearUsers', function transactionHandler() {
				console.log("clearUsers socket received ")
				io.emit("clearUsers",data)
			})
		})
	 
		socket.on("notificationsUpdatedInadmin",()=>{
			nr.startWebTransaction('/websocket/notificationsUpdatedInadmin', function transactionHandler() {
				io.emit("refresh-notifications")
			})
		})

		socket.on("present",async(data)=>{
			
			nr.startWebTransaction('/websocket/present', async function transactionHandler() {
				logger.info("LiveUser:Present-ActiveUser-Information: ",{
					"presentUserId":data.userId
				  });
				const active_user_data = await User.findOne({'_id':data.userId})
				$ipAddress = socket.id;
				let temp = {}
				temp['userId'] = data.userId
				temp['ip'] = $ipAddress
				temp['user'] = data.userId
				temp['userType'] = data.userType
				temp['experiences'] = ''
				temp['ratings'] = 0
				temp['jobsSolved'] = 0
				
				//enter logs in userlifecycle table
				saveUserLifeCycle(data.userId, data.userType, "rejoined")
				if(data.userType == 'technician'){
					let expert_softwares = []
					socket.join("technicians")
					const technician = await Technician.find({ user:data.userId}); 
					var expertises = technician[0]['expertise']
					let soft_li = expertises.map(item=>item.software_id)
					const feedBacks = await Feedback.find({to:data.userId,is_solved:true})
					temp['jobsSolved'] = feedBacks.length
					let overAllRatings = computeRatings(feedBacks)
					// console.log('overAllRatings>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',overAllRatings)
					temp['ratings'] = overAllRatings

					const experiences = await Experience.find({
						_id :{ $in:
										technician[0].experiences
												}
					});
					temp['experiences'] = soft_li
					
					for(let exp in expertises){
						if(expertises[exp]['two_tier_value'] == 'expert'){
							expert_softwares.push(expertises[exp]['software_id'])
						}
					}

					temp['expertExperiences'] = expert_softwares
					temp['technicianType'] = technician[0]['tag']

					logger.info("LiveUser:Present-Technicain-ActiveUser-Information :",{
						'TechnicianId':data.userId,
						'Technician-AvailableForJob':active_user_data.availableForJob
					  });
				}
				else{
					logger.info("LiveUser:Present-Customer-ActiveUser-Information:",{
						'customerId':data.userId,
					  });
				}
				
				if(active_user_data && (active_user_data.availableForJob == undefined || active_user_data.availableForJob == null || active_user_data.availableForJob == true)){
					const  activeUsers = new ActiveUser(temp)
					activeUsers.save()

				}
			})
		})

		socket.on("join-user", () => {
			nr.startWebTransaction('/websocket/join-user', function transactionHandler() {
				socket.join("job-post");
			})
		});

		socket.on("send-business-info-to-admin", (data) => {
			nr.startWebTransaction('/websocket/send-business-info-to-admin', function transactionHandler() {
				console.log("My console for send-business-info-to-admin", data)
				sendEmailToaAdminForBusinessInfo(data)
			})
		});
		
		socket.on("send-user-left-email-to-admin", (data) => {
			nr.startWebTransaction('/websocket/send-business-info-to-admin', function transactionHandler() {
				console.log("My console for send-user-left-email-to-admin", data)
				sendEmailToaAdminForLeavingUser(data)
			})
		});

		socket.on('disconnect',  function() {
			nr.startWebTransaction('/websocket/disconnect',async function transactionHandler() {
				let $ipAddress = socket.id
				try{
					const updatedData = loggedInUsers.filter((item)=>item.ip != $ipAddress)
					const actUser = await ActiveUser.findOne({ip:$ipAddress})
					
					// if (actUser){}
					if(actUser){
						//enter logs in userlifecycle table
						saveUserLifeCycle(actUser['user'], actUser['userType'], "disconnect")
						
						let date_options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:'America/New_York'};

						// 
						let logsToSave = {
							"message":`${actUser['user']} is Disconnected`,
							"stack":`User id ::: ${actUser['user']} disconnected at ${new Date().toLocaleTimeString('en-US', date_options)}`,
							"severity":"error"
						}
						let logs = new Log(logsToSave)
						logs.save()
					}
					await ActiveUser.deleteOne({ip:$ipAddress}).then(()=>{
						console.log("succesfully deleted")
						logger.info("LiveUser: Delete Active User when Tab is close ", {
							'body': $ipAddress,
							'UserId': actUser['user']
						});
					})
					if ($ipsConnected.hasOwnProperty($ipAddress)) {
						delete $ipsConnected[$ipAddress];
						count--;
						socket.emit('counter', {count:count});
						console.log(count,"disconnected")
						logger.info("LiveUser:Delete Active User when Tab is close with IP: ", {
							'body': $ipAddress,
							'info': { "loggedInUsers": loggedInUsers, "disconnectedCount": count },
						});
					} 
					loggedInUsers = updatedData
					
				}
				catch (err){
					logger.error("disconnect: Catch error while deleting IPs: ",{
						'body':$ipAddress,
						'err':err,
					});
				}
			})
		});

		socket.on("loggedIn",async(data,fn) =>{
			nr.startWebTransaction('/websocket/loggedIn', async function transactionHandler() {
				console.log('loggedIn>>>>>>>>>>>')
				$ipAddress = socket.id;
				let temp = {}
				temp['userId'] = data.userId
				temp['ip'] = $ipAddress
				temp['user'] = data.userId
				temp['userType'] = data.userType
				temp['experiences'] = ''
				temp['ratings'] = 0
				temp['jobsSolved'] = 0
				try{
					const theJob =  JobService.findJobByParams({"schedule_accepted_by_technician":data.userId})
					theJob.then((res)=>{
						// console.log("res:::: ",res[0].customer['_id'])
						if(res.length > 0){
							for(var k in res){
								let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:res[k].customer['user']['timezone']};
								let primarytime = new Date(res[k].primarySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
								let secondrytime = new Date(res[k].secondrySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
								let mytime = new Date().toLocaleTimeString('en-US', DATE_OPTIONS)
								let timeStart = new Date(mytime).getTime();
								let timeEnd = new Date(primarytime).getTime();
								let seconTimeEnd = new Date(secondrytime).getTime();
								var hourDiff = timeEnd - timeStart; //in ms
								var seconHourDiff = seconTimeEnd - timeStart
								var minDiff = hourDiff / 60 / 1000; //in minutes

								if(minDiff === 15 || (minDiff <15 && minDiff > -1)){
									let notify_data = {
										user:res[k]['customer']['user']['_id'],
										title:"Technician is online and join scheduled meeting with you soon.",
										actionable:true,
										read:false,
										job:res[k]['_id'],
										type:"status"
									}
									// console.log("notify_data :::: ",notify_data)
									// let notification = new Notifications(notify_data)
									// notification.save()
									// io.emit("refresh-notifications")
								}
							} 
						}
					})
				} catch(err){
					console.log("error in try loggedOut socket :::: ",err)
				}  

				if(data.userType == 'technician'){
					let expert_softwares = []
					const technician = await Technician.find({ user:data.userId}); 
					let expertises = technician[0]['expertise']
					let soft_li = expertises.map(item=>item.software_id)
					const feedBacks = await Feedback.find({to:data.userId,is_solved:true})
					temp['jobsSolved'] = feedBacks.length
					let overAllRatings = computeRatings(feedBacks)
					temp['ratings'] = overAllRatings

					const experiences = await Experience.find({
						_id :{ $in:technician[0].experiences}
					});

					// let soft_li = experiences.map(item=>item.software)
					temp['experiences'] = soft_li

					for(let exp in expertises){
						if(expertises[exp]['two_tier_value'] == 'expert'){
							expert_softwares.push(expertises[exp]['software_id'])
						}
					}

					temp['expertExperiences'] = expert_softwares
					temp['technicianType'] = technician[0]['tag']

					logger.info("LiveUser:ActiveUser-Information Login Time:Technician status",{
						'TechnicianId':data.userId,
						'Technician-AvailableForJob':data.user.availableForJob
					  });
					
				}
				else{
					logger.info("LiveUser:ActiveUser-Information Login Time:Customer status",{
						'CustomerId':data.userId,
						'CustomerStatusForJob':data.user.availableForJob
					});
				}
				// console.log(loggedInUsers.findIndex(user => user.userId == data.userId) == -1)
				if(loggedInUsers.findIndex(user => user.userId == data.userId) == -1 && (data.user.availableForJob == true || data.user.availableForJob == undefined)){
					loggedInUsers.push(temp)
					const  activeUsers = new ActiveUser(temp)
					activeUsers.save()
				}

				// fn(true)
			})
		})

		socket.on("loggedOut",async(data) => {
			nr.startWebTransaction('/websocket/loggedOut', async function transactionHandler() {
				$ipAddress = socket.id;
				try{
					//enter logs in userlifecycle table
					saveUserLifeCycle(data.userId, data.userType, "logged_out")

					const theJob =  JobService.findJobByParams({"schedule_accepted_by_technician":data.userId})
					theJob.then((res)=>{
						// console.log("res:::: ",res[0].customer['_id'])
						if(res.length > 0){
							for(var k in res){
								let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:res[k].customer['user']['timezone']};
								let primarytime = new Date(res[k].primarySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
								let secondrytime = new Date(res[k].secondrySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
								let mytime = new Date().toLocaleTimeString('en-US', DATE_OPTIONS)
								let timeStart = new Date(mytime).getTime();
								let timeEnd = new Date(primarytime).getTime();
								let seconTimeEnd = new Date(secondrytime).getTime();
								var hourDiff = timeEnd - timeStart; //in ms
								var seconHourDiff = seconTimeEnd - timeStart
								var minDiff = hourDiff / 60 / 1000; //in minutes

								if(minDiff === 15 || (minDiff <15 && minDiff > -1)){
									let notify_data = {
										user:res[k]['customer']['user']['_id'],
										title:"Technician is not available to  join the scheduled meeting.",
										actionable:true,
										read:false,
										job:res[k]['_id'],
										type:"status"
									}
									// console.log("notify_data :::: ",notify_data)
									let notification = new Notifications(notify_data)
									notification.save()
									io.emit("refresh-notifications")
								}
							}
						}
					})
				} catch(err){
					console.log("error in try loggedOut socket :::: ",err)
				}
				logger.info("LiveUser:Logout-ActiveUser-Information:",{
					'UserId':data.userId,
				});
				// schedule_accepted_by_technician
				ActiveUser.deleteOne({user:data.userId}).then(()=>{
					console.log("succesfully deleted")
				})

				const updatedData = loggedInUsers.filter((item)=>item.userId != data.userId)
				loggedInUsers = updatedData
			})
		})

		socket.on("job-declined-by-customer",(data)=>{
			nr.startWebTransaction('/websocket/job-declined-by-customer', function transactionHandler() {
				io.emit("refresh-notifications")
			})
		})

		socket.on("job-cancel-by-customer",async (data)=>{
			logger.info('Start Function job-cancel-by-customer',{
				'jobData':data,
				'jobId':data.id
			})
			let businessName = ''
			console.log("stakeholder notification",data)
			if (data.customer.user.roles[0] === 'owner' && data.customer.user.isBusinessTypeAccount) {
				businessName = data.customer.user.businessName
				console.log("Business name:", data.customer.user.businessName);
				// Replace with your desired logic or JSX code
			  }
			  if (data.customer.user.roles.includes('admin') || data.customer.user.roles.includes('user')) {
				if (data.customer.user.parentId) {
					
					const userInfo = await User.findById(data.customer.user.parentId)
						.populate("customer")
						.populate("technician");
					if(userInfo.isBusinessTypeAccount) {
						businessName = userInfo['businessName']
						console.log("user admin or user", userInfo);
					
					// Replace with your desired logic or JSX code
				  }
				}}
			nr.startWebTransaction('/websocket/job-declined-by-customer', async function transactionHandler() {
				let updateTitle = {
					"read":false,
					"shownInBrowser":false,
					"updatedAt": moment()
				}
				
				updateTitle['title'] = 'This Job is cancel by customer '+data.customer.user.firstName.charAt(0).toUpperCase() + data.customer.user.firstName.slice(1) + (businessName ? '' +', '+businessName : '')+'.';
				let dataNotify = await Notifications.updateMany({"job":data.id,"type":"new_job"},updateTitle)
				await jobCancelByCustomer({
					email:data.customer.user.email,
					firstName: data.customer.user.firstName
					
				});
				
				await informStakeholdersJobCancelled(data);
				
				logger.info('job-cancel-by-customer',{
					'jobId':data.id
				})
				io.emit("refresh-notifications")
				
			})
		})
		socket.on("technician:schedule-job-declined-without-accepted",async (data) =>{
				console.log("technician:schedule-job-declined-without-accepted",data);
				let techName = data.technician_user['firstName'] + " "+ data.technician_user['lastName']
				let job = await Job.findOne({"_id":data.jobId}).populate({path: 'customer', populate: 'user'}).populate('software')
				let techInfo = await Technician.findOne({"_id":job.tech_declined_ids}).populate('user');
				const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
				Promise.all(
					stakeholderData.map((stakeholder)=>{
						try {
							if(stakeholder.job_flow === "active"){
								//alert on email
								if ((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')) {
									sendEmailToStakeholderTechDeclinedSchJob(stakeholder, job, techName)
								}
								//alert on phone number
								let message = "Hi Stakeholder " + stakeholder.name + ", Technician "+ data.technician_user['firstName']+ " is declined a schedule job (" + job.JobId + ")" + "."
								if ((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')) {
									TextService.sendSmsToNumber(
										stakeholder.phone,
										message,
										job.id
									)
								}

								console.log("scheduleCancelledByTechnician", message);
							}else{
								logger.info("Not to informStakeholders send to message ", {phone:stakeholder.phone, "job_id":job.id})
							}
						} catch (error) {
							logger.error("scheduleCancelledByTechnician : Error scheduleCancelledByTechnician  ", {error:error, stakeholder:stakeholder, jobId:job.id})
						}
					})
				)
		})	

		socket.on("technician:schedule-job-declined",async (data)=>{
			let reason = data.reason;
			nr.startWebTransaction('/websocket/technician:schedule-job-declined', async function transactionHandler() {
				let job = await Job.findOne({"_id":data.jobId}).populate({path: 'customer', populate: 'user'}).populate('software')
				let techInfo = await Technician.findOne({"_id":job.tech_declined_ids}).populate('user');
				 
				const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
				
				let notificationData = {
					"user":job['customer']['user']['id'],
					"job":job['id'],
					"actionable":false,
					'customer':job['customer']['id'],
					"title":"Sorry you geek has decline your job we will find another and notify you. Reason: "+data.reason,
					"type":"Declined Job",
					"read":false
				}
				let notify = new Notifications(notificationData)
				notify.save()

				Promise.all(
					stakeholderData.map((stakeholder)=>{
						try {
							
							if(stakeholder.job_flow === "active"){
								//alert on phone number
								let message = "Hi Stakeholder " + stakeholder.name + "," + " Technician "+ techInfo['user']['firstName']+ " is cancelled a schedule job (" + job.JobId + ")" + ".\n" + "Reason : "+ data.reason +"."
								if ((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')) {
									TextService.sendSmsToNumber(
										stakeholder.phone,
										message,
										job.id
									)
								}
								console.log("scheduleCancelledByTechnician", message);
							}else{
								logger.info("Not to informStakeholders send to message ", {phone:stakeholder.phone, "job_id":job.id})
							}
						} catch (error) {
							logger.error("scheduleCancelledByTechnician : Error scheduleCancelledByTechnician  ", {error:error, stakeholder:stakeholder, jobId:job.id})
						}
					})
				)

				// send email to customer
				logger.info(`technician:schedule-job-declined: scheduleCancelByTechJobAlertCustomer:`,{
					'firstName':job['customer']['user']['firstName'],
					'jobId':job.id,
					'email': job['customer']['user']['email'],
					'reason': data.reason,
					'programName': job.software['name'],
					'jobDescription':job.issueDescription,
				});
                let programName = await getProgrameName(job)
                
				await scheduleCancelByTechJobAlertCustomer({
					firstName:job['customer']['user']['firstName'],
					email: job['customer']['user']['email'],
					reason: data.reason,
					programName: programName,
					jobDescription:job.issueDescription,

				})
				io.emit("refresh-notifications")
			})
		})

		socket.on("search-for-tech", async (data)=>{
			nr.startWebTransaction('/websocket/search-for-tech', function transactionHandler() {
				logger.info("Step-1 search-for-tech socket called")
				startSearchingForTech(data)
			})
		})

		socket.on("new-job-alert", async (data) => {
			nr.startWebTransaction('/websocket/new-job-alert', async function transactionHandler() {

				//Checking if "Job Posted" tag is already send or not?
				if(!data.jobData.GA4_job_posted_tag_sent){
					logger.info('Pushing Job Posted tag for ASAP job with job id'+data.jobData.id,{
						'job':data.jobData,
						'tagName' : "Job Posted"
					})
					//Sending GTM tag for "Job Posted"
					postGTMTag(data.jobData, "jobPosted")
					await JobService.updateJob(data.jobData.id, {GA4_job_posted_tag_sent : true});
				}

				logger.info('Find technician logic start at '+ new Date()+ ' for job '+data.jobData.id,{
					'job':data.jobData
				})
				console.log('update statuse in socket',data.status);
				// usrArr[data.jobData.id] = []
				alreadyGetNotify[data.jobData.id] =[]
				// await JobService.updateJob(data.jobData.id,{'status':data.jobData.status,'posted':data.jobData.posted}); 

				// let  {availableUsers,activeUsers} = await JobService.findTechniciansBySkill(data.jobData.id,false,'new-job-alert');
				// availableUsers = availableUsers.concat(activeUsers)
				// let currentlyActiveUsers= await ActiveUser.find({'userType' : "technician"}).populate('user').select('email')
				// if(currentlyActiveUsers){
				// 	let result = currentlyActiveUsers.map(a => a.user['email']);
				// 	logger.info(`Technicians Availale right now:${result.length}`,{
				// 		'body':result,
				// 		'jobId':data.jobData.id,
				// 	});
				// }
				/*let softwareData = (typeof(data.jobData.subSoftware) == 'string' ? await Software.findById(data.jobData.subSoftware) : data.jobData.software)
				for(var k in technicianPhoneNumbers){
					if(technicianPhoneNumbers[k] && softwareData){
						let helpName = (data.jobData.subOption)?softwareData.name+ ' '+data.jobData.subOption:softwareData.name;
						TextService.sendSmsToNumber(technicianPhoneNumbers[k],'Geeker - New job of '+ helpName +' posted by customer '+data.jobData.customer.user.firstName+'.',data.jobData.id)
					}
				}*/
				// logger.info("Searching for same technician  ::::::::::",{'techsearch':data.searchSameTech,'jobId':data.jobData.id,})
				// logger.info("Technician id for new job alert ::::::::::::",{'tech-id':data.technicianId,'jobId':data.jobData.id,})

				if (!data.searchSameTech){
					RecursiveTech(data)
				}
				else{
					RecursiveTech(data,data.searchSameTech,data.technicianId)
				}

				// sendTechnicianSignal(data)

				// console.log("solved")
			})
			
		});
		socket.on('invite-screen', async (job) => {
			nr.startWebTransaction('/websocket/invite-screen', async function transactionHandler() {
				await JobService.updateJob(job.id, {'screenshare':'yes'});
				io.to(job.id).emit("send-screenshare", null);
			})
		})
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("DisableLoader",()=>{
		// 	nr.startWebTransaction('/websocket/DisableLoader', function transactionHandler() {
		// 		io.emit("setLoaderFalse")
				
		// 	})
		// })

		socket.on("stop-timer",(data)=>{
			nr.startWebTransaction('/websocket/stop-timer', function transactionHandler() {
				io.to(data.id).emit("stop-customer-timer",data)
				
			})
		})
		
		socket.on("decline-post-again-job",(data)=>{
			nr.startWebTransaction('/websocket/post-again', function transactionHandler() {
				io.to(data).emit("decline-post-again",data)
			})
		})

		socket.on("decline-post-again-job",(data)=>{
			nr.startWebTransaction('/websocket/post-again', function transactionHandler() {
				io.emit("decline-post-again-dashboard",data)
			})
		})

		socket.on("post-again-schedule-job-cancel",(data)=>{
			nr.startWebTransaction('/websocket/post-again-schedule-decline', function transactionHandler() {
				io.to(data).emit("decline-post-again-schedule",data)
			})
		})

		socket.on("start-timer",(data)=>{
			nr.startWebTransaction('/websocket/start-timer', function transactionHandler() {
				io.to(data.id).emit("start-customer-timer",data)
			
			})
		})
		socket.on('stop-screen', async (job) => {
			nr.startWebTransaction('/websocket/stop-screen', function transactionHandler() {
				io.to(job.id).emit("stop-screenshare", null);
			
			})
		});

		socket.on("new-appointment-request", async (data) => {
			nr.startWebTransaction('/websocket/new-appointment-request', async function transactionHandler() {
				io.emit("new-appointment-request", {
					receiver: data.customer,
					job: data.jobId,
					technician:data.technician
				});
				
				
				await JobService.updateJob(data.jobId, { technician: data.technician,status:'Accepted' });
				// console.log("technician Name ::: ",data.technicianName)
				// let subject = "[CONNECT NOW] We found a tech for you"
				// let previewtext = 'Here’s the link to connect'
				// let email = data.mainJob.customer.user.email
				// console.log("accept button not working here :::",data.mainJob)
				// let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:data.mainJob.customer.user.timezone};
				// let text  = `
				// 		<p style="font-size:26px;font-weight:bold;text-align:center">Help is here</p>
				// 		<p style="text-align:center;font-size:15px;">Click below to connect with your Geek,${data.mainJob.customer.user.firstName} and let’s get your issue solved, ASAP</p> 
				// 		<p style="text-align:center;font-size:15px;"><a href=${process.env.mailEndpoint}>Connect Now</p> 
				// 		<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
				// 			<p style="font-weight:bold;text-align:center;font-size:15px;">Need help?</p>         
				// 			<p style="text-align:center;font-size:15px;">support@geeker.co</p>
				// 		</div>
				// 	`
				

				let notificationData = {
					"user":data.mainJob.customer.user.id,
					"job":data.mainJob.id,
					"actionable":true,
					'customer':data.mainJob.customer.id,
					"title":"We found a Technician for your Job",
					"type":"Scheduled Job ",
					"read":false
									}
				let notiFy = new Notifications(notificationData)
				try{
					await notiFy.save()
				}
				catch(err){
					console.log("notification not saved :::: ",)
				}
				io.emit("refresh-notifications")
				// await dynamicEmail({email,subject,text,previewtext})
				let allJobs = []
				io.emit("update-dashboard-status")
				io.emit("set-join-on-dashboard",{allJobs:[],jobId:data.mainJob.id,tech:data.mainJob.technician})
				
				await JobService.updateTechnician(data.technician, { status: 'Busy' });

				io.emit("failed-job", {
					receiver: data.userIds,
					job : data
				});
			})
		});

		socket.on("join", (jobId) => { 
			nr.startWebTransaction('/websocket/join', function transactionHandler() {
				// console.log("i am joining the room with jobId >>>>>>",jobId)
				socket.join(jobId);
				// console.log(">>>>>>>>>>>>>>>>>>>>Joined",socket)
				 const ids = io.in(jobId).allSockets();
				 // console.log(ids,">>>>ids>>>>>")
			})

		});
		socket.on("accept-job", async(job) => {
			nr.startWebTransaction('/websocket/accept-job', async function transactionHandler() {
				// console.log("inside accept job --------------")
				let start_call_date_time = new Date()
				await JobService.updateJob(job.id, {"status": "Inprogress","start_call_time":start_call_date_time});
				// const responseforCall =  await CallService.conferenceCall(job.id);
				io.to(job.id).emit("accept-job", job);
				// console.log("volatile in accept job ")
				let notificationData = {
					user:job.technician.user.id,
					job:job.id,
					read:false,
					customer:job.customer.id,
					actionable:true,
					title:"Customer is waiting for you, Please join the meeting.",
					type:"meeting_notifcation"
				}
				let notify = new Notifications(notificationData)
				notify.save()
				io.emit("set-join-on-dashboard",{allJobs:[],jobId:job.id,tech:job.technician})
				// console.log("volatile in set join on dashboard")
				io.emit('refresh-notifications')
			})
			

		});

		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("add-start-time-in-job", async(job) => {
		// 	nr.startWebTransaction('/websocket/add-start-time-in-job', async function transactionHandler() {
		// 		let meeting_start_time = new Date()
		// 		await JobService.updateJob(job.id, {"meeting_start_time" :meeting_start_time});
		// 	 })
		// });

		


		socket.on("MuteAll",(data)=>{
			nr.startWebTransaction('/websocket/MuteAll', function transactionHandler() {
				// console.log(data,">>>>>>>>>>job")
				io.emit("mute-signal",{job:data.job})
			})
		})
		socket.on("invite-technician",async(data)=>{
			nr.startWebTransaction('/websocket/invite-technician', async function transactionHandler() {
				// console.log("invite-technician ::: inside")
				await JobService.updateJob(data.job, {"status": "Inprogress"});
				// console.log("socket received.......................................")
				// const res = JobService.getAllJobs()
				// res.then(function(result){
				io.emit("join-scheduled-call",{jobId:data.job,tech:data.tech.user.id})
				// })
			})
		 
		})

		socket.on("zoho-session",(data)=>{
			nr.startWebTransaction('/websocket/zoho-session', function transactionHandler() {
				// console.log('zoho-session socket recieved>>>>>>>>>',data)
				io.to(data.job.id).emit("send-tech-to-zoho-session",data)
			})
		})

		socket.on("change-status",async (data)=>{
			nr.startWebTransaction('/websocket/change-status', async function transactionHandler() {
				await JobService.updateTechnician(data.id, { status: 'Available' });
			})
		})

		socket.on("remote-desktop-triggered",async(jobId)=>{
			nr.startWebTransaction('/websocket/remote-desktop-triggered', function transactionHandler() {
				// socket.join(jobId)
				const res = JobService.findJobById(jobId)
				res.then((result)=>{
					io.emit("start-remote-desktop",result)
				})
			})
		 
		})
		socket.on("technician-ended-meeting",async(data)=>{
			nr.startWebTransaction('/websocket/technician-ended-meeting', function transactionHandler() {
				io.to(data.JobId).emit("technician-tried-to-end-meeting")
			})
		})

		socket.on('customer-need-more-work',async(data)=>{
			nr.startWebTransaction('/websocket/customer-need-more-work', function transactionHandler() {
				// console.log("more work :::::",data.JobId)
				io.to(data.JobId).emit("customer-need-more-work",data)
			})
		})

		socket.on("technician-decline:scheduleJob",async(data)=>{
			nr.startWebTransaction('/websocket/technician-decline:scheduleJob',async function transactionHandler(){
				console.log(">>>>>>>inside decline scheudle job")
				let {activeUsers,availableUsers,technicianPhoneNumbers} = await JobService.findTechniciansBySkill(data.jobId);	
					activeUsers = availableUsers.concat(activeUsers)
				let	userIds = activeUsers.map((item) => item['_id']);
				let techs = availableUsers.filter(item=> item['userType'] == 'technician')
				let	techEmails = techs.map((item) => item['email'])

			})
		})

		socket.on("customer-not-joined",async(data)=>{
			nr.startWebTransaction('/websocket/customer-not-joined', async function transactionHandler() {
				let notificationData = {	
					user:data.user.id,
					job:data.job.id,
					actionable:false,
					title:`Technician is waiting for you to join the meeting for ${data.job.issueDescription}`,
					type:"waiting_for_customer",
					read:false,
				}
				// console.log("customer not joined your call ")
				let notify = new Notifications(notificationData)
				let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:data.user.timezone};
				let selectedDate = ''
				// console.log("data.job.primarySchedule ::: ",data.job.primarySchedule)
				if(data.job.schedule_accepted_on === 'primary'){
					selectedDate = new Date(data.job.primarySchedule).toLocaleString("en", DATE_OPTIONS)
				}
				else{
					selectedDate = new Date(data.job.secondrySchedule).toLocaleString("en", DATE_OPTIONS)
				}
				// console.log("selectedDate ::::: ",selectedDate)
				// let subject = `Your Scheduled meeting started ${selectedDate}`
				// let email = data.job.customer.user.email
				// let text  = `
				// 	<p style="font-size:26px;font-weight:bold;text-align:center">Technician is waiting</p>
				// 	<p style="text-align:center;font-size:15px;">Technician is waiting for your job at ${selectedDate} </p> 
				// 	<p style="text-align:center;font-size:15px;"><a href=${process.env.appEndpoint}>  Join from dashboard </a> </p>
				// `
				// let previewtext = ''
				
				await customerNotJoinedEmail({
					date: selectedDate,
					email:data.job.customer.user.email,
					dash: process.env.appEndpoint,
				})
				// await dynamicEmail({email,subject,text,previewtext})
				notify.save()
				io.emit("refresh-notifications")
				// console.log("technician has not joined your call")
			})
		})

		socket.on("scheduled-job-accepted-by-technician",async(data)=>{
			nr.startWebTransaction('/websocket/scheduled-job-accepted-by-technician', async function transactionHandler() {
				logger.info('Pushing Technician Accepted tag for Schedule job with job id'+data.job.id,{
					'job':data.job,
					'tagName' : "Technician Accepted"
				})
				postGTMTag(data.job, "technicianAccepted")
				console.log("scheduled-job-accepted-by-technician ::: ",)
				let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:data.job.customer.user.timezone};
				let scheduledTimeCustomer;
				let scheduledTimeTechnician;
				if(data.scheduleAccptOnVar == 'primary'){
					scheduledTimeCustomer = new Date(data.job.primarySchedule).toLocaleString("en", DATE_OPTIONS)
				} else{
					scheduledTimeCustomer = new Date(data.job.secondrySchedule).toLocaleString("en", DATE_OPTIONS)
				} 

				let notificationDataForAccpetedJob = {
					"user":data.job.customer.user.id,
					"job":data.job.id,
					"actionable":true,
					"customer":data.job.customer.id,
					"title":`We have found a technician for your job of ${data.job.software.name} at ${data.scheduleAccptOnVar} scheduled time ${scheduledTimeCustomer}`,
					"type":"Scheduled Job Accepted",
					"read":false,
				}   
				let notify = new Notifications(notificationDataForAccpetedJob)
				notify.save()
				io.emit("refresh-notifications")
				io.emit("refresh-tech")
				io.to(data.job.id).emit("refresh-customer",data.job.id)
				DATE_OPTIONS['timeZone'] = data.timezone
				if(data.scheduleAccptOnVar == 'primary'){
					scheduledTimeTechnician = new Date(data.job.primarySchedule).toLocaleString("en", DATE_OPTIONS)
				}else{
					scheduledTimeTechnician = new Date(data.job.secondrySchedule).toLocaleString("en", DATE_OPTIONS)
				} 


				console.log("scheduled time technician ::",scheduledTimeTechnician)
				console.log(">>>>>>>>>>>>>>>>>>>>>BREAK")
				let programeName = await getProgrameName(data.job)
				// let previewtext = 'Thanks for Accepting the job'
				await sendScheduleAlertToCustomer({
					login:process.env.mailEndpoint,
					email:data.job.customer.user.email,
					techName:data.techName,
					softwareName:programeName,
					scheduleTimer:scheduledTimeCustomer,
					calendarLink:`<a href="https://calendar.google.com">Calendar</a>`
				})
				let businessName = await getBusinessName(data.job.customer);
				await scheduleJobAcceptTechnician({
                    email:data.techEmail,
                    firstName:data.job.customer.user.firstName,
                    jobDescription:data.job.issueDescription,
                    scheduleTimer:scheduledTimeTechnician,
					programeName:programeName,
					businessName:businessName,
                })

				// sending text message to customer by manibha starts
				let correctedNumber = data.job.customer.phoneNumber
				TextService.sendSmsToNumber(correctedNumber,'Hi '+data.job.customer.user.firstName +', Your scheduled job has been accepted by technician - '+data.techName+'. He has chosen the '+data.scheduleAccptOnVar+' time '+scheduledTimeCustomer+' of your job. So, please be available on the system.',data.job.id)
				// sending text message to customer by manibha ends


				DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:data.job.customer.user.timezone};

			})

		})

		socket.on("toStartChat-WithCustomer",async(data)=>{
			nr.startWebTransaction('/websocket/toStartChat-WithCustomer', async function transactionHandler() {
				try{
					console.log("toStartChat-WithCustomer ::: ",)
					console.log("data >>>>>>> ",data)
					io.to(data.jobId).emit("refresh-chat",data.jobId)
				}
				catch(err){
					console.log("error in getting start chat cosocket",err)
				}
			})

		})

		socket.on("technician-declined",async(job)=>{
			nr.startWebTransaction('/websocket/technician-declined', async function transactionHandler() {
				// console.log("technician decline socket")
				// const res = JobService.getAllJobs()
				let subject = "Request Rejected"
				// console.log("job.job :::: ",job.job)
				let email = job.job.technician.user.email
				// console.log("customerEmail:::: ",customerEmail)
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

				// let previewtext = 'Request Rejected'
				//  console.log("step :: 3")
				//  await dynamicEmail({email,subject,text,previewtext})

				let programeName = await getProgrameName(job.job)
				await customerDeclinedJobEmail({
					email : job.job.technician.user.email,
					firstName:job.job.customer.user.firstName,
					jobDescription:job.job.issueDescription,
					jobCreatedAt:new Date(job.createdAt).toLocaleString("en", DATE_OPTIONS),
					programeName:programeName,
				})
				 
				await JobService.updateTechnician(job.tech.id, { status: 'Available' });
				// res.then(function(result){
				io.emit("refresh-notifications")
				io.emit("decline-technician",{res:job.tech})
				// })
			})
		})
		socket.on("rejected",async(data)=>{
			nr.startWebTransaction('/websocket/rejected', function transactionHandler() {
				// usrArr = {}
				alreadyGetNotify ={}
				decline_arr.push(`${data.userId}+_+${data.jobId}`)
				io.emit("rejected-by-technician",data)
			})
		})

		/**
		 * Get all tech who have enable the email emailAlertsWithoutLogin setting
		 * @params : Job(Type:Object)
		 * @author : Ridhima Dhir
		 */
		socket.on("send-schedule-alerts",async (job)=>{

			job = {...job, jobObj: {...job.jobObj, primarySchedule: job.primaryTime}}
			console.log("calling this socket :::: send-schedule-alerts ::: ",job)
			nr.startWebTransaction('/websocket/send-schedule-alerts', async function transactionHandler() {
				//Checking if "Job Posted" tag is already send or not?
				if(!job.GA4_job_posted_tag_sent){
					logger.info('Pushing Job Posted tag for Schedule job with job id'+job.id,{
						'job':job,
						'tagName' : "Job Posted"
					})
					//Sending GTM tag for "Job Posted"
					postGTMTag(job.jobData, "jobPosted")
					await JobService.updateJob(job.id, {GA4_job_posted_tag_sent : true});
				}
				console.log("calling this socket for :::: timer ::: ")
				logger.info("send-schedule-alerts :: ",{'job':job})
				let businessName = await getBusinessName(job.customer); // Call the function to get business name
				let techEmails = []
				let technicianPhoneNumbers=[]
				let technicianTimezones=[]
				let availTechs = []
				let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:job.customerTimezone};
				//get program name. In update case we get software id only not full object. 
				//So we check if software name is not set then find software detail by id 
				let programeName = await getProgrameName(job.jobObj);

				// if technicianId is not null
				if(job.technicianId){	
					console.log("My console to check ", job.technicianId)
					const techStats = await Technician.findOne({ user: job.technicianId }).populate({ path: "user" });
					console.log("My console to check 1", techStats)
					let filtertedTechvalues = {
						'techId': techStats._id,
						'techStatus': techStats.status,
						'email': techStats.user['email'],
						'firstName': techStats.user['firstName'],
						'userId': techStats.user['_id'],
						'timezone': techStats.user['timezone'],
						'profile': techStats.profile
					}
					console.log("My console to check 2", filtertedTechvalues)
					if (techStats.profile && techStats.profile.alertPreference && techStats.profile.alertPreference.settings && techStats.profile.alertPreference.settings.Job && techStats.profile.alertPreference.settings.Job.Text && techStats.profile.alertPreference.settings.Job.Text.toggle) {
						technicianPhoneNumbers.push(techStats.profile.alertPreference.settings.Job.Text.value)
					}
					availTechs.push(filtertedTechvalues);
					logger.info("send-schedule-alerts :: if technicianId:: ", { 'availTechs': availTechs, 'technicianPhoneNumbers': technicianPhoneNumbers })
					if(techStats.user && techStats.user['timezone']){
						technicianTimezones.push(techStats.user['timezone'])
					}else{
						technicianTimezones.push("America/New_York")
					}


					//send text alert on tech phone number
					const message = 'Geeker - New scheduled job of ' + programeName + ' posted by customer ' + job.customerName + '. Scheduled time - '
					await sendScheduleSmsToTechs(technicianPhoneNumbers, job, message, technicianTimezones)

					//save notification and update notifiedTechs field in jobs table
					await sendScheduleWebNotificationsToTechs(io, availTechs, job.jobObj)
					//send job alerts on customer by email and phone number
					await customerJobAlert(job, programeName, DATE_OPTIONS)

					//send schedule Job email Alert to Technician 
					await sendScheduleEmailToTechs(programeName, availTechs, job, DATE_OPTIONS,businessName)
				
				}else{
					console.log("My console to check 3", availTechs);
					console.log("job.technicianId :: ", job.technicianId);

					// If no technician assigned to job

					//fetch technicians and there phonenumber for text message alert				
					//let { availTechs, technicianPhoneNumbers} = await JobService.findTechsForScheduleJob(job.jobId);
					const techStats = await JobService.findTechsForScheduleJob(job.jobId);
					technicianPhoneNumbers = techStats['technicianPhoneNumbers']
					availTechs = techStats['availTechs']
					technicianTimezones = techStats['techniciantimezones']
					logger.info("send-schedule-alerts :: if no technicianId:: ", { 'availTechs': availTechs, 'technicianPhoneNumbers': technicianPhoneNumbers,  "technicianTimezones":technicianTimezones})


					//send text alert on tech phone number
					const message = 'Geeker - New scheduled job of ' + programeName + ' posted by customer ' + job.customerName + '. Scheduled time - '
					await sendScheduleSmsToTechs(technicianPhoneNumbers, job, message, technicianTimezones)

					//save notification and update notifiedTechs field in jobs table
					await sendScheduleWebNotificationsToTechs(io, availTechs, job.jobObj)
					//send job alerts on customer by email and phone number
					await customerJobAlert(job, programeName, DATE_OPTIONS)

					//send schedule Job email Alert to Technician 
					await sendScheduleEmailToTechs(programeName, availTechs, job, DATE_OPTIONS,businessName)
				}

			})
		})
		socket.on("KeepSearching",async(data)=>{
			nr.startWebTransaction('/websocket/KeepSearching', async function transactionHandler() {

					try{
						// usrArr[data.jobData.id] = [] 
						//  alreadyGetNotify[data.jobData.id] = []
						console.log('socket KeepSearching 30 min function called') 
						data.runMins = data.useTimer
						// await JobService.updateJob(data.jobData.id, {status:'Waiting', hire_expert:false });
						RecursiveTech(data)
						// let postedDate = addMinutes(new Date(data.postedTime),data.runMins)
						// let currentTime = new Date()
						// let currMin = new Date (currentTime).getMinutes()
						// sendSearchEmail({
						// 		userData: data.user,
						// 		jobData : data.jobData
						// 	});
						// logger.info("KeepSearching: socket KeepSearching 30 min function called: ",{
						// 	'body':data.user.id,
						// 	'jobId':data.jobData.id,
						// });
						// // sending text message to customer by manibha starts
						// let correctedNumber =data.custPhoneNumber
						// TextService.sendSmsToNumber(correctedNumber,'Hi '+data.user.firstName+', Thanks for your patience. We are again searching for technicians to solve your problem. We will let you know as soon as we found a technician for your job.',data.jobData.id)
						// // sending text message to customer by manibha ends

				}
				catch (err){
					logger.error("KeepSearching: socket KeepSearching 30 min function called: ",{
			'err':err,
			'jobId':data.jobData.id,
		  });
				}
			})
		})


		socket.on('invite-remote-desktop', async (job) => {
			nr.startWebTransaction('/websocket/invite-remote-desktop', async function transactionHandler() {
				await JobService.updateJob(job.id, {'remote_desktop':'yes'});
			})
		})
		socket.on('scheduleCancelledByCustomer',async(data)=>{
			console.log(" job :::::::1 ", data)
			let reason = data.reason
			nr.startWebTransaction('/websocket/scheduleCancelledByCustomer', async function transactionHandler() {
				let job = await JobService.findJobById(data.jobId);
				const programeName = await getProgrameName(job)
				const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})

				console.log(" job ::::::: 2", job)
				if(job.schedule_accepted){
					await informStakeholdersSchAcceptedJobCancelledByCustomer(job,reason)
					let notificationData = {
						"user":job.schedule_accepted_by_technician,
						"job":job.id,
						"actionable":true,
						'customer':job['customer']['id'],
						"title":"Customer Cancelled the job. Reason: " + data.reason,
						"type":"Cancelled Job",
						"read":false
					}
					let notify = new Notifications(notificationData)
					notify.save()
					//Send text message
					const technicianPhoneNumbers = []
					const technicianTimezones = []
					const techStats = await Technician.findOne({ _id:job.technician['id']}).populate({ path: "user" });
					if(techStats.profile && techStats.profile.alertPreference.settings && techStats.profile.alertPreference.settings.Job.Text.toggle){
						technicianPhoneNumbers.push(techStats.profile.alertPreference.settings.Job.Text.value)
						if(techStats.user['timezone']){
							technicianTimezones.push(techStats.user['timezone'])
						}else{
							technicianTimezones.push("America/New_York")
						}
						const message = "Customer Cancelled the job. Reason: " + data.reason;
						await sendScheduleSmsToTechs(technicianPhoneNumbers, job, message, technicianTimezones)
					}

					//Send Email
					//console.log(" job :::::::3 ", job.technician['user']['email'])
					let selectedDate = '';
					if (job['schedule_accepted_on'] === 'primary') {
						selectedDate = new Date(job['primarySchedule']).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: job['technician']['user']['timezone'] });
					} else {
						selectedDate = new Date(job['secondrySchedule']).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: job['technician']['user']['timezone'] });
					}
					if(job.technician['user'] && job.technician['user']['email']){
						
						scheduleCancelJobAlertTechnician({
							email: job.technician['user']['email'],
							firstName:job.technician['user']['firstName'],
							reason:data.reason,
							programName:programeName,
							date:selectedDate
						});

					}	


				}else{
					Promise.all(
						stakeholderData.map((stakeholder)=>{
							try {
								console.log("stakeholder",stakeholder);
								if(stakeholder.job_flow === "active"){
									//alert on phone number
									let message = "Hi Stakeholder " + stakeholder.name + "," + " Customer "+ job.customer['user']['firstName']+ " is cancelled a schedule job (" + job.JobId +")" + ".\n" + "Resaon: " + data.reason + "."
									if((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')){
										TextService.sendSmsToNumber(
											stakeholder.phone,
											message,
											job.id
										)
									}
								}else{
									logger.info("Not to informStakeholders send to message ", {phone:stakeholder.phone, "job_id":job.id})
								}
							} catch (error) {
								logger.error("scheduleCancelledByCustomer : Error scheduleCancelledByCustomer  ", {error:error, stakeholder:stakeholder, jobId:job.id})
							}
						})
					)

				}
				await informStakeholdersScheduledJobCancelledByCustomer(job, reason)
				//send email and save notification for customer
				await sendCancelMailToCustomer({
					'email':job.customer['user']['email'],
					'firstName':job.customer['user']['firstName'],
					'customerUserId':job.customer['user']['id'],
					'jobId':job.id,
					'reason':data.reason,
					'programeName':programeName,
				})
				io.emit("refresh-notifications")	
			})
			
		})
		
		socket.on('set-method',(data)=>{
			nr.startWebTransaction('/websocket/set-method', function transactionHandler() {
				io.emit("get-method",data.method)
			})
		})
		
		// Commented by Nafees as per ticket - GKF-237 on 10-07-2023
		// socket.on("dial-number", (job) => {
		// 	nr.startWebTransaction('/websocket/dial-number', function transactionHandler() {
		// 		io.to(job.id).emit("dial-number", null);
		// 	})
		// });
		socket.on("cancel-connect", (job) => {
			nr.startWebTransaction('/websocket/cancel-connect', function transactionHandler() {
				io.to(job.id).emit("cancel-connect", null);
			})
		});
		socket.on("start-share", (job) => {
			nr.startWebTransaction('/websocket/start-share', function transactionHandler() {
				io.to(job.id).emit("start-share", job.pinCode);
			})
		});
		socket.on('call:started',async(data)=>{
			await JobService.updateJob(data.id, {'callStartType':'Phone','technician_started_call':true,'status':"Inprogress"});
			io.to(data.id).emit("call:started-customer")
			io.to(data.id).emit("phone-from-tech")
			io.to(data.id).emit("meeting:join-button",{res :data.id})
		})
		socket.on("match-confirmed", (job) => {
			nr.startWebTransaction('/websocket/match-confirmed', function transactionHandler() {
				io.to(job.id).emit("match-confirmed", job.isMatched);
				console.log("volatile in match-confirmed")
			})
		});
		socket.on("notification-to-technician",(data)=>{
			nr.startWebTransaction('/websocket/notification-to-technician', function transactionHandler() {
				io.to(data.jobId).emit("notification-to-technician-for-timeout")
				console.log("volatile in notification-to-technician-for-timeout")
			})
		})
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("update-time-confirmation", (job) => {
		// 	nr.startWebTransaction('/websocket/update-time-confirmation', function transactionHandler() {
		// 		io.to(job.id).emit("update-time-confirmation", job.time);
		// 		console.log("volatile in update-time-confirmation")
		// 	})
		// });
    	// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("time-estimate-approve", (job) => {
		// 	nr.startWebTransaction('/websocket/time-estimate-approve', function transactionHandler() {
		// 		io.to(job.id).emit("time-estimate-approve", job.approved);
		// 		console.log("volatile in time-estimate-approve :::::::::")
		// 	})
		// });
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023 
		// socket.on("confirm-with-customer", (job) => {
		// 	nr.startWebTransaction('/websocket/confirm-with-customer', function transactionHandler() {
		// 		io.to(job.id).emit("confirm-with-customer", job.time);
		// 		console.log("volatile in confirm-with-customer ::::::::::")
		// 	})
		// });
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023 
		// socket.on("issue-breakdown", (job) => {
		// 	nr.startWebTransaction('/websocket/issue-breakdown', function transactionHandler() {
		// 		io.to(job.id).emit("issue-breakdown", job.issueBreakdown);
		// 		console.log("volatile in issue-breakdown ::::::::::")
		// 	})
		// });
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("confirm-issue-summary", (job) => {
		// 	nr.startWebTransaction('/websocket/confirm-issue-summary', function transactionHandler() {
		// 		io.to(job.id).emit("confirm-issue-summary", job.confirmed);
		// 		console.log("volatile in confirm-issue-summary :::::")
		// 	})
		// });
		socket.on("job-completed", (job) => {
			nr.startWebTransaction('/websocket/job-completed', function transactionHandler() {
				io.to(job.id).emit("job-completed", job.confirmed);
				console.log("volatile in job-completed ::::::::::::")
			})
		});
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("summarize-solution", (job) => {
		// 	nr.startWebTransaction('/websocket/summarize-solution', function transactionHandler() {
		// 		io.to(job.id).emit("summarize-solution", job.solutions);
		// 		console.log("volatile in summarize-solution:::::::::::")
		// 	})
		// });
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("confirm-solution", (job) => {
		// 	nr.startWebTransaction('/websocket/confirm-solution', function transactionHandler() {
		// 		io.to(job.id).emit("confirm-solution", null);
		// 		console.log("volatile in confirm-solution")
		// 	})
		// });
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("stop-timer-due-to-card",(job)=>{
		// 	nr.startWebTransaction('/websocket/stop-timer-due-to-card', function transactionHandler() {
		// 		io.to(job.id).emit("stop-timer-for-card",{"job":job})
		// 		console.log("volatile in stop-timer-for-card")
		// 	})
		// });
		socket.on("calculate-cost-according-to-freesession",(data)=>{
			nr.startWebTransaction('/websocket/calculate-cost-according-to-freesession', function transactionHandler() {
				io.to(data.jobData.id).emit("free-customer-calculation",{data:data})
			})
		})

		socket.on("start-card-timer",(job)=>{
			nr.startWebTransaction('/websocket/start-card-timer', function transactionHandler() {
				io.to(job.id).emit("start-timer-for-card",{"job":job})
				console.log("volatile in start-timer-card ::::::")
			})
		})
		socket.on("technician-submitted-notes",async(data)=>{
			nr.startWebTransaction('/websocket/technician-submitted-notes', function transactionHandler() {
				socket.join(data.jobId);
				io.emit("send-notes-to-customer",data)
				console.log("volatile in send-notes-to-customer::::::::")
			})
		})
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("customer-confirmed-notes",async(data)=>{
		// 	nr.startWebTransaction('/websocket/customer-confirmed-notes', function transactionHandler() {
		// 		socket.join(data.jobId);
		// 		io.emit("send-notes-confirmation-to-technician",data)
		// 		console.log("volatile in send-notes-confirmation-to-technician")
		// 	})
		// })
		// NOTE  : This socket is commented by Jagroop under ticket GK-171  : 28-04-2023
		// socket.on("customer-declined-notes",async(data)=>{
		// 	nr.startWebTransaction('/websocket/customer-declined-notes', function transactionHandler() {
		// 		socket.join(data.jobId);
		// 		io.emit("send-notes-declined-confirmation-to-technician",data)
		// 		console.log("volatile in send-notes-declined-confirmation-to-technician:::")
		// 	})
		// })
		socket.on("technician-updated-job-details",async(data)=>{
			nr.startWebTransaction('/websocket/technician-updated-job-details', function transactionHandler() {
				socket.join(data.jobId);
				io.emit("send-updated-job-details-to-customer",data)
				console.log("volatile in send-updated-job-details-to-customer")
			})
		})
		socket.on("long-job-submission-by-tech",async(data)=>{
			nr.startWebTransaction('/websocket/long-job-submission-by-tech', function transactionHandler() {
				socket.join(data.jobId);
				io.to(data.jobId).emit("long-job-submission-to-cust",data)
				io.to(data.jobId).emit("refresh-notifications")
				logger.info('socket: long-job-submission-by-tech: ', {
					body: data,
					jobId: data.jobId,
				})
			})
		})
		socket.on("re-submit-job-by-cust",async(data)=>{
			nr.startWebTransaction('/websocket/re-submit-job-by-cust', function transactionHandler() {
				socket.join(data.jobId);
				io.to(data.jobId).emit("re-submit-job-to-tech",data)
				io.to(data.jobId).emit("refresh-notifications")
				logger.info('socket: re-submit-job-by-cust: ', {
					body: data,
					jobId: data.jobId,
				})
			})
		})

		socket.on("long-job-approved-by-cust",async(data)=>{
			nr.startWebTransaction('/websocket/long-job-approved-by-cust', function transactionHandler() {
				socket.join(data.jobId);
				io.to(data.jobId).emit("long-job-approved-to-tech",data)
				io.to(data.jobId).emit("refresh-notifications")
				logger.info('socket: long-job-approved-by-cust: ', {
					body: data,
					jobId: data.jobId,
				})
			})
		})

		socket.on('send-more-hours', async (data)=>{
				socket.join(data.jobId);
				console.log('sendMoreHoursToCustomer>>>>>>>>>>>', data)
				let dataToUpdate = {}
				logger.info('sendMoreHoursToCustomer: sending more hours to customer: ', {
					body: data,
					jobId: data.jobId,
				})

				await Job.findByIdAndUpdate({_id:data.jobId}, {additional_hours_submission: "yes", $push: {
					hour_history : {'extra_hours_added': data.hoursValue, 'extra_cost': data.cost,extra_hours_submission:"pending",extra_hours_payment_id:"None",extra_hours_payment_status:"None"} 
				}})
				
				let notify_data = {
					user:data.user,
					title:"Technician requested for more hour(s) for your long-job.",
					actionable:true,
					read:false,
					job:data.jobId,
					shownInBrowser: true,
					type:"additional hour for long-job"
				}
				let notification = new Notifications(notify_data)
				notification.save()
				console.log("Phone:::::::",data.phoneNumber)
				let correctedPhoneNumber =data.phoneNumber
				TextService.sendSmsToNumber(correctedPhoneNumber,'Hi '+data.customerName+'. technician has sent a request for some additional hours for the fixed hour long job, kindly take a look at the request at app.geeker.co and accept/reject request accordingly.',data.jobId)
				additionalHourLongJobEmailCustomer(data);

				io.to(data.jobId).emit('update-additional-hours', data);
		})

		socket.on('edit-job', async ()=>{
			console.log('job-updated :::jobId');
			io.emit('job-updated' );
		})

		socket.on('customer-approved-additional-hours', async (data)=>{
			socket.join(data.id);
			console.log('socket emmited', data);
			let notify_data = {
				user:data.technician.user.id,
				title:"Customer approved additional hours.",
				actionable:true,
				read:false,
				job:data.id,
				shownInBrowser: true,
				type:"additional hour for long-job"
			}
			let notification = new Notifications(notify_data)
			notification.save()
			let technicianCategory = data.technician.commissionCategory
			let softwareObj = data.software
			let softwareComission = await getCountryCodeCommissions(technicianCategory,softwareObj,true)
			let earnedMoney = await cutCommissionCharges(softwareComission,data.total_cost)
			console.log("Earning Details:::::",earnedMoney,softwareComission,)
			await EarningDetails.update({"job_id":data.id},{$set:{"total_amount": data.total_cost,"amount_earned":earnedMoney,"commisiion":softwareComission}})
			const technician = await Technician.findOne({ _id:data.technician.id});
			if(technician && technician){
				TextService.sendSmsToNumber(technician.profile.confirmId.phoneNumber,'Hi. Customer has approved your request for additional hours.',data.id)
			}

			await BillingDetails.update({"job_id":data.id},{$set:{"total_amount": data.total_cost}})
			let email = data.technician.user.email;
			let firstName = data.technician.user.firstName;
			let programName = data.software.name;
			let issueDescription = data.issueDescription;
			let jobId = data.id
			customerApproveAdditionalHours(email,firstName,programName,issueDescription,jobId)
			io.to(data.id).emit('additional-hours-approved', data);


		})

		socket.on('customer-declined-additional-hours', async (data)=>{
			socket.join(data.id)
			console.log('socket emmited', data);
			let notify_data = {
				user:data.technician.user.id,

				title:"Customer declined additional hours.",
				actionable:true,
				read:false,
				job:data.id,
				shownInBrowser: true,
				type:"additional hour for long-job"
			}
			let notification = new Notifications(notify_data)
			notification.save()
			const technician = await Technician.findOne({ _id:data.technician.id});
			if(technician){
				TextService.sendSmsToNumber(
					technician.profile.confirmId.phoneNumber,
					'Hi. Customer has declined your request for additional hours.',
					data.jobId
				)
			}
			let email = data.technician.user.email;
			let firstName = data.technician.user.firstName;
			let programName = data.software.name;
			let issueDescription = data.issueDescription;
			let jobId = data.id
			customerRejectAdditionalHours(email,firstName,programName,issueDescription,jobId)
			io.to(data.id).emit('additional-hours-rejected', data);	
		})

		/**
	 	* This socket calls the function to send email to admin when user submits request for a callback.
	 	* @params : User Input of Name & Phone Number
	 	* @response : Email
	 	* @author : Kartik,Mritunjay
	 	*/

		socket.on("send-user-review-email", async (data) => {
			nr.startWebTransaction('/websocket/send-user-review-email', async function transactionHandler() {
				let userName = data.name;
				let userPhoneNumber = data.phoneNumber;
				let admin_emails = data && data.userTypeStatus === 'live' ? JSON.parse(process.env.adminMails) : JSON.parse(process.env.testAdminMails)
				for (var k in admin_emails) {
					const email = admin_emails[k]
					await sendUserReviewEmailAdmin(userName, userPhoneNumber, email)
				};
			});
		});

		/**
	 	* This socket calls the function take_charge_from_customer.
	 	* @params : job
	 	* @author : Ridhima Dhir
	 	*/
		socket.on("take_charge_from_customer", async (job) => {
			logger.info("take_charge_from_customer", {"job":job})
			nr.startWebTransaction('/websocket/take_charge_from_customer', async function transactionHandler() {
				await takeChargeFromCustomerFromSocket(job)
			});
		});

		/**
	 	* This send email to customer with job which tech do not want charge
	 	* @params : job
	 	* @author : Ridhima Dhir
	 	*/
		socket.on("dont_charge_without_review", async (emailStat) => {
			logger.info("dont_charge_without_review", emailStat)
			nr.startWebTransaction('/websocket/dont_charge_without_review', async function transactionHandler() {
				
				let jobdetail = await JobService.findJobById(emailStat.jobId);
				let adminReviewDetails = {}
				adminReviewDetails['reason'] = ""
				adminReviewDetails['total_cost'] = jobdetail.total_cost
				adminReviewDetails['free_session_total'] = jobdetail.free_session_total
				
				await JobService.updateJob(jobdetail.id, {"technician_charged_customer":'no','total_cost':0,'free_session_total':0,'total_discounted_cost':0, "adminReviewDetails":adminReviewDetails});
				logger.info("dont_charge_without_review", {"jobdetail":jobdetail})

				const searchCriteria = {
					'id': jobdetail.id, 
					customer_user_id:jobdetail.customer['user'].id, 
					technician_user_id:jobdetail.technician['user'].id
				}
				await earningDetailsService.updateEarningDetails(searchCriteria,{'total_amount':0,'amount_earned':0})
				await billingDetailsService.updateBillingDetails(searchCriteria,{'total_amount':0})

				//sendEmail
				await dontChargeWithoutReview(emailStat)
			});
		});

		/**
	 	* This send email to admin with job which tech do not want charge
	 	* @params : job
	 	* @author : Ridhima Dhir,Mritunjay
	 	*/
		 socket.on("admin_review_email", async (emailStat) => {
			logger.info("admin_review_email", emailStat)
			nr.startWebTransaction('/websocket/admin_review_email', async function transactionHandler() {
				let admin_emails = emailStat.is_customer_live === 'live' || emailStat.is_tech_live === 'live' ? JSON.parse(process.env.adminMails) : JSON.parse(process.env.testAdminMails)
				for (var k in admin_emails) {
					emailStat['email'] = admin_emails[k]
					await adminReviewJob(emailStat)
				}
				
			});
		});

		/**
	 	* This send email to admin with job which tech do not want charge
	 	* @params : job
	 	* @author : Ridhima Dhir
	 	*/
		socket.on("admin_review_customer_email", async (emailStat) => {
			logger.info("admin_review_customer_email", emailStat)
			nr.startWebTransaction('/websocket/admin_review_customer_email', async function transactionHandler() {
				await adminReviewJobCustomerAlert(emailStat)
			});
		});

		
socket.on("stakeholder-technician-charge-no", async (data) => {
	logger.info("stakeholder-technician-charge-no", data)
	nr.startWebTransaction('/websocket/stakeholder-technician-charge-no', async function transactionHandler() {
			try {
				
				let customerType = data.job.customer.customerType;
				// let customerType = job['customer']['customerType'];
				let jobStatus = data.job['status'];
				let jobId = data.job['id'];
				let jobDes = data.job['issueDescription'];
				let JobId = data.job['JobId'];
				let custName = data.job['customer']['user']['firstName'] + " " + data.job['customer']['user']['lastName'];
				let techName = data.job['technician']['user']['firstName'] + " " + data.job['technician']['user']['lastName'];
				let paymentStatus = data.job.payment_status;
				let payment_status = (typeof paymentStatus !== 'undefined') ? paymentStatus : 'NA';
				let payment_failed_reason = data.job.error_message;

				let totalTime = data.job.total_time;
				let total_cost = data.job.total_cost;
				let softName = data.job['software']['name'];
				if (customerType === 'live') {
					let jobType = 'Regular';
					if (jobStatus === 'Scheduled') {
						logger.info('Stakeholders, meeting has been Completed ', { jobId: data.job.jobid });
						jobType = jobStatus;
					}
					//Fetching emails of all the stakeholders
					const stakeholderData = await Stakeholder.find({}, { email: 1, job_flow: 1, phone: 1, name: 1,notification_preferences:1, _id: 0 })
					//Sending SMS & Email alert to Geeker statkeholders.
					logger.info("informStakeholders Preparing to send SMS and Email to stake holders ", { stakeholderData: stakeholderData })
					Promise.all(
						stakeholderData.map((stakeholder) => {
							try {
								if (stakeholder.job_flow === "active") {
									//alert on email
									logger.info("informStakeholders about to send email to", { email: stakeholder.email, "job_id": data.job.jobId })
									if((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')){
										stakeHolderMailTechnicianChargeNo(stakeholder, jobType, JobId, jobDes, custName, techName, totalTime, total_cost, paymentStatus, jobId, softName, data.issues)
									}
									//alert on phone number
									let message = "Hi Stakeholder " + stakeholder.name + ", " + (jobType === 'Scheduled' ? "Schedule " : "Regular ") + "job(" + data.job.JobId + ") for " + data.job.software.name + " posted by " + custName + " is completed" + " but " + techName + " decided not to charge Customer" + ".\n" + "Total Paid Time:" + totalTime + "\n" + "Total Cost:$" + total_cost + "\n" + "Reason:" + data.issues
									console.log("informStakeholderForjobComplete", message, data.issues);
									if ((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')) {
										TextService.sendSmsToNumber(
											stakeholder.phone,
											message,
											data.job.id
										)
									}

								} else {
									logger.info("Not to informStakeholders about to send email to", { email: stakeholder.email, "job_id": jobId })
								}
							} catch (error) {
								logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping ", { error: error, stakeholder: stakeholder, jobId: jobId })
							}
						})
					)
				}
			} catch (error) {
				console.log("Error in informStakeholderForjobComplete ", error)
			}
		
	});
	
});


		/**
	 	* This send email to customer that admin approve tech do not want charge
	 	* @params : job
	 	* @author : Ridhima Dhir
	 	*/
		socket.on("admin_review_dont_charge_customer_email", async (job) => {
			let jobId = job.jobId
			logger.info("admin_review_dont_charge_customer_email", {"jobId":jobId})
			nr.startWebTransaction('/websocket/admin_review_dont_charge_customer_email', async function transactionHandler() {
				let jobdetail = await JobService.findJobById(jobId);
				let feedBack = await Feedback.find({"user":jobdetail.customer['user']['id'],"job":jobId})
				console.log("feedback>>>>>>>", feedBack);

				let comments = 'NA';

				if (feedBack.length > 0) {
					const feedbackItem = feedBack[0];
					if (feedbackItem.comments) {
						comments = feedbackItem.comments;
					}
				}
				// This condition is for if admin approve tech do not want charge then we will refund payment hold
				const haveMultipleHoldedPayments = jobdetail && jobdetail.customer_holded_payments && jobdetail.customer_holded_payments.length > 0
				if (haveMultipleHoldedPayments) {
					const stripeReqObj = {
						"params": {
							"stripe_id": jobdetail.customer['stripe_id'],
							'liveUser': jobdetail.customer['customerType'] === 'live' ? "true" : "false",
							'jobId': jobId,
						}
					}
					let stripe = await Services.getStripeObject(stripeReqObj);
					const holdedPyaments = jobdetail.customer_holded_payments
					const refundStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments, "cancelling_holded_payments", stripe, 0,jobId,jobdetail.customer['stripe_id'])
					logger.info("holded payment is refunded now :", { 'jobId': jobId, 'refundStatus': refundStatus });
				}

				logger.info("admin_review_dont_charge_customer_email", {"jobdetail":jobdetail})
				const searchCriteria = {
					'id': jobdetail.id, 
					customer_user_id:jobdetail.customer['user'].id, 
					technician_user_id:jobdetail.technician['user'].id
				}
				await earningDetailsService.updateEarningDetails(searchCriteria,{'total_amount':0,'amount_earned':0})
				await billingDetailsService.updateBillingDetails(searchCriteria,{'total_amount':0})

				//sendEmail
				const programName = await getProgrameName(jobdetail)
				await adminReviewDontChargeCustomerAlert({
					email:jobdetail.customer['user'].email,
					firstName:jobdetail.customer['user'].firstName,
					programName:programName,
					jobDescription:jobdetail.issueDescription,
					techName:jobdetail.technician['user'].firstName,
					reason:jobdetail.adminReviewDetails['reason'],
					customerComment:comments
					
				})
			});
		});

		
		/**
	 	* This send email to admin with job which tech do not want charge
	 	* @params : job
	 	* @author : Ridhima Dhir
	 	*/
		 socket.on("admin_review_refund", async (job) => {
			let jobId = job.jobId
			logger.info("admin_review_refund called", {'jobid':job.jobId})
			nr.startWebTransaction('/websocket/admin_review_refund', async function transactionHandler() {
				let jobdetail = await JobService.findJobById(jobId);
				const customerBillingDetails = await billingDetailsService.findDetailsByJobId(jobId)
				const earnDataDetails = await earningDetailsService.findDetailsByJobId(jobId)
				logger.info("earnDataDetails and customerBillingDetails :: ", {'earningDetails':earnDataDetails, 'billingDetails':customerBillingDetails})
				const searchCriteria = {
					'id': jobdetail.id, 
					customer_user_id:jobdetail.customer['user'].id, 
					technician_user_id:jobdetail.technician['user'].id
				}
				const updatedEarnDataDetails = await earningDetailsService.updateEarningDetails(searchCriteria,{'total_amount':0,'amount_earned':0})
				const updatedBillingDetails = await billingDetailsService.updateBillingDetails(searchCriteria,{'total_amount':0})
				let subscription = jobdetail.customer['subscription']
				if(jobdetail.total_subscription_seconds){
					subscription['time_used'] = jobdetail.customer['subscription']['time_used'] - jobdetail.total_subscription_seconds
					console.log("subscription :::", subscription);
					await Customer.updateOne({_id:jobdetail.customer['id']},{subscription:subscription})
				}
				await JobService.updateJob(jobdetail.id, {'total_cost':0,'free_session_total':0});
				logger.info("updatedEarnDataDetails and updatedBillingDetails :: ", {'earningDetails':updatedEarnDataDetails, 'billingDetails':updatedBillingDetails})
				const programName = await getProgrameName(jobdetail)
				await adminReviewRefundCustomerAlert({
					email:jobdetail.customer['user'].email,
					firstName:jobdetail.customer['user'].firstName,
					programName:programName,
					jobDescription:jobdetail.issueDescription,
					techName:jobdetail.technician['user'].firstName,
					reason:jobdetail.adminReviewDetails['reason']
				})
			});
		});


		/**
		* send email to customer with link
		* @params : job
		* @author : Ridhima Dhir
		*/
		socket.on("mobile_tablet_job_post_email", async(job)=>{
			console.log(" job.customer ::::::", job.customer)
			logger.info("mobile_tablet_job_post_email", {'jobid':job.id})
			nr.startWebTransaction('/websocket/mobile_tablet_job_post_email', async function transactionHandler() {
				let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:job.customer.user.timezone};
				//sendEmail
				const programName = await getProgrameName(job)
				const jobLink = process.env.mailEndpoint+"customer/profile-setup?jobId="+job.id+"&newpost=yes&isMobilePost=yes"
				await mobileTabletJobPostEmail({
					email:job.customer.user.email,
					firstName:job.customer.user.firstName,
					jobDescription:job.issueDescription,
					jobCreatedAt:new Date(job.createdAt).toLocaleString("en", DATE_OPTIONS),
					programeName:programName,
					jobLink: '<a href='+jobLink+'>Click Here to view job</a>'
				})
			});
		})
  /**
	 	* This send email to technician for job updation
	 	* @params : job
	 	* @author : Ridhima Dhir
	 	*/
		 socket.on("updated_schedule_job_accepted_technician_email", async (job) => {
			console.log("::::job::: ",job)
			let jobId = job.id
			logger.info("updated_schedule_job_accepted_technician_email called", {'jobid':jobId})
			nr.startWebTransaction('/websocket/updated_schedule_job_accepted_technician_email', async function transactionHandler() {
				let jobdetail = await JobService.findJobById(jobId);
				console.log("timezone::: ", job['timezone'])
				let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:job['timezone']};
				let primaryDate  =  new Date(jobdetail.primarySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
				let secondryDate  =  new Date(jobdetail.secondrySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
				const jobLink = process.env.mailEndpoint+'dashboard?scheduleJobId='+jobdetail.id
				const programName = await getProgrameName(jobdetail)
				console.log("programName :::: ", programName)
				await updatedScheduleJobAcceptedTechnician({
					email:job.email,
					firstName:job.firstName,
					primaryDate:primaryDate,
					secondryDate:secondryDate,
					programName:programName,
					jobLink:jobLink,
					jobDescription:jobdetail.issueDescription
				})
			});
		});


		/**
	 	* This send email to customer that job is updated by technician
	 	* @params : job
	 	* @author : Ridhima Dhir
	 	*/
		 socket.on("schedule_job_updated_by_technician_to_customer_email", async (jobId) => {
			console.log("job :::", jobId)
			logger.info("schedule_job_updated_by_technician_to_customer_email called", {'jobid':jobId})
			nr.startWebTransaction('/websocket/schedule_job_updated_by_technician_to_customer_email', async function transactionHandler() {
				let jobdetail = await JobService.findJobById(jobId);
				console.log("jobdetail ::::", jobdetail)
				let timezone = jobdetail.customer['user']['timezone'];
				console.log("timezone::: ", timezone)
				let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:timezone};
				let primaryDate  =  new Date(jobdetail.primarySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
				let secondryDate  =  new Date(jobdetail.secondrySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
				const jobLink = process.env.mailEndpoint+'dashboard?scheduleJobId='+jobdetail.id
				const programName = await getProgrameName(jobdetail)
				await scheduleJobUpdatedByTechnicianToCustomer({
					email:jobdetail.customer['user'].email,
					firstName:jobdetail.customer['user'].firstName,
					primaryDate:primaryDate,
					secondryDate:secondryDate,
					programName:programName,
					jobLink:jobLink,
					jobDescription:jobdetail.issueDescription
				})
			});
		});

		socket.on("schedule_job_time_change_alert", async (job) => {
			nr.startWebTransaction('/websocket/schedule_job_time_change_alert', async function transactionHandler() {
				try{
					let jobdetail = await JobService.findJobById(job.id);
					const programName = await getProgrameName(jobdetail)
					const jobLink = process.env.mailEndpoint+'dashboard?scheduleJobId='+jobdetail.id
					let message  = 'Geeker - Job time has been changed by '+job.by+'. programName: '+programName+'. Here is link '+jobLink
					logger.info("schedule_job_time_change_alert: text message : ",{
						'jobId':job.id,
						'message':message
					});
					let correctedNumber = job.number
					TextService.sendSmsToNumber(correctedNumber,message,job.id)
				}
				catch(err){
					logger.error("schedule_job_time_change_alert: text message not sent: ",{
						'err':err,
						'jobId':job.id,
					});
				}
			})
	});
    socket.on("refresh-ScheduleTime",async (data)=>{ 
		socket.join(data.id);
		 io.to(data.id).emit('refreshScheduleTime', data);
		 })

	socket.on("refresh-twilio-chat-panel",async (jobId)=>{ 
		io.emit("refresh-twilio-chat-panel-send",jobId)
		console.log('chat daata twilio 1::::',jobId)
	})
    
	socket.on("talk-js-notification",async (data)=>{ 
	    io.emit("open-chat-panel-talkjs",data)
    })

	socket.on("talk-js-notification-to-customer",async (data)=>{ 
	    io.emit("open-chat-panel-talkjs-for-customer",data)
    })

	/**
	  * This socket calls the function to send businessInfoMessage to all Customers(Owner,Admin,User)  when Owner or Admin submits business message.
	  * @params :userId and business message 
	  * @response :  
	  * @author : Mritunjay
	  */
		socket.on("update-business-info-message", async (data) => {
			io.emit("updated-business-message",data)
		});

		socket.on("show-business-message", async (data) => {
			const userDetails = await User.findOne({'_id':data.userId})
			io.emit("seen-current-message",userDetails)
		});
    
		socket.on("refresh-job-after-decline-by-user", async (data) => {
			io.emit("refresh-job-after-decline", data)
		})


		socket.on("user-twilioChat-notification", async (data) => {
			// if(!data.includes('job_')){
			await TwilioChat.updateOne({ 'chat_id': data.chatId }, { new_message_alert: true })
			// }
			console.log("user-twilioChat-notification", data)
			if (data.userType == "technician") {
				io.emit("user-twilioChat-notification-to-customer", data.chatId)
			} else if (data.userType == "customer") {
				io.emit("user-twilioChat-notification-tech", data.chatId)
			} else if (data.userType == "Admin") {
				io.emit("user-twilioChat-notification-admin", data.chatId)
			}
		})

		socket.on("user-twilioChat-notification-admin", async (data) => {
			await TwilioChat.updateOne({ 'chat_id': data.chatId }, { new_message_alert_admin: true })
		})

		socket.on("user-twilioChat-refresh-chat", async (data) => {
			io.emit("user-twilioChat-refresh-tech", data)
		})

})}

