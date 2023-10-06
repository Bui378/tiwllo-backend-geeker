import { Router } from "express";
import {create,getReferal,updateReferal,refundReferalAmount,getTotalReferalAmount} from '../controllers/ReferalDiscountController';
import {getByParams} from '../controllers/DiscountHistoryController';
const referalDiscountRouter = Router();

referalDiscountRouter.get('/',getReferal);
referalDiscountRouter.post('/',create);

referalDiscountRouter.post("/update",updateReferal)
referalDiscountRouter.post("/refund",refundReferalAmount)
referalDiscountRouter.get("/discount-history",getByParams)
referalDiscountRouter.post("/total-referal",getTotalReferalAmount)

export default referalDiscountRouter;