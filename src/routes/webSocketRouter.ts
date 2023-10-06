import { Router } from 'express';
import { create,update,customer_declined_the_technician,technician_accepted_job,customer_start_call,polling_for_customer} from '../controllers/WebSocketController';

const webSocketRouter = Router();
webSocketRouter.post('/', create);
webSocketRouter.put('/:id', update);
webSocketRouter.post('/technician-declined', customer_declined_the_technician);
webSocketRouter.post('/technician-accepted',technician_accepted_job)
webSocketRouter.post('/customer-start-call',customer_start_call)
webSocketRouter.post('/technician-polling',polling_for_customer)

export default webSocketRouter;
