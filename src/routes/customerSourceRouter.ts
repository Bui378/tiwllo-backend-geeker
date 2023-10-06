import { Router } from 'express';
import { create,getAllLiveTechnicians,checkIfCustomerSourceExists } from '../controllers/CustomerSourceController';

const sourceRouter = Router();
sourceRouter.post('/', create);
sourceRouter.get('/getAllLiveTechnicians', getAllLiveTechnicians);
sourceRouter.post('/check-if-customer-exist',checkIfCustomerSourceExists)

export default sourceRouter;
