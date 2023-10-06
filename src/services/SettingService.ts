import Settings, { ISettings } from '../models/Settings';
import * as EmailService from './MailService';
import Technician from '../models/Technician';
import Software from '../models/Software';
let logger = require('../../winston_logger');
logger = logger("SettingService.ts");
const ct = require('countries-and-timezones');
export const FetchSoftwareByParams = async(data={})=>{
	let soft_list = []
	try{
		
		const Software = Promise.resolve(await Settings.find(data))
		return Software

		
	}
	catch(err){
		console.log("error in FetchSoftwareByParams :::")
	}

}


/**
 * Returns Stripe Object According to User
 * @params : req(Type:Object)
 * @response : returns stripe object for payments
 * @author : Sahil
 **/

export const getStripeObject = async(req)=>{
	try{
		let isliveUser = true
		if(req.socketliveUser){
			isliveUser = req.socketliveUser
		}else{
			if (req.params.liveUser != undefined){
				isliveUser = req.params.liveUser
			}else if(req.query.liveUser != undefined){
				isliveUser = req.query.liveUser
			}else if(req.body.liveUser != undefined){
				isliveUser = req.body.liveUser
			}
		}
		if(typeof isliveUser === "string" ){
			isliveUser = isliveUser === "true" ? true : false
		}
		let stripe : any;
		if (isliveUser){
			stripe = require('stripe')(process.env.STRIPE_KEY)
		}
		else{
			stripe = require('stripe')(process.env.TEST_STRIPE_KEY)
		}
		return stripe;
	}
	catch(err){
		console.log("error in getStripeObject ::::: ",err)
	}
}

/**
  * this function handles Email for the software test to technician
  * @params : req(Type:Object)
  * @response : {void}
  * @author : Sahil
  **/
  export const handleTestEmails = async(technicianId)=>{
  	try{
  		let technicianObject = await Technician.findOne({"_id":technicianId}).populate('user')
  		let username = technicianObject['user']['firstName']+" "+technicianObject['user']['lastName']
  		let email = technicianObject['user']['email']
  		let softwares = []
  		let softwareLinkArray = []
  		console.log("technicianObject >>>>>>>>.",technicianObject)
  		for (var k in technicianObject.expertise){
  			let software = await Software.findOne({"_id":technicianObject.expertise[k]['software_id']})
  			if(software){
  				softwares.push(software)
  			}
  		}
  		for (var j in softwares){

  			let softwareName = softwares[j].name
  			let programe = softwares[j]
  			let testUrl = programe.testUrl
  			if (testUrl && testUrl != 'None' && testUrl != ''){
  				let li = `<li><strong>${softwareName}</strong> : <a href=${testUrl}>${testUrl}</a></li>`
  				softwareLinkArray.push(li)
  				// await EmailService.sendTechnicianTestEmails({
  				// 	"email":email,
  				// 	"name":username,
  				// 	"testLink":`<a href=${testUrl}>${testUrl}</a>`,
  				// 	"programeName":softwareName
  				// })
  			}
  		}
  		let softwareString = ` <ul> ${softwareLinkArray.join(" ")} </ul>`
  		console.log("softwareString >>>>>>",softwareString)
  		await EmailService.sendDetailedMail({
  			"name":username,
  			"email":email,
  			"testLink":softwareString
  		})
  	}
  	catch(err){
  		console.log("error in handleTestEmails :::: ",err)
  	}
  }


/**
 * this function gets the country name according to the timezone of technician
 * @param : timezone(Type:String)
 * @author : Sahil
 **/
 export const getCountryCategory = (timezone)=>{
 	let category = 'NON-US'
 	try{
 		let timezoneObj = ct.getTimezone(timezone)
		let country  = timezoneObj.countries[0]
		category = (country == 'US')?country:'NON-US'
 	}
 	catch(err){
 		logger.error("Error in getCountryCategory ::: ",{
 			"error":err,
 			"timezone":timezone
 		})
 		console.log("Error in getCountryCategory ::: ",{
 			"error":err,
 			"timezone":timezone
 		})
 	}
 	return category
 }


/**
 * this function gets commission according to the use timezone
 * @param : softwareObj (Type:Object)
 * @param : isHourlyLongJob (Type:Boolean)
 * @response : JSON object
 * @author : Sahil
 **/
export const getCountryCodeCommissions = (technicianCategory,softwareObj,isHourlyLongJob)=>{
	try{
		let commission_list = JSON.parse(JSON.stringify(softwareObj.commissions))
		let commission_obj = commission_list.find(item => item.category === technicianCategory)
		if(isHourlyLongJob){
			return commission_obj.commisionPerHour
		}
		return commission_obj.commissionPerMinute
	}
	catch(err){
		logger.error("error in getCountryCodeCommissions :::::: ",{
			"error":err,
			"softwareObj":softwareObj,
			"isHourlyLongJob":isHourlyLongJob
		})
		console.log("error in getCountryCodeCommissions ::::::: ",{
			"error":err,
			"softwareObj":softwareObj,
			"isHourlyLongJob":isHourlyLongJob
		})
	}
}