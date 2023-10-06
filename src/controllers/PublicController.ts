import { Request, Response, NextFunction } from 'express';
import Customer from '../models/Customer';

let logger = require('../../winston_logger');
logger = logger("PublicController.ts");

export async function list(req: Request, res: Response, next: NextFunction) {
	try {
		console.log('PublicController Customer list>>>>>>>>>>>>')

		const query = Customer.find();

		const totalCount = await Customer.countDocuments(query);

		return res.json({
            success:true,
			totalCount
		});
	} catch (err) {
        next(err);
		return res.json({
            success:false
		});
	}
}