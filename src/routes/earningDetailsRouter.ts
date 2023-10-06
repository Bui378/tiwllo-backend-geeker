import { Router } from 'express';
import { list, create, retrieve, update, remove,retrieveByJob } from '../controllers/EarningDetailsController';

const earningDetailsRouter = Router();

earningDetailsRouter.post('/list', list);
earningDetailsRouter.post('/', create);
earningDetailsRouter.get('/:id', retrieve);
earningDetailsRouter.get('/by-job/:id', retrieveByJob);
earningDetailsRouter.put('/:id', update);
earningDetailsRouter.delete('/:id', remove);


export default earningDetailsRouter;
