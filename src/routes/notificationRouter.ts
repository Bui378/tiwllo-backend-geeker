import { Router } from 'express';
import { create,list,findNotificationByParams,updateReadStatus,updateByParams} from '../controllers/NotificationController';

const notificationRouter = Router();


notificationRouter.post('/', create);
notificationRouter.get('/',list);
notificationRouter.post('/notify',findNotificationByParams);
notificationRouter.post("/updateStatus",updateReadStatus);
notificationRouter.post("/update",updateByParams)


export default notificationRouter;
