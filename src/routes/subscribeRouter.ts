import { Router } from 'express';
import { subscribeEmail } from '../controllers/SubscribeController';

const subscribeRouter = Router();

subscribeRouter.post('/subscribe', subscribeEmail);

export default subscribeRouter;
