import { Router } from 'express';
import { getByParams } from '../controllers/AdminTransactionController';
 
const transactionRouter = Router();

transactionRouter.get('/', getByParams);


export default transactionRouter;
