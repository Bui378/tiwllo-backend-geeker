import { Request, Response, NextFunction } from 'express';
import Customer,{ICustomer} from '../models/Customer';
import AppliedCoupon,{IAppliedCoupons} from '../models/AppliedCoupons';
import * as Services from '../services/SettingService'
import moment from 'moment';
import SubscriptionHistory from '../models/SubscriptionHistory';
import {sendStripInfoToStakeholders} from '../utils'
import * as discountServices from '../services/DiscountServices';
import DiscountHistory from '../models/DiscountHistory';
import referalDiscount, { IReferalDiscount } from '../models/ReferalDiscounts';

import {
	sendBuySubscriptionEmailToCustomer,
	sendBuySubscription,
	sendBuySubscriptionEmailAdmin
  } from "../services/MailService";

let logger = require('../../winston_logger');
logger = logger("SubscriptionController.ts");
import { track } from '../services/klaviyo'
import Promo, { IPromo } from '../models/Promo';


/**
 * To convert the amount in percentage
 * @params : totalAmount(Type:Integer),smallAmount(Type:Integer)
 * @response : return integer value calculated with percentage and returns the amount pending in referal discount
 * @author : Sahil
 **/

function getAmountPercentage(totalAmount,discAmount){
	try{
		let percentageForValue = 0;
		let remaningAmount = 0;
		if(totalAmount > discAmount){
			percentageForValue = (discAmount/totalAmount) * 100
		}
		else{
			percentageForValue = 100
			remaningAmount = discAmount - totalAmount
		}

		
		return [percentageForValue,remaningAmount]
	}
	catch(err){
		console.log("error in  getAmountPercentage :::",err)
		return [0,0]
	}
}


export async function getAPlan(req: Request, res: Response, next: NextFunction) {
	try {
		console.log('REQ DATA BODY', req)
		let stripe = await Services.getStripeObject(req)
		const singlePlan = await stripe.products.retrieve(req.query.planId);
		  
		console.log('A plan retrieved from stripe', singlePlan)

		return res.json({
			status: true,
			data: singlePlan
		});
		
	} catch (err) {
		next(err);
		return res.json({
			status: false,
			error:err
		});
	}
}
export async function getAllPlans(req: Request, res: Response, next: NextFunction) {
	try {
		// console.log('REQ DATA BODY',req_obj)
		let stripe = await Services.getStripeObject(req)
		const plans = await stripe.products.list({
			active:true,
			// limit: 3,
		 });
		 console.log(' Data PLANS',plans)
		if(plans && plans.data && plans.data.length > 0){
			
			const prices = await stripe.prices.list({
				limit:100,
			});
			console.log('PRICES',prices)

			let plansData = []
			plans['data'].forEach(function(p){
				
				let obj = prices['data'].find(o => o.product === p.id);
				p['price'] = {};
				if(obj){
					p['price'] = obj;
				}
				plansData.push(p)
			})
			return res.json({
				data: plansData
			});
		}else{
			return res.json({
				data: [],
				totalPlans : 0
			});
		}
	} catch (err) {
		next(err);
	}
}

export async function buySubscription(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.. buying subscription <<<<<<<<<<<<<<",req.body.params.customer_id)
	const req_obj = {query:{},body:{},params:{"liveUser":  (req.body && req.body.params ? req.body.params.liveUser : true)}}
	let stripe = await Services.getStripeObject(req_obj);
	let userId = (user)? user.id:null;
	let discountAmount = 0
	let coupon;
	let remaningAmount;
	let promoCode = false
	let promoPrice = 0
	let paidPrice = 0
	let priceOff = 0
	try {
		const {couponId,promoId,plan_purchased_date} = req.body.params
		// console.log("couponId",couponId , "promoId",promoId)
		const customer_id = (req.body && req.body.params ? req.body.params.customer_id : "");
		const customer = await Customer.findOne({"stripe_id":customer_id})
		const referalDiscountObject = await referalDiscount.findOne({"customer":customer._id});
		// console.log('referalDiscountObject Data',referalDiscountObject)
		const price_id = (req.body && req.body.params ? req.body.params.price_id : "");
		const product_id = (req.body && req.body.params ? req.body.params.product_id : "");
		const product_info = await stripe.products.retrieve(
			product_id,
		);
		const price_info = await stripe.prices.retrieve(
			price_id
		);
		
		let priceForSubscription = price_info.unit_amount / 100
    	const price = (price_info['unit_amount']/100);
		if(customer_id && price_id){
			discountAmount = referalDiscountObject != null ?referalDiscountObject.discountNumber:0
			let price = (price_info['unit_amount']/100);
			let cost = getAmountPercentage(priceForSubscription,discountAmount)
			let percentageForDiscount = cost[0]
			let discountObj = await DiscountHistory.findOne({"customer":customer._id}).sort({'_id':-1}).limit(1)
			let initalAmount = referalDiscountObject? referalDiscountObject.discountNumber  : 0

			// console.log('priceForSubscription',priceForSubscription)
			// console.log('discountAmount',discountAmount)
			// console.log('cost',cost)
			// console.log('percentageForDiscount',percentageForDiscount)
			// console.log('discountObj',discountObj)
			let historyData = {
				"customer":customer._id,
				"spentFor":'subscription',
				"spentType":"debit",
				"initalAmount":initalAmount,
				"newAmount" :discountAmount,
				"spentAmount":priceForSubscription - discountAmount,
				"modelType" :"Subscribe",
			}
			remaningAmount = cost[1]

			if (discountAmount > 0){

				coupon = await stripe.coupons.create({
					  percent_off: percentageForDiscount.toFixed(2),
					  duration: 'once',
				});
			}
			if(price_info['type'] == 'one_time'){

				const invoiceItem = await stripe.invoiceItems.create({
				  price: price_id,
				  customer: customer_id,
				});
				const invoice = await stripe.invoices.create({
				  	customer: customer_id,
					collection_method:'charge_automatically',
				});
				const invoice_pay = await stripe.invoices.pay(
				  invoice.id
				);
				let purchasedAt = {"label":"Expiry Date","date": moment(invoice.period_end).format('MM-DD-YYYY')};
				if (discountAmount > 0 ){
					price = price  - discountAmount
				}
				// await sendBuySubscription(req.body.params,product_info,purchasedAt,price,promoCode);
				await sendBuySubscriptionEmailToCustomer(req.body.params,product_info,purchasedAt,price,promoCode);

				let cust_name = req.body.params.name;
				let product_info_name = product_info.name;
				let plan_price =`$${price}`
				let renewal_date = purchasedAt.date
				let purchased_label = purchasedAt.label
				let product_info_data = JSON.parse(product_info.metadata.key_features)

				let admin_emails = customer["customerType"] === "live" ? JSON.parse(process.env.adminMails) : JSON.parse(process.env.testAdminMails)
				for(var k in admin_emails){
					const email = admin_emails[k]
					await sendBuySubscriptionEmailAdmin(cust_name, product_info_name, renewal_date,purchased_label,plan_price,email,product_info_data,plan_purchased_date)
				}
				logger.info("Success! Your plan is now active: ",{'body':req.body.params, 'userId':userId});

				return res.json({
					success:true,
					data: invoice_pay,
					errorMessage:'',
					messageToDisplay:'Success! Your plan is now active.'
				});
			}else{		
				let subscriptionData = {
					'customer': customer_id,
					'items': [
						{'price': price_id},
					]
				}
				let afterSubscriptionResponse = await discountServices.addReferalDiscount({customer:customer._id})

				if(discountAmount > 0){
					subscriptionData['coupon']  = coupon.id
				}
				if(promoId){
					subscriptionData['promotion_code']  = promoId
				}
				if(couponId){
					subscriptionData['coupon']  = couponId
				}
				const subscription = await stripe.subscriptions.create(subscriptionData);
				if(subscription){
					const invoice = await stripe.invoices.retrieve(
						subscription.latest_invoice
					);
					if(invoice.discount && invoice.discount.coupon){
						if(invoice.discount.promotion_code === null){
							const coupon_records = await stripe.coupons.retrieve(
								invoice.discount.coupon.id
							);
							if(coupon_records.metadata && Object.keys(coupon_records.metadata).length >= 1){
								let old_arr = JSON.parse(coupon_records.metadata.customer_list) 
								const lastTenElements = old_arr.slice(-10)
								let arr = [...lastTenElements,customer._id]
								const coupon = await stripe.coupons.update(
									invoice.discount.coupon.id,
									{metadata: {customer_list:JSON.stringify(arr)}}
								  );
							}else{
								const coupon = await stripe.coupons.update(
									invoice.discount.coupon.id,
									{metadata: {customer_list:JSON.stringify([customer._id])}}
								  );
							}
							const appliedCouponDataToSave = {
								customer:customer._id, 
								user:userId,
								coupon_id:couponId,
								subscription_id:product_id,
							}
							const savedAppliedCoupon = new AppliedCoupon(appliedCouponDataToSave);
							await savedAppliedCoupon.save((err)=>{
								if(err){
									console.log('Error while saving savedAppliedCoupon! ',err)
								}
							});
						}
						if(invoice.discount && invoice.discount.coupon && invoice.discount.promotion_code !== null){
							let  promoDataUpdated = await Promo.updateOne({"customer_id":customer._id, "promo_id":promoId},{$set:{"redeemed":true,"subscription_id":subscription.id}})
							promoCode = true;
							let parcentage = price-(0.05 * price)
							promoPrice = Math.round(parcentage* 100) / 100
						}
						if(invoice.discount.coupon && invoice.discount.coupon.percent_off && invoice.discount.coupon.percent_off !== null && invoice.discount.coupon.percent_off !== undefined){
							priceOff = (invoice.discount.coupon.percent_off/100) * (invoice.subtotal/100)
						}else{
							priceOff = invoice.discount.coupon.amount_off/100
						}						
					}
					paidPrice = invoice.amount_paid/100
				}

				if (discountAmount > 0 ){
					let discountCharge = await discountServices.createDiscount(historyData)	
				}
		
				if(discountAmount > 0){
					let dataUpdated = await referalDiscount.updateOne({"customer":customer._id},{"discountNumber":remaningAmount})
				}
				let validate_subscription = await check_subscription_valid(subscription,stripe)
				if(validate_subscription == 'paid'){
					const currentPeriodEnd = moment().add(1, 'months').format('MM-DD-YYYY');
					let purchasedAt = {"label":"Renewal Date","date": currentPeriodEnd};
					
					// await sendBuySubscription(req.body.params,product_info,purchasedAt,price,promoPrice);
					await sendBuySubscriptionEmailToCustomer(req.body.params,product_info,purchasedAt,price,promoCode);

					let cust_name = req.body.params.name;
					let product_info_name = product_info.name;
					let plan_price = `$${price}`
					let admin_emails = customer["customerType"] === "live" ? JSON.parse(process.env.adminMails) : JSON.parse(process.env.testAdminMails) 
					// console.log("Admin_Mails:::::;",admin_emails)
					let renewal_date = purchasedAt.date
					let purchased_label = purchasedAt.label
					let product_info_data = JSON.parse(product_info.metadata.key_features)
					for(var k in admin_emails){
						const email = admin_emails[k]
						await sendBuySubscriptionEmailAdmin(cust_name, product_info_name, renewal_date,purchased_label,plan_price,email,product_info_data,plan_purchased_date)      	
					}
					logger.info("Success! Your plan is now active: ",{'body':req.body.params, 'userId':userId});


					track({
						event: 'Subscription bought',
						email: req.body.params.email,
						properties: {
						  $first_name: req.body.params.firstName,
						  $last_name: req.body.params.lastName,
						  $plan_name:product_info.name,
						  $purchasedAt: req.body.params.plan_purchased_date,
						  $price: price,
						  $renew_date:moment(subscription.current_period_end * 1000).format('MM-DD-YYYY')
						}
					});
					return res.json({
						success:true,
						data: subscription,
						promo_code_applied:promoCode,
						errorMessage:'',
						paidPrice:Number(paidPrice),
						priceOff:Number(priceOff).toString().match(/^-?\d+(?:\.\d{0,2})?/)[0],
						messageToDisplay:'Success! Your plan is now active.'

					});	
				}else{
					// logger.info("Your request for subscription is still pending.You can check with the bank if transaction is successfull : ",{'body':req.body.params, 'userId':userId});
					let reasonForError = 'Your request for subscription is still pending.You can check with the bank if transaction is successfull.'
					await sendStripInfoToStakeholders({status:validate_subscription,reason:reasonForError,stripe_id:req.body.params.customer_id,jobId:'NA'})
					return res.json({
						success:false,
						data: subscription,
						errorMessage:validate_subscription,
						messageToDisplay:reasonForError
					});
				}

							
			}
		}else{
			let error_message = 'Invalid customer_id or plan_id';
             let message_to_display = 'Seems like your session is expired. Please reload your page and try again.';
			logger.error("Seems like your session is expired. Please reload your page and try again : ",{'body':req.body.params, 'userId':userId,err:'Invalid customer_id or plan_id'});

			await sendStripInfoToStakeholders({status:error_message,reason:message_to_display,stripe_id:req.body.params.customer_id,jobId:'NA'})

			return res.json({
				success:false,
				data: [],
				errorMessage: error_message,
				messageToDisplay:message_to_display
			});
		}
	 

	} catch (err) {
		let result = {}
		result['message'] = err.raw.message
		result['status'] = 'Not Successful'
		result['success'] = false
		await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.body.params.customer_id,jobId:'NA'})

		logger.error("Subscription bought: Catch Error : ",{'body':req.body.params, 'userId':userId,'err':err});
		return res.json({
			success:false,
			data: [],
			errorMessage:err.raw.message || "Something went wrong !!",
			messageToDisplay:'Seems like your session is expired. Please reload your page and try again.'
		});
		next(err);
	}
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
	const user = (req as any).user;
	let userId = (user)? user.id:null;
	let stripe = await Services.getStripeObject(req.body);
	try {
		const subscription_id = (req.body && req.body.params ? req.body.params.subscription_id : "");

		if(subscription_id){
			

			if(subscription_id.startsWith("in_")){
				
				const invoice_details = await stripe.invoices.retrieve(
					  subscription_id
					);
				logger.info("Subscription canceled successfully: ",{'body':req.body.params, 'userId':userId});

				return res.json({
					success:true,
					data: invoice_details,
					errorMessage:'',
					messageToDisplay:'Subscription canceled successfully.'
				});
			}else{
				
				const subscription = await stripe.subscriptions.del(subscription_id);
				// logger.info("Subscription canceled successfully: ",{'body':req.body.params, 'userId':userId});
				return res.json({
					success:true,
					data: subscription,
					errorMessage:'',
					messageToDisplay:'Subscription canceled successfully.'
				});
			}
			

		}else{
			logger.error("Seems like your session is expired. Please reload your page and try again. ",{'body':req.body.params, 'userId':userId, 'err':"Invalid subscription_id"});
			return res.json({
				success:false,
				data: [],
				errorMessage:'Invalid subscription_id',
				messageToDisplay:'Seems like your session is expired. Please reload your page and try again.'
			});
		}

	} catch (err) {
		logger.error("Catch error : Subscription canceled",{'body':req.body.params, 'userId':userId, 'err':err});
		return res.json({
			success:false,
			data: [],
			errorMessage: err.raw.message || "Something went wrong !!",
			messageToDisplay:'Seems like your session is expired. Please reload your page and try again.'
		});
		next(err);
	}
}


export async function charge_money_directly(req: Request, res: Response, next: NextFunction){
	// const user = (req as any).user;
	// let userId = (user)? user.id:null;
	// let stripe = await Services.getStripeObject(req);
	// let referalDiscountObject = await referalDiscount.findOne({"customer":req.params.stripe_id});
	// let discountAmount =  referalDiscountObject != null ?referalDiscountObject.discountNumber:0
	// let amountToBeCharged =  req.params.amount - discountAmount
	try{
		
		const stripe = require('stripe')(process.env.STRIPE_KEY)
		
		
		console.log("req.query :::::",req.query)
		const charge = await stripe.charges.create({
			amount: req.query.amount,
			currency: 'usd',
			customer: req.query.stripe_id,
		});
		// logger.info("charge money directly from stripe: ",{'body':req.body.params, 'userId':userId});
		
		res.json({})
	}catch (err) {
		let result = {}
		result['message'] = err.raw.message
		result['status'] = 'Not Successful'
		result['success'] = false
		await sendStripInfoToStakeholders({status:result['status'],reason:result['message'],stripe_id:req.query.stripe_id,jobId:'NA'})
		// logger.error("Catch error while charging money directly from stripe :",{'body':req.body.params, 'userId':userId,'err':err});
		res.json({'error':err})
	}
}


export async function subscription_invoice_status(req: Request, res: Response, next: NextFunction) {

	const user = (req as any).user;
	let userId = (user)? user.id:null;
	let stripe = await Services.getStripeObject(req);

	try {

		const invoice_id = (req.body && req.body.params ? req.body.params.invoice_id : "");		

		const invoice = await stripe.invoices.retrieve(invoice_id);

		if(invoice['status'] == 'paid'){
      logger.info("Subscription invoice status paid : ",{'body':req.body.params, 'userId':userId});
			res.json({'payment':true})
		}else{
      logger.error("Subscription invoice status not paid : ",{'body':req.body.params, 'userId':userId});
			res.json({'payment':false})
		}


	}catch (err) {
		logger.error("Subscription invoice status not paid : ",{'body':req.body.params, 'userId':userId, 'err':err});
		res.json({'payment':false,'error':err})
	}
}



async function check_subscription_valid(subscription,stripe){
	try{
		let initial_retry = 0
		let max_retries = parseInt(process.env.CHECK_SUBSCRIPTION_VALID_TOTAL_RETRIES)
		let result_sub  = await recursive_payment_check(subscription,initial_retry,max_retries,stripe)
		logger.info("Checking subscription is valid for not: ",{'body':{'subscription':subscription}, 'info':result_sub});
		return result_sub

	}catch (err) {
		logger.error("Catch Error: Checking subscription is valid for not: ",{'body':{'subscription':subscription}, 'err':err});
		return 'not paid'
	}
	
}

async function delay(ms) {
  // return await for better async stack trace support in case of errors.
  return await new Promise(resolve => setTimeout(resolve, ms));
}



async function recursive_payment_check(subscription,initial_retry,max_retries,stripe){
	initial_retry = initial_retry + 1
   	const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);

   	if(invoice['status'] == 'paid'){
   		return 'paid'

	}


   	if(initial_retry >= max_retries && invoice['status'] != 'paid' ){
   		return 'not paid'
   	}


  	if(initial_retry >= max_retries && invoice['status'] == 'paid' ){
   		return 'paid'
   	}

   	if(initial_retry <= max_retries && invoice['status'] != 'paid' ){
		await delay(parseInt(process.env.CHECK_SUBSCRIPTION_VALID_INETRVAL_SECONDS));
		let data  = await recursive_payment_check(subscription,initial_retry,max_retries,stripe)
		return data
   	}
}



export async function cancel_pending_subscription(req: Request, res: Response, next: NextFunction) {
	try {
		const invoice_id = (req.body && req.body.params ? req.body.params.invoice_id : "");		
		const customer_id = (req.body && req.body.params ? req.body.params.customer_id : "");		

		const customer: ICustomer = await Customer.findById(customer_id);
    let all_subs =  customer['subscription_history']
    for (var sub in all_subs){
        if(all_subs[sub]['invoice_id'] == invoice_id){
            all_subs[sub]['status'] = 'Cancelled'
        }        
    }

    customer.set({'subscription_history':all_subs});
    await customer.save();
    logger.error("Canceling pending subscriptions: ",{'body':req.body.params,'info':{'success':true,'all_subs':all_subs} });
    res.json({'success':true})

	}catch (err) {
    logger.error("Catch Error while cancel pending subscriptions: ",{'body':req.body.params, 'err':{'success':false,'error':err}});
		res.json({'success':false,'error':err})
	}
}


	/**
	 * This is a funciton used to save previous subscription data of a user.
	 * @params =  Previous subscription of user
	 * @response : no response
	 * @author : Vinit
	 */


export async function subscription_history(req: Request, res: Response, next: NextFunction) {
	
	try {
		
		const customer_id = (req.body && req.body.params ? req.body.params.cust_id : "");		
		logger.info("Customer id to fetch subscription history to display in table is", {'customer_id': customer_id});
		
		let data = req.body.params.subscription_history;
		data.customer_id = customer_id;

		
		const subscriptionHistory  = new SubscriptionHistory(data);
		await subscriptionHistory.save((err)=>{
			if(err){
				console.log('Error while saving subscription history! ',err)
			}
		});
		res.json({'success':true});
		
	}catch (err) {
		console.log('error in saving subscription history>>>>>>>>',err)
    logger.error("Catch Error while saving subscription ihstory: ",{'body':req.body.params, 'err':{'success':false,'error':err}});
		res.json({'success':false,'error':err})
	}
	//next();
}

	/**
	 * This funciton is responsible to fetch subscription history of user to display in the table.
	 * @params =  customer id
	 * @response : subscription history
	 * @author : Vinit
	 */

export async function fetch_subscription_history(req: Request, res: Response, next: NextFunction) {

	const cust_id = (req.query[0] ? req.query[0] : "");		
	logger.info("Customer id to fetch subscription history is", {'customer_id': cust_id});
	
	try {
		const subHistory = await SubscriptionHistory.find({customer_id: cust_id});
		res.status(200).json(subHistory);
	} catch (error) {
		console.log(error);
		res.json({status:false});
	}
}
