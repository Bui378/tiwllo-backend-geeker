import { Router } from 'express';
import { list, create, listAllForTech, remove } from '../controllers/InterviewController';

const interviewRouter = Router();
interviewRouter.get('/:id', list);
interviewRouter.get('/technician/:id', listAllForTech);
interviewRouter.get('/remove/:id', remove);
interviewRouter.post('/', create);
// interviewRouter.get('/:id', retrieve);


export default interviewRouter;