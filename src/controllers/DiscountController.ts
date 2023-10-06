import { Request, Response, NextFunction } from 'express';
import DiscountHistory ,{IDiscountHistory} from '../models/DiscountHistory';

function getByParams(req:Request,res:Response,next:NextFunction){
	try{
		let query = req.query || req.params;
		let discountResponse = await DiscountHistory.find(query,function(err,result){
			return result
		})
		res.json({"success":true,"data":discountResponse,"message":"Data Fetched"})
	}	
	catch(err){
		console.log("error in create :::: ",err)
		res.status(500).json({"success":false,"message":err})
	}
}