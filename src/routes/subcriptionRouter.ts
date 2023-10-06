import { Router } from 'express';
import { getAllPlans, getAPlan, buySubscription, cancelSubscription,charge_money_directly,cancel_pending_subscription, subscription_history,fetch_subscription_history} from '../controllers/SubscriptionController';
// import { getAllPlans, buySubscription, cancelSubscription } from '../controllers/SubscriptionController';

const subscriptionRouter = Router();

subscriptionRouter.get('/', getAllPlans);
subscriptionRouter.get('/get-a-plan', getAPlan);
subscriptionRouter.post('/buy-subscription', buySubscription);
subscriptionRouter.post('/cancel-subscription', cancelSubscription);
subscriptionRouter.get('/charge-money-directly', charge_money_directly);
subscriptionRouter.post('/cancel-pending-subscription', cancel_pending_subscription);
subscriptionRouter.post('/subscription-history', subscription_history);
subscriptionRouter.get('/fetch-subscription-history', fetch_subscription_history);




export default subscriptionRouter;
