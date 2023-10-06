import { Router } from 'express';
import { create, list} from '../controllers/ServiceProviderController';
import {classRoomWebHookHandler} from "../controllers/WebhooksController";
import * as CallService from "../services/CallService";
import * as JobService from "../services/JobService";

const serviceProviderRouter = Router();

serviceProviderRouter.post('/end_call', CallService.end_conference_call);
serviceProviderRouter.get('/', list);
serviceProviderRouter.post('/', create);
serviceProviderRouter.post("/webhook",classRoomWebHookHandler)
serviceProviderRouter.post('/:jobId/:participant_number', CallService.add_participant_to_call);
serviceProviderRouter.get('/send_email_to_customer/:jobId', JobService.send_email_to_customer);

export default serviceProviderRouter;
