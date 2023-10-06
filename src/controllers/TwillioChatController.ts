import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import AccountsCustomUsers from '../models/AccountsCustomUser';
import { TWILIO_DETAILS } from '../constant'
let logger = require('../../winston_logger');
logger = logger("TwillioChatController.ts");
const twilio = require('twilio')
import Job, { IJob } from '../models/Job';
import TwilioChat from '../models/TwilioChat';
/**
 * @param {*} req.body 
 * @returns array of objects
 * @description : This API will create the conversation and return the details.
 * @author : Kartar Singh
 */
export const twillioChatCreateConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // params used when generating any kind of tokens
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
    // Here Identitiy specifies that user to whom we allow chat
    const jobId = req.params.id;
    // console.log('jobId twillioChatCreateConversation ::::', jobId)

    const createdConversation = await createTwillioConversation(jobId)
    if (createdConversation) {

      let serviceObj = { sid: createdConversation.sid, chatServiceSid: createdConversation.chatServiceSid }
      await Job.updateOne({ "_id": jobId }, { twilio_chat_service: serviceObj })

      return res.status(201).json({ "conversation": createdConversation, "success": true })
    } else {
      return res.status(201).json({ "conversation": "", "success": true })
    }
  } catch (error) {
    logger.error("Error while generating Auth Token for Twillio Chat", { error: error });
    return res.status(201).json({ "token": "", "success": false, error: error })
  }
}

/**
 * @param {*} req.params 
 * @returns array of objects
 * @description : This API will first fetch the conversation if find then return it else create the conversation and return the details.
 * @author : Kartar Singh
 */
export const twillioChatFetchConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chatId = req.body.chatId;
    // console.log('jobId chat  :::', chatId)
    // console.log('jobId chat  :::1', req.body)
    if(req.body.technician !=null)
    {
    const updatedChat = await TwilioChat.updateOne(
      { chat_id: chatId },
      { $set: { technician: req.body.technician } }
    );
    // console.log('updatedChat :::', updatedChat)
    }
    
    // params used when generating any kind of tokens
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
    // Here Identitiy specifies that user to whom we allow chat
    // let updatedJob = await Job.findOne({ _id: conversationId }).select("-notifiedTechs");
    const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);
    const conversation = await twilioApi.conversations.v1.conversations(chatId).fetch();
    const chatServiceSid = conversation;
    // console.log('conversation ::::::::::',conversation)
    if (conversation) {
      // console.log('inside the if ::::', chatServiceSid);

      return res.status(201).json({ "conversation": conversation, "success": true });
    } else {
      return res.status(201).json({ "conversation": "", "success": true });
    }
  } catch (error) {
    // console.log('inside if kartra :::::::', typeof error.status)
    if (error.status === 404) {
      const twilioData = req.body;
      const createdConversation = await createTwillioConversation(twilioData)
      if (createdConversation) {
        // console.log('inside the else ::::', createdConversation)
        // await twillioChatAuthTokenForChat(createdConversation.chatServiceSid, 'kartar singh')
        return res.status(201).json({ "conversation": createdConversation, "success": true })
      } else {
        return res.status(201).json({ "conversation": "", "success": true })
      }
    }
    logger.error("Error while generating Auth Token for Twillio Chat", { error: error });
    return res.status(201).json({ "token": "", "success": false, error: error })
  }
}

/**
 * @param {*} jobId 
 * @returns array of objects
 * @description : This API will create the conversation and update the dataBase variable twilio_chat_service return the createdConversation.
 * @author : Kartar Singh
 */
const createTwillioConversation = async (twilioData) => {
  try {
    // console.log('twilioData ::::::::', twilioData)
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
    const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);
    const conversation = twilioApi.conversations.v1.conversations;

    const createdConversation = await conversation.create({ friendlyName: twilioData.chatId, uniqueName: twilioData.chatId });
    // console.log('createdConversation ::::', typeof createdConversation.chatServiceSid)
    let serviceObj = { sid: createdConversation.sid, chatServiceSid: createdConversation.chatServiceSid }
    // await Job.updateOne({ "_id": jobId }, { twilio_chat_service: serviceObj })

    const twilioChat = await TwilioChat.insertMany({ chat_id: twilioData.chatId, twilio_chat_service: serviceObj, customer: twilioData.customer, technician: twilioData.technician });
    // console.log('twilioChat :::::', twilioChat)
    return createdConversation

  } catch (error) {
    console.error('Error creating conversation:', error);
    return error
  }
}

/**
 * @param {*} req.body 
 * @returns array of objects
 * @description : This API will first fetch the details of participant if find it it will return the details else it will create the participant and add it into the group
 * @author : Kartar Singh
 */
export const addParticipatInConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // params used when generating any kind of tokens
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
    // Here Identitiy specifies that user to whom we allow chat
    const conversationSid = req.body.conversationSid;
    const participatDetails = req.body.userDetails;
    const chatServiceSid = req.body.chatServiceSid;
    const id = req.body.id
    const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);

    const findParticipants = await fetchParticipants(conversationSid, participatDetails.id)

    // console.log('findParticipants :::: ', findParticipants)

    if (findParticipants) {
      // console.log('createParticipant :::::::: inside fetch')

      const AccessToken = await twillioChatAuthTokenForChat(chatServiceSid, findParticipants.identity)
      // console.log('AccessToken ::::::::', AccessToken)
      return res.status(201).json({ "participant": findParticipants, token: AccessToken, "success": true });

    } else {

      // console.log('createParticipant :::::::: inside create')
      const createParticipant = await createParticipants(conversationSid, participatDetails);
      /*if (id.includes("job_")) {
        const superAdminUsersList = await AccountsCustomUsers.find({ "user_role": "SuperAdmin" });
        // console.log("superAdminUsersList", superAdminUsersList)
        for await (const element of superAdminUsersList) {
          const findParticipants = await fetchParticipants(conversationSid, element.id)
          // console.log('findParticipants :::: ', findParticipants)
          if(!findParticipants){
            const participatDetails = {
              userType: "SuperAdmin",
              email: element.email,
              id: element.id,
              firstName: element.first_name[0],
              lastName: element.last_name,
              phoneNumber: ''
            }
            await createParticipants(conversationSid, participatDetails);
          }
        }
      }*/
      // console.log('createParticipant :::::::: 11', createParticipant)
      
      if (createParticipant) {
        const AccessToken = await twillioChatAuthTokenForChat(chatServiceSid, createParticipant.identity)
        // console.log('AccessToken ::::::::', AccessToken)
        return res.status(201).json({ "participant": createParticipant, token: AccessToken, "success": true });
      }

    }
  } catch (error) {
    logger.error("Error while generating participant for Twillio Chat", { error: error });
    return res.status(201).json({ "participant": "", "success": false, error: error })
  }
}

/**
 * @param {*}  conversationSid and participatName
 * @returns array of objects
 * @description : This function is responsible to find the participant details in the conversation 
 * @author : Kartar Singh
 */
const fetchParticipants = async (conversationSid, participatName) => {
  try {

    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
    const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);

    const participantsFetch = await twilioApi.conversations.v1
      .conversations(conversationSid)
      .participants.list({ limit: 20 });

    // console.log('participantsFetch1:::::', participantsFetch);

    const checkParticipants = participantsFetch.find(
      (p) => p.identity == participatName
    );

    // console.log('checkParticipants ::::::::::::::::', checkParticipants);

    return checkParticipants ? checkParticipants : false

  } catch (error) {
    // Handle the error here
    console.error('An error occurred:', error);
    throw error; // Throw the error to propagate it further if needed
  }
};

/**
 * @param {*}  req.body
 * @returns array of objects
 * @description : This Api is responsible to find all the participant details in the conversation 
 * @author : Kartar Singh
 */
export const fetchParticipantsList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
    // Here Identitiy specifies that user to whom we allow chat

    const conversationSid = req.body.conversationSid;
    const participatDetails = req.body.userDetails;
    const chatServiceSid = req.body.chatServiceSid;

    const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);

    const participantsFetch = await twilioApi.conversations.v1
      .conversations(conversationSid)
      .participants.list({ limit: 20 });

    // console.log('participantsFetch1:::::', participantsFetch);

    return res.status(201).json({ "participants": participantsFetch, "success": true });

  } catch (error) {
    // Handle the error here
    console.error('An error occurred:', error);
    return res.status(201).json({ "participants": 'error whyle getting participants', "success": false, 'error': error });
  }
};

/**
 * @param {*}  req.body
 * @returns array of objects
 * @description : This function is responsible to create participant 
 * @author : Kartar Singh
 */
const createParticipants = async (conversationSid, participatDetails) => {
  try {
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS

    let participatUserType = participatDetails.userType;
    let participatEmail = participatDetails.email;
    let participatUserId = participatDetails.id;
    let participatname = `${participatDetails.firstName} ${participatDetails.lastName}`;
    let participantPhoneNumber = '';
    if(participatDetails.userType == "customer"){
      participantPhoneNumber = participatDetails.customer.phoneNumber  
    }
    if(participatDetails.userType == "technician" && participatDetails.technician && participatDetails.technician.profile.confirmId && participatDetails.technician.profile.confirmId.phoneNumber){
      participantPhoneNumber = participatDetails.technician.profile.confirmId.phoneNumber
    }
    const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);

    let userAttributes = { 'userType': participatUserType, 'email': participatEmail, 'name': participatname, 'userId': participatUserId , "phoneNumber" :participantPhoneNumber}
    const participant = await twilioApi.conversations.v1.conversations(conversationSid).participants
      .create({ identity: participatDetails.id, attributes: JSON.stringify(userAttributes) })

    // console.log('paticipant api hit :::::', participant)

    return participant ? participant : false

  } catch (error) {
    // Handle the error here
    console.error('An error occurred:', error);
    throw error; // Throw the error to propagate it further if needed
  }
};


/**
 * @param {*}  chatServiceSid, identity
 * @returns jwt token
 * @description : This function is responsible to give grant permission to the participant to chat in the conversation  
 * @author : Kartar Singh
 */
const twillioChatAuthTokenForChat = (chatServiceSid, identity) => {
  try {
    // params used when generating any kind of tokens
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_API_KEY_CHAT, TWILIO_API_SECRET_CHAT, TWILIO_TOKEN_EXPIRY_SECONDS, TWILIO_CHAT_SERVICE_SID } = TWILIO_DETAILS

    // Here Identitiy specifies that user to whom we allow chat
    // const identity = req.params.identity;

    // Getting Accesstoken and chatGrat from twilio package 
    const AccessToken = twilio.jwt.AccessToken;
    const ChatGrant = AccessToken.ChatGrant;

    // Create a "grant" which enables a client to use Chat as a given user,
    // on a given device
    const chatGrant = new ChatGrant({
      serviceSid: chatServiceSid,
    });

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const token = new AccessToken(
      TWILIO_ACCOUNT_SID_CHAT,
      TWILIO_API_KEY_CHAT,
      TWILIO_API_SECRET_CHAT,
      { identity: identity, ttl: TWILIO_TOKEN_EXPIRY_SECONDS }
    );

    token.addGrant(chatGrant);

    // Serialize the token to a JWT string and then encrypted the jwt token 
    const jwtToken = token.toJwt()
    // console.log('jwtToken :::::', jwtToken)
    return jwtToken
    // if (token.toJwt()) {
    //   const encryptedToken = CryptoJS.AES.encrypt(JSON.stringify(jwtToken), process.env.secretPassKey).toString();
    //   return res.status(201).json({ "token": encryptedToken, "success": true })
    // } else {
    //   return res.status(201).json({ "token": "", "success": true })
    // }

  } catch (error) {
    logger.error("Error while generating Auth Token for Twillio Chat", { error: error });
    // return res.status(201).json({ "token": "", "success": false, error: error })
  }
}

/**
 * @param {*}  req.body
 * @returns media url
 * @description : This api fetch the media url  
 * @author : Jagroop 
 */
export const getMediaLinkOfTwilioChat = async (req: Request, res: Response, next: NextFunction) => {
  const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
  // Here Identitiy specifies that user to whom we allow chat
  const chatServiceSid = req.body.chatServiceSid;
  const mediaSid = req.body.mediaSid;
  const URL = `https://mcs.us1.twilio.com/v1/Services/${chatServiceSid}/Media/${mediaSid}`;
  const basicAuth = 'Basic ' + Buffer.from(TWILIO_ACCOUNT_SID_CHAT + ':' + TWILIO_AUTH_TOKEN_CHAT).toString('base64');
  try {
    const twilioChatResponse = await axios.get(URL, { headers: { 'Authorization': basicAuth } });
    console.log('twilioChatResponse 00 1212 ::::::::', twilioChatResponse.data);
    if (twilioChatResponse.data && twilioChatResponse.data) {
      return res.status(201).json({ "response": twilioChatResponse.data, "success": true });
    }
  } catch (error) {
    console.error("Error retrieving Twilio chat:", error);
    return res.status(201).json({ "response": {}, "success": false });
  }
};

/**
 * @param {*}  req.query
 * @returns media url
 * @description : This api fetch the media url updated one 
 * @author : Milan  
 */
export const getMediaLinkOfTwilioChatUpdated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
    const chatServiceSid = req.query.chatServiceSid;
    const mediaSid = req.query.mediaSid;
    if (!chatServiceSid || !mediaSid) return res.redirect(`${req.get('referer')}notfound`);

    const URL = `https://mcs.us1.twilio.com/v1/Services/${chatServiceSid}/Media/${mediaSid}`;
    const basicAuth = 'Basic ' + Buffer.from(TWILIO_ACCOUNT_SID_CHAT + ':' + TWILIO_AUTH_TOKEN_CHAT).toString('base64');

    const twilioChatResponse = await axios.get(URL, { headers: { 'Authorization': basicAuth } });

    if (twilioChatResponse.data && twilioChatResponse.data && twilioChatResponse.data.links && twilioChatResponse.data.links.content_direct_temporary)
      return res.redirect(twilioChatResponse.data.links.content_direct_temporary)

    res.redirect(`${req.get('referer')}notfound`)
  } catch (error) {
    logger.error("Error while generating Image Temporary URL", { error: error });
    res.redirect(`${req.get('referer')}notfound`)
  }
}

/**
 * @param {*} req.body 
 * @returns array of objects
 * @description : This API will create the conversation and return the details.
 * @author : Kartar Singh
 */
// ... (Other imports and setup)

export const fetchChatServiceDetailsById = async (req: Request, res: Response, next: NextFunction) => {
  console.log('twillioChatCreateConversation :::::::')
  try {
    // params used when generating any kind of tokens
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS;
    // Here Identitiy specifies that user to whom we allow chat
    const data = req.body;

    console.log('req.body ::::::::::::101', data);

    // const chatDocuments = await TwilioChat.find(data);
    // console.log('chatDocuments :::', chatDocuments);
    // const filteredData = chatDocuments.filter(item => !item.chat_id.startsWith('job'));

    const chatDocuments = await TwilioChat.find(data);
    // console.log('chatDocuments :::', chatDocuments);
    // Now, filter the chatDocuments array to remove items where chat_id starts with 'job'
    // const filteredData = chatDocuments.filter(item => !item['chat_id'].startsWith('job'));
    // console.log('filteredData :::', filteredData);

    if (chatDocuments) {
      // Extract the first chat document from the array
      // const chatDocument;
      return res.status(201).json({ "conversation": chatDocuments, "success": true });
    } else {
      return res.status(201).json({ "conversation": "", "success": true });
    }
  } catch (error) {
    logger.error("Error while generating fetchChatServiceDetailsById", { error: error });
    return res.status(201).json({ "token": "", "success": false, error: error });
  }
}

/**
 * @param {*} req.body 
 * @returns array of objects
 * @description : This API will create the conversation and return the details.
 * @author : Kartar Singh
 */
// ... (Other imports and setup)

export const fetchChatServiceUserDetailsById = async (req: Request, res: Response, next: NextFunction) => {
  console.log('twillioChatCreateConversation :::::::')
  try {
    // params used when generating any kind of tokens
    const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS;
    // Here Identitiy specifies that user to whom we allow chat
    const data = req.body;

    // console.log('req.body :::::::fetchChatServiceUserDetailsById:::::101', data);

    // const chatDocuments = await TwilioChat.find(data);
    // console.log('chatDocuments :::', chatDocuments);
    // const filteredData = chatDocuments.filter(item => !item.chat_id.startsWith('job'));

    const chatDocuments = await TwilioChat.find(data).sort({ createdAt: -1 });
    // console.log('chatDocuments :::fetchChatServiceUserDetailsById', chatDocuments);
    // Now, filter the chatDocuments array to remove items where chat_id starts with 'job'
    const filteredData = chatDocuments.filter(item => !item['chat_id'].startsWith('job'));
    // console.log('filteredData :::fetchChatServiceUserDetailsById', filteredData);

    if (filteredData) {
      // Extract the first chat document from the array
      // const chatDocument;
      return res.status(201).json({ "conversation": filteredData, "success": true });
    } else {
      return res.status(201).json({ "conversation": "", "success": true });
    }
  } catch (error) {
    logger.error("Error while generating fetchChatServiceDetailsById", { error: error });
    return res.status(201).json({ "token": "", "success": false, error: error });
  }
}


export const updateTwilioChatTableById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId, newMessageAlertStatus, alertAlreadySend, lastReadMessageId,new_message_alert } = req.body;
    let data = {}
    if (alertAlreadySend) {
      data['alertAlreadySend'] = alertAlreadySend;
    }
    if (newMessageAlertStatus) {
      data['new_message_alert'] = newMessageAlertStatus
    }
    if (lastReadMessageId) {
      data['lastReadMessageId'] = lastReadMessageId
    }
    if(new_message_alert !=undefined){
      data['new_message_alert'] = lastReadMessageId
    }
    console.log("updateTwilioChatTableById", { data, chatId })
    const updateTableResponse = await TwilioChat.update({ chat_id: chatId }, data);
    if (updateTableResponse) {
      return res.send({ status: true })
    }
    return res.send({ status: false })

  } catch (error) {
    logger.error('Error while updating twilio chat table by id', error);
    return res.send({ status: false })

  }
}