import { Router } from 'express';
import { create, list } from '../controllers/TypeServiceController';

const typeServiceRouter = Router();

typeServiceRouter.get('/', list);
typeServiceRouter.post('/', create);

export default typeServiceRouter;
