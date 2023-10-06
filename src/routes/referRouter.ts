import { Router } from 'express';
import {create,checkEmail} from '../controllers/ReferController';

const referRouter = Router();
referRouter.post('/', create);
referRouter.post('/check-email',checkEmail)
export default referRouter;