import { Request, Response, NextFunction } from 'express';
import DiscountHistory ,{IDiscountHistory} from '../models/DiscountHistory';
import Job ,{IJob} from '../models/Job';
import Customer ,{ICustomer} from '../models/Customer';
import Subscribe ,{ISubscribe} from '../models/Subscribe';

async function getByParams(req:Request,res:Response,next:NextFunction){
	try{
		let query = req.query || req.params;
		let { page, pageSize } = query;
	    page = parseInt(page, 10);
	    pageSize = parseInt(pageSize, 10);
	    delete query.page
	    delete query.pageSize
	    let totalDiscountCount = await DiscountHistory.find(query).count()
		let discountResponse = await DiscountHistory.find(query,function(err,results){
		})
		.skip((page - 1) * pageSize)
      	.limit(pageSize)
		.populate('customer')
		.populate('job')
		.populate({
			path:'referedCustomer',
			populate:{
				'path':'user',
				'model':'User'
			}
		})
		let responseToSend = [...discountResponse]
		// responseToSend  =  discountResponse.map(async (element)=>{
		// 		if (element.spentFor == 'job'){
		// 			let jobObj = await Job.findOne({"_id":element.spentOn})
		// 			element.transactionFor = jobObj.JobId
		// 			return element
		// 		}
		// 		else if (element.spentFor == 'referal'){
		// 			let customObj = await Customer.findOne({"_id":element.spentOn}).populate('user')
		// 			element.transactionFor = 'Customer Done First Job'
		// 			return element
		// 		}
		// 		else if (element.spentFor == 'subscription'){
		// 			let subscribeObj = await Subscribe.findOne({"_id":element.spentOn}).populate('user')
		// 			element.transactionFor = 'Subscription'
		// 			return element
		// 		}
		// 	})
		console.log("responseToSend ::::::: ",responseToSend)
		res.json({"success":true,"data":responseToSend,"message":"Data Fetched",'totalCount':totalDiscountCount})
	}	
	catch(err){
		console.log("error in create :::: ",err)
		res.status(500).json({"success":false,"message":err})
	}
}

export {getByParams};