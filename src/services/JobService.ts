import Job from '../models/Job';
import Technician from '../models/Technician';
import Experience from '../models/Experience';
import { sendJobAlertEmail } from './MailService';
import { Request, Response, NextFunction } from 'express';
import EmailFormat from '../models/EmailFormat';
import {dynamicEmail } from "./MailService";
import ActiveUser from '../models/Activeusers';
import User, { IUser } from '../models/User';
let logger = require('../../winston_logger');
logger = logger("JobService.ts");

export const findJobById = async (jobId) => {
	try {
		const job = await Job.findById(jobId)
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
		return job;
	} catch (err) {
		console.error('findJobById::', err);
	}
};



export const findJobByParams = async (params) => {
	try {
		const job = await Job.find(params)
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
		return job;
	} catch (err) {
		console.error('findJobByParams::', err);
	}
};





export const getAllJobs = async (data={})=>{
	try{
		const jobs = await Job.find(data).sort({createdAt:-1})
		.populate('software')
		.populate({
			 path : 'subSoftware',
			 populate:'software'
			})
			.populate('expertise')
			.populate({
				path: 'customer',
				populate: 'user',
			})
			.populate({
				path: 'technician',
				populate: 'user',
			});
		return jobs;
	}
	catch(err){
		console.log("error in getting all jobs",err)
	}
}

export const updateJob = async (jobId, data) => {
	try {
		await Job.updateOne({ _id: jobId }, data);
	} catch (err) {
		console.error('update job::', err);
	}
};

export const updateTechnician = async (tech_id, data) => {
	try {
		await Technician.updateOne({ _id: tech_id }, data);
	} catch (err) {
		console.error('update job::', err);
	}
};

let activeUsers = [];

/**
 * Function will check that availble job is scheduled or not
 * @params : job(Type:Object)
 * @response : returns true/false based or weather job is scheduled or not
 * @author : Karan
 */
async function isScheduledJob(job){
	return (job && job.status && job.status == 'Scheduled' ? true : false)
}

/**
 * This function returns technicians who are not blocked and adding emailAlertLogin prefernce.
 * @params : filteredTechnicians(Type:Array)
 * @response : returns array of technicians user object that are eligible
 * @author : Sahil
 * */

 const getFilteredTechs = async(filteredTechnicians)=>{

	try{
		let users = filteredTechnicians.map((item)=>{
			let userInfo =  JSON.parse(JSON.stringify(item.user));
			if (userInfo){
				userInfo['emailAlertsWithoutLogin'] = item.emailAlertsWithoutLogin
				return userInfo;
			}
		}).filter(item => !!item && !item['blocked']) as any;
		return users;
	}
	catch(err){
		console.log("error in getFilteredTechs ::: ",err)
		logger.error("error in getFilteredTechs ::: ",{
			"error":err,
		})
		return []
	}
	
}

/**
 * This function returns technicians available for scheduled job
 * @params : technicians(Type:Array),softwareId(Type:String),subSoftwareId(Type:String)
 * @response : returns array of technicians that are eligible
 * @author : Karan
 * */
const getTechsForScheduledJobs = async(technicians,softwareId,subSoftwareId)=>{
	let filteredTechnicians = []
	for(var m in technicians){
			let expertises = technicians[m]['expertise']
			for(var k in expertises){
				if((expertises[k].software_id === softwareId  || expertises[k].software_id ===subSoftwareId)){
					filteredTechnicians.push(technicians[m])
				}
			}
		}
		return filteredTechnicians
}


/**
 * This function returns technicians according to query
 * @params : actUsrIds(Type:Array),elgStat(Type:Array),decline_technicians(Type:Array),customerType:(Type:String)
 * @response : returns array of technicians that are online
 * @author : Sahil,Manibha
 * */

const getActiveTechs = async(actUsrIds,elgStat,declined_technicians,customerType,jobId)=>{
	try{
		logger.info("Going to find all technician data of found active technicians :: ",{ 
			'actUsrIds':actUsrIds,
			'elgStat':elgStat,
			'declined_technicians':declined_technicians,
			'customerType':customerType,
			'jobId':jobId
		})
		let actTechs  = await Technician.find({
								user: { "$in" : actUsrIds},
								registrationStatus:{"$in":elgStat},
								id:{"$nin":declined_technicians},
								technicianType:customerType}
							).populate("user")

		logger.info("Total technician found from technician table are :: "+actTechs.length.toString(),{ 
			'activeTechs':actTechs,
			'jobId':jobId
		})
		return actTechs
	}
	catch(err){
		console.log("error in getActiveTechs ::::",err)
		return []
	}
}

export const findTechniciansBySkill = async (jobId,technicianId=false,calledFrom='RecursiveTech') => {
	try {
		const job = await Job.findById(jobId).populate('customer');
		const softwareId =  job.software;
		const subSoftwareId =  job.subSoftware;
		const declined_technicians = job.tech_declined_ids
		let customerType = job['customer']['customerType']
		

		let minutes = getHowManyMinutesTillJobCreation(job)

		logger.info("FindTechniciansBySkill() called from "+ calledFrom,{ 
			'minutes_from_getHowManyMinutesTillJobCreation':minutes,
			'jobId':jobId
		})
		logger.info('Going to find ' +customerType+ ' technicians of software '+softwareId)

		const experiences = await Experience.find({
			$or: [
				{ software: {$in:[softwareId, subSoftwareId]} }
			],
		}).populate('technician');

		logger.info("FindTechniciansBySkill() Technician should have experiences :: ",{ 
			'experiences':experiences,
			'jobId':jobId
		})

		const actUsers = await getActiveUsersBasedOnTransferOrNot(job,softwareId, subSoftwareId,minutes,technicianId) 

		// logger.info("FindTechniciansBySkill()  ",{ 
		// 	'activeUsers':actUsers,
		// 	'jobId':jobId
		// })
		// console.log("actUsers :: ",actUsers)
		const actUsrIds = actUsers.map((item)=> {
			if(item['user']['blocked'] == false){
				return item.user['_id']
			}
		})

		logger.info("FindTechniciansBySkill() UserIds of the active users (Not Blocked) :: ",{ 
			'actUsrIds':actUsrIds,
			'jobId':jobId
		})
		let elgStat =  ['incomplete_profile','completed','complete']
		
		// console.log('AAAAAAAA === elgStat',elgStat)
		console.log('AAAAAAAA === declined_technicians',declined_technicians)
		console.log('AAAAAAAA === customerType',customerType)

		const ActTechs = await getActiveTechs(actUsrIds,elgStat,declined_technicians,customerType,jobId)
		let activeTechnicians = []
		let technicianPhoneNumbers = []
		let techPhoneNumbersObj = {}
		let techEmailsObj = {}

		// console.log("ActTechs.length*******+++++++++++++++++++++++++*",ActTechs.length)
		// console.log(" :::::::: condition ::::::::::::: ",elgStat,declined_technicians,techType, softwareId, subSoftwareId)
		// logger.info("Total ActTechs :: ",{ 
		// 	'ActTechs-length':ActTechs.length,
		// 	'ActTechs':ActTechs,
		// 	'jobId':jobId
		// 	})

		if(ActTechs.length > 0){
			for(var oneTech in ActTechs){
				// console.log("ActTechs[oneTech]********",ActTechs[oneTech])
				if(ActTechs[oneTech]['user']['availableForJob'] ==  true){
					activeTechnicians.push(ActTechs[oneTech])
					try{
						// Only use for schedule jobs.
						if(ActTechs[oneTech].profile.alertPreference.settings.Job.Text.toggle){
							// console.log("Inside the IF part..........",ActTechs[oneTech].profile.alertPreference.settings.Job.Text.value)
							technicianPhoneNumbers.push(ActTechs[oneTech].profile.alertPreference.settings.Job.Text.value)
						}else{
							// console.log("Inside the ELSE part..........")
							technicianPhoneNumbers.push(0)
						}
					}
					catch(err){
						technicianPhoneNumbers.push(0)
					}												
				}
			}	
		}
		console.log("FindTechniciansBySkill() activeTechnicians :::::::::::::",activeTechnicians)
		
		const mainusers = activeTechnicians.map((item)=> item.user)
		logger.info('Technicians list that are available for job (technician who set themselves as Active from header). Total Available technician are '+activeTechnicians.length.toString(),{ 
			'activeTechnicians-email':activeTechnicians.map((item)=>item['user']['email']).join(','),
			'jobId':jobId
		})

		// const printAbleUsers = mainusers.map((item)=>item['email'])
		// const technicianIds = experiences.map(item => item.technician ? item.technician._id : '').filter(item => !!item);

		// var filteredTechnicianIds = []
		// technicianIds.forEach(function (item, index) {
		// 	if( ! job.tech_declined_ids.includes(item)){
		// 		filteredTechnicianIds.push(item)
		// 	}
		// }); 
		
		// console.log("technicianIds (JobService.ts):: ",technicianIds)
		
		// Get all the techs who can eligible for this job, They can either online or offline.
		const technicians = await Technician.find({
			registrationStatus:{"$in":elgStat},
			technicianType:customerType,
			expertise:{
				$elemMatch:{
					'software_id':{
						"$in":[softwareId, subSoftwareId]
					}
				}
			}
		}).populate("user"); 
		logger.info('')

		// const tech_emails = technicians.map(item => item.profile)
		// console.log("tech_emails:::::",tech_emails)
		let filteredTechnicians = []
		let scheduledJob = await isScheduledJob(job);
		if(scheduledJob){
			filteredTechnicians = await getTechsForScheduledJobs(technicians,softwareId,subSoftwareId)
		}else{
			filteredTechnicians = technicians
			// filteredTechnicians = getFilteredTechs(technicians,softwareId,subSoftwareId)
		}
		logger.info("FindTechniciansBySkill() Active Technician who are available for this software (Filter 1)",{ 
			// 'filteredTechnicians':filteredTechnicians.map((item)=>item['user']['email']).join(','),
			'filteredTechnicians':filteredTechnicians,
			'jobId':jobId
		})
		// console.log("technicians :::::: ",technicians.length)
		// console.log("filteredTechnicians length ::::::::::: ",filteredTechnicians.length)
		// console.log("active technicians length :::::::::::: ", activeTechnicians.length)
		// console.log("filteredTechs  (JobService.ts) :: ",filteredTechnicians)

		
		technicianPhoneNumbers = technicians.map(item => item.profile && item.profile.alertPreference.settings && item['profile']['alertPreference']['settings']['Job']['Text']['toggle']?item['profile']['alertPreference']['settings']['Job']['Text']['value']:false).filter(item => !!item)

	
		techPhoneNumbersObj =   await getEligibleTechsPhoneNumbers(technicians)
		techEmailsObj  =	await getEligibleUsersEmails(technicians)
		
		logger.info("techPhoneNumbersObj:: ",{ 
			'techPhoneNumbersObj':techPhoneNumbersObj,
			'jobId':jobId
		})
		// let users = filteredTechnicians.map(item => item.user)
		// Remove blocked users and remove users who dont want 
		let users = await getFilteredTechs(filteredTechnicians)
		logger.info("FindTechniciansBySkill() Technicians who are not blocked and emailAlertLogin prefernce set as True (Filter 2) ",{ 
			'users':users.map((item)=>item.email).join(','),
			'jobId':jobId
		})
		/**
		 * @mainusers : active users
		 * @activeUsers : available for job technicians
		 * @technicianPhoneNumbers :  technicians that set 'send sms' in preference.
		 * 
		 **/
		let resp = {"activeUsers":mainusers,"latestUpdatedJob":job,"availableUsers":users,'technicianPhoneNumbers':technicianPhoneNumbers,'techPhoneNumbersObj':techPhoneNumbersObj,'techEmailsObj':techEmailsObj}
		
		if(scheduledJob){
			resp["activeUsers"] = technicians.map(item => item.user).filter(item => !!item && !item['blocked']) as any;			 

		 	return resp	 	
		}	
		logger.info("FinalResponse of FindTechniciansBySkill()",{ 
			'response':resp,
			'jobId':jobId
		})	 
	 	return resp
		
	} catch (err) {
		logger.error("Error in FindTechniciansBySkill() ::: ",{
			"error":err,
			"jobId":jobId

		})
	}
};

/**
 * This function returns technicians according to query
 * @params : 
 * 		elgStat(Type:Array): registration status like ('incomplete_profile','completed','complete'),
 * 		decline_technicians(Type:Array): List of tech who decline the job,
 * 		techType(Type:String): Live/test according to customer,
 * 		softwareId(Type:String),
 * 		subSoftwareId(Type:String),
 * @response : returns array of technicians that are online
 * @author : Ridhima Dhir
 * */

 const getAvailableTechs = async(elgStat,declined_technicians,techType, softwareId, subSoftwareId)=>{
	try{
		// Filter techs as followed
		// registartion status should ('incomplete_profile','completed','complete')
		// tech not declined
		// tech type should match(like live user will get all live techs)
		// tech expertise should be match with job
		// emailAlertsWithoutLogin should true
		// tech un-blocked
		logger.info("getAvailableTechs :: condition:: ",{ 
			'elgStat':elgStat,
			'declined_technicians':declined_technicians,
			'techType':techType, 
			'softwareId':softwareId, 
			'subSoftwareId':subSoftwareId})

		let availTechs  = await Technician.find({
								registrationStatus:{"$in":elgStat},
								_id:{"$nin":declined_technicians},
								technicianType:techType,
								expertise:{
									$elemMatch:{
										'software_id':{
											"$in":[softwareId, subSoftwareId]
										}
									}
								},
								//emailAlertsWithoutLogin:true
							}).populate({
								path:"user", 
								match:{
									'blocked':false
								}
							})
		// Ridhiama Todo(Inner join)
		availTechs = availTechs.filter(function(item){ return item.user != null })
		console.log(" availTechs constional:::::::", availTechs);
		return availTechs.map((tech)=> {
			return {
				'techId':tech._id,
				'techStatus':tech.status,
				'email':tech.user['email'],
				'firstName':tech.user['firstName'],
				'userId':tech.user['_id'],
				'timezone':tech.user['timezone'],
				'profile':tech.profile
			}
		})
	}
	catch(err){
		console.log("error in getActiveTechs ::::",err)
		return []
	}
}

/**
 * Find technicians for schedule job
 * @params : jobId(Type:string): Schedule job id,
 * @response : returns array of availTechs and there technicianPhoneNumbers
 * @author : Neha Sharma
 * */
 export const findTechsForScheduleJob = async (jobId) => {
	try {
		console.log('findTechsForScheduleJob>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
		const job = await Job.findById(jobId).populate('customer');
		const softwareId =  job.software;
		const subSoftwareId =  job.subOption;
		const declined_technicians = job.tech_declined_ids
		let customerType = job['customer']['customerType']
		let elgStat =  ['incomplete_profile','completed','complete']

		// Get techs which is not blocked, not declined the job, 
		// registartion status should ('incomplete_profile','completed','complete')
		// Customer and tech type should match(like live user will get all live techs)
		// expertise match
		const availTechs = await getAvailableTechs(elgStat,declined_technicians,customerType, softwareId, subSoftwareId)
		logger.info("findTechsForScheduleJob :: availTechs:: ",{ 'availTechs':availTechs,'availTechs_length':availTechs.length})

		//Get technicians phone number & timezone collectively
		const techPhonNumberAndTimezone = await getTechsPhoneNumber(availTechs)

		//Extract techniciens phone numbers
		const technicianPhoneNumbers = techPhonNumberAndTimezone.map((item)=>{
											return item.phoneNumber
										})
										
		//Extract techniciens timezone
		const techniciantimezones = techPhonNumberAndTimezone.map((item)=>{
										return item.timezone
									})

		//Respose data prepare
		let resp = {"availTechs":availTechs,'technicianPhoneNumbers':technicianPhoneNumbers, "techniciantimezones":techniciantimezones}
		return resp
	} catch (err) {
		console.error(err);
	}
};

/**
 * get phonenumbers of technicians
 * @params : techs(type:object) object of available techs
 * @returns : phonenumbers(type:array)
 * @author : Ridhima Dhir
 */
async function getTechsPhoneNumber(techs){
	return techs
		.map(item => {
			//If phone number present in tech setting 
			if(item.profile && item.profile.alertPreference.settings && item.profile.alertPreference.settings.Job['Text']['toggle']){
				return {"phoneNumber":item['profile']['alertPreference']['settings']['Job']['Text']['value'], 
						"timezone":item.timezone}
			}
		}).filter(item => !!item)
}
/**
 * @description Check if tech has alert preference set or not for email and sms
 * @param tech Available tech regarding posted job
 * @param nofificationSource alert preference like "Text" or "Email"
 * @param techStatus "ActiveTechs" OR "InactiveTechs"
 * @returns BOOLEAN 
 */
function hasAlertPreference(tech, notificationSource, techStatus){

	let preferenceFor = 'Job'

	if (techStatus == 'ActiveTechs'){
		preferenceFor = 'Job'
	}
	if (techStatus == 'InactiveTechs'){
		preferenceFor = 'Techs'
	}

	if(tech['profile'] && 
		tech['profile']['alertPreference'] && 
		tech['profile']['alertPreference']['settings'] && 
		tech['profile']['alertPreference']['settings'][preferenceFor] &&
		tech['profile']['alertPreference']['settings'][preferenceFor][notificationSource] &&
		tech['profile']['alertPreference']['settings'][preferenceFor][notificationSource]['toggle']){

        return true
    }
    return false
}
/**
 * this function creates a object that have technicians phone numbers with him
 * @params : technicians(type:Array)
 * @response : returns an javascript object (type:Object)
 * @author : Nafees
 **/
async function getEligibleTechsPhoneNumbers(technicians){
	let techPhoneNumbersObj = {}
	techPhoneNumbersObj['active'] = {}
	techPhoneNumbersObj['inActive'] = {}
	try{		
		for (var index in technicians){
			let tech = technicians[index]
			if(tech['user'] && tech['user'] !== null){
				let techUserId = (tech['user']['_id'] ? tech['user']['_id'] : tech['user']['id'])
				if( hasAlertPreference(tech, 'Text', 'ActiveTechs') ){					
					let phoneNumber = tech['profile']['alertPreference']['settings']['Job']['Text']['value']
					techPhoneNumbersObj['active'][techUserId] = phoneNumber
		
				}
				if( hasAlertPreference(tech, 'Text', 'InactiveTechs') ){	
					let phoneNumber = tech['profile']['alertPreference']['settings']['Techs']['Text']['value']
					techPhoneNumbersObj['inActive'][techUserId] = phoneNumber
		
				} 			
			}
		}
		return techPhoneNumbersObj
	}
	catch(err){
		logger.error("error in getEligibleTechsPhoneNumbers ::: ",{
			"error":err,

		})
		console.log("error in getEligibleTechsPhoneNumbers :: ",err)
		return techPhoneNumbersObj
	}
}

/**
 * TODO Get all eligible technician's email for new job alert, either for active techs or inactive techs.
 * @params : technicians(type:Array) All eligible techs who have same software expertise according to posted job.
 * @response : returns an javascript object (type:Object)
 * @author : Nafees
 **/

async function getEligibleUsersEmails(technicians){
	let techEmailsObj = {}
	techEmailsObj['active'] = {}
	techEmailsObj['inActive'] = {}
	try{
		// logger.info("My logger to check technicians", technicians)
		for (var index in technicians){
			let tech = technicians[index]			
			if(tech['user'] && tech['user'] !== null ){
				let techUserId = (tech['user']['_id'] ? tech['user']['_id'] : tech['user']['id'])	
				if (hasAlertPreference(tech, 'Email', 'ActiveTechs')) { 
					logger.info("My logger to check tech", tech)
					let email = tech['profile']['alertPreference']['settings']['Job']['Email']['value']
					techEmailsObj['active'][techUserId] = email
				}
	
				if( hasAlertPreference(tech, 'Email', 'InactiveTechs') ){
					let email = tech['profile']['alertPreference']['settings']['Techs']['Email']['value']
					techEmailsObj['inActive'][techUserId] = email
				} 	
			}
			
		}
		return techEmailsObj
	}
	catch(err){
		logger.error("error in getEligibleUsersEmails ::: ",{
			"error":err,

		})
		console.log("error in getEligibleUsersEmails :: ",err)
		return techEmailsObj
	}
}


 /* This function returns technicians according to query
 * @params : 
 * 		elgStat(Type:Array): registration status like ('incomplete_profile','completed','complete'),
 * 		decline_technicians(Type:Array): List of tech who decline the job,
 * 		techType(Type:String): Live/test according to customer,
 * 		softwareId(Type:String),
 * 		subSoftwareId(Type:String),
 * @response : returns array of technicians that are online
 * @author : Ridhima Dhir
 * */

 /*const getAvailableTechs = async(elgStat,declined_technicians,techType, softwareId, subSoftwareId)=>{
	try{
		// Filter techs as followed
		// registartion status should ('incomplete_profile','completed','complete')
		// tech not declined
		// tech type should match(like live user will get all live techs)
		// tech expertise should be match with job
		// emailAlertsWithoutLogin should true
		// tech un-blocked
		console.log(" :::::::: condition ::::::::::::: ",elgStat,declined_technicians,techType, softwareId, subSoftwareId)
		logger.info("getAvailableTechs :: condition:: ",{ 
			'elgStat':elgStat,
			'declined_technicians':declined_technicians,
			'techType':techType, 
			'softwareId':softwareId, 
			'subSoftwareId':subSoftwareId})

		let availTechs  = await Technician.find({
								registrationStatus:{"$in":elgStat},
								_id:{"$nin":declined_technicians},
								technicianType:techType,
								expertise:{
									$elemMatch:{
										'software_id':{
											"$in":[softwareId, subSoftwareId]
										}
									}
								},
								//emailAlertsWithoutLogin:true
							}).populate({
								path:"user", 
								match:{
									'blocked':false
								}
							})
		// Ridhiama Todo(Inner join)
		availTechs = availTechs.filter(function(item){ return item.user != null })
		console.log(" availTechs constional:::::::", availTechs);
		return availTechs.map((tech)=> {
			return {
				'techId':tech._id,
				'techStatus':tech.status,
				'email':tech.user['email'],
				'firstName':tech.user['firstName'],
				'userId':tech.user['_id'],
				'timezone':tech.user['timezone'],
				'profile':tech.profile
			}
		})
	}
	catch(err){
		console.log("error in getActiveTechs ::::",err)
		return []
	}
}*/

/**
 * Find technicians for schedule job
 * @params : jobId(Type:string): Schedule job id,
 * @response : returns array of availTechs and there technicianPhoneNumbers
 * @author : Neha Sharma
 * */
 /*export const findTechsForScheduleJob = async (jobId) => {
	try {
		console.log('findTechsForScheduleJob>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
		const job = await Job.findById(jobId).populate('customer');
		const softwareId =  job.software;
		const subSoftwareId =  job.subSoftware;
		const declined_technicians = job.tech_declined_ids
		let customerType = job['customer']['customerType']
		let elgStat =  ['incomplete_profile','completed','complete']

		// Get techs which is not blocked, not declined the job, 
		// registartion status should ('incomplete_profile','completed','complete')
		// Customer and tech type should match(like live user will get all live techs)
		// expertise match
		const availTechs = await getAvailableTechs(elgStat,declined_technicians,customerType, softwareId, subSoftwareId)
		logger.info("findTechsForScheduleJob :: availTechs:: ",{ 'availTechs':availTechs,'availTechs_length':availTechs.length})
		console.log("availTechs.length*******+++++++++++++++++++++++++*",availTechs.length, availTechs)

		//Get techniciens phone numbers
		const technicianPhoneNumbers = await getTechsPhoneNumber(availTechs)

		//Respose data prepare
		let resp = {"availTechs":availTechs,'technicianPhoneNumbers':technicianPhoneNumbers}
		return resp
	} catch (err) {
		console.error(err);
	}
};*/

/**
 * get phonenumbers of technicians
 * @params : techs(type:object) object of available techs
 * @returns : phonenumbers(type:array)
 * @author : Ridhima Dhir
 */
/*async function getTechsPhoneNumber(techs){
	return techs
		.map(item => {
			//If phone number present in tech setting 
			if(item.profile && item.profile.alertPreference.settings && item.profile.alertPreference.settings.Job['Text']['toggle']){
				return item['profile']['alertPreference']['settings']['Job']['Text']['value']
			}else{
				return false
			}
		}).filter(item => !!item)
}*/

async function getActiveUsersBasedOnTransferOrNot(job,softwareId, subSoftwareId,minutes,technicianId=null){
	try {
		logger.info('Parameter of getActiveUsersBasedOnTransferOrNot()',{
			'job':job,
			'softwareId':softwareId,
			'subSoftwareId':subSoftwareId,
			'minutes':minutes,
			'technicianId':technicianId,
			'jobId':job.id
		})
		
		const freelancers =  await ActiveUser.find({
			$or: [
				{ experiences: {$in:[softwareId, subSoftwareId]} }
			],'technicianType':'freelancer'

		}).count()
		logger.info('Total Freelancers found in getActiveUsersBasedOnTransferOrNot() are '+ freelancers.toString(),{
			'jobId':job.id
		})

		var result = checkJobShouldBeSentToFreelancerOrNot(freelancers,minutes)
		logger.info('Total freelancers are ' + freelancers.toString() + ' and minutes are ' + minutes.toString() + ' so notification will ' + (result ? '' : 'not ')+ 'sent to freelancers.',{'jobId':job.id})

		if(technicianId){
			const actUsers = await ActiveUser.find({"user":technicianId}).populate('user')
			logger.info('TechnicianId ('+technicianId+') is available so finding it in active user table ',{
				'actUsers':actUsers,
				'jobId':job.id
			})
			return actUsers
		}
		
		if(job.status === 'Scheduled'){
			
			const actUsers = await ActiveUser.find({
				$or: [
					{ experiences: {$in:[softwareId, subSoftwareId]} }
				],
	
			}).sort({"jobsSolved":-1,"ratings":-1}).populate("user")
			logger.info('Job is scheduled job so getting all the active users in getActiveUsersBasedOnTransferOrNot()',{
				'actUsers':actUsers.map((item) => item['user']['email']).join(','),
				'jobId':job.id,
			})
			return actUsers
		}else if(job.hire_expert){
			
			const actUsers = await ActiveUser.find({
				$or: [
					{ expertExperiences: {$in:[softwareId, subSoftwareId]} }
				],
	
			}).sort({"jobsSolved":-1,"ratings":-1}).populate("user")

			logger.info('Job is for expert so getting all the active users in getActiveUsersBasedOnTransferOrNot()',{
				'actUsers':actUsers.map((item) => item['user']['email']).join(','),
				'jobId':job.id,
			})
			return actUsers
	
		}
		else if(minutes < 3 && result){
			// console.log("second if part 2222222222222222222")
			const actUsers = await ActiveUser.find({
				$or: [
					{ experiences: {$in:[softwareId, subSoftwareId]} }
				],'technicianType':'freelancer'
	
			}).sort({"jobsSolved":-1,"ratings":-1}).populate("user")

			logger.info('minutes are less then 3 so getting freelancer from active users in getActiveUsersBasedOnTransferOrNot()',{
				'actUsers':actUsers.map((item) => item['user']['email']).join(','),
				'jobId':job.id,
			})
			return actUsers			
		}		
		else if( minutes > 3 || (minutes < 3 && !result)){
			// console.log("third if part 3333333333333333333")
			const actUsers = await ActiveUser.find({
				$or: [
					{ experiences: {$in:[softwareId, subSoftwareId]} }
				],
	
			}).sort({"ratings":1}).populate("user")
			let msg = result ? '' : 'and no active freelancer available'
			logger.info('Minutes are '+minutes.toString()+msg+' so finding all active users by rating ',{
				'actUsers':actUsers.map((item) => item['user']['email']).join(','),
				'jobId':job.id,
			})
			return actUsers
		}
		else {
			// console.log("ELSE part 44444444444444444444444444444444")
			const actUsers = await ActiveUser.find({
				$or: [
					{ experiences: {$in:[softwareId, subSoftwareId]} }
				],
	
			}).sort({"jobsSolved":-1,"ratings":-1}).populate("user")

			logger.info('Going to find all active user in else part of getActiveUsersBasedOnTransferOrNot() ',{
				'actUsers':actUsers.map((item) => item['user']['email']).join(','),
				'jobId':job.id,
			})
			return actUsers
		}	
		
	} catch (error) {
		logger.error("error in getActiveUsersBasedOnTransferOrNot :::: ",{
			"error":error,
			"job":job,
			"softwareId":softwareId,
			"minutes":minutes,

		})
		console.log('error in getActiveUsersBasedOnTransferOrNot>>>>>>',error)
	}

}

/**
 * This function check whether to send new job notification to freelancer technician or not.
 * @params : freelancers(Type:Number),minutes(Type:Number)
 * @response : returns boolean value
 * @author : Manibha
 **/

const checkJobShouldBeSentToFreelancerOrNot = (freelancers,minutes) => {
	let sentToFreelancers = false
	if(freelancers >= 1  && minutes == 0){
		sentToFreelancers = true
	}
	if(freelancers >= 3  && minutes == 1){
		sentToFreelancers = true
	}
	if(freelancers >= 5  && minutes == 2){
		sentToFreelancers = true
	}
	if(freelancers >= 7  && minutes == 3){
		sentToFreelancers = true
	}
	
	return sentToFreelancers
}
const getData = async(users) => {
	return Promise.all(users.map(async(item)=>{ 
			let haveEle = await sendAllActiveReq(item)
			if(haveEle){
				activeUsers.push(item)
				return activeUsers
			}  
		})
	)
}

const sendAllActiveReq = async (user)=>{
	const myPromise = new Promise(async (resolve,reject)=>{
		const act_user = await  ActiveUser.find({"user":user._id},function(err,docs){
				if(err){
					resolve(false)
				}
				else{
					if(docs.length !=0){
						if(docs[0].user === user._id){
							resolve(true)
						}
					}
				}
			})
	})
	
	return myPromise
}


/**t
 * This function returns difference between two datetimes in minutes.
 * @params : job(Type:Object)
 * @response : returns number of minutes
 * @author : Manibha
 **/

const getHowManyMinutesTillJobCreation = (job)=>{

	let jobCreateTime = job['createdAt']
	let currentTime = new Date()
	var difference = currentTime.getTime() - jobCreateTime.getTime();
	let resultInMinutes = Math.round(difference / 60000);
	// console.log('resultInMinutes>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',resultInMinutes)
	return resultInMinutes
}
export async function send_email_to_customer(req: Request, res: Response, next: NextFunction) {
	try {
		console.log("dead function send_email_to_customer")
		// let { jobId } = req.params;
		// const job = await findJobById(jobId);
		// console.log("timeZone ::::::: ",job.customer['user']['timezone'])
		// let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',hour: '2-digit', minute:'2-digit',timeZone:job.customer['user']['timezone']};
		// let primaryDate  =  new Date(job.primarySchedule).toLocaleTimeString('en-US', DATE_OPTIONS)
		// console.log("primaryDate :::: :::: ",primaryDate)
		//  await dynamicEmail({
		//       email: job.customer['user']['email'],
		//       subject :'Technician accepted your scheduled job.',
		//       text:`  <h3> Hello ${job.customer['user']['firstName']}</h3>
		//               <p>Technician has been found for your scheduled job.</p> 
		//               <p> Job description -> ${job.issueDescription}</p>
		//               <p>Primary meeting time is  ${primaryDate}</p>
		//               `,
		//       previewtext:'Technician accepted your scheduled job'
		//   }); 
		
	} catch (err) {
		next(err);
	}
}


