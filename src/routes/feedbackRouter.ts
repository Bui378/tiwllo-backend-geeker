import { Router } from 'express';
import {create,fetchByJobId,earningsDetails,subscribeEmail,update,checkIfFeedbackAlreadyGiven} from '../controllers/feedbackController';

const feedbackRouter = Router();
feedbackRouter.post('/', create);
feedbackRouter.post('/tech-earnings',earningsDetails);
feedbackRouter.get('/:jobId', fetchByJobId);
feedbackRouter.post('/checkForFeedback',checkIfFeedbackAlreadyGiven)
feedbackRouter.post('/checkForFeedbackCustomer',checkIfFeedbackAlreadyGiven)
feedbackRouter.post('/subscribe', subscribeEmail);
feedbackRouter.put('/:id', update);
export default feedbackRouter;