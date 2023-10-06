import { Router } from 'express';
import  { retrieve }  from '../controllers/JobNotificationHistoryController';

const jobNotificationHistoryRouter = Router();

jobNotificationHistoryRouter.get('/:id', retrieve);

export default jobNotificationHistoryRouter;
