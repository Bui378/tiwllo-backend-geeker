import { Router } from 'express';
import authentication from '../middlewares/authentication';
import {createStripeAccount,generateAccountLink,techPayCycleEarning,getStripeAccountLoginLink,adminPayCycleEarning,getStripeAccountById,getAllstripeAccounts,transferPayoutToTechnicians,transferPayoutToTechniciansTest,getAllTransferData,getStripeaccountStatus, getCouponInfo} from '../controllers/StripeAccountControlller';

const stripeAccountRouter = Router();

stripeAccountRouter.post('/create',authentication,createStripeAccount);
stripeAccountRouter.post('/generate-account-link',authentication,generateAccountLink);
stripeAccountRouter.post('/get-account',authentication,getStripeAccountById);
stripeAccountRouter.post('/account-status',authentication,getStripeaccountStatus);
stripeAccountRouter.get('/get-all-accounts',authentication,getAllstripeAccounts);
stripeAccountRouter.post('/get-all-transfer-data',authentication,getAllTransferData);
stripeAccountRouter.get('/payout-funds',transferPayoutToTechnicians);
stripeAccountRouter.get('/payout-funds-test',transferPayoutToTechniciansTest);

stripeAccountRouter.get('/pacycles/:uid/:tid',authentication,techPayCycleEarning);
stripeAccountRouter.post('/admin-paycycle-view',adminPayCycleEarning);
stripeAccountRouter.post('/stripe-loginLink',authentication,getStripeAccountLoginLink)
stripeAccountRouter.post('/coupon-info',authentication,getCouponInfo)


export default stripeAccountRouter;
