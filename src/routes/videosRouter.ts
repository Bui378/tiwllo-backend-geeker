import { Router } from 'express';
import { create, list, remove, retrieve, update} from '../controllers/VideoDetailController';

const videoRouter = Router();

videoRouter.get('/', list);
videoRouter.post('/', create);
videoRouter.get('/:id', retrieve);
videoRouter.put('/:id', update);
videoRouter.delete('/:id', remove);


export default videoRouter;
