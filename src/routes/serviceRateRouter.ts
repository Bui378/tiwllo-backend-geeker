import { Router } from 'express';
import { create, list } from '../controllers/ServiceRateController';

const serviceRateRouter = Router();

serviceRateRouter.get('/', list);
serviceRateRouter.post('/', create);

export default serviceRateRouter;
