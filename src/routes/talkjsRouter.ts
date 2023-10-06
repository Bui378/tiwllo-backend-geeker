import { Router } from "express";
import { handleWebHooks } from "../controllers/talkjsController";

const talkjsRouter = Router();

talkjsRouter.post('/', handleWebHooks);

export default talkjsRouter;