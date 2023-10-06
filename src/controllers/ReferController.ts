import { Request, Response, NextFunction } from 'express';
import Refer, { IRefer } from '../models/Refer';
import User, { IUser } from '../models/User';
import InvalidRequestError from '../errors/InvalidRequestError';


export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('ReferController create>>>>>>>>>>>>')

	const refer_obj = new Refer(req.body);
	await refer_obj.save();

	res.status(201).json();
  } catch (err) {
	next(err);
  }
}

export async function checkEmail(req: Request, res: Response, next: NextFunction) {
  try {

        console.log('ReferController checkEmail>>>>>>>>>>>>')

	const data = req.body;

	const query = Refer.find(data);
	const totalCount = await Refer.countDocuments(query);

	res.json({"totalCount":totalCount});
  } catch (err) {
	next(err);
  }
}

