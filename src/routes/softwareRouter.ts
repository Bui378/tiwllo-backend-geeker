import { Router } from 'express';
import { create, list, remove, retrieve, update,serverApi } from '../controllers/SoftwareController';

const softwareRouter = Router();
softwareRouter.get("/serverCheck",serverApi);
softwareRouter.get('/', list);
softwareRouter.post('/', create);
softwareRouter.get('/:id', retrieve);
softwareRouter.put('/:id', update);
softwareRouter.delete('/:id', remove);


export default softwareRouter;
