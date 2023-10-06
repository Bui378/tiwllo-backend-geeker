import { Router } from 'express';
import { list } from '../controllers/SoftwareExperiencesController';

const softwareExperiencesRouter = Router();

softwareExperiencesRouter.get('/', list);
// softwareExperiencesRouter.post('/', create);
// softwareExperiencesRouter.get('/:id', retrieve);
// softwareExperiencesRouter.put('/:id', update);
// softwareExperiencesRouter.delete('/:id', remove);

export default softwareExperiencesRouter;
