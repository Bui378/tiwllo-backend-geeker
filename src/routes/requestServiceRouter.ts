import { Router } from 'express';
import { assignUser, create, list } from '../controllers/RequestServiceController';

const requestServiceRouter = Router();

requestServiceRouter.get('/', list);
requestServiceRouter.post('/', create);
requestServiceRouter.post('/:id/assign', assignUser);

export default requestServiceRouter;
