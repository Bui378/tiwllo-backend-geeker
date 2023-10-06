import {sendInvitationMail,referPeopleEmail, klaviyoTrack} from "../controllers/TypeServiceController"
import { Router } from 'express';

const ServicesRouter = Router();


ServicesRouter.post('/invite-to-jitsi',sendInvitationMail)
ServicesRouter.post('/refer-people',referPeopleEmail)
ServicesRouter.post('/klaviyo-track', klaviyoTrack)

export default ServicesRouter;