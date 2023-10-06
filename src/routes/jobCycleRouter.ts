import { Router } from 'express';
import {create,update} from '../controllers/jobCycleController';

const jobCycleRouter = Router();

jobCycleRouter.post('/',create);
jobCycleRouter.put('/',update);
export default jobCycleRouter;
