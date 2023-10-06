import { Request, Response, NextFunction } from 'express';
import JobCycle, { IJobCycle } from '../models/JobCycle';
var request = require('request');
import { roleStatus } from "../utils";
let logger = require('../../winston_logger');
logger = logger("JobCycleController.ts");
var myModule = require('../app');
/**
	 * This is a funciton used to save tags in jobLifecycle table.
	 * @params =  object
	 * @response : no response
	 * @author : Sahil Sharma
	 */
export async function create(req: Request, res: Response, next: NextFunction) {
    console.log('REQQQQQ>>>>>>>>>>>>', req.body)
	try {
        const job_tag = new JobCycle(req.body);
        await job_tag.save();
        res.status(201).json({"success":true});
	} catch (err) {
        logger.error("Error while creating Job Tag ",{
            "error":err,
            "body":req.body
        })
        res.status(201).json({"success":false});
    }
}
/**
	 * This is a funciton used to update JobId in jobLifecycle table.
	 * @params =  object
	 * @response : no response
	 * @author : Sahil Sharma
	 */
 export async function update(req: Request, res: Response, next: NextFunction) {
    console.log('UPDATE>>>>>>>>>>>>JOBTAGS', req.body)
	try {
        await JobCycle.updateMany({
            $and:[
                {"$or": [{ "JobId": { "$exists": false } },{ "JobId": null }]},
                {"UserId": req.body.UserId}
            ]},
                {"$set": {"JobId": req.body.JobId}})
        res.status(201).json({"success":true}); 
	} catch (err) {
        logger.error("Error while updating Job Id ",{
            "error":err,
            "body":req.body
        })
        res.status(201).json({"success":false});
    }
}