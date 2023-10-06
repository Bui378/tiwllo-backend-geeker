import { Request, Response, NextFunction } from 'express';
import { token } from 'morgan';
import TypeService, { ITypeService } from '../models/TypeService';
// import *  as {MailService , referrLink}  from '../services/MailService'
import { referrLink , inviteLink} from "../services/MailService";
let logger = require('../../winston_logger');
logger = logger("TypeServiceController.ts");
import { track } from '../services/klaviyo';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('TypeServiceController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = TypeService.find();

    const totalCount = await TypeService.countDocuments(query);
    const typeServices: ITypeService[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

    return res.json({
      data: typeServices,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('TypeServiceController create>>>>>>>>>>>>')

    const typeService = new TypeService(req.body);

    await typeService.save();

    res.status(201).json(typeService);
  } catch (err) {
    next(err);
  }
}

export async function sendInvitationMail(req:Request,res:Response,next:NextFunction){
  try{
        console.log('TypeServiceController sendInvitationMail>>>>>>>>>>>>')

    console.log("Sending invited emails",req.body)
    const email = req.body.email ?req.body.email :req.query.email 
    const link = req.body.link ? req.body.link :req.query.link 
    let actual_link = link+'#config.startWithVideoMuted=true'
    let sendToLink = `<a href='${actual_link}'>  ${actual_link}  </a>`
    await inviteLink({ email, token ,sendToLink})
    // const text = `You have been invited to join a meeting on Geeker
    //       <p> <strong>Meeting link</strong> -  <a href='${actual_link}'>  ${actual_link}  </a></p>

    // `
    // MailService.dynamicEmail({
    //   email:email,
    //   subject:"Invitation Link",
    //   text:text,
    //   previewtext:'Invitation Link'

    // })
    const result = {"success":true,"message":"mail sent"}
    console.log("Invite email Sent")
    return res.status(201).json(result)
  }
  catch(err){
    return err
  }
}


export async function referPeopleEmail(req:Request,res:Response,next:NextFunction){
  try{
        console.log('TypeServiceController referPeopleEmail>>>>>>>>>>>>')
    
    console.log("Sending invited emails",req.body)
    const email = req.body.email ?req.body.email :req.query.email 
    const link = req.body.link ? req.body.link :req.query.link 

    // const text = `You have been referred on Geeker.Please join us by clicking on the following link
    //              <p> <a href='${link}'>  ${link}  </a></p>

    await referrLink({
			email : email,
			referrLink: `<a href='${link}'>  ${link}  </a>`,
		})
    // MailService.dynamicEmail({
    //   email:email,
    //   subject:"Refer",
    //   text:text,
    //   previewtext:'Refer'

    // })
    const result = {"success":true,"message":"mail sent"}
    console.log("referPeopleEmail email Sent")
    return res.status(201).json(result)
  }
  catch(err){
    return err
  }
}

/**
 * klaviyo helper function call
 * @params = event(name of event), properties(dynamic), email
 * @response : call kalviyo track api form helper
 * @author : Karan
 */
export async function klaviyoTrack(req: Request, res: Response, next: NextFunction) {
  try {

    track({
      event: req.body.event,
      email: req.body.email,
      properties: req.body.properties
    });
    res.status(201).json(true);
  } catch (err) {
    logger.error("Klaviyo tracking api catch error : ",{
      'event':req.body.event,
      'err': err
    });
    return err
  }
}

