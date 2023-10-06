  /**
	 * This controller handles the webhooks from stripe.com.
	 * @params =  req from stripe.com
	 * @response : res to stripe.com
	 * @author : Vinit
	 */

import Customer from '../models/Customer';
import SubscriptionHistory from '../models/SubscriptionHistory';
import forge from 'node-forge'
var myModule = require('../app');
let logger = require('../../winston_logger');
logger = logger("WebhooksController.ts");

export const handleWebHooks = (req,res) => {
  
  logger.info("Event fired by stripe.com", {'event': req.body.type });
  const event = req.body.type;
  const invoice_id = req.body.data.object.id;
  const stripeId = req.body.data.object.customer;
  
  /**
	 * Following function is used to update the current subscription of customer and save the previous subscription in the subscription history table.
     * @params =  From stripe
	 * @response : status and a message.
	 * @author : Vinit
	 */
  async function updateSubscription(){
    
    updateSubscriptionHistory();
    updateCurrentSubscription();
    res.status(200).send('Payment successful')
  }

  /**
	 * Following function is used to handle the webhook to create invoice from stripe.
     * @params =  From stripe
	 * @response : status and a message.
	 * @author : Vinit
	 */
  const invoiceCreated = () => {
    res.status(200).send('Invoice created');
  }

  /**
	 * Following function is used to handle the webhook related to payment failure.
     * @params =  From stripe
	 * @response : status and a message.
	 * @author : Vinit
	 */
  const paymentFailed = async () => {
    updateSubscriptionHistory();
    //Updating the current subscription code starting.
    await Customer.updateOne({stripe_id: stripeId}, {'subscription.plan_id': '','subscription.plan_name': '', 'subscription.total_minutes': 0, 'subscription.total_seconds': 0, 'subscription.time_used': 0,'subscription.invoice_id': '', 'subscription.subscription_id': '', 'subscription.status': '', 'subscription.plan_purchased_date': ''},(err)=>{
      if(err){
        console.log(err);
        logger.info("Error encountered while payment failure.", {'error is': err});
      }
    })
    //Updating the current subscription code ending.
    res.status(200).send('Payment failed');
  }

  /**
	 * Following function is used to save the current subscription of customer in subscription history table.
     * @params =  stripe_id
	 * @response : current subscription of customer.
	 * @author : Vinit
	 */
  const updateSubscriptionHistory = async () => {
    const customer_data = await Customer.findOne({stripe_id: stripeId })

    let subscription_history_data = customer_data.subscription;
    const customer_id = customer_data._id;
    
    //Saving Subscription history code starting.
    let temp_subscription_history_data = {...subscription_history_data};
    temp_subscription_history_data["customer_id"] = customer_id;
    temp_subscription_history_data["plan_inactive_date"] = new Date();
    temp_subscription_history_data['status'] = 'canceled' ;
    delete temp_subscription_history_data['$init']

    const subscriptionHistory = new SubscriptionHistory(temp_subscription_history_data)
    await subscriptionHistory.save((err)=>{
      if(err){
        console.log("Error while saving subscription history!", err);
        logger.info("Error encountered while saving subscription history", {'Error': err});
      }
    })
    //Saving subscription history code ending.
  }
  
  /**
	 * Following function is used to update the current subscription of customer.
     * @params =  stripe_id
	 * @response : latest current subscription of customer.
	 * @author : Vinit
	 */
  const updateCurrentSubscription = async () => {

    const customer_data = await Customer.findOne({stripe_id: stripeId })

    //Updating the current subscription code starting.
    await Customer.updateOne({stripe_id: stripeId}, {'subscription.invoice_id': invoice_id, 'subscription.plan_purchased_date':new Date(), 'subscription.time_used': 0},(err)=>{
      if(err){
        console.log(err);
        logger.info("Error while updating customer subscription", {'error': err});
      }
    })
    //Updating the current subscription code ending.
  }


  if(event === 'invoice.created'){
    invoiceCreated();
    logger.info("Invoice created web hook called", {'Event is' : event});
  }else if(event === 'invoice.payment_succeeded'){
    updateSubscription()
    logger.info("Payment succeded webhook is called", {'Event is' : event});
  }else if(event === 'invoice.payment_failed'){
    paymentFailed()
    logger.info("Payment failed webhook is called", {'Event is' : event});
  }else{
    console.log("unhandeled event type.");
    logger.info("Unhandeled web hook encountered");
  }
  

}


/** 
 * Function that handles incoming request from the tests
 * @params : req(Type:Object),res(Type:Object) ,err(Type:Object)
 * @response : returns boolean;
 * @author : Sahil
 **/

export const classRoomWebHookHandler = (req,res,err)=>{
  try{

    // console.log(">>>>>inside the classRoomWebHookHandler >>>>>>>> >>>",req)
      var headerHmacSignature = req.get("X-Classmarker-Hmac-Sha256")
      // You are given a unique secret code when creating a Webhook.
      var secret = process.env.CLASSMARKER_SECRET_CODE;

      var verified = verifyData(req.rawBody,headerHmacSignature,secret);

      if(verified){
        console.log(">>>>>raw Body>>>",req.rawBody)
          // Save results in your database.
          // Important: Do not use a script that will take a long timе to respond.

          // Notify ClassMarker you have recеived the Wеbhook.
          res.sendStatus(200);
      } else {
          res.sendStatus(400);
      }
  }
  catch(err){
    console.log("error in classRoomWebHookHandler :::::: ",err)
  }
}


/** 
 * Function that verifies the signature
 * @params : rawBody(Type:Object),headerHmacSignature(Type:String) ,secret(Type:String)
 * @response : returns boolean;
 * @author : Sahil
 **/
var verifyData = function(rawBody,headerHmacSignature, secret)
{
    var jsonHmac = computeHmac(rawBody, secret);
    return jsonHmac == headerHmacSignature;
};

/** 
 * Function that encodes  the signature
 * @params : rawBody(Type:Object) ,secret(Type:String)
 * @response : returns string;
 * @author : Sahil
 **/

var computeHmac = function(rawBody, secret){
    var hmac = forge.hmac.create();
    hmac.start('sha256', secret);
    var jsonString = rawBody;
    var jsonBytes = new Buffer(jsonString, 'ascii');
    hmac.update(jsonBytes);
    return forge.util.encode64(hmac.digest().bytes());
};