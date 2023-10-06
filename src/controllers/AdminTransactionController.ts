import { Request, Response, NextFunction, response } from "express";
import AdminTransaction ,{IAdminTransactions} from '../models/AdminTransactions';
let logger = require('../../winston_logger');
logger = logger("AdminTransactionController.ts");

export async function getByParams(req:Request,res:Response,next:NextFunction){
    try{
        let query = req.query || req.params
        let transactions:IAdminTransactions[] =  await AdminTransaction.find(query).sort({paidOn:-1});
        res.json({"success":true,"data":transactions}) 
    }
    catch(err){
        logger.error("error in getByParams :: AdminTransactionControllers",{"err":err})
        res.json({"success":false}) 
    }
}