import { Request, Response, NextFunction } from "express";
let logger = require('../../winston_logger');
logger = logger("StripeAccountController.ts");
const stripe = require('stripe')(process.env.STRIPE_KEY)
import Technician from "../models/Technician";
import {sendTransferFundsEmail,sendTransferFundEmailAdmin} from '../services/MailService'
import EarningDetails from '../models/EarningDetails'
import { CronJob } from 'cron';
import Transfer from "../models/Transfer";
import CronPayoutHistory  from "../models/CronPayoutHistory";
import * as TextService from "../services/TextService";
import User from "../models/User";
import CryptoJS from 'crypto-js';
import PayCycle from "../models/PayCycle";
const ct = require('countries-and-timezones');

/**
	 * This is a funciton used to get coupon info
	 * @request =  object
	 * @response : coupon Info
	 * @author : Vinit Verma
	 */
export async function getCouponInfo (req: Request, res: Response, next: NextFunction) {
    try {

        logger.info("Coupon req.body ----------------", req.body)
        const {id} = req.body
        logger.info("Coupon id ----------------", id)
        const coupon = await stripe.coupons.retrieve(id);
        logger.info("Coupon info ----------------", coupon)
        if(coupon){
            res.status(200).json({success:true, data:coupon});
        }
            
	}catch (error) {
        logger.info("Error while fetching coupon info ",{
            "error":error,
            "body":req.body
        })
        res.status(200).json({success:false, errorMsg:error.raw.message});
    }
}

/**
	 * This is a funciton used to Create Stripe Account.
	 * @request =  object
	 * @response : no response
	 * @author : Sahil Sharma
	 */
export async function createStripeAccount(req: Request, res: Response, next: NextFunction) {
    try {
        let accountParams
        let user ={...req.body.dataToCreateAccount}
        console.log('user:::::::::::::::',user)
        if(typeof user === 'object' && Object.keys(user).length > 0){
            accountParams = {
                type: 'express',
                country: "US",
                email: user.email ,
                business_type: 'individual', 
                capabilities: {
                    card_payments: {requested: true},
                    transfers: {requested: true},
                },
                individual: {
                    first_name: user.firstName,
                    last_name: user.lastName,
                    email: user.email,
                    }
                }
                let account = await stripe.accounts.create(accountParams);
                console.log("Account::::",account)
                if(account.id){
                    const accountId = account.id
                    let link = await generateLink(accountId)
                    const data = await Technician.updateOne({'_id': user.id},{ $set: { 'accountId': accountId} })
                    res.status(201).json({'accountId':accountId,'accountLink': link});
                }
            }else{
                logger.info("User object is empty ",{
                    "body":req.body
                })
                res.status(401).json("User is empty");
            }
            
	}catch (err) {
        logger.info("Error while creating Stripe Account ",{
            "error":err,
            "body":req.body
        })
        next(err);
    }
}

/**
	 * This is a funciton used to Generate  Account Link.
	 * @request =  Technician Account ID and email
	 * @response : URL
	 * @author : Sahil Sharma
	 */
export async function generateAccountLink(req: Request, res: Response, next: NextFunction){
    try{
        const {accountId} = req.body
        if(req.body.accountId && req.body.accountId !== ''){
            let response = await generateLink(accountId)
            if(response){
                res.status(201).json({'success':true, 'accountLink': response});
            }
        }
    }catch (error){
        logger.info("Error while generating Account Link ",{
            "error":error,
        })
        next(error)
    }
}

const generateLink = async(accountId) =>{
    try{
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: process.env.mailEndpoint,
            return_url: `${process.env.mailEndpoint}dashboard/?&checkStripeAccountStatus=true`,
            type: 'account_onboarding',
        });
        return accountLink.url
    }catch(err){
        logger.info("Error while generateLink ",{
            "error":err,
        })
    }
}
/**
	 * This is a funciton to retrieve connect account details of technician 
	 * @request =  Technician Account ID
	 * @response : object
	 * @author : Sahil Sharma
	 */

 export async function getStripeAccountById(req: Request, res: Response, next: NextFunction){
    try{
        if(req.body.accountId && req.body.accountId !== ''){
            const accountDetails = await stripe.accounts.retrieve(
                req.body.accountId
            );
            res.status(201).json({'accountDetails': accountDetails});
        }
    }catch (err){
        logger.info("Error while retrieving a Technician Stripe Account ",{
            "error":err,
        })
        next(err)
    }
}

/**
	 * This is a funciton to retrieve connect account status
	 * @request =  Technician Account ID
	 * @response : object
	 * @author : Sahil Sharma
	 */

 export async function getStripeaccountStatus(req: Request, res: Response, next: NextFunction){
    let accountStatus=false;
    try{
        if(req.body.accountId && req.body.accountId !== ''){
            const accountDetails = await stripe.accounts.retrieve(
                req.body.accountId
            );
            if(accountDetails.details_submitted === true){
                accountStatus = true
            }          
        }
    }catch (err){
        logger.info("Error while retrieving a Technician Stripe Account Status",{
            "error":err,
        })
        next(err)
    }
    res.status(201).json({'accountStatus': accountStatus});
}

/**
	 * This is a funciton to retrieve connect account login link
	 * @request =  Technician Account ID
	 * @response : object
	 * @author : Sahil Sharma
	 */

 export async function getStripeAccountLoginLink(req: Request, res: Response, next: NextFunction){
    let loginUrl = "";
    try{
        if(req.body.accountId ){ 
            const loginLink = await stripe.accounts.createLoginLink(
                req.body.accountId
            );
            if(loginLink && loginLink.url!==''){
                loginUrl = loginLink.url
            }        
        }
    }catch (err){
        logger.info("Error while retrieving a Technician Stripe Account Status",{
            "error":err,
        })
        next(err)
    }
    res.status(201).json({'loginUrl': loginUrl});

} 

/**
	 * This is a funciton to retrieve all connected accounts of technician's 
	 * @response : list of objects
	 * @author : Sahil Sharma
	 */
export async function getAllstripeAccounts(req: Request, res: Response, next: NextFunction){
    try{
        const allStripeAccount = await stripe.accounts.list({
            limit: 3,
          });
          res.status(201).json({'allStripeAccount': allStripeAccount});
    }catch(err){
        logger.info("Error while retrieving all Technician Stripe Account ",{
            "error":err,
        })
        next(err)
    }
}

export async function techPayCycleEarning(req: Request, res: Response, next: NextFunction){
    try{
        console.log("BODY:::::::::::::::::::::",req.params.tid)
        let techUserId = req.params.uid
        let techId = req.params.tid
        let response = await PayCycleEarning(techUserId,techId)
        console.log("Response",response)
        res.status(201).json({'payperiodArr':response});
    }catch(err){
        logger.info("Error in techPayCycleEarning",{
            "error":err,
        })
        next(err)
    }
}

// export async function adminPayCycleEarning(req: Request, res: Response, next: NextFunction){
//     try{
//         console.log("req.body::::::::::",req.body)
//         let encryptedUserId = req.body.userId
//         let techId = req.body.techId
//         let Base64CBC = encryptedUserId;
//         let iv = CryptoJS.enc.Utf8.parse((process.env.SECRET_IV));
//         console.log("iv",iv)
//         let key =(process.env.SECRET_BACKEND_KEY)//key used in Python
//         key = CryptoJS.enc.Utf8.parse(key);
//         console.log("key",key)
//         let techUserId =  CryptoJS.AES.decrypt(Base64CBC, key, { iv: iv, mode: CryptoJS.mode.CBC});
//         techUserId = techUserId.toString(CryptoJS.enc.Utf8);
//         console.log("Decrypted",techUserId);
//         let response = await PayCycleEarning(techUserId,techId)
//         res.status(201).json({'payperiodArr':response});
//     }catch(err){
//         logger.info("Error in adminPayCycleEarning",{
//             "error":err,
//         })
//         next(err)
//     }
// }
export async function adminPayCycleEarning(req: Request, res: Response, next: NextFunction){
    try{
        console.log("req.body::::::::::",req.body)
        // let encryptedUserId = req.body.userId
        let paycycleId = req.body.paycycle_id
        let userType = req.body.user_type
        let fromAdmin = req.body.from_admin
        // let Base64CBC = encryptedUserId;
        // let iv = CryptoJS.enc.Utf8.parse((process.env.SECRET_IV));
        // console.log("iv",iv)
        // let key =(process.env.SECRET_BACKEND_KEY)//key used in Python
        // key = CryptoJS.enc.Utf8.parse(key);
        // console.log("key",key)
        // let techUserId =  CryptoJS.AES.decrypt(Base64CBC, key, { iv: iv, mode: CryptoJS.mode.CBC});
        // techUserId = techUserId.toString(CryptoJS.enc.Utf8);
        // console.log("Decrypted",techUserId);
        let response = await payCycleData(paycycleId,userType,fromAdmin)
        res.status(201).json({'payperiodArr':response});
    }catch(err){
        logger.info("Error in adminPayCycleEarning",{
            "error":err,
        })
        next(err)
    }
}
/**
	 * This is a funciton to retrieve all data for date range of paycycle
	 * @response : list of objects
	 * @author : Kartik
	 */
 export async function payCycleData(paycycleId,userType,fromAdmin){
    let payperiodArr = [];
    try{
        let payPeriodObj = await PayCycle.findOne({"_id":paycycleId})
        let payStatus;
        let paydate = "NA"
        let fromDate = payPeriodObj["From"]
        let toDate = payPeriodObj["To"]
        let technicians = await Technician.find({"technicianType":userType})
        for(var index in technicians){
            let techObj = {};
            let techUserId = technicians[index]['user']
            let techEarning = await getEarningbyPayCycle(techUserId,fromDate,toDate,fromAdmin)
            if( techEarning['totalEarnings'] > 0) {
                let userInfo = await User.findOne({"_id":techUserId})
                let jobData = await EarningDetails.find({'technician_user_id':userInfo['_id'],'createdAt':{$gte:fromDate,$lte:toDate}},{'job_id':1,'amount_earned':1,'_id':0})
                let year = Number(fromDate.getFullYear());
                let month = Number(fromDate.getMonth())
                let day = Number(fromDate.getDate())
                let payPeriodStatus= await CronPayoutHistory.find({"techId":technicians[index]['_id'],"From":new Date(year,month,day)})
    
                console.log("payPeriodStatus",payPeriodStatus)
                if(payPeriodStatus.length>0){
                    payStatus = payPeriodStatus[0]["Status"]
                    paydate = payStatus === "Paid" ? payPeriodStatus[0]["transferDate"].toDateString() : "NA"
                }else{ 
                    payStatus = "NA"
                }
                techObj['userId'] = userInfo['_id'];
                techObj['email'] = userInfo['email'];
                techObj['name'] = userInfo['firstName'] + ' - ' + userInfo['lastName'];
                techObj['earnings'] = techEarning['totalEarnings'].toFixed(2);
                techObj['status'] = payStatus
                techObj['payDate'] = paydate
                techObj['jobData'] = jobData
                techObj['jobIdArr'] = techEarning['jobIdArr']
                payperiodArr.push(techObj)
            }
        }
        console.log("Final Array",payperiodArr)
    }catch(err){
        console.log("Error in PayCycleEarning API ",err)
        logger.info("Error in PayCycleEarning API ",{
            "error":err,
        })
    }
    return payperiodArr;   
}
/**
	 * This is a funciton to retrieve all connected accounts of technician's 
	 * @response : list of objects
	 * @author : Sahil Sharma
	 */
export async function PayCycleEarning(techUserId,techId){
    let payperiodArr = [];
    try{
        let payPeriods = await PayCycle.find({})
        let userInfo = await User.findOne({"_id":techUserId}) 
        for(var index in payPeriods){
            let payPeriodObj={};
            let totalearnings=0;
            let payStatus ="NA";
            let paydate = "NA"
            let payperiodInfo = payPeriods[index]
            let FromDate = payperiodInfo["From"]
            let year = Number(FromDate.getFullYear());
            let month = Number(FromDate.getMonth())
            let day = Number(FromDate.getDate())
            let ToDate = payperiodInfo["To"]
            
            let payPeriod = FromDate.toDateString() + ' - ' + ToDate.toDateString();
            console.log("payPeriod:::;",payPeriod)
            let payPeriodStatus= await CronPayoutHistory.find({"techId":techId,"From":new Date(year,month,day)})
    
            console.log("payPeriodStatus",payPeriodStatus)
            totalearnings = await getEarningbyPayCycle(techUserId,FromDate,ToDate)
            if(totalearnings>0 && payPeriodStatus.length>0){
                payStatus = payPeriodStatus[0]["Status"]
                paydate = payStatus === "Paid" ? payPeriodStatus[0]["transferDate"].toDateString() : "NA"
            }else{ 
                payStatus = "NA"
            }
            if(totalearnings>0){            
                payPeriodObj['email'] = userInfo['email'];
                payPeriodObj['name'] = userInfo['firstName'] + ' - ' + userInfo['lastName'];
                payPeriodObj['earnings'] = totalearnings.toFixed(2);
                payPeriodObj['payPeriod'] = payPeriod
                payPeriodObj['status'] = payStatus
                payPeriodObj['payDate'] = paydate
                payperiodArr.push(payPeriodObj)
            }
            console.log("payperiodArr",payperiodArr)
        }  
    }catch(err){
        console.log("Error in PayCycleEarning API ",err)
        logger.info("Error in PayCycleEarning API ",{
            "error":err,
        })
    }
    return payperiodArr;   
}
/**
	 * This is a funciton to retrieve all transfers data from stripe
	 * @request =  Technician Account ID , 
	 * @response : object
	 * @author : Sahil Sharma
	 */

 export async function getAllTransferData(req: Request, res: Response, next: NextFunction){
    try{
        const transfers = await stripe.transfers.list({
            limit:3,
            destination: req.body.accountId,
          });
          console.log('transfers',transfers)
        res.status(201).json({'transfersdata': transfers.data});
    }catch (err){
        logger.info("Error while retrieving earinings",{
            "error":err,
        })
        next(err)
    }
}
export async function getFormattedDate(date){
    let formattedDate
    try{
        console.log("Date",date)
        const year = date.getFullYear();
        let months = date.getMonth() + 1; // Months start at 0!
        let days = date.getDate();
    
        if (days < 10) {
            days = '0' + days;
        }
        if (months < 10){
            months = '0' + months;
        } 
        formattedDate= days + '/' + months + '/' + year;
    }catch(err){
        logger.error("Error getFormattedDate",{
            "error":err,
        })
    }
return formattedDate;
}
export async function stripeTransferApi(amount, techAccountId){
    // TODO stripe response Today
    let transfer = await stripe.transfers.create({
        amount: amount,
        currency: "usd",
        destination: techAccountId,
    });
    return transfer
}
export async function getEarningbyPayCycle(techUserId,FromDate,ToDate,fromAdmin=false): Promise<any>{
    let totalEarnings = 0;
    let jobIdArr = [];
    try{
        let date_options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute:'2-digit',timeZone:'US/Eastern'};
        let payToDate = await addDays(ToDate,1)
        
        let payFromDate = new Date(new Date(FromDate.setHours(0,0,0,0)).toLocaleTimeString('en-US', date_options))
        payToDate = new Date(new Date(payToDate.setHours(0,0,0,0)).toLocaleTimeString('en-US', date_options))
        // TODO _id null is not a valid thing here.
        const earn_data = await EarningDetails.aggregate([{$match : {"technician_user_id" :techUserId ,createdAt:{"$gte":payFromDate,"$lte":payToDate}}},{$group: {'_id':null,totalValue: {$sum: "$amount_earned"},jobData:{$addToSet:"$job_id"}}}])
        if(earn_data.length > 0 ){
            totalEarnings = earn_data[0]['totalValue']
            jobIdArr = earn_data[0]['jobData']
        }         
        logger.info("Cron calculating total Earinings for one technician",{
            "techUserId":techUserId,
            "totalEarnings":totalEarnings,
        })
    }catch(err){     
        logger.error("Cron Error while calculating total Earning",{
            "error":err,
            "techUserId":techUserId
        })
    }
    if(fromAdmin){
        return {"totalEarnings":totalEarnings,"jobIdArr":jobIdArr}
    }
    return totalEarnings;
}

export const addDays= async (date, days)=> {
    try{
        let  result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }catch(err){
        logger.error("Error while adding days",{
            "error":err,
        })
    }
  }


const delay = ms => new Promise(res => setTimeout(res, ms));

export async function getEligibleTechnicians(FromDate){
    let technician = []
    try{
        let year = Number(FromDate.getFullYear());
        let month = Number(FromDate.getMonth())
        let day = Number(FromDate.getDate()) 
        // TODO Live technicain filter, 'completed' registrationStatus
        let paidTechs = await CronPayoutHistory.find({"Status":"Paid","From":new Date(year,month,day)},{'techId':1,'_id':0}).distinct("techId")
        logger.info(" Eligible techs for payout",{
            "paidTechs":paidTechs,
        })
        let filters = {$and:[{_id:{"$nin":paidTechs}},{registrationStatus : { "$in": ["incomplete_profile","complete"]},technicianType:"live"},{tag:{"$nin":["employed"]}}]}

        technician= await Technician.find(filters).sort({createdAt:-1})
    }catch(err){
        logger.error("Error while retriving eligible techs for payout",{
            "error":err,
        })
    }
    return technician
}
/**
	 * This is a CronJob to pay technicians automatically
	 * @author : Sahil Sharma
	 */
export const transferPayoutToTechnicians = async (io)=>{
	// let cronJob = new CronJob("*/1 * * * *", async ()=>{
    try{
        let payCycleObj = await PayCycle.findOne({"Status":"pending"}).sort({createdAt:-1})
        if(payCycleObj && payCycleObj!== undefined){
            let payCycleId = payCycleObj['_id']
            await PayCycle.updateOne({_id:payCycleId},{ $set: {"Status":"Inprogress"}})

            let FromDate = payCycleObj["From"]
            let ToDate   = payCycleObj["To"]

            let from_to_date = FromDate.toDateString() + " - " + ToDate.toDateString();
           
            let tech_arr = []; 
            let technician = await getEligibleTechnicians(FromDate)
            for(var index in technician){
                //Delay for Stripe API  
                let techObj = {}   
                await delay(500);
                let amountTransferred = 0;
                let techInfo = technician[index]
                let userInfo = await User.findOne({"_id":techInfo.user})
                let techUserId = techInfo['user']               
                let techPhoneNumber = techInfo['profile']['confirmId']['phoneNumber']
                let transferamount = await getEarningbyPayCycle(techUserId,FromDate,ToDate);
                let payoutAmountToTech = Number(transferamount.toFixed(2))
                console.log('payoutAmountToTech:::::::::::',payoutAmountToTech)
                // Checking tech have some amount earned greater than zero and already have a Stripe account id.
                if(payoutAmountToTech && payoutAmountToTech > 0 && techInfo['accountId'] ){
                    let earningCents = await toCent(payoutAmountToTech)

                    console.log("earningCents:::;",earningCents)
                    let techAccountId = techInfo['accountId']
                    let transfer
                    try{
                        transfer = await stripe.transfers.create({
                            amount: earningCents,
                            currency: "usd",
                            destination:techAccountId,
                        });
                       logger.info("Transfer information After amount Transfer", {
                                'transferInformation':transfer,
                                "TechUserId": techUserId,
                        });
                    }catch (err){
                        logger.error("Cron Error in CronJob while transferring funds via Stripe API ::",{
                            "TechUserId": techUserId,
                            "techTotalEarning": payoutAmountToTech,
                            "Error": err
                        })
                        let reason = err.raw.message
                        await  transferCronJobHistory(techInfo,
                                                        payoutAmountToTech,
                                                        new Date().toLocaleString(),
                                                        FromDate,
                                                        ToDate,
                                                        userInfo,
                                                        "Failed",
                                                        reason)
                        techObj['name'] = userInfo['firstName'] + '' + userInfo['lastName']
                        techObj['email'] = userInfo['email'];
                        techObj['techEarnings'] = payoutAmountToTech;
                        techObj['amountPaid'] = 0;
                        techObj['status'] = "Failed";
                        techObj['reason'] = reason;
                        // Todo please add payment failed reason.
                        tech_arr.push(techObj)
                        continue;
                    }
                    // if(payoutAmountToTech && payoutAmountToTech>0)
                    if(typeof transfer === 'object' && Object.keys(transfer).length > 0){
                        console.log("USER EMAIL::::::::::::::::::::",userInfo['email'] ? userInfo['email'] : " ")
                        amountTransferred = toDollar(transfer.amount)
                        //convert created date from miliseconds to date
                        let transferDate;
                        if (transfer && transfer.created) {
                           transferDate = new Date(transfer.created * 1000)
                          } else {
                            const date = new Date();
                            transferDate = date.toLocaleDateString();
                          }
                        let transferStatus = transfer.id ? "Paid" : "UnPaid"

                        //transferCronJobHistory =>  This function saves total earnings & last paid amount in datatbase for every technician.
                        // let havePayHistory = await CronPayoutHistory.findOne({"techId":techInfo._id,"From": new Date(year,month,day)})
                        // console.log("havePayHistory:::;;",havePayHistory)
                        // if(havePayHistory ){
                        //     console.log("havePayHistory:::;; Update",)
                        //     await CronPayoutHistory.updateOne({"_id":havePayHistory._id},{ $set: {"Status":"Paid"}})
                        // }else{
                        //     console.log("havePayHistory:::;; new record",)
                        //     await  transferCronJobHistory(techInfo,payoutAmountToTech,transferDate,FromDate,ToDate,userInfo,transferStatus)
                        // }

                        await  transferCronJobHistory(techInfo,payoutAmountToTech,transferDate,FromDate,ToDate,userInfo,transferStatus)
                        //send SMS to Technicians
                        
                        TextService.sendSmsToNumber(techPhoneNumber,'Hi '+userInfo['firstName']+', You Stripe A/C has been credited with $ ' + amountTransferred + ' amount on' + transferDate)
                        //sendTransferFundsEmail =>  This function sends transfer funds email to each technician
                        // let email = "sahil798690@gmail.com"
                        let email = userInfo['email']
                        let Name = userInfo['firstName'] + ' ' + userInfo['lastName']
                        logger.info("Transfer Before mail", {'transferInformation':transfer});
                        await sendTransferFundsEmail({
                            email:email,
                            Name : Name,
                            amountPaid : amountTransferred,
                            transferDate: transferDate,
                            transactionNumber:transfer.id
                        })

                        techObj['name'] = userInfo['firstName'] + '' + userInfo['lastName']
                        techObj['email'] = userInfo['email'];
                        techObj['techEarnings'] = payoutAmountToTech;
                        techObj['amountPaid'] = amountTransferred;
                        techObj['status'] = transferStatus;
                        techObj['reason'] = "NA";
                        tech_arr.push(techObj)
                    }else{
                        logger.error("Cron Error in CronJob while saving record of transfer funds ",{
                            "TechUserId": techUserId,
                            "techTotalEarning": payoutAmountToTech,
                    
                        })
                    }
                }else if(payoutAmountToTech && payoutAmountToTech>0 && !techInfo['accountId']){
                    techObj['name'] = userInfo['firstName'] + '' + userInfo['lastName']
                    techObj['email'] = userInfo['email'];
                    techObj['techEarnings'] = payoutAmountToTech;
                    techObj['amountPaid'] = amountTransferred;
                    techObj['status'] = "NA";
                    techObj['reason'] = "Don't have stripe account";
                    tech_arr.push(techObj)
                }
            }
            console.log('------------------------------------------------------------------------------')
            console.log('------------------------------------------------------------------------------')
            if(tech_arr.length>0){
                console.log("Payout Details::::::::;",tech_arr)
                await PayCycle.updateOne({"_id":payCycleId},{ $set: {"Status":"Done"}})
                let transferRecordTable = await sendEmail(tech_arr)
                console.log("transferRecordTable::::",transferRecordTable)
                let admin_emails = JSON.parse(process.env.adminMails)
                for(var index in admin_emails){
                    const email = admin_emails[index]
                    // Todo add reason if payment failed for any technician.
                    await sendTransferFundEmailAdmin({email,transferRecordTable,from_to_date})      	
                }
                // let email = "sahil798690@gmail.com"
                // await sendTransferFundEmailAdmin({email,transferRecordTable,from_to_date})      	
            }
        }
        
    }catch (err){
        console.log("Error in CronJob while transferring funds to Technicians from transferPayoutToTechnicians:",err)
        logger.error("Error in CronJob while transferring funds to Technicians from transferPayoutToTechnicians:",{
            "error":err,
        })
    }
    // })
    // cronJob.start()
}
export async function getEligibleTechniciansTest(FromDate,specificTechId=[]){
    let technician = []
    try{
        let year = Number(FromDate.getFullYear());
        let month = Number(FromDate.getMonth())
        let day = Number(FromDate.getDate()) 
        // TODO Live technicain filter, 'completed' registrationStatus
        let paidTechs = await CronPayoutHistory.find({"Status":"Paid","From":new Date(year,month,day)},{'techId':1,'_id':0}).distinct("techId")
        logger.info("Eligible techs for payout",{
            "paidTechs":paidTechs,
        })
        let filters = {$and:[{_id:{"$nin":paidTechs}},{registrationStatus : { "$in": ["incomplete_profile","complete"]},technicianType:"test"},{tag:{"$nin":["employed"]}},{ _id: { $in: specificTechId }}]}
        //{ $in: technicianIds } for multiple tec
        console.log("filters>>>>>>>>result", filters);
        technician= await Technician.find(filters).sort({createdAt:-1})
        console.log("technician inside filter",technician);
    }catch(err){
        logger.error("Error while retriving eligible techs for payout",{
            "error":err,
        })
    }
    return technician
}
export const transferPayoutToTechniciansTest = async (io)=>{
	// let cronJob = new CronJob("*/1 * * * *", async ()=>{
    try{
        let payCycleObj = await PayCycle.findOne({"Status":"pending"}).sort({createdAt:-1})
        console.log("paycycle history>>>",payCycleObj);
        if(payCycleObj && payCycleObj!== undefined){
            let payCycleId = payCycleObj['_id']
            await PayCycle.updateOne({_id:payCycleId},{ $set: {"Status":"Inprogress"}})

            let FromDate = payCycleObj["From"]
            let ToDate   = payCycleObj["To"]

            let from_to_date = FromDate.toDateString() + " - " + ToDate.toDateString();
           
            let tech_arr = []; 
            let specificTechId = ["tech_HeDn3JAZbLWMWaobv","tech_oRKSQwfDMvhYizBkT"];
            let technician = await getEligibleTechniciansTest(FromDate,specificTechId)
            console.log("tech data >>> " + technician)
            for(var index in technician){
                //Delay for Stripe API  
                let techObj = {}   
                await delay(500);
                let amountTransferred = 0;
                let techInfo = technician[index]
                let userInfo = await User.findOne({"_id":techInfo.user})
                let techUserId = techInfo['user']               
                let techPhoneNumber = techInfo['profile']['confirmId']['phoneNumber']
                let transferamount = await getEarningbyPayCycle(techUserId,FromDate,ToDate);
                let payoutAmountToTech = Number(transferamount.toFixed(2))
                console.log('payoutAmountToTech:::::::::::',payoutAmountToTech)
                // Checking tech have some amount earned greater than zero and already have a Stripe account id.
                if(payoutAmountToTech && payoutAmountToTech > 0 && techInfo['accountId'] ){
                    let earningCents = await toCent(payoutAmountToTech)

                    console.log("earningCents:::;",earningCents)
                    let techAccountId = techInfo['accountId']
                    let transfer
                    try{
                        transfer = await stripe.transfers.create({
                            amount: earningCents,
                            currency: "usd",
                            destination:techAccountId,
                        });
                       logger.info("Transfer information After amount Transfer", {
                                'transferInformation':transfer,
                                "TechUserId": techUserId,
                        });
                    }catch (err){
                        logger.error("Cron Error in CronJob while transferring funds via Stripe API ::",{
                            "TechUserId": techUserId,
                            "techTotalEarning": payoutAmountToTech,
                            "Error": err
                        })
                        let reason = err.raw.message
                        await  transferCronJobHistory(techInfo,
                                                        payoutAmountToTech,
                                                        new Date().toLocaleString(),
                                                        FromDate,
                                                        ToDate,
                                                        userInfo,
                                                        "Failed",
                                                        reason)
                        techObj['name'] = userInfo['firstName'] + '' + userInfo['lastName']
                        techObj['email'] = userInfo['email'];
                        techObj['techEarnings'] = payoutAmountToTech;
                        techObj['amountPaid'] = 0;
                        techObj['status'] = "Failed";
                        techObj['reason'] = reason;
                        // Todo please add payment failed reason.
                        tech_arr.push(techObj)
                        continue;
                    }
                    // if(payoutAmountToTech && payoutAmountToTech>0)
                    if(typeof transfer === 'object' && Object.keys(transfer).length > 0){
                        console.log("USER EMAIL::::::::::::::::::::",userInfo['email'] ? userInfo['email'] : " ")
                        amountTransferred = toDollar(transfer.amount)
                        //convert created date from miliseconds to date
                        let transferDate;
                        if (transfer && transfer.created) {
                           transferDate = new Date(transfer.created * 1000)
                          } else {
                            const date = new Date();
                            transferDate = date.toLocaleDateString();
                          }
                        let transferStatus = transfer.id ? "Paid" : "UnPaid"

                        //transferCronJobHistory =>  This function saves total earnings & last paid amount in datatbase for every technician.
                        // let havePayHistory = await CronPayoutHistory.findOne({"techId":techInfo._id,"From": new Date(year,month,day)})
                        // console.log("havePayHistory:::;;",havePayHistory)
                        // if(havePayHistory ){
                        //     console.log("havePayHistory:::;; Update",)
                        //     await CronPayoutHistory.updateOne({"_id":havePayHistory._id},{ $set: {"Status":"Paid"}})
                        // }else{
                        //     console.log("havePayHistory:::;; new record",)
                        //     await  transferCronJobHistory(techInfo,payoutAmountToTech,transferDate,FromDate,ToDate,userInfo,transferStatus)
                        // }

                        await  transferCronJobHistory(techInfo,payoutAmountToTech,transferDate,FromDate,ToDate,userInfo,transferStatus)
                        //send SMS to Technicians
                        
                        TextService.sendSmsToNumber(techPhoneNumber,'Hi '+userInfo['firstName']+', You Stripe A/C has been credited with $ ' + amountTransferred + ' amount on' + transferDate)
                        //sendTransferFundsEmail =>  This function sends transfer funds email to each technician
                        // let email = "sahil798690@gmail.com"
                        let email = userInfo['email']
                        let Name = userInfo['firstName'] + ' ' + userInfo['lastName']
                        logger.info("Transfer Before mail", {'transferInformation':transfer});
                        await sendTransferFundsEmail({
                            email:email,
                            Name : Name,
                            amountPaid : amountTransferred,
                            transferDate: transferDate,
                            transactionNumber:transfer.id
                        })

                        techObj['name'] = userInfo['firstName'] + '' + userInfo['lastName']
                        techObj['email'] = userInfo['email'];
                        techObj['techEarnings'] = payoutAmountToTech;
                        techObj['amountPaid'] = amountTransferred;
                        techObj['status'] = transferStatus;
                        techObj['reason'] = "NA";
                        tech_arr.push(techObj)
                    }else{
                        logger.error("Cron Error in CronJob while saving record of transfer funds ",{
                            "TechUserId": techUserId,
                            "techTotalEarning": payoutAmountToTech,
                    
                        })
                    }
                }else if(payoutAmountToTech && payoutAmountToTech>0 && !techInfo['accountId']){
                    techObj['name'] = userInfo['firstName'] + '' + userInfo['lastName']
                    techObj['email'] = userInfo['email'];
                    techObj['techEarnings'] = payoutAmountToTech;
                    techObj['amountPaid'] = amountTransferred;
                    techObj['status'] = "NA";
                    techObj['reason'] = "Don't have stripe account";
                    tech_arr.push(techObj)
                }
            }
            console.log('------------------------------------------------------------------------------')
            console.log('------------------------------------------------------------------------------')
            if(tech_arr.length>0){
                console.log("Payout Details::::::::;",tech_arr)
                await PayCycle.updateOne({"_id":payCycleId},{ $set: {"Status":"Done"}})
                let transferRecordTable = await sendEmail(tech_arr)
                console.log("transferRecordTable::::",transferRecordTable)
                // let admin_emails = JSON.parse(process.env.adminMails)
                let admin_emails = ["nafees@rtesoftwares.com","karun@rtesoftwares.com","karan@rtesoftwares.com"];
                for(var index in admin_emails){
                    const email = admin_emails[index]
                    // Todo add reason if payment failed for any technician.
                    await sendTransferFundEmailAdmin({email,transferRecordTable,from_to_date})      	
                }
                // let email = "sahil798690@gmail.com"
                // await sendTransferFundEmailAdmin({email,transferRecordTable,from_to_date})      	
            }
        }
        
    }catch (err){
        console.log("Error in CronJob while transferring funds to Technicians from transferPayoutToTechnicians:",err)
        logger.error("Error in CronJob while transferring funds to Technicians from transferPayoutToTechnicians:",{
            "error":err,
        })
    }
    // })
    // cronJob.start()
}
// To convert array of objects to HTML format
const sendEmail = async (tech_arr) =>{
   
    // Todo create and use email templates form admin panel.
    try{
        let mytable = ``;
        for(var index in tech_arr){
            let techInfo = tech_arr[index]
            // this function return html
            let html = await createTable(techInfo)
            mytable += html;
        }
        return mytable
    }catch(err){
        logger.error("Cron Error while converting array of objects to table for Email",{
            "error" : err
        })
    }
}


const createTable = (techInfo) =>{    
    return(
        `<tr>
            <td style='font-size:20px;  border: 1px solid black;'><span style='text-decoration: none; text-style: none'>${techInfo.name}</span></td>
            <td style='font-size:20px;  border: 1px solid black;'><span>${techInfo.email}</span></td>
            <td style='font-size:20px;  border: 1px solid black;'><span>$${techInfo.techEarnings}</span></td>
            <td style='font-size:20px;  border: 1px solid black;'><span>$${techInfo.amountPaid}</span></td>
            <td style='font-size:20px;  border: 1px solid black;'><span>${techInfo.status}</span></td>
            <td style='font-size:20px;  border: 1px solid black;'><span>${techInfo.reason}</span></td>

        </tr>`
    )
}
//Convert to cents
const toCent = (amount) => {
   try{ 
        const amountInCents = amount * 100
        let checkAmount = Number.isInteger(amountInCents)
        if(checkAmount){
            return amountInCents
        }else{
           return Math.floor(amountInCents)
        }
    }catch(err){
        logger.error("Cron Error while converting to cents",{
            "error":err,
            "amount":amount
        })
    }
}

//Convert to dollars
const toDollar = (amount) => {
    try{ 
         const amountInDollar = amount / 100;
         return amountInDollar
     }catch(err){
         logger.error("Error while converting to Dollar",{
             "error":err,
             "amount":amount
         })
     }
 }


//get Total Earnings
const techEarnings = async (techUserId) =>{
    let totalEarnings = 0;
    try{
        const earn_data = await EarningDetails.aggregate([{$match : {"technician_user_id" : techUserId }},{$group: {'_id':null,totalValue: {$sum: "$amount_earned"}}}])
        if(earn_data.length > 0 ){
            totalEarnings = earn_data[0]['totalValue']
        }  
        logger.info("calculating total Earinings for one technician",{
            "USerId":techUserId,
            "totalEarnings":totalEarnings,
        })
    }catch(err){
        logger.error("Error while calculating total Earning",{
            "error":err,
            "techUserId":techUserId
        })
    }
    return totalEarnings;
}


// save records of cron job transferCronJobHistory
const transferCronJobHistory = async (techInfo,payoutAmountToTech,transferDate,FromDate,ToDate,userInfo,transferStatus,reason=null) =>{
    let transferHistory = {}
    // let formatedDate = parseInt(transferDate.split("/")[2]) - (parseInt(transferDate.split("/")[1]) - 1) - parseInt(transferDate.split("/")[0])
    try{ 
        Object.assign(transferHistory,{
            techId : techInfo['_id'],
            // tech_name: userInfo['firstName'] + " " + userInfo['lastName'],
            techEmail: userInfo['email'],
            total_earnings : payoutAmountToTech,
            transferDate :transferDate,
            From: FromDate,
            // From:new Date(parseInt(formattedPayFromDate.split("/")[2]),(parseInt(formattedPayFromDate.split("/")[1]) - 1),parseInt(formattedPayFromDate.split("/")[0])),
            To:ToDate,
            // To:new Date(parseInt(formattedToDate.split("/")[2]),(parseInt(formattedToDate.split("/")[1]) - 1),parseInt(formattedToDate.split("/")[0])),
            Status:transferStatus,
            Reason:reason
        })
        const history = new CronPayoutHistory(transferHistory);
        await history.save();
        return transferHistory;
    }catch(err){
        logger.error("Error while saving CronJob transfer History of technician in database",{
            "error":err,
            "techInfo":techInfo
        })
    }
}


