import { Router } from "express";
import { twillioChatCreateConversation,twillioChatFetchConversation ,updateTwilioChatTableById,addParticipatInConversation,fetchParticipantsList, getMediaLinkOfTwilioChat,getMediaLinkOfTwilioChatUpdated,fetchChatServiceDetailsById,fetchChatServiceUserDetailsById} from "../controllers/TwillioChatController";

// This will initialize router for TwilioChat
const twilioChatRouter = Router();
// This router will create AuthToken which is must to start chat
// twilioChatRouter.post('/token/:identity', twillioChatAuthToken);
twilioChatRouter.post('/createConversation/:id', twillioChatCreateConversation);
twilioChatRouter.post('/fetchConversation', twillioChatFetchConversation);
twilioChatRouter.post('/addParticipat', addParticipatInConversation);
twilioChatRouter.post('/ParticipatList', fetchParticipantsList);
twilioChatRouter.post('/get-media-link', getMediaLinkOfTwilioChat);
twilioChatRouter.get('/get-media-link-updated', getMediaLinkOfTwilioChatUpdated);
twilioChatRouter.post('/getTwilioChatDetails/', fetchChatServiceDetailsById);
twilioChatRouter.post('/getTwilioUserChatDetails/', fetchChatServiceUserDetailsById);
twilioChatRouter.post('/update-twilio-details',updateTwilioChatTableById)


export default twilioChatRouter;