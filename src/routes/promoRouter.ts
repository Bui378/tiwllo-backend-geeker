import { Router } from 'express';
import {create,retrievePromoData,retrieveCustomerPromoCodes,fetchCoupon,validateCoupon} from '../controllers/PromoController';

const promoRouter = Router();

promoRouter.post('/',create);
promoRouter.post('/fetch-coupon',fetchCoupon);
promoRouter.post('/getPromoDataByParams',retrievePromoData);
promoRouter.post('/getCustomerPromoCodes',retrieveCustomerPromoCodes);
promoRouter.post('/validate-coupon',validateCoupon);

export default promoRouter;
