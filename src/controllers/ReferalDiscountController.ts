import { Request, Response, NextFunction } from 'express';
import InvalidRequestError from '../errors/InvalidRequestError';
import referalDiscount, { IReferalDiscount } from '../models/ReferalDiscounts';
import DiscountHistory ,{IDiscountHistory} from '../models/DiscountHistory';
import Job, { IJob } from '../models/Job';
import {createDiscount} from '../services/DiscountServices';
let logger = require('../../winston_logger');
logger = logger("ReferalDiscount.ts");


/**
 * Api that adds data in table 
 * @params : req,res,next (Type:Object)
 * @returns : JSON response
 * @author : Sahil
 **/

export async function create(req:Request,res:Response,next:NextFunction){
	try{
		let data = req.body
		let existedCustomer = await referalDiscount.findOne({"customer":data.customer}) 
		if (existedCustomer == null){
			let referal = new referalDiscount(data)
			await referal.save(async function(err,results){
				logger.info(`result for id :: ${results._id} saved`)
			})
			if (data.refered_by != null){
				let updatedData = await referalDiscount.updateOne({"customer":data.refered_by},{"$inc":{"refered_people_count":+1}})
				console.log("updated Data response >>>>>>>>>>> ",updatedData)
			}
			res.status(201).json(referal);
		}
		else{
			res.json(existedCustomer)
		}
		
	}
	catch(err){
		logger.error("error in addReferal ::: ReferalDiscont.ts",{error:err})
		res.status(500).json({"success":false})
	}
}


/**
 * Api that get data from table 
 * @params : req,res,next (Type:Object)
 * @returns : JSON response
 * @author : Sahil
 **/

export async function getReferal(req:Request,res:Response,next:NextFunction){
	try{
		const data = req.params ;
		let response = await referalDiscount.find(data)
		res.json(response)
	}
	catch(err){
		logger.error("error in addReferal ::: ReferalDiscont.ts",{error:err})
		res.status(500).json({"success":false})
	}
}

/**
 * Api that updates data from table 
 * @params : req,res,next (Type:Object)
 * @returns : JSON response
 * @author : Sahil
 **/

export async function updateReferal(req:Request,res:Response,next:NextFunction){
	try{
		let data = req.body
		let queryParam = req.body.query;
		if (data.type == 'Discount')
		{
			let referalUser = await referalDiscount.findOne(queryParam)
			if (referalUser.discountNumber != null)
			{
				let discount = referalUser['discountNumber']
				data.discountNumber = 10 + discount
			}

		}
		logger.info("The Data to be updated = ",{data:data})
		delete data.query
		let response = await referalDiscount.updateOne(queryParam,data)
		res.status(202).json(response)
	}
	catch(err){
		logger.error("error in addReferal ::: ReferalDiscont.ts",{error:err})
		res.status(500).json({"success":false})
	}
}

/**
 * Api that updates the referal table if technician do not cut payment 
 * @params : req,res,next (Type:Object)
 * @returns : JSON response
 * @author : Sahil
 **/

export async function refundReferalAmount(req:Request,res:Response,next:NextFunction){
	try{
		let {jobId} = req.body
		let queryParam = req.body.query;
		console.log("queryParam ::::::",queryParam)
		console.log("jobId :::::::",jobId)
		let jobObject = await Job.findOne({"_id":jobId,"referalDiscount":{"$ne":0}})
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
			res.status(202).json(updateReferalDiscount)

		}
		else{
			res.status(200).json({"success":false,"message":"Referal Discount Does Not exist"})
		}
	}
	catch(err){
		logger.error("error in addReferal ::: ReferalDiscont.ts",{error:err})
		res.status(500).json({"success":false})
	}
}

/** 
 * Api that gets the total amount of referal in one app
 * @params : req,response,next
 * @response : Gets the total value of referal amount for the current customer
 * @author Sahil
 */
export async function getTotalReferalAmount(req:Request,res:Response,next:NextFunction){
	try{
		let query = req.body.query
		let referalData = await referalDiscount.findOne(query)
		let totalReferal = referalData.discountNumber
		res.json({"success":true,"totalReferalAmount":totalReferal})
	}	
	catch(err){
		console.log("error in getTotalReferalAmount :::" ,err)
		res.json({"success":false})
	}
}