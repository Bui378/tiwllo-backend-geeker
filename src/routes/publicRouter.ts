import { Router } from 'express';
import {list} from '../controllers/PublicController';

const publicRouter = Router();

publicRouter.get('/', list);


export default publicRouter;
