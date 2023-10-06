import { Router } from 'express';
import { list, create, retrieve, retrieveByJob, update, remove } from '../controllers/BillingDetailsController';

const billingDetailsRouter = Router();

billingDetailsRouter.post('/list', list);
billingDetailsRouter.post('/', create);
billingDetailsRouter.get('/:id', retrieve);
billingDetailsRouter.get('/by-job/:id', retrieveByJob);
billingDetailsRouter.put('/:id', update);
billingDetailsRouter.delete('/:id', remove);

export default billingDetailsRouter;
