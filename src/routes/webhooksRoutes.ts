import { Router } from "express";
import { handleWebHooks } from "../controllers/WebhooksController";

const webhooksRouter = Router();

webhooksRouter.post('/', handleWebHooks);

export default webhooksRouter;