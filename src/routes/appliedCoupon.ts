import { Router } from 'express';
import { getAppliedCouponsByCustomerId } from '../controllers/AppliedCouponController';

const appliedCouponRouter = Router();

appliedCouponRouter.get('/:id', getAppliedCouponsByCustomerId);

export default appliedCouponRouter;
