import { Router } from 'express';
import { list } from '../controllers/OtherSoftwareController';

const otherSoftwareRouter = Router();

otherSoftwareRouter.get('/', list);

export default otherSoftwareRouter;
