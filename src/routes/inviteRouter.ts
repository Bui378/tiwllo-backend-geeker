import { Router } from "express";
import authentication from "../middlewares/authentication";
import { inviteNew, List, getInvite, listAllInvitesByParams } from "../controllers/InviteController";
const inviteRouter = Router();

inviteRouter.post("/new", authentication, inviteNew);
inviteRouter.get("/", authentication, List);
inviteRouter.get("/get/:inviteCode", getInvite);
inviteRouter.post("/fetchAllInvites", listAllInvitesByParams);

export default inviteRouter;
