import { Router } from 'express';
import { create} from '../controllers/ContactController';

const contactRouter = Router();

contactRouter.post('/', create);

export default contactRouter;
