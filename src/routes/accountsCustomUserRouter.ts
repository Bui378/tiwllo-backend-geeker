import { Router } from 'express';
import { getGeekerAdminById } from '../controllers/AccountsCustomUserController';

const accountCustomUserRouter = Router();

accountCustomUserRouter.get('/:id', getGeekerAdminById);

export default accountCustomUserRouter;
