import { Router } from 'express';
import { list} from '../controllers/OfferController';

const offerRouter = Router();

offerRouter.get('/',list);


export default offerRouter;
