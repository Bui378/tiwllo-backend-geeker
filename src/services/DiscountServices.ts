import DiscountHistory , {IDiscountHistory} from '../models/DiscountHistory';
import Job, { IJob } from '../models/Job';
import Customer ,{ICustomer} from '../models/Customer';
import Notifications, { INotfication ,notificationSchema } from '../models/Notifications';
import referalDiscount , {IReferalDiscount} from '../models/ReferalDiscounts'; 
import * as TextService from "./TextService";
import * as EmailService from './MailService'
let logger = require('../../winston_logger');
logger = logger("DiscountServices.ts");

/**
 * Adds entry in create Discount table
 * @params : data (Type:Object)
 * @response : Saves entry in discount table
 * @author : Sahil
**/
var myModule = require('../app');
export  const createDiscount = async(data)=>{
	try{
		console.log("data ::::::::",data)
		let addDiscount = new DiscountHistory(data)
		await addDiscount.save(function(err,result){
			console.log("err:::::::::",err)
			console.log("results :::::: ",result)
		})
		return true;
	}
	catch(err){
		console.log("error in createDiscount ::: ",err)
		return false;
	}
}


/**
 * refunds discount to customer if technician does not cut charge
 * @params : data (Type:Object)
 * @response : updates entry in discount table
 * @author : Sahil
**/

export const refundDiscount = async(data)=>{
	try{
		let jobId = data.jobId
		let queryParam = data.query;
		console.log("queryParam ::::::",queryParam)
		console.log("jobId :::::::",jobId)
		let jobObject = await Job.findOne({"_id":jobId})
		if (jobObject != null)
		{
			let referalUser = await referalDiscount.findOne(queryParam)
			let discountToUpdate;
			if (referalUser.discountNumber != null)
			{
				let discount = referalUser['discountNumber']
				discountToUpdate = jobObject.referalDiscount + discount
			}
			let updateJobReferal = await Job.updateOne({"_id":jobId},{"referalDiscount":0})
			let updateReferalDiscount = await referalDiscount.updateOne(queryParam,{"discountNumber":discountToUpdate})
			return updateReferalDiscount;

		}
	}
	catch(err){
		console.log("error in refundDiscount :::::::: ",err)
	}
}
/**
 * This function adds referal discount to user
 * @params : Data (Type:Object)
 * @response : json object
 * @author :Sahil
 **/
export const addReferalDiscount = async (data) => {
	try {
		let query = { 'customer': data.customer }
		let customerId = data.customer

		let jobQuery = { ...query }
		let existedReferalCustomer = await referalDiscount.findOne({ "customer": data.customer })
		jobQuery['status'] = "Completed"
		jobQuery['meetingStarted'] = true
		let jobsCount = await Job.find(jobQuery).countDocuments()
		if (jobsCount == 0 && existedReferalCustomer.refered_by != null) {
			const response = await referalDiscount.updateOne(query, { "discountNumber": existedReferalCustomer.discountNumber ? existedReferalCustomer.discountNumber + 20 : 20 }, function (err, result) {
				logger.error("error in updating referal discount result :>>>>>> ", {
					"error": err,
					"result": result

				})
			})
			await NotificationManager(query)
			let historyUpdatedReferee = discountEntry({ "customer": data.customer, "referCustomerId": existedReferalCustomer.refered_by })
			let updatedQuery = { "customer": existedReferalCustomer.refered_by }
			let existedReferalCustomerParent = await referalDiscount.findOne({ "customer": existedReferalCustomer.refered_by })
			let historyUpdatedReferrer = await discountEntry(updatedQuery)
			await NotificationManager(updatedQuery)
			let referalUserDiscount = await referalDiscount.updateOne(updatedQuery, { "discountNumber": existedReferalCustomerParent.discountNumber ? existedReferalCustomerParent.discountNumber + 20 : 20 }, function (err, result) {
				logger.error("error in updating referal discount result :>>>>>> ", {
					"error": err,
					"result": result

				})
			})
			return { "updated": true, "message": "Discount Updated" }
		}
		else {
			return { "updated": false, "message": "Its not his first job" }
		}

	}
	catch (err) {
		logger.error("error in addReferalDiscount ::: ", {
			"error": err

		})
		return { "updated": false, "message": `Some error in addReferalDiscount ${err}` }
	}
}

/**
 * this function adds entry in discount
 * @params : Data(type:Object)'
 * @response : boolean true/false
 * @author :Sahil
 **/

export const discountEntry = async(data)=>{
	try{
		let customerId = data.customer
		let referCustomerId = data.referCustomerId
		const discountObj = await DiscountHistory.findOne({ customer: customerId }).sort({ createdAt: -1 }).limit(1)
		let customerDiscountObj = await referalDiscount.findOne({"customer":data.customer})
		let initalAmount = customerDiscountObj.discountNumber ? customerDiscountObj.discountNumber : 0
		const discountData = {
			customer: customerId,
			spentFor: 'referal',
			spentType: 'credit',
			initalAmount: initalAmount,
			newAmount: 20,
			modelType: 'Customer',
			spentOn: referCustomerId ? referCustomerId : customerId,
		}
		let response = await createDiscount(discountData)
		return true
	}
	catch(err){
		console.log("error in discountEntry ::::: ",err)
		return true
	}
}

/** 
 * this function sends notifications and text messages to customers after rewards
 * @params : Data (Type:Object)
 * @response : json object
 * @author : Sahil
 **/

export const NotificationManager = async(data)=>{
	try{
		let customerObject = await Customer.findOne({"_id":data.customer}).populate('user')
		let messageToCustomer = `Thanks for using geeker service. We are sending you a reward of $20 as a appreciation. You can use this reward in next meeting. `
		let notificationData = {
			"user":customerObject['user']['_id'],
			"actionable":false,
			"title":messageToCustomer,
			"type":"referal_reward",
		}
		let notiFy = new Notifications(notificationData)
		notiFy.save()
		let number = customerObject['phoneNumber']
		let email = customerObject['user']['email']
		myModule.io.emit("refresh-notifications")
		await TextService.sendSmsToNumber(number,messageToCustomer)
		await EmailService.referalRewardEmail(email)
		return {"notificationSent":true,"message":"Notifcation sent"}
	}
	catch(err){
		console.log("error in NotificationManager :::::::: ",err)
		return {"notificationSent":false,"message":"Notifcation sent"}
	}
}