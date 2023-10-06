import { Request, Response, NextFunction } from 'express';
import Customer, { ICustomer } from '../models/Customer';
import InvalidRequestError from '../errors/InvalidRequestError';
import Job, { IJob } from '../models/Job';
import User, { IUser, userSchema } from '../models/User';
import PromoCode, { IPromoCode } from '../models/PromoCode';
import Invite from "../models/invite";
import { roleStatus,sendStripInfoToStakeholders } from '../utils';
import * as Services from '../services/SettingService'
import * as discountServices from '../services/DiscountServices';
import DiscountHistory from '../models/DiscountHistory';
import { send_logs_to_new_relic } from './WebSocketController';
import { adminReviewApproveChargeForCustomer,paymentFailedLiveCustomerEmail, referrallinkEmail, paymentInformationEmail, sendEmailToStakeholdersForCompleteJob,paymentInformationWithSubscriptionEmail, techincianCompletedJob,sendEmailToStakeholdersForCompleteJobPaymentFailed} from "../services/MailService";
import referalDiscount, { IReferalDiscount } from '../models/ReferalDiscounts';
import * as JobService from "../services/JobService";
import * as TextService from "../services/TextService";
import BillingDetails from '../models/BillingDetails';
import Software from '../models/Software';
import * as JobTagService from "../services/JobTagService";
import { jobTags } from '../constant';
import { getMaxListeners } from 'process';
import Stakeholder from '../models/Stakeholders';
import TwilioChat from '../models/TwilioChat';
import { TWILIO_DETAILS } from '../constant'

const twilio = require('twilio')



const pdf = require("pdf-creator-node");
const fs = require("fs");

const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY)
var html_to_pdf = require('html-pdf-node');
let email_verified = {}
var successImage = require('path').join(__dirname, '/public/images/success.png');
console.log("successImage")
let logger = require('../../winston_logger');
logger = logger("CustomerController.ts");




export const cutCommissionCharges  = (softwareComission,sessionCost)=>{
	try {
		let softwareComissionInDigits = sessionCost * (softwareComission / 100)
		let charges = sessionCost - softwareComissionInDigits
		return charges
	}
	catch (err) {
		console.log("error in cutCommissionCharges ::::", err)
		return 0
	}
}

export async function list(req: Request, res: Response, next: NextFunction) {
	try {
		console.log('CustomerController list>>>>>>>>>>>>')

		let { page, pageSize } = req.params;

		page = parseInt(page, 10);
		pageSize = parseInt(pageSize, 10);

		const query = Customer.find();

		const totalCount = await Customer.countDocuments(query);
		const customers: ICustomer[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

		return res.json({
			data: customers,
			totalCount
		});
	} catch (err) {
		next(err);
	}
}

export async function create(req: Request, res: Response, next: NextFunction) {
	try {
		console.log('CustomerController create>>>>>>>>>>>>')

		const customer = new Customer(req.body);

		await customer.save(function (err, results) {
			console.log(results._id);
		})

		res.status(201).json(customer);
	} catch (err) {
		next(err);
	}
}

export async function retrieve(req: Request, res: Response, next: NextFunction) {
	try {
		const { id }: { id: string } = req.params as any;

		const customer: ICustomer = await Customer.findById(id);

		if (!customer) {
			throw new InvalidRequestError('Customer does not exist.');
		}

		res.json(customer);
	} catch (err) {
		next(err);
	}
}

export async function retrieveCustomerByParams(req: Request, res: Response, next: NextFunction) {
	try {
	const data = req.body

	const customer = await Customer.find(data);

	res.json(customer);
	} catch (err) {
	next(err);
	}
}

async function checkCustomer(user,userDetail) {
	let chatDocument;
	let conversationSid;
	const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
	const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);
  
	 
	 try {
		 chatDocument = await TwilioChat.findOne({ "customer.id": user });
		 if (chatDocument) {
			 conversationSid = chatDocument.twilio_chat_service.sid;
		 }
	 } catch (error) {
		 console.error('Error updating participant:', error);
		 return 
	 }
  
	 if (conversationSid) {
		 await updateTwilioChatAttributes(twilioApi, conversationSid, user,userDetail);  
		return 
	 }
	 return 
  }

export async function update(req: Request, res: Response, next: NextFunction) {
	try {
		// console.log('CustomerController update>>>>>>>>>>>>', req.body.cancelSignal)

		const { id }: { id: string } = req.params as any;

		const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
		const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);

		//if( req.body ===  { '$unset': { subscription: 1 } }){
		if (req.body.cancelSignal) {
			logger.info("Cancel signal received is :", req.body.cancelSignal);
			const data = await Customer.updateOne({ _id: id }, { $unset: { subscription: 1 } })
		}

		const customer: ICustomer = await Customer.findById(id);
		
		if (!customer) {
			throw new InvalidRequestError('Customer does not exist.');
		}
		customer.set(req.body);

		await customer.save();
		await checkCustomer(customer.user, req.body.phoneNumber);
		res.json(customer);
	} catch (err) {
		logger.error("Error occured during update :", err);
		next(err);
	}
}


async function updateTwilioChatAttributes(
    twilioApi,
    conversationSid: string,
    identity: string,
    newPhoneNumber: string
) {
    try {
        const participantsFetch = await twilioApi.conversations.v1.conversations(conversationSid).participants.list({ limit: 20 });
        const participantToUpdate = participantsFetch.find(participant => participant.identity === identity);

        if (participantToUpdate) {
            const attributes = JSON.parse(participantToUpdate.attributes || '{}');
            attributes.phoneNumber = newPhoneNumber;

            let updateCustomer=await twilioApi.conversations.v1
                .conversations(conversationSid)
                .participants(participantToUpdate.sid)
                .update({ attributes: JSON.stringify(attributes) });

            console.log('Participant attributes updated.',updateCustomer);
        } else {
            console.log('Participant not found with the specified identity.');
        }
    } catch (error) {
        console.error('Error updating Twilio Chat attributes:', error);
    }
}



export async function remove(req: Request, res: Response, next: NextFunction) {
	try {
		console.log('CustomerController remove>>>>>>>>>>>>')

		const { id }: { id: string } = req.params as any;

		await Customer.deleteOne({ _id: id });

		res.json({ deleted: true });
	} catch (err) {
		next(err);
	}
}


export async function add_customer_to_stripe(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;

	let stripe = await Services.getStripeObject(req)
	try {

		/*if ( user.roles.includes(roleStatus.USER))
		{
			return res.status(403).json({ status:false , message:"Forbidden"});
		}*/
		const customer = await stripe.customers.create({
			email: req.body.email,
		});

		logger.info("add_customer_to_stripe : add customer to stripe: ", { 'body': req.body, 'userId': (user) ? user.id : null, 'customer': customer.id });

		res.json(customer);

	} catch (err) {
		logger.error("add_customer_to_stripe : catch error while adding customer in stripe: ", { 'body': req.body, 'userId': (user) ? user.id : null, 'err': err });
		next(err);
	}
}


export async function add_card_to_customer(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {

		let stripe = await Services.getStripeObject(req)
		try {
			const newCard = await stripe.customers.createSource(
				req.body.stripe_id,
				{ source: req.body.token_id },
			);


			console.log('card added successfully')
			logger.info("add_card_to_customer : add card to customer successfully: ", { 'body': req.body.stripe_id, 'userId': (user) ? user.id : null });

			res.json(newCard);
		} catch (stripe_err) {
			console.log('stripe_err>>>>>>>>>>add_card_to_customer', stripe_err)
			let new_response = {}
			new_response['error'] = {}
			new_response['error']['message'] = stripe_err.raw.message
			new_response['error']['code'] = stripe_err.raw.code
			new_response['error']['type'] = stripe_err.raw.type
			new_response['message'] = 'Card Error'
			new_response['customer'] = req.body.stripe_id
			send_logs_to_new_relic(JSON.stringify(new_response))
			logger.error("add_card_to_customer : error from stripe while adding card to customer. body having personal info we just printing stripe id: ",
				{
					'body': req.body.stripe_id,
					'userId': (user) ? user.id : null,
					'err': stripe_err
				});
			await sendStripInfoToStakeholders({status:new_response['message'],reason:stripe_err.raw.message,stripe_id:req.body.stripe_id,jobId:req.body.jobId})
			res.json(new_response);

		}

	} catch (err) {
		logger.error("add_card_to_customer : exceptional error from stripe while adding card to customer. body having personal info we just printing stripe id: ",
			{
				'body': req.body.stripe_id,
				'userId': (user) ? user.id : null,
				'err': err
			});
		next(err);
	}
}

export async function get_stripe_customer_cards(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {

		let stripe = await Services.getStripeObject(req)

		const cards = await stripe.customers.listSources(
			req.body.stripe_id,
			{ object: 'card', limit: 50 }
		);

		const customer = await stripe.customers.retrieve(
			req.body.stripe_id
		);
		let cdata = cards.data

		for (var i in cdata) {
			if (cdata[i]['id'] == customer.default_source) {
				cdata[i]['default_card'] = 'yes'
			}
		}
		logger.info("get_stripe_customer_cards : get stripe customer card info: ",
			{
				'body': req.body.stripe_id,
				'userId': (user) ? user.id : null,
			}
		);
		res.json(cdata);

	} catch (err) {
		let result = {}
		result['message'] = err.raw.message
		result['status'] = 'Exceptional error'
		await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:'NA'})
		logger.error("get_stripe_customer_cards : Exceptional error while get stripe customer card info: ",
			{
				'body': req.body.stripe_id,
				'userId': (user) ? user.id : null,
				'err': err
			}
		);
		next(err);
	}
}


const updateCostByPromoCode = async (id) => {
	try {
		const job: IJob = await Job.findById(id);
		const findPromocode = await PromoCode.findById(job.coupon_id);
		let total_cost = job.total_cost;
		if (findPromocode) {
			const currentCost = Number(job.total_cost);
			const discountedValue = Number(findPromocode.discount_value)

			if (findPromocode.discount_type === 'fixed' && job) {
				total_cost = currentCost - discountedValue
			} else {
				total_cost = (currentCost - (currentCost * discountedValue / 100))
			}

			if (total_cost < 0) {
				total_cost = 0;
			}

			const result = await Job.updateOne({ '_id': id }, {
				"total_discounted_cost": total_cost
			});
			logger.info("updateCostByPromoCode : Updating total_discounted_cost in the Jobs Table  :",
				{
					'response': result,
					'job_id': id
				});
			return result;
		} else {
			return job;
		}
	} catch (error) {
		logger.error("updateCostByPromoCode : error in Updating total_discounted_cost in the Jobs Table  :",
			{
				'err': error,
				'job_id': id,
			}
		);
	}


}

/**
* This function is a direct api called from frontend to charge money from customer.
* @params = req (Type:Object),res (Type:Object),next (Type:Function)
* @response : returns charge object if payment is successful else returns the error information.
* @author : Manibha,Mritunjay
*/
export async function charge_money_from_customer(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;

	try {
		let stripe = await Services.getStripeObject(req)
		let jobData = req.body.jobData
		let stripe_id = req.body.jobData.customer.stripe_id
		let customer_number = req.body.jobData.customer.phoneNumber
		let user_id = jobData.customer.user.id

		const job: IJob = await Job.findById(req.body.jobData.id)
		if(jobData.customer.user.ownerId){
					let ownerDetails = await Customer.findOne({ 'user': jobData.customer.user.ownerId });
					stripe_id = ownerDetails.stripe_id
					logger.info("getting stripeId from owner (chargeFromCustomer)::" +  { 'stripeId': stripe_id, 'ownerUserId':jobData.customer.user.ownerId})
		}
		let total_cost = job.total_cost
		// console.log("checking if Job History is Available in Job Data or Not",job.hour_history, job.hour_history.length )

		if (!(job.hour_history && job.hour_history.length > 0 && job.hour_history[0].extra_hours_added)) {
			await updateCostByPromoCode(req.body.jobData.id)
		}
		if (job.free_session_total && job.free_session_total != 0) {
			total_cost = job.free_session_total
		}

		if (job.discounted_cost && job.discounted_cost != 0) {
			total_cost = job.discounted_cost
		}


		let result = { 'success': false, 'total_cost': jobData.total_cost }
		if (jobData) {
			let resultData = await stripe_money_deduction(total_cost, result, stripe_id, jobData.id, user_id, jobData, customer_number, stripe)
			res.json(resultData);
			logger.info("charge_money_from_customer : Checking Response from Stripe Money deduction:", { 'response': resultData, 'job_id': jobData.id });
		}

	} catch (err) {
		let result = {}
		result['message'] = err.raw.message
		result['status'] = 'Exceptional error while charge money'
		await sendStripInfoToStakeholders({status:result["status"],reason:result['message'],stripe_id:req.body.jobData.customer.stripe_id,jobId: req.body.jobData.id})
		logger.error("charge_money_from_customer : Exceptional error while charge money :",
			{
				'err': err,
				'userId': user.id,
			}
		);
		next(err);
	}
}

/**
* This function charges the customer money using stripe, if the charge is successfull then charge is returned else customer is blocked and can only be
* unblocked by admin.It also saved the error in job table.
* @params = total_cost (Type:Decimal),result (Type:Object),stripe_id (Type:String),job_id (Type:String),user_id (Type:String)
* @response : returns charge object if payment is successful else returns the error information.
* @author : Manibha
*/
export async function stripe_money_deduction(total_cost,result,stripe_id,job_id,user_id,jobData,custPhoneNumber,stripe, userParent=null){
	let additional_hours_obj
	
	if (jobData.status == 'long-job') {

		//Utkarsh Dixit
		//subtracting already deducted mony from total cost

		if (jobData.is_long_job && jobData != undefined && jobData.hour_history.length != undefined && jobData.hour_history.length > 0) {
			total_cost = jobData.long_job_cost - total_cost;
			console.log("total_cost- if", total_cost)
			additional_hours_obj = jobData.hour_history.find((e) => e.extra_hours_submission === 'pending')
			if (additional_hours_obj) {
				total_cost = additional_hours_obj.extra_cost
			}
		}
		if (jobData.long_job_with_minutes && jobData.long_job_with_minutes == "yes") {
			total_cost = jobData.long_job_cost;
			console.log("total_cost- else", total_cost)
		}
	}


	const job: IJob = await Job.findById(jobData.id);
	// console.log("JOBDATA", jobData)
	// console.log("userParent ::::::::::::;", userParent)
	const softwareData = await Software.findById(job.software)
	const userData = await User.findById(user_id)
	// const customerData = await Customer.findOne({user: user_id})
	let discount = 0

	/*if(userParent && userParent.length > 0 && customerData && !customerData.stripe_id) {
		let parent = await Customer.findOne({user: userParent})
		let parentUser = await User.findOne({_id: userParent})
		custPhoneNumber = parent.phoneNumber;
		userData.firstName = parentUser.firstName;
		if(parent.stripe_id) stripe_id = parent.stripe_id;
	} */

	if(job.is_long_job && job.referalDiscount != undefined){

		// here the referralDiscount is deducted in case of long job.As this function hits directly when money for long job is deducted from customers card.
		// so deduction has to be made here from total cost.
		discount = job.referalDiscount
	}
	if (total_cost && total_cost > 0) {
		// Here total_discounted_cost is the actual cost after giving discount to the customer . So a condition is added that if total_discounted_cost exist then
		//instead of total_cost , total_discounted_cost is send to the Stripe API for money deduction
		if (jobData.coupon_id && jobData.coupon_id != "") {
			/*total_cost = job.total_discounted_cost && job.total_discounted_cost !=undefined && jobData.hour_history &&
			/*total_cost = job.total_discounted_cost && job.total_discounted_cost !=undefined && jobData.hour_history &&
						 jobData.hour_history.length === 0
						 ? job.total_discounted_cost : total_cost;*/
			total_cost = job.total_discounted_cost && job.total_discounted_cost != undefined &&
				(jobData.hour_history == undefined || jobData.hour_history.length == 0) ? job.total_discounted_cost : total_cost;
		}

		let cost_in_cents = total_cost * 100
		let actual_cost = Math.round(cost_in_cents)
		console.log("stripe_id :>>>>>>", stripe_id)
		console.log("actual_cost", actual_cost)
		// console.log("stripe_id ::::::", stripe_id)
		try {
			const charge = await stripe.charges.create({
				amount: actual_cost,
				currency: 'usd',
				customer: stripe_id,
			});

			// This condition will refund  holded money if amount is deducted and job is completed.
			const haveMultipleHoldedPayments = jobData && jobData.customer_holded_payments && jobData.customer_holded_payments.length >0
			if(charge["status"] === "succeeded" && haveMultipleHoldedPayments){
                const holdedPyaments = jobData.customer_holded_payments
				const refundStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments,"cancelling_holded_payments",stripe, actual_cost,jobData.id,stripe_id)	
				console.log("refundStatus refundOrDefuctMoneyFromHoldedArray",refundStatus)
				logger.info("stripe_money_deduction : Payment hold is refunded for job :", {JobId: jobData.id, refundStatus: refundStatus })
			}
			// This condition will deduct  holded money if amount deduction is failed and job is completed.

			if(charge["status"] !== "succeeded" && haveMultipleHoldedPayments){
				const holdedPyaments = jobData.customer_holded_payments
				const refundAndCaptureStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments,"capturing_holded_payments",stripe,actual_cost,jobData.id,stripe_id)	
				logger.info("stripe_money_deduction : Payment hold is deducted for job :",{JobId: jobData.id, refundAndCaptureStatus:refundAndCaptureStatus})
			}
			if (typeof additional_hours_obj === 'object' && Object.keys(additional_hours_obj).length > 0) {
				await Job.update({"_id": job_id,"hour_history._id": additional_hours_obj.id }, { $set: { "hour_history.$.extra_hours_payment_id": charge['id'], "hour_history.$.extra_hours_payment_status": 'Successful' } });
			} else {
				await JobService.updateJob(job_id, { 'payment_id': charge['id'], 'payment_status': 'Successful' });
			}

			// sending text message to customer by manibha starts
			//let correctedNumber = TextService.removePlusFromNumber(custPhoneNumber)
			TextService.sendSmsToNumber(custPhoneNumber,'Hi '+userData.firstName+', We have successfully charged $'+total_cost+' for your'+((userParent && userParent.length > 0) ? " Organization": "")+' job of '+softwareData.name+'. Thanks for using geeker services.',job_id)
			// sending text message to customer by manibha ends
			if (job.is_long_job) {
				// here the discount history table is updated in case of long job.As this function hits directly when money for long job is deducted from customers card.
				// so updation has to be made from here.
				updateDiscountHistory(job, job.referalDiscount)
			}

			// console.log('charge_money_from_customer charge::', charge['id'])
			charge['success'] = true
			result['status'] = 'Successful'
			logger.info("charge_money_from_customer : ",
				{
					'body': result,
					'userId': user_id,
					'info': { 'amount': actual_cost, "stripe_id": stripe_id }
				}
			);
			return charge

		} catch (stripe_err) {

			// This condition will deduct  holded money if amount deduction is failed and job is completed.
			const haveMultipleHoldedPayments = jobData && jobData.customer_holded_payments && jobData.customer_holded_payments.length >0
			if(stripe_err &&  haveMultipleHoldedPayments){
				const holdedPyaments = jobData.customer_holded_payments
				const refundAndCaptureStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments,"capturing_holded_payments",stripe,actual_cost,jobData.id,stripe_id)	
				logger.info("stripe_money_deduction : Payment hold is deducted for job :",{JobId: jobData.id, refundAndCaptureStatus:refundAndCaptureStatus})
			}

			if (typeof additional_hours_obj === 'object' && Object.keys(additional_hours_obj).length > 0) {
				await Job.update({ "_id": job_id, "hour_history._id": additional_hours_obj.id }, { $set: { "hour_history.$.extra_hours_payment_id": stripe_err.raw.charge, "hour_history.$.extra_hours_payment_status": 'Not Successful' } });
			} else {
				await JobService.updateJob(job_id, { 'payment_id': stripe_err.raw.charge, 'stripe_error_status_code': stripe_err.raw.statusCode, 'error_message': stripe_err.raw.message, 'payment_status': 'Not Successful', 'stripe_error_type': stripe_err.raw.type });
			}

			await User.updateOne({ "_id": user_id }, { 'activeStatus': false },
				function (err, response) { })

			console.log('stripe_err>>>>>>>>>>>>charge_money_from_customer', stripe_err.raw)
			result['message'] = stripe_err.raw.message
			result['status'] = 'Not Successful'
			result['success'] = false

			try {
				send_logs_to_new_relic(JSON.stringify(stripe_err.raw))
			}
			catch (log_error) {
				console.log('log_error>>>>>>>>>>>>charge_money_from_customer', log_error)
			}
				await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:stripe_id,jobId:job_id})

			// sending text message to customer by manibha starts

			TextService.sendSmsToNumber(custPhoneNumber, 'Hi ' + userData.firstName + ', Your payment of $' + total_cost + ' has been failed for your '+((userParent && userParent.length > 0) ? " Organization": "")+' job of ' + softwareData.name + '. We have inactive your geeker account and you cannot post a job until your last payment gets cleared.', job_id)
			// sending text message to customer by manibha ends


			prepare_email_for_failed_payment(job, stripe_err.raw)
			logger.error("charge_money_from_customer : Stripe Err while chargerd money: ",
				{
					'body': result,
					'userId': user_id,
					'err': stripe_err.raw,
				}
			);

			return result
		}

	} else {
		result['message'] = "Total cost is 0.";
		logger.info("charge_money_from_customer : " + result['message'] + " :",
			{
				'info': result,
				'userId': user_id,
			}
		);
		return result
	}
}


/**
 * 
 * @param holdedPayments,deductionStatus,stripe,actual_cost,jobId,stripe_id
 * @description : This function either capture or refund the holded amount to the customer's account depending upon deductionstatus
 * @author   : Jagroop
 */
export const refundOrDefuctMoneyFromHoldedArray = async (holdedPayments: any[], deductionStatus: string, stripe: any, actual_cost: number, jobId: string, stripe_id: string) => {
	try {
		let stripeStatus = []
		if (deductionStatus == "cancelling_holded_payments" || actual_cost == 0) {
			for (let i = 0; i < holdedPayments.length; i++) {
				const holdPaymentObj = holdedPayments[i]
				if (holdPaymentObj.payment_hold_id && holdPaymentObj.hold_payment_status == "requires_capture") {
					const paymentHoldId = holdPaymentObj.payment_hold_id;
					let intent;
					try {
						intent = await stripe.paymentIntents.cancel(paymentHoldId)
					} catch (error) {
						await sendStripInfoToStakeholders({ status: 'Not Successful', reason: error.raw.message, stripe_id: stripe_id, jobId: jobId })
						logger.error("Error Occured in refunding money back to customer account", { error: error, stripe_id: stripe_id, jobId: jobId })
						intent={}
					}
					await Job.updateOne(
						{ "customer_holded_payments": { "$elemMatch": { "payment_hold_id": paymentHoldId } } },
						{ "$set": { "customer_holded_payments.$.hold_payment_status": "canceled" } })
					stripeStatus.push({ "status": intent.status })

				}
			}
		}
		if (deductionStatus == "capturing_holded_payments") {
			let costToPay = Number(actual_cost);
			for (let i = 0; i < holdedPayments.length; i++) {
				const holdPaymentObj = holdedPayments[i]
				if (holdPaymentObj.payment_hold_id && holdPaymentObj.hold_payment_status == "requires_capture") {
					const paymentHoldId = holdPaymentObj.payment_hold_id
					const capturedAmount = (costToPay - 10000) > 0 ? 10000 : costToPay
					let intent;
					if (capturedAmount <= 0) {
						try {
							intent = await stripe.paymentIntents.cancel(paymentHoldId)
						} catch (error) {
							await sendStripInfoToStakeholders({ status: 'Not Successful', reason: error.raw.message, stripe_id: stripe_id, jobId: jobId })
							logger.error("Error Occured in capturing money from customer account", { error: error, stripe_id: stripe_id, jobId: jobId })
						}
					}
					if (capturedAmount > 0) {
						try {
							intent = await stripe.paymentIntents.capture(paymentHoldId, { amount_to_capture: capturedAmount })
						} catch (error) {
							await sendStripInfoToStakeholders({ status: 'Not Successful', reason: error.raw.message, stripe_id: stripe_id, jobId: jobId })
							logger.error("Error Occured in capturig money from customer's account", { error: error, stripe_id: stripe_id, jobId: jobId })
							intent={}
						}
					}
					costToPay = (costToPay - 10000) > 0 ? (costToPay - 10000) : 0
					await Job.updateOne(
						{ "customer_holded_payments": { "$elemMatch": { "payment_hold_id": paymentHoldId } } },
						{ "$set": { "customer_holded_payments.$.hold_payment_status": "deduct-specific-and-refund-remaining-amount" } })
					stripeStatus.push({ "status": intent.status })
				}
			}
		}
		return stripeStatus;
	} catch (error) {
		await sendStripInfoToStakeholders({ status: 'Not Successful', reason: "Something Went Wrong !!", stripe_id: stripe_id, jobId: jobId })
		logger.error("Error Occured in refundOrDefuctMoneyFromHoldedArray function", { error: error, stripe_id: stripe_id, jobId: jobId })
		return;
	}
}

export async function retrieve_charge_from_stripe(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {
		let stripe = await Services.getStripeObject(req)
		const charge = await stripe.charges.retrieve(
			req.body.charge_id
		);
		charge['success'] = true
		// console.log('retrieve_charge_from_stripe  charge::', charge)
		logger.info("retrieve_charge_from_stripe : fetch charges from stripe :",
			{
				'info': charge,
				'userId': (user) ? user.id : null,
			}
		);
		res.json(charge);

	} catch (err) {
		logger.error("retrieve_charge_from_stripe : Catch Error: fetch charges from stripe :",
			{
				'err': err,
				'userId': (user) ? user.id : null,
			}
		);
		next(err);
	}
}

export async function update_default_card_customer(req: Request, res: Response, next: NextFunction) {
	try {
		let stripe = await Services.getStripeObject(req)
		const customer = await stripe.customers.update(
			req.body.customer_id,
			{ default_source: req.body.card_id }
		);

		// console.log('update_default_card_customer  customer::', customer)
		res.json(customer);

	} catch (err) {
		next(err);
	}
}

export async function remove_customer_card(req: Request, res: Response, next: NextFunction) {
	try {

		const user = (req as any).user;
		let stripe = await Services.getStripeObject(req)
		/*if ( user.roles.includes(roleStatus.USER))
		{
			return res.status(403).json({ status:false , message:"Forbidden"});
		}*/
		const deleted = await stripe.customers.deleteSource(
			req.body.customer_id,
			req.body.card_id,
		);

		// console.log('remove_customer_card  deleted::', deleted)
		res.json(deleted);

	} catch (err) {
		next(err);
	}
}

/** Function will return subscription details **/
export async function getCustomerSubscription(req: Request, res: Response, next: NextFunction) {
	let user_id = req.body.user_id;
	try {
		// console.log("getCustomerSubscription>>>>>>>>>>>>", req.body)
		let responseData = {}
		let user_role = req.body.user_role;
		let user_parent = req.body.user_parent;
		responseData = await get_subscription(user_role, user_parent, user_id, req.body)
		res.json(responseData);

	} catch (err) {
		logger.error("getCustomerSubscription : Catch error while geting customer subscription :",
			{
				'body': req.body,
				'err': err,
				'userId': user_id,
			}
		);
		console.log('error in getCustomerSubscription', err)
	}
}


/**
* This function finds and return the subscription data whether for a organisation or for single user.
* @params = user_parent (Type:String),user_role (Type:String),user_id (Type:String),reqBody (Type:Object)
* @response : returns subscription data.
* @author : Manibha
*/
async function get_subscription(user_role, user_parent, user_id, reqBody = false) {
	// console.log('get_subscription>>>>>>>>', user_role, user_parent, user_id)

	let responseData = {}
	let found = false
    
	const customer_data = await Customer.findOne({ 'user': user_id }).lean()
	const user_data = await User.findOne({ _id: customer_data.user }).lean()

	if (customer_data && customer_data['subscription'] != undefined) {
		console.log('customer itself has subscription>>>>>>>>>>>>>')
		found = true
		responseData['subscription'] = customer_data['subscription'];
		responseData['subscriptionOwnerId'] = customer_data['_id'];

		logger.info("getCustomerSubscription : customer itself has subscription :",
			{
				'body': reqBody,
				'info': responseData,
				'userId': user_id,
			}
		);

		return responseData
	}


	if (user_role == 'user' || user_role == 'admin') {
		const getSubDetailOfOwner  = await User.findById(user_id);

		const selectWhichIdToPass = getSubDetailOfOwner && getSubDetailOfOwner.ownerId ? getSubDetailOfOwner.ownerId:user_parent
		let check_answer = await check_if_parent_has_subscription(selectWhichIdToPass)
		console.log('check_answer>>>>>>>>>>>', check_answer)
		if (check_answer[0]) {
			found = true
			responseData['subscription'] = check_answer[1]['subscription'];
			responseData['subscriptionOwnerId'] = check_answer[1]['_id'];
			logger.info("getCustomerSubscription : parent has subscription :",
				{
					'body': reqBody,
					'info': responseData,
					'userId': user_id,
				}
			);
			return responseData
		}
	}


	// if(user_role == "owner"){
	// 	let got_admin = await find_all_admins_from_owner(user_id)
	// 	console.log('got_admin>>>>>>>>>>>>>',got_admin)
	// 	if(got_admin[0]){
	// 		found = true
	// 		console.log('owners admin has subscription>>>>>>>>>>>>>>>>>>>>>>>>>>')
	// 		responseData['subscription'] = got_admin[1]['subscription'];
	// 		responseData['subscriptionOwnerId'] = got_admin[1]['_id'];
	// 		logger.info("getCustomerSubscription : owners admin has subscription :",
	// 			{
	// 				'body':reqBody,
	// 				'info':responseData,
	// 				'userId':user_id,
	// 			}
	// 		);
	// 		return responseData
	// 	}
	// }


	if (found == false) {
		logger.info("getCustomerSubscription : Subscription not found :",
			{
				'body': reqBody,
				'info': responseData,
				'userId': user_id,
			}
		);
		return responseData
	}
}

function prepare_email_for_failed_payment(job, stripe_raw_error) {
	try {
		let admin_emails = job && job.customer && job.customer.customerType === 'live' ? JSON.parse(process.env.adminMails) : JSON.parse(process.env.testAdminMails)
		for (var k in admin_emails) {
			send_email_to_admins_for_failed_payment(job, stripe_raw_error, admin_emails[k])
		}
		logger.error("prepare_email_for_failed_payment : while prepare email for failed payment :",
			{
				'body': admin_emails,
				'err': stripe_raw_error,
				'jobId': job.id
			}
		);
	} catch (err) {
		logger.error("prepare_email_for_failed_payment : Catch error while prepare email for failed payment :",
			{
				'err': err,
				'jobId': job.id
			}
		);

	}

}

function send_email_to_admins_for_failed_payment(job, stripe_raw_error, email_name) {
	try {
		let DATE_OPTIONS = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' };
		paymentFailedLiveCustomerEmail({
			email: email_name,
			JobId: `<a href=${process.env.ADMIN_LINK}service_details/${job.id}>Job Details</a>`,
			jobStatus: job.status,
			createdAt: new Date(job.createdAt).toLocaleString("en", DATE_OPTIONS),
			jobTotalCost: `$${job.total_cost}`,
			stripeError: stripe_raw_error.code
		})
	} catch (err) {
		logger.error("send_email_to_admins_for_failed_payment : Geeker Customer Payment Failed mail to admin :",
			{
				'body': stripe_raw_error,
				'err': err,
				'jobId': job.id
			}
		);
		console.log('error in send_email_to_admins_for_failed_payment', err)
	}

}

/**
* This function sends the job compelete email.
* @params = req (Type:Object),res (Type:Object),next (Type:Function)
* @response : no response.
* @author : Manibha
*/
export async function meeting_closed_emails(req: Request, res: Response, next: NextFunction) {
	try {
		await prepare_and_send_meeting_end_emails(req.body.JobId, req.body)

		res.json({ 'success': true });
	} catch (err) {
		console.log('error in meeting_closed_emails', err)
		await JobService.updateJob(req.body.JobId, { 'jobCompleteEmailSent': false });
		logger.error("meeting_closed_emails : Catch error: update job jobCompleteEmailSent column status false :",
			{
				'body': req.body,
				'err': err,
				'jobId': req.body.JobId
			}
		);
		res.json({ 'success': false });
	}
}

/**
	 * Funciton fetch data from db using the jobId
	 * @params = jobId
	 * @response : an object with details of job.
	 * @author : Vinit
*/
const fetchJobData = async (jobId) => {
	return await JobService.findJobById(jobId)
}

/**
	 * Checks if payment id there or not
	 * @params = Null
	 * @response : True / False.
	 * @author : Vinit
*/
const isPaymentIdDefined = () => {
	return fetchJobData['payment_id'] != undefined
}

/**
	 * Checks if payment id starts with ch_
	 * @params = Null
	 * @response : True / False.
	 * @author : Vinit
*/
const doesPaymentIdInclude = () => {
	return (fetchJobData['payment_id'].includes("ch_", 0) || fetchJobData['payment_id'].includes("prod_", 0))
}

/**
	 * Checks if technician charged the customer
	 * @params = Null
	 * @response : True / False.
	 * @author : Vinit,Mritunjay
*/
const isTechnicianCharging = () => {
	return fetchJobData['technician_charged_customer'] == 'yes' || 'partially'
}

/**
	 * Checks if payment id starts with prod_
	 * @params = Null
	 * @response : True / False.
	 * @author : Vinit
*/
const technicianChargedSubscription = () => {
	return (fetchJobData['payment_id'].includes("prod_", 0) && fetchJobData['technician_charged_customer'])
}

/**
	 * function to create html for invoice
	 * @params = jobId
	 * @response : raw html for invoice
	 * @author : Vinit
*/
const htmlToPdf = async (jobId) => {
	try {
		let jobData = await fetchJobData(jobId)

		let rawHtml = {}

		if (jobData['payment_status'] == 'Successful' || technicianChargedSubscription) {
			rawHtml['content'] = `
			<div class="card"  style="box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2); transition: 0.3s; width: 100%; font-family: 'Trebuchet MS, sans-serif'; display: flex; margin-top:50px;" >

					<div style="width: 100%; ">
						<div style ="padding: 5px; ">
							<div style="display: inline;">
								<span>${jobData['payment_id'] && jobData['payment_id'].includes("prod_", 0) ? "Subscription type" : ""}</span>
							</div>
							<div style="display: inline; float:right;">
								<span>${jobData['payment_id'] && jobData['payment_id'].includes("prod_", 0) && jobData['technician_charged_customer'] === 'no' ? 'NA' : jobData['payment_id'] && jobData['payment_id'].includes("prod_", 0) ? jobData['customer']['subscription']['plan_name'] : ""}</span>
							</div>
						</div>
					
						<div style ="padding: 5px;">
							<div style="display: inline;">
								<span>Job Id</span>
							</div>
							<div style="display: inline; float:right;">
								<span>${jobData['JobId']}</span>
							</div>
						</div>
						
						<div style ="padding: 5px;">
							<div style="display: inline;">
								<span>Software name</span>
							</div>
							<div style="display: inline; float:right;">
								<span>${jobData['software']['name']}</span>
							</div>
						</div>
						
						<div style ="padding: 5px;">
							<div style="display: inline;">
								<span>Method</span>
							</div>
							<div style="display: inline; float:right;">
								<span>${jobData['technician_charged_customer'] === 'no' ? 'NA' : jobData['payment_id'] && jobData['payment_id'].includes("prod_", 0) ? 'Subscription' : 'Card'}</span>
							</div>
						</div>
						
						<div style ="padding: 5px;">
							<div style="display: inline;">
								<span>Paid on</span>
							</div>
							<div style="display: inline; float:right;">
								<span>${String(new Date()).substring(4, 25)}</span>
							</div>
						</div>
					</div>		
				</div>`
		}


		if (jobData['payment_status'] == 'Successful' || technicianChargedSubscription) {
			rawHtml['content'] = rawHtml['content'] + `
			<div class="card"  style="box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2); transition: 0.3s; width: 100%; font-family: 'Trebuchet MS, sans-serif'; display: flex;" >
				<div style="width: 100%; ">
					<div style ="padding: 5px;">
						<div style="display: inline;">
							<span>Mobile Number</span>
						</div>
						<div style="display: inline; float:right;">
							<span>${jobData['customer']['phoneNumber']}</span>
						</div>
					</div>
				
					<div style ="padding: 5px;">
						<div style="display: inline;">
							<span>Email</span>
						</div>
						<div style="display: inline; float:right;">
							<span>${jobData['customer']['user']['email']}</span>
						</div>
					</div>
				</div>
			</div>
			`
		}

		if (jobData['payment_status'] == 'Successful' || technicianChargedSubscription) {
			rawHtml['content'] = rawHtml['content'] + `
			<div class="card"  style="box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2); transition: 0.3s; width: 100%; font-family: 'Trebuchet MS, sans-serif'; display: flex; margin-top:50px" >
				<div style="width: 100%; text-align: center  ">
					<table style="width: 100%;  ">
					<thead>
						<tr>
							<th>Job Id</th>	
							<th>Software Name</th>	
							<th>Issue Summary</th>	
							<th>Total Time</th>	
							<th>Is Long Job</th>	
							<th>Total Amount</th>	
						</tr>
					</thead>
					<tbody>
						<tr style="border: solid 2px black;">
							<td style="text-align: center;">${jobData['JobId']}</td>
							<td style="text-align: center;">${jobData['software']['name']}</td>
							<td style="text-align: center;">${jobData['issueDescription']}</td>
							<td style="text-align: center;">${jobData['total_time']}</td>
							<td style="text-align: center;">${jobData['is_long_job']}</td>
							<td style="text-align: center;">${jobData['payment_id'] && jobData['payment_id'].includes("prod_", 0) ? "NA" : jobData['is_free_job'] ? "$ " + jobData['free_session_total'] : "$ " + jobData['total_cost']}</td>
						</tr>
					</tbody>
					</table>
				</div>
			</div>
			`
		}

		if (jobData['payment_status'] == 'Not Successful') {
			rawHtml['content'] = rawHtml['content'] + `
			<div class="card"  style="box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2); transition: 0.3s; width: 100%; font-family: 'Trebuchet MS, sans-serif'; display: flex; margin-top:50px;" >
				<div style="width: 100%; ">

					<div style ="padding: 5px;">
						<div style="display: inline;">
							<span>Payment Failed reason</span>
						</div>
						<div style="display: inline; float:right;">
							<span>${jobData['error_message']}</span>
						</div>
					</div>


				</div>		
			</div>
			`
		}

		return rawHtml['content'];

	} catch (error) {
		console.log('Error from htmlToPdf function', error);
	}
}

/**
   * Following function is responsible for converting seconds into time format of HH:MM:SS
   * @params = (sec) => (Type: Number)
   * @response : no response
   * @author : Kartik
*/
const convertTime = (sec) => {
	try {
		var hours = Math.floor(sec / 3600);
		var hourstr = '00';
		var minstr = '00';
		(hours >= 1) ? sec = sec - (hours * 3600) : hours = 0;
		var min = Math.floor(sec / 60);
		(min >= 1) ? sec = sec - (min * 60) : min = 0;
		minstr = min.toString();
		(sec < 1) ? sec = '00' : void 0;

		(min.toString().length == 1) ? minstr = '0' + min.toString() : void 0;
		(sec.toString().length == 1) ? sec = '0' + sec : void 0;

		if (hours >= 1 && hours <= 9) {
			hourstr = '0' + hours.toString()
		}

		return hourstr + ':' + minstr + ':' + sec;
	} catch (error) {
		logger.error("Error in convertTime function>>>>>", error)
	}
}

/**
 * Function will return the total job time amd total seconds -- excluding pause time
 * @params = job
 * @response : Will return an object of total job time and total seconds
 * @author : Kartik
 */
const getTotalJobTime = (job) => {
	let meetingStartTime = new Date(job.meeting_start_time);
	let meetingEndTime = (job.status === "Completed") ? new Date(job.meeting_end_time) : new Date()
	// let meetingEndTime = new Date()
	let total_time;
	let totalSeconds = 0

	if (job.meeting_pause || job.pause_start_time) {

		if (job.meeting_pause) {

			meetingEndTime = job.pause_start_time;
			totalSeconds = new Date(meetingEndTime).getTime() - meetingStartTime.getTime()
			let duration = Number(new Date(totalSeconds));
			if (job.total_pause_seconds && job.total_pause_seconds > 0) {
				total_time = new Date(duration - (job.total_pause_seconds * 1000)).toISOString().substr(11, 8);
			} else {
				total_time = new Date(duration).toISOString().substr(11, 8);
			}

		} else {

			let meetingEndTime = (job.status === "Completed") ? new Date(job.meeting_end_time) : new Date()
			totalSeconds = meetingEndTime.getTime() - meetingStartTime.getTime()
			let duration = totalSeconds;
			if (job.total_pause_seconds && job.total_pause_seconds > 0) {
				total_time = new Date(duration - (job.total_pause_seconds * 1000)).toISOString().substr(11, 8);
			}
		}

	} else {
		if (meetingEndTime && meetingStartTime) {
			totalSeconds = meetingEndTime.getTime() - meetingStartTime.getTime();
		}
		if (totalSeconds > 0) {
			total_time = new Date(totalSeconds).toISOString().substr(11, 8);
		}

	}
	return ({ 'totalSeconds': (totalSeconds > 0) ? (totalSeconds / 1000) : 0, 'totalTime': total_time })
}

export default getTotalJobTime;

/**
* This function prepares and send the job complete emails. The email is dynamic and is sent to both customer or technician. It also sends the attached pdf of payment information
* if required.
* @params = jobId (Type:String),reqBody (Type:Object)
* @response : no response.
* @author : Manibha,Sahil,Hemant,Vinit,Kartik
*/
export async function prepare_and_send_meeting_end_emails(jobId,reqBody=false,userParent=null){
	let firstJob = false
	let email = []
	let imagePath = ''
	let payment_html = ''
	let discountedCharge = 0;
	let meetingTime = '00:00:00'
	let technicianCharges = 'NA'
	let sharingLink = process.env.AMBASSDOR_SHARING_LINK
	let totalTime,timeUsed,planName,remainingSeconds,convertedTotal,convertedRemaining,usedFromSubscription;
	const jobData  = await JobService.findJobById(jobId)
	let customer_data = await Customer.findOne({'_id':jobData.customer}).lean();
	const mainAccountUserId = jobData['customer']['user']['ownerId'] ?jobData['customer']['user']['ownerId'] : userParent
	if(!customer_data.subscription && mainAccountUserId && mainAccountUserId !== null) {
		 customer_data = await Customer.findOne({'user':mainAccountUserId}).lean()
	}
	let totalJobs = await Job.count({"customer":jobData['customer']['id'],"status":"Completed","meetingStarted":true})
	if(totalJobs === 1){
		firstJob = true
	}
	// customer email starts
	if (jobData['payment_status'] == undefined) {
		payment_html = ''
	} else {
		payment_html = `<p><b>Payment status</b> : ${jobData['payment_status']}</p>`
	}
	//  Total cost 

	let totalCharge = firstJob && jobData.free_session_total != 0 && jobData.free_session_total != undefined
		? jobData.free_session_total : jobData.total_cost - (jobData.referalDiscount ? jobData.referalDiscount : 0)
	if (jobData.is_long_job) {
		if (jobData['long_job_with_minutes'] === 'yes') {
			meetingTime = getTotalJobTime(jobData).totalTime
			totalCharge = jobData.long_job_cost - (jobData.referalDiscount ? jobData.referalDiscount : 0)
		} else {
			meetingTime = jobData.long_job_hours + ' hours'
			totalCharge = jobData.long_job_cost
		}
	} else {
		meetingTime = jobData.total_time
	}
	//  This will run if promocode is applied or not 
	if (jobData.total_discounted_cost && jobData.total_discounted_cost != undefined) {
		discountedCharge = jobData.total_discounted_cost
	} else {
		discountedCharge = firstJob && jobData.free_session_total === 0 ? jobData.free_session_total : totalCharge
	}
	technicianCharges = jobData['technician_charged_customer']
	//setting variables for sending subscription details in email starts
	if (customer_data.subscription && customer_data.subscription !== undefined && jobData.is_long_job === false) {
		totalTime = Number(customer_data.subscription.total_seconds)
		timeUsed = Number(customer_data.subscription.time_used)
		planName = customer_data.subscription.plan_name
		remainingSeconds = totalTime - timeUsed
		convertedTotal = convertTime(totalTime)
		convertedRemaining = convertTime(remainingSeconds)
		if (jobData.is_long_job) {
			usedFromSubscription = "00:00:00"
		}
		else {
			usedFromSubscription = meetingTime;
		}
		totalCharge = 0;

		if ((meetingTime > convertedRemaining)){
			if(remainingSeconds < 0) remainingSeconds = 0;
			convertedRemaining = convertTime(remainingSeconds)
			usedFromSubscription = convertTime(jobData.total_subscription_seconds)
			totalCharge = firstJob ? jobData.free_session_total : jobData.total_cost - (jobData.referalDiscount ? jobData.referalDiscount : 0)
		}

	}


	//setting variables for sending subscription details in email ends

	let paymentStatus = payment_html
	let issueDescription = jobData['issueDescription']
	let softwareName = jobData['software']['name']

	let user_name;

	// This will send mail to customer, owner and admin
	if (mainAccountUserId && mainAccountUserId != '') {
		const ownerId = mainAccountUserId
		const ownerCustomerResponse = await User.findOne({ _id: mainAccountUserId })
		email.push(ownerCustomerResponse['email'])
	}
	if (userParent && mainAccountUserId != userParent) {
		const ownerCustomerResponse = await User.findOne({ _id: userParent })
		email.push(ownerCustomerResponse['email'])
	}
	user_name = jobData['technician']['user']['firstName'] + " " + jobData['technician']['user']['lastName']
	email.push(jobData['customer']['user']['email'])
  let firstName = jobData['customer']['user']['firstName']

	// let customerData = await Customer.findOne({'stripe_id': jobData['customer']['stripe_id']})

	sharingLink = jobData['customer']['user']['referalData']['url']
	// console.log("sharingLink:::::::::::::", sharingLink)
	if (sharingLink && sharingLink !== "") {
		await referrallinkEmail({ email: email, link: sharingLink })
	}

	if (jobData['payment_status'] == 'Successful') {
		imagePath = 'https://freepngimg.com/save/18343-success-png-image/1200x1200'
	}
	else {
		imagePath = 'https://cdn3.vectorstock.com/i/1000x1000/21/02/red-cross-button-refuse-wrong-answer-cancel-vector-932102.jpg'
	}

	/**
	* Following function is responsible for sending payment information email to customer
	* @params : none
	* @response : no response
	* @author : Kartik
	*/
	const sendPaymentInformationEmail = () => {
		if (customer_data.subscription && customer_data.subscription !== undefined && jobData.is_long_job === false) {
			for (let i = 0; i < email.length; i++) {
				paymentInformationWithSubscriptionEmail({
					email: email[i],
					totalCharge,
					meetingTime,
					paymentStatus,
					issueDescription,
					softwareName,
					technicianCharges,
					user_name,
					planName,
					convertedTotal,
					convertedRemaining,
					usedFromSubscription
				})
			}
		} else if(jobData.adminReviewActionTaken === true) {
			adminReviewApproveChargeForCustomer({
				email:jobData['customer']['user']['email'],
				firstName:jobData['customer']['user']['firstName'],
				softwareName:jobData['software']['name'],
				issueDescription:jobData['issueDescription'],
				techName:jobData['technician']['user']['firstName'] + " " + jobData['technician']['user']['lastName'],
				reason:jobData['adminReviewDetails']['reason'],
				totalCost:jobData['total_cost'],
				amountToPaid:jobData['total_discounted_cost'] !== undefined ? jobData['total_discounted_cost'] : 0
			})
		}
		else {
			for (let i = 0; i < email.length; i++) {
				paymentInformationEmail({
					email: email[i],
					totalCharge,
					discountedCharge,
					meetingTime,
					paymentStatus,
					issueDescription,
					softwareName,
					technicianCharges,
					user_name
				})
			}
		}
	}

	if (jobData.total_cost > 0) {
		var filePath = path.join(__dirname, `../../public/files/invoice_${jobData['id']}_.pdf`);
		//let options = { format: 'A4',path:filePath,printBackground:true };
		let options = {
			format: "A3",
			orientation: "portrait",
			border: "10mm",
			header: {
				height: "1mm",
				contents: ''
			},
			footer: {
				height: "1mm",
				contents: {
					first: 'Cover page',
					2: 'Second page', // Any page number is working. 1-based index
					default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
					last: 'Last Page'
				}
			}
		};

		let logoPath = "https://www.geeker.co/wp-content/uploads/2021/12/logo.png"
		let totalPayment = jobData.total_cost - (jobData.referalDiscount ? jobData.referalDiscount : 0)

		let file = {
			content: `
			<div class="card" style="box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);font-family: 'Trebuchet MS, sans-serif'; transition: 0.3s; width: 100%; text-align: center;">
					<div style="padding: 5px;">
						<img  src="${logoPath}" alt="Avatar" style="width:15%">
						<br/>
						<br/>
						<b>Thanks for using Geeker service.</b>	
						<p style="margin:4px; color:#0D2366; font-size: 20px; margin-top:20px;">
							 ${jobData['technician_charged_customer'] === 'no' ? '$0' : jobData['payment_id'] && jobData['payment_id'].includes("prod_", 0) ? jobData.total_time : firstJob ? '$' + jobData.free_session_total : '$' + (totalPayment)}
						</p>
						<p style="font-size: 14px; margin:8px; color: #7B8199;">
							${jobData['technician_charged_customer'] === 'no' ? 'No payment charged' : jobData['payment_id'] && jobData['payment_id'].includes("prod_", 0) ? 'Deducted from Subscription' : jobData['payment_status'] == 'Successful' ? 'Payment ' + jobData['payment_status'] : 'Payment not successful'}
						</p>
					</div>
				</div>		
		`};

		file['content'] = file['content'] + await htmlToPdf(jobId);

		let document = {
			html: file['content'],
			path: filePath,
			data: {
				users: "",
			},
			type: "",
		};

		try {
			// console.log('0---------------------------------------------->1', document, options)
			if (isPaymentIdDefined && doesPaymentIdInclude && isTechnicianCharging) {

				await pdf.create(document, options)
					.then((output) => {
						let myPdf = filePath
						sendPaymentInformationEmail()
					})
					.catch((error) => {
						sendPaymentInformationEmail()
						logger.error("::::::::::ERROR IN PDF CREATION::::::::::", error);
					});
			} else {
				sendPaymentInformationEmail()
			}

		} catch (html_err) {
			sendPaymentInformationEmail()
			logger.error('html_err>>>>>>>>>>>>>>>', html_err)
		}
	} else {
		sendPaymentInformationEmail()
	}

	// customer email ends

	// technician email starts


	let software = jobData['software']['name']
	let issue = jobData['issueDescription']
	let jobTime = jobData.total_time
	let earnedMoney;
	let softwareComission;
	let sessionCost = jobData.total_cost
	let isFixedHourLongJob = jobData['long_job_with_minutes'] === 'no' && parseInt(jobData['long_job_hours']) > 0 ? true : false
	softwareComission = Services.getCountryCodeCommissions(jobData['technician']['commissionCategory'], jobData['software'], isFixedHourLongJob)
	if (isFixedHourLongJob) {
		earnedMoney = await cutCommissionCharges(softwareComission, sessionCost)
	} else {
		earnedMoney = await cutCommissionCharges(softwareComission, sessionCost)
	}
	logger.info('earnedMoney Details Comming from cutCommissionCharges Function', { "earnedMoney": earnedMoney.toFixed(2), "jobId": jobId });
	email = jobData['technician']['user']['email']
	await techincianCompletedJob({
		meetingTime: jobTime,
		technicianCharges: jobData['technician']['tag'] && jobData['technician']['tag'] === 'employed' ? 'NA' : '$' + earnedMoney.toFixed(2),
		email: email,
		programName: software,
		jobDescription: issue,
		jobTotalCost: sessionCost
	})

	// technician email	ends

	await JobService.updateJob(jobId, { 'jobCompleteEmailSent': true });
	await informStakeholderForjobComplete(jobData)
	logger.info("prepare_and_send_meeting_end_emails : Meeting close email sent status updated in job :",
		{
			'body': reqBody,
			'info': { 'payment_status': jobData['payment_status'], 'total_time': jobData.total_time, 'total_cost': jobData.total_cost },
			'jobId': jobData.id
		}
	);
}

const informStakeholderForjobComplete=async(job)=>{
	// console.log("job>>>>>>>>>>>>>", job)
	try{
		let customerType = job['customer']['customerType'];
		let jobStatus = job['status'];
		let jobId = job['id'];
		let jobDes = job['issueDescription'];
		let JobId = job['JobId'];
		let custName = job['customer']['user']['firstName'] + " " +job['customer']['user']['lastName'];
		let techName = job['technician']['user']['firstName'] + " " +job['technician']['user']['lastName'];
		let paymentStatus = job.payment_status;
		let payment_status = (typeof paymentStatus !== 'undefined') ? paymentStatus : 'NA';
		let payment_failed_reason = job.error_message;
		let totalTime= job.total_time;
		let total_cost = job.total_cost;
		let softName = job['software']['name'];
		if(customerType === 'live'){
			let jobType = 'Regular';
			if(jobStatus === 'Scheduled'){
				logger.info('Stakeholders, meeting has been Completed ',{jobId:job.jobid});
				jobType = jobStatus;
			}
				//Fetching emails of all the stakeholders
			const stakeholderData = await Stakeholder.find({}, {email:1, job_flow:1, phone:1, name:1,notification_preferences:1, _id:0})
			//Sending SMS & Email alert to Geeker statkeholders.
				logger.info("informStakeholders Preparing to send SMS and Email to stake holders ",{stakeholderData:stakeholderData} )
				Promise.all(
					stakeholderData.map((stakeholder)=>{
						try {
							if(stakeholder.job_flow === "active"){
								logger.info("informStakeholders about to send email to", {email:stakeholder.email, "job_id":job.jobId})
								//alert on email
								//sendEmailToStakeholdersForCompleteJob(stakeholder, jobType, job, JobId, jobDes, custName,techName,totalTime, total_cost ,paymentStatus,softName)
								
								if (job.payment_status == 'Successful' || (job.is_free_job && job.total_seconds > 1 && job.total_seconds < 360)) {
									//alert on email
									if ((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')) {
										sendEmailToStakeholdersForCompleteJob(stakeholder, jobType, job, JobId, jobDes, custName, techName, totalTime, total_cost, paymentStatus, jobId, softName)
									}
								}
								else {
									if ((stakeholder.notification_preferences === 'email only') || (stakeholder.notification_preferences === 'both')) {
										sendEmailToStakeholdersForCompleteJobPaymentFailed(stakeholder, jobType, job, JobId, jobDes, custName, techName, totalTime, total_cost, paymentStatus, jobId, softName, payment_failed_reason)
									}
								}
								//alert on phone number
									"Total Paid Time:" + totalTime +"\n"+ "Total Cost:$" + total_cost
								let message = "Hi Stakeholder " + stakeholder.name + ", " + (jobType === 'Scheduled' ? "Schedule " : "Regular ") + "job(" + job.JobId + ") for " + job.software.name + " posted by "+custName+" is completed" + ".\n" + "Total Paid Time:" + totalTime +"\n"+ "Total Cost:$" + total_cost+"\n" + "Payment :" + payment_status
					  			console.log("informStakeholderForjobComplete", message);
								if ((stakeholder.notification_preferences === 'sms only') || (stakeholder.notification_preferences === 'both')) {
									TextService.sendSmsToNumber(
										stakeholder.phone,
										message,
										job.id
									)
								}
							}else{
								logger.info("Not to informStakeholders about to send email to", {email:stakeholder.email, "job_id":jobId})
							}
						} catch (error) {
							logger.error("informStakeholders : Error occured stakeholderTeamInfo mapping ", {error:error, stakeholder:stakeholder, jobId:jobId})
						}
					})
				)
		}
	}catch(error){
		console.log("Error in informStakeholderForjobComplete ", error)
	}
	
}

export async function subscription_and_card_fetcher(user, customer, stripe, requires_stripe_id = false) {
	try {
		let found = false;

		if (customer.subscription != undefined && customer.subscription['subscription_id'] !== undefined) {
			found = true
			let response = { 'success': true, 'has_card_or_subscription': true, stripe_id: null }
			if (requires_stripe_id) {
				response['stripe_id'] = customer.stripe_id
			}
			return response
		}
		else if (customer.stripe_id != undefined && customer.stripe_id != '') {
			const stripe_customer = await stripe.customers.retrieve(customer.stripe_id);
			if (stripe_customer.default_source != null && stripe_customer.default_source != '') {
				console.log('customer itself has card>>>>>>>>>>>>>>>>>')
				found = true
				let response = { 'success': true, 'has_card_or_subscription': true, 'stripe_id': null }
				if (requires_stripe_id) {
					response['stripe_id'] = customer.stripe_id
				}
				return response
			}
		}
			if(user.roles.includes("user") || user.roles.includes("admin")){
				let get_owner_id  = user.ownerId
				let check_answer = await check_if_owner_has_subscription(get_owner_id)
				if(check_answer[0]){
					found = true
					let response = {'success':true,'has_card_or_subscription':true,'stripe_id':null}
					if (requires_stripe_id){
						response['stripe_id'] = check_answer[1].stripe_id
					}	
					console.log('parent has subscription>>>>>>>>>>>>>>>>>>>>>>>>>>')
					return response
				}
			}
		// 	if(user.roles.includes('owner')){
		// 		let got_admin = await find_all_admins_from_owner(user['id'])
		// 		console.log("got_admin[0] >>>>>>>",got_admin[0])
		// 		if(got_admin[0]){
		// 			found = true
		// 		let response = {'success':true,'has_card_or_subscription':true,'stripe_id':null}
		// 		if (requires_stripe_id){
		// 			response['stripe_id'] = got_admin[1].stripe_id
		// 		}	
		// 		console.log('parent has subscription>>>>>>>>>>>>>>>>>>>>>>>>>>')
		// 		return response
		// 	}
		//}
		if(found == false){

			console.log('no subscription found>>>>>>>>>>')
			return { 'success': true, 'has_card_or_subscription': false, 'stripe_id': null };
		}
	}
	catch (err) {
		logger.error({
			"message": "Error in subscription_and_card_fetcher",
			"error": err.message
		})
		return { 'success': false, 'has_card_or_subscription': false, 'stripe_id': null };
	}
}

export async function check_organisation_subscription(req: Request, res: Response, next: NextFunction) {
	try {
		let found = false
		let user_dict = req.body.user
		let customer = await Customer.findOne({ "user": user_dict.id })
		// let req_obj = {query:{},body:{},params:{"liveUser":  (req.body && req.body.liveUser ? req.body.liveUser : true)}}
		let stripe = await Services.getStripeObject(req)
		let response = await subscription_and_card_fetcher(user_dict, customer, stripe, true)
		res.json(response)
	} catch (err) {
		console.log('error in check_organisation_subscription', err)
	}
}

export async function check_if_parent_has_subscription(parentId) {
	const parent_user = await User.findOne({ '_id': parentId }).populate("customer").lean()
	if (parent_user['customer']['subscription'] != undefined || parent_user['customer']['stripe_id'] != undefined) {
		console.log('has subscription>>>>>>>>>', parent_user['_id'])
		return [true, parent_user['customer']]

	}

	// if (parent_user['roles'].includes("admin")) {
	// 	console.log('recursion>>>>>>>>>>>>>>>>')
	// 	check_if_parent_has_subscription(parentId)
	// }

	/*if (parent_user['roles'].includes("owner")) {
		let got_admin = await find_all_admins_from_owner(parent_user['_id'])
		if (got_admin[0]) {
			return [true, got_admin[1]]
		}
	}*/
	return [false, []]

}

export async function check_if_owner_has_subscription(ownerId) {
	const owner_user = await User.findOne({ '_id': ownerId }).populate("customer").lean()
	if (owner_user['customer']['subscription'] != undefined || owner_user['customer']['stripe_id'] != undefined) {
		console.log('has subscription>>>>>>>>>', owner_user['_id'])
		return [true, owner_user['customer']]
	}
	return [false, []]
}

export async function find_all_admins_from_owner(owner_id) {
	const admin_data = await User.find({ 'parentId': owner_id, 'roles': ['admin'] }).populate("customer").lean()
	// console.log('admin_data>>>>>>>>', admin_data)
	for (let i = 0; i <= admin_data.length - 1; i++) {
		if (admin_data[i]['customer']['subscription'] != undefined || admin_data[i]['customer']['stripe_id'] != undefined) {
			console.log('admin has subscription>>>>>>>>>>>>>>>>', admin_data[i]['_id'])
			return [true, admin_data[i]['customer']]
		}
	}
	return [false, []]
}

export async function check_card_validation(req: Request, res: Response, next: NextFunction) {
	try {
		let stripe = await Services.getStripeObject(req)
		let result = {}
		try {
			console.log('cut test charge>>>>>>>>>>')
			const charge_obj = await stripe.charges.create({
				amount: 10000,
				currency: 'usd',
				source: req.body.token_id,
			});

			if (charge_obj) {
				console.log('charge successfull now refund>>>>>>>>>')
				const refund = await stripe.refunds.create({
					charge: charge_obj.id
				});

				result['message'] = 'Test charge successfull'
				result['status'] = 'Successful'
				result['success'] = true
			}
		} catch (stripe_err) {
			console.log('charge not successfull>>>>>>>>>', stripe_err)
			result['message'] = stripe_err.raw.message
			result['status'] = 'Not Successful'
			result['success'] = false
			await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:'NA'})
		}
		res.json(result);

	} catch (err) {
		console.log('error in check_organisation_subscription', err)
		let result = {}
         const errorMessage = err.raw.message || 'Something went wrong! Please try again later.';
		result['message'] = errorMessage
		result['status'] = 'Not Successful'
		result['success'] = false
		res.json(result);
		await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:'NA'})
	}
}

/**
 * This function refunds the amount of referal if payment is not cut
 * @params : jobId(Type:Integer)
 * @response : true / false boolean
 * @author : Sahil
**/
async function refundReferalAmount(jobId) {
	try {
		let jobObj = await Job.findOne({ "_id": jobId })
		let dataForRefund = {
			"jobId": jobId,
			"query": { "customer": jobObj['customer'] }
		}
		await discountServices.refundDiscount(dataForRefund)
	}
	catch (err) {
		console.log("error in refundReferalAmount :::::::: ", err)
	}
}

/**
* This function charge money from the customer if the customer is liable to pay in any form whether from subscription or from card, sends job complete emails,saves data in
* billing table.
* @params = req (Type:Object),res (Type:Object),next (Type:Function)
* @response : no response.
* @author : Ridhima Dhir,Mritunjay
*/

export async function takeChargeFromCustomerFromSocket(job) {
	try {
		console.log(" take_charge_from_customer -3 ", job.jobId)
		job['socketliveUser'] = (job.customer_type == 'live') ? true : false;
		let stripe = await Services.getStripeObject(job)
		const totalJobTime = job.totalJobTime
		const jobId = job.jobId
		const user_role = job.user_role
		const user_parent = job.user_parent
		const user_id = job.user_id
		const customer_type = job.customer_type

		logger.info("totalJobTime in admin_approve_charge: ", { 'totalJobTime': totalJobTime, 'job_id': jobId });
		if (job.is_partially_solved) {
			await JobService.updateJob(jobId, { technician_charged_customer: 'partially' });
		} else {
			await JobService.updateJob(jobId, { technician_charged_customer: 'yes' });
		}

		let get_updated_job = await Job.find({ _id: jobId });
		const subscriptionDetailsRes = await get_subscription(user_role, user_parent, user_id)

		logger.info("subscriptionDetailsRes in admin_approve_charge: ", { 'subscriptionDetailsRes': subscriptionDetailsRes, 'job_id': jobId });

		const cutCharge = await checkIfCustomersFirstHasFreeSession(totalJobTime, subscriptionDetailsRes, get_updated_job);
		logger.info("cutCharge in admin_approve_charge: ", { 'cutCharge': cutCharge, 'job_id': jobId });

		let newly_updated_job = get_updated_job[0];


		//check if customer is test user then just send email of invoice
		// await ifTestUser(newly_updated_job, customer_type)
		await ifNotTestUser(job, stripe, newly_updated_job, subscriptionDetailsRes, cutCharge)

	} catch (err) {
		logger.error("admin_approve_charge : catch error admin_approve_charge: ", { 'jobId': job.jobId, 'err': err.message });
	}

}

/**
* This function charge money from the customer if the customer is liable to pay in any form whether from subscription or from card, sends job complete emails,saves data in
* billing table.
* @params = req (Type:Object),res (Type:Object),next (Type:Function)
* @response : no response.
* @author : Manibha,Karan, ridhima,Mritunjay
*/

export async function take_charge_from_customer(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	try {
		let stripe = await Services.getStripeObject(req)
		const totalJobTime = req.body.totalJobTime
		const jobId = req.body.jobId
		const user_role = req.body.user_role
		const user_parent = req.body.user_parent
		const user_id = req.body.user_id
		const customer_type = req.body.customer_type

		logger.info("totalJobTime in take_charge_from_customer: ", { 'totalJobTime': totalJobTime, 'job_id': jobId });

		if (req.body.is_partially_solved) {
			await JobService.updateJob(jobId, { technician_charged_customer: 'partially' });
		} else {
			await JobService.updateJob(jobId, { technician_charged_customer: 'yes' });
		}
		let get_updated_job = await Job.find({ _id: jobId });
		const subscriptionDetailsRes = await get_subscription(user_role, user_parent, user_id)

		logger.info("subscriptionDetailsRes in take_charge_from_customer: ", { 'subscriptionDetailsRes': subscriptionDetailsRes, 'job_id': jobId });

		const cutCharge = await checkIfCustomersFirstHasFreeSession(totalJobTime, subscriptionDetailsRes, get_updated_job);
		logger.info("cutCharge in take_charge_from_customer: ", { 'cutCharge': cutCharge, 'job_id': jobId });

		let newly_updated_job = get_updated_job[0];

		//check if customer is test user then just send email of invoice
		// await ifTestUser(newly_updated_job, customer_type,stripe)

    let userParent = user_parent
		const ifNotTestUserRes = await ifNotTestUser(req.body, stripe, newly_updated_job, subscriptionDetailsRes, cutCharge, userParent)
		return res.json({
			data : ifNotTestUserRes
		});

	} catch (err) {
		logger.error("take_charge_from_customer : catch error take_charge_from_customer: ", { 'body': req.body, 'userId': (user) ? user.id : null, 'err': err });
    return res.json({err})

	}

}

/**
* check if customer is test user then just send email of invoice
* @params = newly_updated_job(string: jobId), 
* 		customer_type(string:test)
* @response : send invoice email to customer
* @author : ridhima
*/
async function ifTestUser(newly_updated_job, customer_type) {
	try {
		if (customer_type === 'test' && newly_updated_job['jobCompleteEmailSent'] == false) {
			// meeting end email code should only work on technician side (manibha)
			logger.info("take_charge_from_customer : ifTestUser: ", { 'newly_updated_job': newly_updated_job, 'customer_type': customer_type });
			prepare_and_send_meeting_end_emails(newly_updated_job['id'])
		}
	} catch (err) {
		logger.error("take_charge_from_customer : catch error ifTestUser: ", { 'newly_updated_job': newly_updated_job, 'customer_type': customer_type, 'err': err })
	}
}

/**
* check if customer is not a test user then calculate calculation
* @params = body (Object: jobId), 
* 		stripe (Object: stripe details), 
* 		newly_updated_job (Object: created job), 
*		subscriptionDetailsRes (Object: subscription Details),
*		cutCharge (Boolean: True if job is not free / False if job is free)
* @response : update job and send invoice email to customer
* @author : ridhima,Mritunjay
*/
async function ifNotTestUser(body, stripe, newly_updated_job, subscriptionDetailsRes, cutCharge, userParent=null){
	const customer_type = body.customer_type
	const minutesFreeForClient = body.minutesFreeForClient
	const technician_user_id = body.technician_user_id
	const softwareRate = body.software_rate
	const user_id = body.user_id
	const jobId = body.jobId
	
	try{

		// if (customer_type !== 'test') {
			// if(!newly_updated_job.technician_charged_customer || newly_updated_job.technician_charged_customer !== 'yes' || newly_updated_job.technician_charged_customer !== 'partially'){
			// 	console.log("Mail - One")
			// 	prepare_and_send_meeting_end_emails(newly_updated_job['id'],false,userParent)
			// } 
			if (!newly_updated_job.payment_id && cutCharge) {
				const subscriptionDetails = subscriptionDetailsRes['subscription'] ? subscriptionDetailsRes['subscription'] : {};
				if (subscriptionDetails && subscriptionDetails.plan_id) {
					let totalJobSeconds = newly_updated_job['total_seconds'];
					// This code is commented because we don't want to give customer free 6 min if he or his owner have Subscription  : Jagroop
					// if (newly_updated_job['is_free_job']) {
					// 	totalJobSeconds -= (minutesFreeForClient * 60);
					// 	prepare_and_send_meeting_end_emails(newly_updated_job['id'],false,userParent)
					// }
					totalJobSeconds = (totalJobSeconds > 0 ? totalJobSeconds : 0);
					const totalSubscriptionSeconds = subscriptionDetails.total_seconds;
					const totalSubscriptionSecondsUsed = subscriptionDetails.time_used;
					const totalPendingSeconds = totalSubscriptionSeconds - totalSubscriptionSecondsUsed;

					logger.info("totalJobSeconds in take_charge_from_customer: ",{'totalJobSeconds':totalJobSeconds,'job_id':jobId});
					logger.info("totalSubscriptionSeconds in take_charge_from_customer: ",{'totalSubscriptionSeconds':totalSubscriptionSeconds,'job_id':jobId});
					logger.info("totalSubscriptionSecondsUsed in take_charge_from_customer: ",{'totalSubscriptionSecondsUsed':totalSubscriptionSecondsUsed,'job_id':jobId});
					logger.info("totalPendingSeconds in take_charge_from_customer: ",{'totalPendingSeconds':totalPendingSeconds,'job_id':jobId});
					logger.info("newly updated job>>>>>>>>>>>>",{"newlyUpdatedUob":newly_updated_job});


					if (totalPendingSeconds <= 0) {
						logger.info("Total pending seconds are 0 so going to charge customer",{'job_id':jobId})
						const chargeFromCustomerRes = chargeFromCustomer(newly_updated_job,user_id,technician_user_id,stripe, userParent);
						return chargeFromCustomerRes
					} 
					let conditionalStat = {
						'totalPendingSeconds': totalPendingSeconds, 
						'totalJobSeconds': totalJobSeconds, 
						'subscriptionDetails': subscriptionDetails, 
						'totalSubscriptionSeconds': totalSubscriptionSeconds, 
						'jobId': jobId, 
						'subscriptionDetailsRes': subscriptionDetailsRes, 
						'newly_updated_job': newly_updated_job, 
						'minutesFreeForClient': minutesFreeForClient, 
						'softwareRate': softwareRate, 
						'user_id': user_id, 
						'technician_user_id': technician_user_id, 
						'stripe': stripe,
						'totalSubscriptionSecondsUsed':totalSubscriptionSecondsUsed
					}

					isGreaterTotalPendingSeconds(conditionalStat, userParent)
					isGreaterTotalJobSeconds(conditionalStat, userParent)
				} else {
					logger.info("Newly Updated Job>>>>>>>>>>>>",{"Newly updated job":newly_updated_job})
					const chargeFromCustomerRes = chargeFromCustomer(newly_updated_job,user_id,technician_user_id,stripe, userParent);
					return chargeFromCustomerRes
				}
			} else {
				const haveMultipleHoldedPayments = newly_updated_job && newly_updated_job.customer_holded_payments && newly_updated_job.customer_holded_payments.length > 0
				if (haveMultipleHoldedPayments) {
					const holdedPyaments = newly_updated_job.customer_holded_payments
					const stripe_id =  newly_updated_job.customer['stripe_id']
					const refundStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments,"cancelling_holded_payments",stripe,0,newly_updated_job.id,stripe_id)	
					logger.info("stripe_money_deduction : Payment hold is refunded for job-if job is first job with 6 min free :", { JobId: newly_updated_job.id, jobData: newly_updated_job, refundStatus:refundStatus })
				}
				
				if (newly_updated_job['jobCompleteEmailSent'] == false) {
					prepare_and_send_meeting_end_emails(newly_updated_job['id'],false,userParent)
					return {success:false, message:"Customer not charged"}
				}
			}
		// }
		
	}catch(err){
		
		logger.error("take_charge_from_customer : catch error ifNotTestUser: ",{
			'err':err, 
			'stripe':stripe, 
			'newly_updated_job':newly_updated_job, 
			'subscriptionDetailsRes':subscriptionDetailsRes, 
			'cutCharge':cutCharge
		})
	}
}

/**
* check totalPendingSeconds is greater then totalJobSeconds
* @params = 
* 		totalPendingSeconds (Integer: totalPendingSecond), 
*		totalJobSeconds (Integer: totalJobSeconds), 
*		subscriptionDetails (Object: subscriptionDetailsRes get subscription from object), 
*		totalSubscriptionSeconds (Integer: subscriptionDetails), 
*		jobId (String: jobId), 
*		subscriptionDetailsRes (Object: subscriptionDetailsRes), 
*		newly_updated_job (Object: newly_updated_job) 
*		minutesFreeForClient (Object: minutesFreeForClient), 
*		softwareRate (Object: softwareRate), 
*		user_id (Object: user_id), 
*		technician_user_id (Object: technician_user_id), 
*		stripe (Object: stripe),
*		totalSubscriptionSecondsUsed (Object: totalSubscriptionSecondsUsed)
* @response : update job and send invoice email to customer
* @author : ridhima
*/
async function isGreaterTotalPendingSeconds(conditionalStat, userParent=null) {
	try {
		logger.info(`Total pending seconds are ${conditionalStat.totalPendingSeconds} so going to deduct from subscription`, { 'job_id': conditionalStat.jobId })
		if (conditionalStat.totalPendingSeconds > conditionalStat.totalJobSeconds) {
			logger.info(`Total pending seconds are ${conditionalStat.totalPendingSeconds} so going to deduct from subscription`, { 'job_id': conditionalStat.jobId })
			conditionalStat.subscriptionDetails.time_used = conditionalStat.totalSubscriptionSecondsUsed + conditionalStat.totalJobSeconds;
			await refundReferalAmount(conditionalStat.jobId)
			const dataToUpdate = {
				subscription: conditionalStat.subscriptionDetails,
			};
			await Customer.updateOne({ "_id": conditionalStat.subscriptionDetailsRes['subscriptionOwnerId'] }, dataToUpdate,
				function (err, response) { }
			)

			const jobDataToUpdate = {
				total_subscription_seconds: conditionalStat.totalJobSeconds,
				payment_id: conditionalStat.subscriptionDetails.plan_id,
				payment_type :"subscription_only",
			};
			// This condition will refund  holded money if amount is holded and job is completed in subscription case.
			const haveMultipleHoldedPayments = conditionalStat && conditionalStat.newly_updated_job['customer_holded_payments'] && conditionalStat.newly_updated_job['customer_holded_payments'].length >0
			if (haveMultipleHoldedPayments) {
				const holdedPyaments = conditionalStat.newly_updated_job['customer_holded_payments']
				const stripe_id =  conditionalStat.newly_updated_job.customer['stripe_id']
				const refundStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments,"cancelling_holded_payments",conditionalStat.stripe, 0,conditionalStat.newly_updated_job["id"],stripe_id)
				logger.info("stripe_money_deduction : Payment hold is refunded in subscription case", {jobId: conditionalStat.newly_updated_job['id'], refundStatus: refundStatus })
			}

			await JobService.updateJob(conditionalStat.newly_updated_job['id'], jobDataToUpdate);

			// creating Biling Report
			const dataToSave = {};
			dataToSave['transaction_type'] = 'Subscription (' + capitalizeFirstLetter(conditionalStat.subscriptionDetails.plan_name) + ')'
			dataToSave['transaction_status'] = 'Completed'
			dataToSave['total_amount'] = conditionalStat.newly_updated_job['total_cost']
			dataToSave['job_id'] = conditionalStat.newly_updated_job['id']
			dataToSave['customer_user_id'] = conditionalStat.user_id
			dataToSave['technician_user_id'] = conditionalStat.technician_user_id
			create_billing_report(dataToSave)
			// creating Biling Report
			let datatoTags = {};
			if (conditionalStat.newly_updated_job.is_transferred && conditionalStat.newly_updated_job.is_transferred == true) {

			} else {
				datatoTags['Tag'] = jobTags.SUBSCRIPTION_DEDUCTED;
			}
			datatoTags['JobId'] = conditionalStat.jobId;
			JobTagService.createJobTags(datatoTags)
			prepare_and_send_meeting_end_emails(conditionalStat.newly_updated_job['id'], false, userParent)
		}
	} catch (err) {
		logger.error("take_charge_from_customer : catch error isGreaterTotalPendingSeconds: ", {
			'err': err,
			'conditionalStat': conditionalStat
		})
	}
}

/**
* check totalPendingSeconds is greater then totalJobSeconds
* @params = 
* 		totalPendingSeconds (Integer: totalPendingSecond), 
*		totalJobSeconds (Integer: totalJobSeconds), 
*		subscriptionDetails (Object: subscriptionDetailsRes get subscription from object), 
*		totalSubscriptionSeconds (Integer: subscriptionDetails), 
*		jobId (String: jobId), 
*		subscriptionDetailsRes (Object: subscriptionDetailsRes), 
*		newly_updated_job (Object: newly_updated_job) 
*		minutesFreeForClient (Object: minutesFreeForClient), 
*		softwareRate (Object: softwareRate), 
*		user_id (Object: user_id), 
*		technician_user_id (Object: technician_user_id), 
*		stripe (Object: stripe),
*		totalSubscriptionSecondsUsed (Object: totalSubscriptionSecondsUsed)
* @response : update job and send invoice email to customer
* @author : ridhima,Mritunjay
*/
async function isGreaterTotalJobSeconds(conditionalStat, userParent=null){
	try{
		if (conditionalStat.totalPendingSeconds < conditionalStat.totalJobSeconds) {
			logger.info(`Total pending seconds are ${conditionalStat.totalPendingSeconds}. Its not enough for job so going to charge for pending time`, { 'job_id': conditionalStat.jobId })

			conditionalStat.subscriptionDetails.time_used = conditionalStat.totalSubscriptionSeconds;
			const dataToUpdate = {
				subscription: conditionalStat.subscriptionDetails,
			};

			await Customer.updateOne({ "_id": conditionalStat.subscriptionDetailsRes['subscriptionOwnerId'] }, dataToUpdate, function (err, response) { })

			let chargePendingSeconds = conditionalStat.totalJobSeconds - conditionalStat.totalPendingSeconds;
			if (conditionalStat.newly_updated_job['is_free_job']) {
				prepare_and_send_meeting_end_emails(conditionalStat.newly_updated_job['id'],false,userParent)
			}
			chargePendingSeconds = (chargePendingSeconds > 0 ? chargePendingSeconds : 0);
			logger.info(`chargePendingSeconds in take_charge_from_customer : `, { 'job_id': conditionalStat.jobId, 'chargePendingSeconds': chargePendingSeconds })

			if (chargePendingSeconds > 0) {
				let intPerSixMin = 0
				const totalMinutesForCharge = chargePendingSeconds / 60;
				const perSixMin = totalMinutesForCharge / 6;
				intPerSixMin = Math.floor(perSixMin)
				let totalCost = 0;
				if (perSixMin > intPerSixMin) {
					totalCost = conditionalStat.softwareRate * (intPerSixMin + 1);
				} else {
					totalCost = conditionalStat.softwareRate * intPerSixMin;
				}

				logger.info(`chargePendingSeconds totalCost in take_charge_from_customer : `, { 'job_id': conditionalStat.jobId, 'totalCost': totalCost })

				if (conditionalStat.subscriptionDetails.discount != undefined) {
					const subs_discount_percent = conditionalStat.subscriptionDetails.discount;
					const subs_discount = (totalCost * subs_discount_percent) / 100;
					const subs_discounted_cost = totalCost - subs_discount;

					const jobDataToUpdate = {
						'total_subscription_seconds': conditionalStat.totalPendingSeconds,
						'total_discounted_cost': totalCost,//subs_discounted_cost :: question for chintan sir
						'free_session_total': totalCost, //subs_discounted_cost :: question for chintan sir
						// 'discounted_cost': subs_discounted_cost,
						'discount_percent': subs_discount_percent,
						'discount': subs_discount,
						payment_type :"subscription_and_card",
					};
					await JobService.updateJob(conditionalStat.newly_updated_job['id'], jobDataToUpdate);
				}

				let now_updated_job = await Job.findOne({ '_id': conditionalStat.newly_updated_job['id'] });
				//console.table([now_updated_job])				
				let tempObj = {...conditionalStat, stripe: {}}
				logger.info("take_charge_from_customer : isGreaterTotalJobSeconds: ",{
					'now_updated_job':now_updated_job, 
					'conditionalStat':tempObj
				})
				chargeFromCustomer(now_updated_job,conditionalStat.user_id,conditionalStat.technician_user_id,conditionalStat.stripe,userParent);
			}
		}
	} catch (err) {
		logger.error("take_charge_from_customer : catch error isGreaterTotalJobSeconds: ", {
			'err': err,
			'conditionalStat': conditionalStat
		})
	}
}

/**
* This function checks if the customer is using free session or not and according to that returns a variable which tells whether to charge customer or not.
* @params = jobTime (Type:String),subscriptionDetailsRes (Type:Object),jobData (Type:Object)
* @response : This function return true/false which symbolizes whether to charge money or not.
* @author : Manibha,Karan,Sahil
*/
export async function checkIfCustomersFirstHasFreeSession(jobTime, subscriptionDetailsRes, jobData) {
	try {
		const freeSessionMinutes = parseInt(process.env.FREE_SESSION_MINUTES)
		let cutCharge = false;
		const [hours, minutes, seconds] = jobTime.split(':');

		logger.info("the hours in checkIfCustomersFirstHasFreeSession: ", { 'hours': hours , jobId : jobData[0]['_id']});
		logger.info("the minutes in checkIfCustomersFirstHasFreeSession: ", { 'minutes': minutes, jobId : jobData[0]['_id'] });
		logger.info("the seconds in checkIfCustomersFirstHasFreeSession: ", { 'seconds': seconds, jobId : jobData[0]['_id'] });

		const customer_info = await Customer.findOne({ '_id': jobData[0]['customer'] })
        let customer_stripe_id = customer_info.stripe_id;
		const customer_user_info = await User.findOne({ '_id': customer_info.user })
		if(customer_user_info && customer_user_info.ownerId && customer_user_info.ownerId !== '' ){
			const customer_owner_info = await Customer.findOne({ 'user': customer_user_info.ownerId })
			customer_stripe_id = customer_owner_info.stripe_id;

		}
		console.log('stripe id ::::',customer_stripe_id)
		
		const totalJobsCountForFreeSessions = await Job.count({ 'customer': customer_info._id, 'meetingStarted': true })

		// This condition will verify is  minutes are greater than 6 and then we will cutCharges in that case
		const totalMinutes = parseInt(hours) * 60 + parseInt(minutes) + parseInt(seconds) / 60;
		const roundedMinutes = Math.round(totalMinutes);
		logger.info("Total minutes of job is ",{jobId : jobData[0]['_id'] , totalMinutes :roundedMinutes})
		if(roundedMinutes > 6){
			cutCharge = true;
			return cutCharge;
		}

		if (parseInt(minutes) < 6 && jobData[0]['is_free_job'] === true) {
			if (parseInt(seconds) > 0){
				cutCharge = false;
			}
			return cutCharge;
		  }

		if (totalJobsCountForFreeSessions > 1) {
			cutCharge = true;
			return cutCharge;
		}
		
		if (parseInt(hours) >= 1) {
			cutCharge = true;
			return cutCharge;
		}
		if (parseInt(minutes) >= freeSessionMinutes) {
			if (parseInt(minutes) > freeSessionMinutes) {
				if (customer_stripe_id && customer_stripe_id != '') {
					cutCharge = true;
				} else {
					cutCharge = false;
					// setFreeSessionAmount('0');
				}
			} else if (parseInt(minutes) === freeSessionMinutes) {
				if (parseInt(seconds) > 0 && (customer_stripe_id && customer_stripe_id != '')) {
					cutCharge = true;
				} else {
					cutCharge = false;
				}
			}

			return cutCharge;
		}

		logger.info("subscriptionDetailsRes checkIfCustomersFirstHasFreeSession: ", { 'subscriptionDetailsRes': subscriptionDetailsRes });


		if (Object.keys(subscriptionDetailsRes).length > 0 && totalJobsCountForFreeSessions <= 1) {
			cutCharge = true;
			return cutCharge;
		}


		logger.info("totalJobsCountForFreeSessionsgreater than 1 ::::: checkIfCustomersFirstHasFreeSession: ", { 'condition': totalJobsCountForFreeSessions > 1 });
		logger.info("hours greater than equal to 1  ::::: checkIfCustomersFirstHasFreeSession: ", { 'condition': parseInt(hours) >= 1 });
		logger.info("minutes greater than freeSessionMinutes ::::: checkIfCustomersFirstHasFreeSession: ", { 'condition': parseInt(minutes) > freeSessionMinutes });

		return cutCharge;
	} catch (err) {
		logger.error("checkIfCustomersFirstHasFreeSession : catch error checkIfCustomersFirstHasFreeSession: ", { 'jobTime': jobTime, 'subscriptionDetailsRes': subscriptionDetailsRes, 'jobData': jobData, 'err': err });
		return false;
	}
};

/**
 * 
 * @param jobData 
 * @returns total_cost
 * @description This function is used to apply coupon code and recalculate the total cost.
 * @author : Jagroop
 */
const applyCouponcode = (jobData) => {
	try {
		let total_cost = -1;
		if (jobData.coupon_id && jobData.coupon_id != "") {
			if (jobData.discounted_cost && jobData.discounted_cost != 0 && jobData.total_cost > jobData.discounted_cost) {
				total_cost = jobData.discounted_cost
			}
			if (jobData.total_discounted_cost && jobData.total_discounted_cost) {
				total_cost = jobData.total_discounted_cost
			}
			if (jobData.coupon_code && jobData.coupon_code_discount && jobData.discount_type === "fixed") {
				total_cost = Number(jobData.coupon_code_discount) >= Number(jobData.total_cost) ? 0 : total_cost
			}
		}
		logger.info("applyCouponcode : total_cost: ", { 'total_cost': total_cost, "jobData": jobData.id });
		return total_cost;
	} catch (error) {
		logger.error("applyCouponcode : catch error applyCouponcode: ", { 'jobData': jobData, 'err': error });
		return -1;
	}
}



/**
* This function charges the customer money using stripe, saves data in billing report and send complete meeting emails.
* @params = jobData (Type:Object),user_id (Type:String),technician_user_id (Type:String)
* @response : no response
* @author : Manibha, karan
*/
export async function chargeFromCustomer(jobData,user_id,technician_user_id,stripe,userParent=null) {
	try {
		let referDiscount = 0;
		if (!jobData.payment_id) {
			const customer_info = await Customer.findOne({ '_id': jobData['customer'] })
			// console.table([customer_info])
			const user_obj = await User.findOne({ "_id": customer_info.user })
			// console.log("customer_info in chargeFromCustomer :::: ", user_obj)
			let subscription_details = await subscription_and_card_fetcher(user_obj, customer_info, stripe, true)
			// console.log('subscription_details::::',subscription_details)
			if (subscription_details.has_card_or_subscription) {
				customer_info.stripe_id = subscription_details.stripe_id
			}
			let total_cost = jobData.total_cost
			if (jobData.referalDiscount) {
				referDiscount = jobData.referalDiscount
				total_cost = total_cost - referDiscount
			}
			if (jobData.free_session_total && jobData.free_session_total != 0) {
				total_cost = jobData.free_session_total
			}
			// console.log('subscription_details:::: 1',customer_info)
			// Below code is used to apply coupon code and recalculate the total cost. If it return -1 then it means coupon is not availale and it will
			// use the previous total cost.
			const resultantCost = applyCouponcode(jobData);
			total_cost = resultantCost === -1 ? total_cost : resultantCost
			let result = { 'success': false, 'total_cost': total_cost }

			const charge = await stripe_money_deduction(total_cost,result,customer_info.stripe_id,jobData._id,user_id,jobData,customer_info.phoneNumber,stripe, userParent)
			logger.info("chargeFromCustomer : total_cost: ", { 'total_cost': total_cost, 'customer': user_id, 'job_id': jobData._id, 'charge': charge });
			updateDiscountHistory(jobData, referDiscount)

			if (charge) {
				// creating Biling Report
				const dataToSave = {};
				if (charge.payment_method_details && charge.payment_method_details.card) {
					dataToSave['transaction_type'] = capitalizeFirstLetter(charge.payment_method_details.card.brand);
				}
				dataToSave['job_id'] = jobData['_id'];
				dataToSave['transaction_status'] = capitalizeFirstLetter(charge.status);
				dataToSave['total_amount'] = total_cost;
				dataToSave['customer_user_id'] = user_id
				dataToSave['technician_user_id'] = technician_user_id
				create_billing_report(dataToSave)
				let datatoTags = {};
				if (jobData.is_transferred && jobData.is_transferred == true) {
					datatoTags['Tag'] = jobTags.PAYMENT_DEDUCTED_AFTER_TRANSFER;
				} else {
					datatoTags['Tag'] = jobTags.PAYMENT_DEDUCTED;
				}
				datatoTags['JobId'] = jobData.id;
				JobTagService.createJobTags(datatoTags)
				// creating Biling Report
			}

			if (jobData.jobCompleteEmailSent == false) {
				prepare_and_send_meeting_end_emails(jobData.id,false,userParent)
			}

			return charge
		} 
    
	} catch (err) {
		logger.error("chargeFromCustomer : catch error chargeFromCustomer: ", { 'jobData': jobData, 'user_id': user_id, 'technician_user_id': technician_user_id, 'err': err });
		return err
	}
}


export async function updateDiscountHistory(jobData, referDiscount) {
	let discountObj = await DiscountHistory.findOne({ "customer": jobData['customer'] }).sort({ 'createdAt': -1 }).limit(1)
	let customerDiscountObj = await referalDiscount.findOne({ "customer": jobData['customer'] })
	let initalAmount = customerDiscountObj != null ? customerDiscountObj.discountNumber : 0
	console.log(">>>> initalAmount <<<< >>>>> initalAmount <<<< initalAmount  >>>>>>", initalAmount)
	let historyData = {
		"customer": jobData['customer'],
		"spentFor": 'job',
		"spentType": "debit",
		"initalAmount": initalAmount,
		"newAmount": referDiscount,
		"modelType": "Job",
		"spentAmount": referDiscount,
		"spentOn": jobData['_id'],
	}
	if (referDiscount > 0) {
		let discountCharge = await discountServices.createDiscount(historyData)
	}
}


/**
* This function changes the first letter of string to capital.
* @params = str (Type:String)
* @response : returns the string with first letter capitalize
* @author : Manibha
*/

function capitalizeFirstLetter(str) {
	if (str) {
		return str.replace(/^\p{CWU}/u, char => char.toLocaleUpperCase());
	}
	return '';
}


/**
* This function inserts data in billings table.
* @params = dataToSave (Type:Object)
* @response : no response
* @author : Manibha
*/

export async function create_billing_report(dataToSave) {
	const billingdata = await BillingDetails.findOne({ "job_id": dataToSave.job_id })
	const jobData = await Job.findById({ "_id": dataToSave.job_id })
	if (billingdata) {
		await BillingDetails.updateOne({ "job_id": dataToSave.job_id }, { $set: { "transaction_type": dataToSave.transaction_type, "transaction_status": dataToSave.transaction_status, "total_amount": dataToSave.total_amount } })
		if (jobData && jobData.payment_id) {
			const result = jobData.payment_id
			if (jobData.total_subscription_seconds > 0 && result && !result.startsWith("ch_")) {
				await BillingDetails.updateOne({ "job_id": dataToSave.job_id }, { $set: { "is_stripe_called": false } })
			}
			else {
				await BillingDetails.updateOne({ "job_id": dataToSave.job_id }, { $set: { "is_stripe_called": true } })
			}
		}
		else {
			const details = new BillingDetails(dataToSave);
			await details.save();
		}
	}
}

/**
 * Handle Discount from referal (copied sahils function by manibha)
 * @params : customerID(Type:String),discountedCost(Type:Integer)
 * @response : if have referal discount then update the referal table
 * @author : Sahil
 **/

export async function handleReferalDiscount(req: Request, res: Response, next: NextFunction) {
	try {

		let customerId = req.body.customerId
		let totalCost = req.body.totalCost

		const referalUser = await referalDiscount.findOne({ customer: customerId })
		let discount = referalUser.discountNumber
		let discountRemaining = discount
		if (discount > 0) {
			if (totalCost > discount) {
				discountRemaining = 0
			} else {
				discountRemaining = discount - totalCost
				discount = totalCost
			}
			await referalDiscount.updateOne({ customer: customerId }, { discountNumber: discountRemaining })
		}

		let result = {}
		result['referalDiscountCost'] = discount
		result['success'] = true
		res.json(result);

	} catch (err) {
		logger.error("handleReferalDiscount : catch error handleReferalDiscount: ", { 'customerId': req.body.customerId, 'err': err });
		let result = {}
		result['referalDiscountCost'] = 0
		result['success'] = false
		res.json(result);
	}
}

/**
 * Deducts $100 from stripe and refunds it immediately before any job.
 * @params : req>>>stripe_id(Type:String)
 * @response : result(Type:Object)
 * @author : Kartik
 **/
export async function card_pre_authorization(req: Request, res: Response, next: NextFunction) {
	try {
		let stripe = await Services.getStripeObject(req)

		let result = {}
		try {
			console.log('pre authorization of $100>>>>>>>>>>')
			const charge_obj = await stripe.charges.create({
				amount: 10000,
				currency: 'usd',
				customer: req.body.stripe_id,
				description: 'Pre-authorization',
			});

			if (charge_obj.status === "succeeded") {
				console.log('charge successful now refund>>>>>>>>>')
				const refund = await stripe.refunds.create({
					charge: charge_obj.id
				});

				if (refund.status === "succeeded") {
					console.log('refund successful>>>>>>>>>')
					result['message'] = 'Pre authorization successful'
					result['status'] = 'Successful'
					result['success'] = true
				}
			}
		} catch (stripe_err) {
			console.log('pre authorization not successful>>>>>>>>>', stripe_err)
			logger.error("Error occured during pre authorization :", stripe_err);
			result['message'] = stripe_err.raw.message
			result['status'] = 'Not Successful'
			result['success'] = false
			await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:'NA'})
		}
		res.json(result);

	} catch (err) {
		console.log('error in card_pre_authorization', err)
		logger.error("Error in card_pre_authorization :", err);
		let result = {}
		result['message'] = 'Something went wrong!.Please try again later'
		result['status'] = 'Not Successful'
		result['success'] = false
		await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:'NA'})
		res.json(result);
	}
}

/**
 * @description: This function is used to hold the payment before meeting and release the holded payment if meeting is successfully 
 * 				 deducted from customer account otherwise deducted from holded money.
 * @params : required stripe_id(Type:String),job_id(Type:String)
 * @author : Jagroop
 */

export async function holdChargeFromCustomer(req: Request, res: Response, next: NextFunction) {

	try {
		// Get Stripe Object
		let stripe = await Services.getStripeObject(req);
		// Create a hold on the payment
		let paymentIntent ={};
		
		logger.info('holdChargeFromCustomer:::hold-on-payment process called for job '+req.body.jobId, {data: req.body});
		try {
				paymentIntent= await stripe.paymentIntents.create({
					amount: 10000,
					currency: 'usd',
					payment_method_types: ['card', 'apple_pay', 'google_pay'],
					customer: req.body.stripe_id,
					confirm: true,
					capture_method: 'manual',
				});		
		} catch (error) {
			paymentIntent = error;
			let result = createResultObject(error.raw.message, 'Failure', false);
			result = {...result , ...{"response" : paymentIntent}}
			// This will update job fields when payment hold fails 
			await Job.update({ _id: req.body.jobId },
				{
					$push: {
						failed_payments: {
							payment_hold_id: paymentIntent['id'],
							payment_fail_reason: error.raw.message,
							payment_failed_date: new Date(),
						}
					}
				}
			);
			logger.info('holdChargeFromCustomer:::hold-on-payment process failed (Catch block) for job '+req.body.jobId, {result: result});
			await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:req.body.jobId})
			return res.json(result);
		}

		logger.info('holdChargeFromCustomer:::hold-on-payment paymentIntent response for job'+req.body.jobId, {paymentIntent: paymentIntent});

		logger.info('holdChargeFromCustomer:::hold-on-payment', { paymentIntent: paymentIntent, data: req.body });
		if (paymentIntent['status'] === "requires_capture") {
			logger.info('Payment of $100 hold successfully>>>>>>>>>');
			if (req.body.jobId == "NA") {
				let result = createResultObject('$100 on hold successfully', 'Successful', true);
                result  = {...result, ...{"payment_id" :paymentIntent['id'], "payment_status": paymentIntent['status'], "stripe_id": paymentIntent['customer']}}
				logger.info('Result Obtained after Payment Hold',{result : result, data : req.body})
				return res.json(result);
			} else {
				// This will update job fields on the basis of response that we get while Holding Payments
				await Job.update({ _id: req.body.jobId },
					{
						$push: {
							customer_holded_payments: {
								payment_hold_id: paymentIntent['id'],
								hold_payment_status: "requires_capture",
								payment_hold_date : new Date(),
							}
						},
						$set: {
							cardPreAuthorization: true
						}
					}
				);
				const result = createResultObject('$100 on hold successfully', 'Successful', true);
				return res.json(result);
			}
		}else{
			const messageOne =  paymentIntent['charges'] && paymentIntent['charges'].data[0] &&  paymentIntent['charges'].data[0].outcome.seller_message;
			const messageTwo = paymentIntent['charges'] && paymentIntent['charges'].data[0] &&  paymentIntent['charges'].data[0].failure_message;
			const message = messageOne || messageTwo || 'Something went wrong!.Please try again later';
			const result = createResultObject(message, 'Failure', false);
			// This will update job fields when payment hold fails 
			await Job.update({ _id: req.body.jobId },
				{
					$push: {
						failed_payments: {
							payment_hold_id: paymentIntent['id'],
							payment_fail_reason: message,
							payment_failed_date: new Date(),
						}
					}
				}
			);


			await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:req.body.jobId})


			logger.info('holdChargeFromCustomer:::hold-on-payment process failed for job '+req.body.jobId, {result: result});
			return res.json(result);
		}

	} catch (error) {
		let response = {}
		response['message'] = error.raw.message
		response['status'] = 'Error occured during holdChargeFromCustomer'
		await sendStripInfoToStakeholders({status:response['status'],reason:response['message'],stripe_id:req.body.stripe_id,jobId:req.body.jobId})

		logger.error("holdChargeFromCustomer :: Error occured during holdChargeFromCustomer :", { error: error, data: req.body });
		const result = createResultObject('Something went wrong!.Please try again later', 'Not Successful', false);
		return res.json(result);
	}

}


/**
 * 
 * @param req (payment_hold_id: string, isDeduct:boolean)
 * @description this function is used to deduct or refund holded amount
 * @returns return payment deducted or refunded successfully
 * @author Jagroop
 */
export async function deductOrRefundHoldedAmount(req: Request, res: Response, next: NextFunction) {

	try {
		const paymentHoldId = req.body.payment_hold_id;
		const isDeduct = req.body.isDeduct;
		const jobId = req.body.jobId
		const stripe_id = req.body.stripe_id
		if (jobId === "NA") { 
			const cancelledResult = await refundMoneyToAuthorizedCard(paymentHoldId,stripe_id,jobId);
			return res.json(cancelledResult);
		} else {
			const job: IJob = await Job.findById(jobId).populate("customer").lean();
			const stripeReqObj = {
				"params": {
					"stripe_id": job.customer['stripe_id'],
					'liveUser': job.customer['customerType'] === 'live' ? "true" : "false",
					'jobId': jobId,
				}
			}
			logger.info("Customer Details for Checking Live or Test", { stripeReqObj: stripeReqObj, job: job },)
			let stripe = await Services.getStripeObject(stripeReqObj);
			if (isDeduct) {
				const holdedPyaments = job.customer_holded_payments
				const captureStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments, "capturing_holded_payments", stripe, 10000,jobId,stripe_id)
				return res.json(captureStatus);
			} else {
				const holdedPyaments = job.customer_holded_payments
				const refundStatus = await refundOrDefuctMoneyFromHoldedArray(holdedPyaments, "cancelling_holded_payments", stripe, 0,jobId,stripe_id)
				return res.json(refundStatus);
			}
		}
	} catch (error) {
		logger.error("Error occured during deductOrRefundHoldedAmount :", { error: error, data: req.body });
		const result = createResultObject('Something went wrong!.Please try again later', 'Not Successful', false);
		await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.stripe_id,jobId:req.body.jobId})
		return res.json(result);
	}
}


/**
 * 
 * @param payment_hold_id 
 * @returns stripe object
 * @description : This function will check user type (live or not) and return stripe key(live or test)
 *                on the basis of that payment is refunded in case of card authorization only
 * @author : Jagroop
 */
const returnStripeOjectWithCorrectUserType = async (payment_hold_id: string,stripe_id:any) => {
	try {
		if (stripe_id) {
			const customer_details = await Customer.find({ stripe_id: stripe_id })
			logger.info("Getting customer details from stripe id:", { customer_details: customer_details });
			if (customer_details && customer_details[0]['customerType']) {
				const stripeReqObj = {
					"params": {
						"stripe_id": stripe_id,
						'liveUser': customer_details[0]['customerType'] === 'live' ? "true" : "false",
						'jobId': "NA",
					}
				}
				logger.info("Customer Details for Checking Live or Test", { stripeReqObj: stripeReqObj, job: customer_details },)
				let stripe = await Services.getStripeObject(stripeReqObj);
				return stripe;
			} else {
				return stripe;
			}
		} else {
			return stripe;
		}
	} catch (error) {
		logger.info("Nothing is processed so returning stripe for live customer", { error: error });
		return stripe;
	}
}

// This function is called when we want to refund the money during cardAuthorizaton
const refundMoneyToAuthorizedCard = async (paymentHoldId: string, stripe_id:any,jobId) => {
	let capture = {}
	let updatedResult = {}
	try {
		const stripe = await returnStripeOjectWithCorrectUserType(paymentHoldId,stripe_id)
		capture = await stripe.paymentIntents.cancel(paymentHoldId);
	} catch (error) {
		updatedResult = createResultObject('Something Went Wrong', 'Unsuccessful', false);
		updatedResult = { ...updatedResult, ...{ "response": error } }
		logger.error("Checking Status from stripe while payment is not cancelled",{updatedResult : updatedResult})
		await sendStripInfoToStakeholders({status:updatedResult['status'],reason:updatedResult['message'],stripe_id:stripe_id,jobId:jobId})
		return updatedResult
	}
	logger.info("checking response when payment is successfully cancelled",{capture : capture})
	if (capture['status'] === "canceled") {
		updatedResult = createResultObject('Payment refunded successfully', 'Refunded', true);
		return updatedResult;
	} else {
		let updatedResult = createResultObject('Something Went Wrong', 'Unsuccessful', false);
		updatedResult = { ...updatedResult, ...{ "response": capture } }
		await sendStripInfoToStakeholders({status:updatedResult['status'],reason:updatedResult['message'],stripe_id:stripe_id,jobId:jobId})
		return updatedResult;
	}
}

// This function  is used to update payment status and update in job
// const upDatePaymentStatus = async (status:string, jobId:string) => {
// 	let result = {};
// 	if (status === "succeeded") {
// 		result = createResultObject('Payment deducted successfully', 'Successful', true);
// 		await Job.update({ '_id': jobId }, { "hold_payment_status": "succeeded" });
// 	}
// 	if (status === "canceled") {
// 		result = createResultObject('Payment refunded successfully', 'Refunded', true);
// 		await Job.update({ '_id': jobId }, { "hold_payment_status": "canceled" });
// 	}
// 	if (status === "deduct-specific-and-refund-remaining-amount") {
// 		result = createResultObject('Payment holded and refunded remaining amount successfully', 'deduct-specific-and-refund-remaining-amount', true);
// 		await Job.update({ '_id': jobId }, { "hold_payment_status": "deduct-specific-and-refund-remaining-amount" });
// 	}
// 	logger.info("stripe_money_deduction : Payment hold is refunded for job :", { result: result, jobId: jobId })
// 	return result;
// }



// This function is used to create result object
function createResultObject(message, status, success) {
	let result = {}
	result['message'] = message
	result['status'] = status
	result['success'] = success
	logger.info('createResultObject:::result', {result : result});
	return result
}


