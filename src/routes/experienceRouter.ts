import { Router } from 'express';
import { create, list, remove, retrieve, update, editSoftware } from '../controllers/ExperienceController';

const experienceRouter = Router();

experienceRouter.get('/', list);
experienceRouter.post('/', create);
experienceRouter.get('/:id', retrieve);
experienceRouter.put('/:id', update);
experienceRouter.post('/updateSoftware', editSoftware);
experienceRouter.delete('/:id', remove);

export default experienceRouter;
