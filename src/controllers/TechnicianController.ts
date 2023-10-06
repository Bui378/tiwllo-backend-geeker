import { Request, Response, NextFunction } from 'express';
import Technician, { ITechnician } from '../models/Technician';
import ActiveUser from '../models/Activeusers';
import Software from '../models/Software';
import InvalidRequestError from '../errors/InvalidRequestError';
import Experience from '../models/Experience';
import Notifications, { INotfication } from '../models/Notifications';
import Feedback, { IFeedback } from '../models/Feedback';
let logger = require('../../winston_logger');
logger = logger("JobController.ts");
import {handleTestEmails} from '../services/SettingService'
import {ITSupport,EmailOutlook} from '../constant'
import User from '../models/User';
import TwilioChat from '../models/TwilioChat';
import { TWILIO_DETAILS } from '../constant'

const twilio = require('twilio')

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('TechnicianController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;
    // console.log("technician  request ::::::::::::::::::::::::::::::")
    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = Technician.find();

    const totalCount = await Technician.countDocuments(query);
    const technicians: ITechnician[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

    return res.json({
      data: technicians,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('TechnicianController create>>>>>>>>>>>>')
    console.log(req.body)
    let {...other } = req.body;
    let promo_data = await createPromo (other);
    // console.log("Promo Data", promo_data);
    Object.assign(other,{promo_id:promo_data.id})
    let userInfo = await User.findById({_id:req.body.user})
    let {
      profile
    } = req.body

  const data = {
      "alertPreference":{
      "complete" : true,
      "settings" : {
        "Job" : {
          "Text" : {
            "toggle" : true,
            "value" : profile.confirmId.phoneNumber,
            "type" : "number",
            "error" : null
          },
          "Email" : {
            "toggle" : true,
            "value" : userInfo.email,
            "type" : "email",
            "error" : null
          },
          "Whatsapp" : {
						"toggle" : false,
						"value" : "",
						"type" : "number",
						"error" : null
					},
					"Browser" : {
						"toggle" : true,
						"value" : true,
						"type" : "button",
						"error" : null
					}
        },
        "Techs" : {
          "Text" : {
            "toggle" : true,
            "value" : profile.confirmId.phoneNumber,
            "type" : "number"
          },
          "Email" : {
            "toggle" : true,
            "value" : userInfo.email, 
            "type" : "email"
          },
          "Whatsapp" : {
						"toggle" : false,
						"value" : "",
						"type" : "number",
						"error" : null
					},
					"Browser" : {
						"toggle" : true,
						"value" : true,
						"type" : "button",
						"error" : null
					}
        }
      }
    }
  }
  Object.assign(other.profile,{"alertPreference":data.alertPreference})
  const technician = new Technician(other);
  await technician.save();
  let notificationData = {
                    "user":req.body.user,
                    'title':'Thanks for signing up, We look forward working with you, We will reach out to you with next steps.',
                    'type':'from_admin',
                    "read":false,
                    "actionable":false,
                }
  let notiFy = new Notifications(notificationData)
  await notiFy.save()
  res.status(201).json(technician);
  } catch (err) {
    if(err){
      try{
        const randomString = Math.random().toString(36).substring(2,5);
        const {...other } = req.body;
        const new_promo_code = `${other.promo_code}${randomString}`.replace(/ /g,'').toLocaleUpperCase()
        other.promo_code = new_promo_code;
        let promo_obj = await createPromo (other);
        other['promo_id'] = promo_obj.id;
        const technician = new Technician(other);
        await technician.save();
        let notificationData = {
                          "user":req.body.user,
                          'title':'Thanks for signing up, We look forward working with you, We will reach out to you with next steps.',
                          'type':'from_admin',
                          "read":false,
                          "actionable":false,
                    }
        let notiFy = new Notifications(notificationData)
        await notiFy.save()
        res.status(201).json(technician);
      }
      catch(error){
        next(error)
      }
    }
  }
}
/**
	 * This is a funciton used to create promocode at stripe using technician full name
	 * @params =  data (Object)=> Technician details
	 * @response : promotion code object from stripe
	 * @author : Sahil
	 */
export async function createPromo(data) {
  try {
    let stripe = require('stripe')(`${process.env.STRIPE_KEY}`);
    const codeName = data["promo_code"]
    let promo_data = await stripe.promotionCodes.create({
      coupon: process.env.STRIPE_COUPON_NAME,
      code: `${codeName}`,
    });
    return promo_data
  } catch (err) {
    logger.info("Error while creating promotion code at stripe",{
      "error":err,
      "body":data
  })
  }
}

export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {
      // console.log('TechnicianController retrieve>>>>>>>>>>>>',req.body)


    const {id}: { id: string } = req.params as any;

    const query = Technician.findById(id);

    const technician: ITechnician = await query
      .populate('user')
      .exec();

    if (!technician) {
      throw new InvalidRequestError('Technician does not exist.');
    }

    res.json(technician);
  } catch (err) {
    next(err);
  }
}

export async function retrieveByParams(req: Request, res: Response, next: NextFunction) {
  const data = req.body;
  // console.log(data,">>>the body")

  try {
      // console.log('TechnicianController retrieveByParams>>>>>>>>>>>>')

    // const data = req.body;
    // console.log(data,">>>the body")
    const technician = await Technician.find(data);
    // console.log('technician',technician)
    if (!technician) {
      throw new InvalidRequestError('Technician does not exist.');
    }
    // console.log(technician)
    return (res.json(technician));
  } catch (err) {
    res.status(500).json({
      message: 'Incorrect Coupon'
  });
  }
}

export async function updateAvatar(req: Request, res: Response, next: NextFunction) {
  try {

    const {id}: { id: string } = req.params as any;

    const technician =  await Technician.findById(id);

    if (!technician) {
      throw new InvalidRequestError('Technician does not exist.');
    }
    console.log(req.body,"....................")
    const {
      profileImage 
    } = req.body;

    const techData = {
      ...req.body,
      profile: {
        image: profileImage || '' 
      }
    }

    technician.set(techData);

    await technician.save();

    res.json(technician);
  } catch (err) {
    next(err);
  }
}

/**
 * Function called by api that updates technician object with result as pass or fail for each software after submission of test
 * @params = req: Type(Object)
 * @response : none
 * @author : Kartik
 */
export async function updateResult(req: Request, res: Response, next: NextFunction) {
  try {

    const { id }: { id: string } = req.params as any;
    
    const technician = await Technician.findById(id);
    if (!technician) {
      throw new InvalidRequestError('Technician does not exist.');
    }
    console.log(req.body, "....................")
    
    const removeByAttr = function (arr, attr, value) {
      var i = arr.length;
      while (i--) {
        if (arr[i]
          && arr[i][attr]
          && arr[i][attr] === value) {
          arr.splice(i, 1);

        }
      }
      return arr;
    }
    const software = await Software.findById(req.body.software_id);
    let dataArr = [];
    let dataToSave = {}
    dataToSave['software_id'] = req.body.software_id
    dataToSave['experience'] = ''
    dataToSave['sub_options'] = []
    dataToSave['parent'] = (software.parent ? software.parent : '')

    if (technician && technician.expertise) {
      dataArr = [...technician.expertise];

      if (req.body.result === 'Pass' && !technician.expertise.some(el => el.software_id === req.body.software_id)) {
        dataArr.push(dataToSave)
        console.log("dataarr Between",dataArr)
      } else if (req.body.result === 'Fail') {
        await removeByAttr(dataArr, "software_id", req.body.software_id);
      }
    }
    if (req.body.software_id === ITSupport && req.body.result === 'Pass') {
      let dataToSave2 = {}
      dataToSave2['software_id'] = EmailOutlook
      dataToSave2['experience'] = ''
      dataToSave2['sub_options'] = []
      dataToSave2['parent'] = 0
      dataArr.push(dataToSave2)

    }
    await Technician.updateOne({ "_id": id }, {
      "expertise": dataArr,
    });


    await Technician.updateOne({ "_id": id }, {
      $pull: {
        "testHistory":{
          "software_id": req.body.software_id
        }
      }
    });

    let testHistory = await Technician.updateOne({ "_id": id }, {
      $push: {
        "testHistory":{
          "software_id": req.body.software_id,
          "result": req.body.result
        }
      }
    });
    // let testData = await Technician.updateOne({ "_id": id, "testHistory": { "$elemMatch": { "software_id": req.body.softwareId } } }, { "$set": { "expertise.$.result": req.body.result } });
    console.log('result data>>>>>',testHistory)

    //CONFLICTION PART START
    /*await Technician.updateOne({ "_id": id, "expertise": { "$elemMatch": { "software_id": req.body.softwareId } } }, { "$set": { "expertise.$.result": req.body.result } });
    
    if(req.body.softwareId === ITSupport && req.body.result === 'Pass')
    {
      await Technician.updateOne({ "_id": id, "expertise": { "$elemMatch": { "software_id": EmailOutlook } } },
      { "$set": { "expertise.$.result": req.body.result }})
    }*/
    //CONFLICTION PART END

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}




async function updateTwilioChatAttributes(
    twilioApi, 
    conversationSid: string, 
    technician: string, 
    requestBody: any
  ) {
  try {
    console.log("updateTwilioChatAttributes>>>>", twilioApi, conversationSid, technician, requestBody);
    const participantsFetch = await twilioApi.conversations.v1.conversations(conversationSid).participants.list({ limit: 20 });
    const participantToUpdate = participantsFetch.find(participant => participant.identity === technician);

    if (participantToUpdate) {
      try {
        const attributes = JSON.parse(participantToUpdate.attributes);
        const alertPreference = requestBody.alertPreference;


        if (alertPreference && alertPreference.settings.Job.Text.toggle && alertPreference.settings.Job.Text.value) {
          if (!attributes.phoneNumber) {
            const newPhoneNumber = alertPreference.settings.Job.Text.value;
            attributes.phoneNumber = newPhoneNumber;
            }
           else {
              attributes.phoneNumber = alertPreference.settings.Job.Text.value;
          }

        } else if (alertPreference && alertPreference.settings.Techs.Text.toggle && alertPreference.settings.Techs.Text.value) {
          if (!attributes.phoneNumber) {
            const newPhoneNumber = alertPreference.settings.Techs.Text.value;
            attributes.phoneNumber = newPhoneNumber;
          }
          else {
            attributes.phoneNumber = alertPreference.settings.Techs.Text.value;
          }
        }
        else {
          if (!attributes.phoneNumber) {
            const newPhoneNumber = requestBody.confirmId.phoneNumber; // New phone number to set
            attributes.phoneNumber = newPhoneNumber; // New phone number to set
          }
          else {
            attributes.phoneNumber = requestBody.confirmId.phoneNumber;
          }
        }

        try {
          const updatedParticipant = await twilioApi.conversations.v1
            .conversations(conversationSid)
            .participants(participantToUpdate.sid)
            .update({ attributes: JSON.stringify(attributes) });

          console.log('Participant updated:', updatedParticipant);
          return true;
        } catch (error) {
          console.error('Error updating participant:', error);
        }
      } catch (error) {
        console.error('Error parsing attributes JSON:', error);
      }
    } else {
      console.log('Participant not found with the specified identity.');
    }
  } catch (error) {
    console.error('Error updating Twilio Chat attributes:', error);
  }
}

async function checkTechnician(user,userDetail) {
  let chatDocument;
  let conversationSid;
  const { TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT } = TWILIO_DETAILS
  const twilioApi = twilio(TWILIO_ACCOUNT_SID_CHAT, TWILIO_AUTH_TOKEN_CHAT);

   
   try {
       chatDocument = await TwilioChat.findOne({ "technician.id": user });
       if (chatDocument) {
           conversationSid = chatDocument.twilio_chat_service.sid;
       }
   } catch (error) {
       console.error('Error updating participant:', error);
       return 
   }

   if (conversationSid) {
       await updateTwilioChatAttributes(twilioApi, conversationSid, user,userDetail);  
      return 
   }
   return 
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
      logger.info('TechnicianController update now>>>>>>>>>>>>')
      logger.info("req.body ::::::::",{techId:req.params ,body:req.body})
      
    const {id}: { id: string } = req.params as any;
    console.log(">>>>.id >>>>>>",id)
    const technician = await Technician.findById(id);

    
 
    const userInfo = await User.findById({_id:technician.user})

    if (!technician) {
      throw new InvalidRequestError('Technician does not exist.');
    }
   

    const {
      agreement,
      alertPreference,
      bankAccount,
      confirmId,
      profileImage,
      reviewGuide,
      schedule,
      systemRequirement,
      status,
      general,
      technicianSource,
      profileDescription
    } = req.body;

    const techData = {
      ...req.body,
      profile: {
        // image: profileImage != undefined && profileImage.imageUrl!= undefined ?  profileImage.imageUrl : '',
        image: technician && technician.profile.image ? technician.profile.image : '',
        agreement,
        confirmId,
        bankAccount,
        schedule,
        systemRequirement,
        alertPreference,
        reviewGuide,
        profileDescription
      },
    }
    logger.info("tech data ::::::::>>>>>>>>>>>>>>>>>>>>>>>",{techData:techData})
    logger.info("techData.promo_data && techData.promo_data != '' >>>>>>>>>>>>>>>",{promocode:techData.promo_code} )
    if (techData.promo_code && techData.promo_code != ''){
      console.log("creating promo code >>>>>>")
      let promo_obj = await createPromo(req.body)
      techData['promo_id'] = promo_obj.id
    }
    technician.set(techData);
    if (techData.registrationStatus == 'interview_result'){
      await handleTestEmails(id)
    }
    await technician.save();
    
    await checkTechnician(technician.user,req.body)
    res.json(technician);
  } catch (err) {
    if(err){
      try{
        logger.info("Err occured while updating technician", {techId:req.params,error:err})
        const {id}: { id: string } = req.params as any;
        console.log(">>>>.id >>>>>>",id)
        const technician =  await Technician.findById(id);
        if (!technician) {  
          throw new InvalidRequestError('Technician does not exist.');
        }
        const randomString = Math.random().toString(36).substring(2,5);
        const {...other } = req.body;
        const new_promo_code = `${other.promo_code}${randomString}`.replace(/ /g,'').toLocaleUpperCase()
        other.promo_code = new_promo_code;
        let promo_obj= await createPromo (other);
        other['promo_id'] = promo_obj.id
        technician.set(other);
        await technician.save();
        res.json(technician);
        
      }
      catch(error){
        next(error)
      }
    }
  }
}


export async function updateByParams(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('TechnicianController update>>>>>>>>>>>>')
      console.log("req.body ::::::::",req.body)
      const {id}: { id: string } = req.params as any;
      console.log(">>>>.id >>>>>>",id)
      const technician =  await Technician.findById(id);
      if (!technician) {
        throw new InvalidRequestError('Technician does not exist.');
      }
      console.log("tech data ::::::::>>>>>>>>>>>>>>>>>>>>>>>")
      technician.set(req.body);
      await technician.save();
      res.json(technician);
      const updatedTechnician =  await Technician.findById(id);
      if (updatedTechnician.registrationStatus == 'interview_result'){
        await handleTestEmails(id)
      }
  } catch (err) {
        next(err)
      }
    }



export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('TechnicianController remove>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    await Technician.deleteOne({_id: id});

    res.json({deleted: true});
  } catch (err) {
    next(err);
  }
}

export async function updateAccountInfo(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('TechnicianController updateAccountInfo>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const technician: ITechnician = await Technician.findById(id);

    if (!technician) {
      throw new InvalidRequestError('Technician does not exist.');
    }

    technician.set(req.body);

    if ((req as any).files) {
      const { files } = (req as any);

      if (files.w9File) {
        technician.w9File = files.w9File[0].filename;
      }

      if (files.photoDOL) {
        technician.photoDOL = files.photoDOL.map(item => item.filename);
      }
    }

    await technician.save();

    res.json();
  } catch (err) {
    next(err);
  }
}

export async function getTechnicianRating(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('TechnicianController getTechnicianRating>>>>>>>>>>>>')
    // console.log(req.params,"i am the rating func..")
    // let newData = {'to':req.params.id}
    // let ratings = await Feedback.find(newData);
    // const rateFilter = {}
    // let overAllRatings = 0
    // let avgSum = 0
    // for(const j in ratings){
    //   if(ratings[j] && ratings[j].rating){
    //     if(!rateFilter[ratings[j].rating.toString()]){
    //       rateFilter[ratings[j].rating.toString()] = 1
    //     }
    //     else{
    //       rateFilter[ratings[j].rating.toString()] = rateFilter[ratings[j].rating.toString()] +1
    //     }
    //   }
    // }

    // let totalSum = 0;
    // for(var g in rateFilter){

    //   avgSum += parseInt(g)*rateFilter[g.toString()]
    //   totalSum += rateFilter[g.toString()]
    // }

    // overAllRatings = avgSum/totalSum;
    // if(Number.isNaN(overAllRatings)){
    //   overAllRatings = 0
    // }
    // console.log('TechnicianController getTechnicianRating>>>>>>>>>>>> overAllRatings:',overAllRatings);
    // return res.json({
    //   data: overAllRatings.toFixed(2)
    // });

    Feedback.aggregate([ 
      { $match: { to: req.params.id, rating: { $gt: 0 } } },
      { $group: { _id: '$to', avgValue: { $avg: '$rating' } } }
    ],async function(err, result) {
      if (err) {
        console.log('Error calculating average value:', err);
        return res.json({data: 0.0});
      } else {
        if (result.length > 0) {
          const updatedRating = parseFloat(result[0].avgValue.toFixed(1));
           await Technician.updateOne({ "user": req.params.id }, {
            'rating': updatedRating,
          });
          console.log('TechnicianController getTechnicianRating>>>>>>>>>>>> Average value:', parseFloat(result[0].avgValue.toFixed(2)));
          return res.json({
            data: result[0].avgValue.toFixed(2)
          });
        }; 
      };
    });

  } catch (err) {
    // next(err);
    return res.json({data: 0.0});
    
  }
  
}


export async function getLiveTechnicians(req:Request,res:Response,next:NextFunction){
  try{
    let softwares = req.body.softwares
    let myUserId = req.body.userId
    let activeUsers = await ActiveUser.find({"experiences":{"$in":softwares}}).populate('user')
    let userIds = activeUsers.map(ele => ele.user['_id'])
    let technicians = await Technician.find({"user":{"$in":userIds}}).populate('user')
    let all_softwares = await Software.find()
    let dataToSend = technicians.map((ele)=>{
      let temp = {}
      temp['id'] = ele.id
      temp['user'] = ele.user
      temp['status'] = ele.status
      temp['software'] = ele['expertise'].map((element) => {
        let software_id = element.software_id
        if (element.parent && element.parent != 0 ){
          software_id = element.software_id
        }
        let software = all_softwares.find(ele => ele._id == software_id)
        if (software){
           return software['name']
        }
        return null
        // let obj = await Software.findOne({"_id":software_id})

      }).filter(ele => ele!=null).join(",")
      if (myUserId == ele['user']['_id']){
          temp['name'] = ele['user']['firstName'] + " " + ele['user']['lastName'] + " (Me)"
      }
      else{
         temp['name'] = ele['user']['firstName'] + " " + ele['user']['lastName']
      }
      return temp

    })
    res.json({"success":true,data:dataToSend})
  }
  catch(err){
    console.log("error in getLiveTechnicians >>>",err)
    res.json({"success":false,data:{}})
  }
}


export async function getOnlineTechnicianById(req:Request,res:Response,next:NextFunction){
  try{
    let myUserId = req.params.id

    let activeUsers = await ActiveUser.find({user:myUserId}).populate('user')

    let dataToSend = activeUsers
    if(dataToSend.length === 0){
      res.json({"success":true,data:dataToSend,activeUserFound:false})
    }else{
      res.json({"success":true,data:dataToSend,activeUserFound:true})
    }

  }
  catch(err){
    console.log("error in getLiveTechnicians >>>",err)
    res.json({"succes":false})
  }
}


export async function getTechnicianDetailesByUserId(req:Request,res:Response,next:NextFunction){
  try{
    let myUserId = req.params.id;
    
    const myTechData = await Technician.find({'user':myUserId}).populate('user');

    let dataToSend = myTechData
      res.json({"success":true,data:dataToSend})

  }
  catch(err){
    console.log("error in getTechnicians >>>",err)
    res.json({"succes":false})
  }
}

// export async function numberOfCustomerForRating(req: Request, res: Response, next: NextFunction) {
//   try {
//     const totalCustomerRating = await Feedback.countDocuments({ to: req.params.id })
//     return res.json({"success":true,data:totalCustomerRating});

//   } catch (err) {
//     console.log("error in numberOfCustomerForRating >>>",err)
//     res.json({"succes":false})
//   }
// }