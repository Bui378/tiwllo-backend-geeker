import AccountsCustomUsers from '../models/AccountsCustomUser';
import { Request, Response } from 'express';
import mongoose from "mongoose";

export async function getGeekerAdminById(req: Request, res: Response) {
	try {
		const {id} = req.params as any;
        console.log("My console from controller ----------------------------------------------", id)
		const geekerAdmin = await AccountsCustomUsers.findOne({_id: mongoose.Types.ObjectId(id)});
        console.log("My console from controller ", {geekerAdmin})
		res.json(geekerAdmin);

	} catch (err) {
        console.error("Some er occured in getGeekerAdminById", {err:err})
		res.json({success:false});
	}
}