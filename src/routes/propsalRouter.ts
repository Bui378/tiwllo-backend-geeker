import { Router } from 'express';
import { create, list, remove, retrieve, update } from '../controllers/ProposalController';

const proposalRouter = Router();

proposalRouter.get('/', list);
proposalRouter.post('/', create);
proposalRouter.get('/:id', retrieve);
proposalRouter.put('/:id', update);
proposalRouter.delete('/:id', remove);


export default proposalRouter;
