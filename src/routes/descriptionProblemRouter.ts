import { Router } from 'express';
import { create, list } from '../controllers/DescriptionProblemController';

const descriptionProblemRouter = Router();

descriptionProblemRouter.get('/', list);
descriptionProblemRouter.post('/', create);

export default descriptionProblemRouter;
