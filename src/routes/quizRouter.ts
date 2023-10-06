import { Router } from 'express';
import { list, createQuizSubmission, updateQuizSubmission, quizSubmissionResult } from '../controllers/QuizController';

const quizRouter = Router();

quizRouter.get('/quizzes/:courseId', list);
quizRouter.post('/quizzes/submissions', createQuizSubmission);
quizRouter.post('/quizzes/submit', updateQuizSubmission);
quizRouter.post('/quizzes/submit/result', quizSubmissionResult);

export default quizRouter;
