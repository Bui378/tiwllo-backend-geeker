import { Router } from 'express';
import { create, list, remove, retrieve, update } from '../controllers/ExpertiseController';

const expertiseRouter = Router();

expertiseRouter.get('/', list);
expertiseRouter.post('/', create);
expertiseRouter.get('/:id', retrieve);
expertiseRouter.put('/:id', update);
expertiseRouter.delete('/:id', remove);

export default expertiseRouter;
