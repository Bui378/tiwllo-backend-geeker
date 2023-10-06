import { Router } from 'express';
import {retrievePromoData, update} from '../controllers/promoCodeController';
const promoCodeRouter = Router({caseSensitive: false});

promoCodeRouter.get('/promocode-list/:coupon',retrievePromoData);
promoCodeRouter.patch('/:id', update)


export default promoCodeRouter;
