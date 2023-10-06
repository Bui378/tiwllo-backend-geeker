import AppliedCoupons from '../models/AppliedCoupons';
import { Request, Response } from 'express';

export async function getAppliedCouponsByCustomerId(req: Request, res: Response) {
	try {
		const {id} = req.params as any;
        console.log("Fetching applied coupons for customer with id", id)
		const AllAppliedCoupons = await AppliedCoupons.find({customer:id});
        console.log("All applied coupons by customer with customer id", id, {AllAppliedCoupons})
		res.json(AllAppliedCoupons);

	} catch (err) {
        console.error("Some er occured in getAppliedCouponsByCustomerId", {err:err})
		res.json({success:false});
	}
}