import { Router } from 'express';
import { list } from '../controllers/TouchPointsController';

const touchPointsRouter = Router();

touchPointsRouter.get('/', list);
// touchPointsRouter.post('/', create);
// touchPointsRouter.get('/:id', retrieve);
// touchPointsRouter.put('/:id', update);
// touchPointsRouter.delete('/:id', remove);

export default touchPointsRouter;
