import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import Invite, { IInvite, IInviteModel } from "../models/invite";
import { validateInviteBody } from "../middlewares/validation";
import joi from "joi";
import { generateReferralCode, generateinviteCode } from "../utils";
import { sendInviteEmail } from "../services/MailService";
import { userTypeStatus, roleStatus } from "../utils";
let logger = require('../../winston_logger');
logger = logger("InviteController.ts");

export async function inviteNew(req: Request, res: Response, next: NextFunction) {
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    try {
      validateInviteBody(
        {
          email: joi.string().regex(emailRegex).required(),
  
          role: joi.string().valid(roleStatus.ADMIN, roleStatus.USER).required(),
          businessName :  joi.string().allow(null, '')
        },
        req.body,
        res
      );
      
     
  
      const { email, role, businessName } = req.body;
      const user = (req as any).user;
  
      const parentId = user._id;
      const ownerName = user.firstName
      const ownerEmail = user.email;
      const ownerBusinessName = user.businessName ? user.businessName : ''
  
       if(!emailRegex.test(email)){
        return res.json({status: false, message: "Invalid  email format."})
      }
      
      if (
        user.userType !== userTypeStatus.CUSTOMER ||
        (user.roles && user.roles.includes(roleStatus.USER))
      ) {
        
        return res.status(403).json({ status:false , message:"Forbidden"});
      }

      const name = `${user.firstName} ${user.lastName}`;
  
      let referralCode = user.referralCode;
  
      const existingUser = await User.findOne({ email });
  
      const inviteAlready = await Invite.findOne({ email });
  
      if (existingUser) {
        logger.info("inviteNew : User Already Exist : ",
          {
            'userId': parentId
          }
        );
        return res.json({ status: false, message: "User Already Exist" });
      }
  
      if (inviteAlready) {
        const inviteCode = inviteAlready.inviteCode
        const redirectURL = `${process.env.mailEndpoint}customer/register?inviteCode=${inviteCode}`;
        await sendInviteEmail(email, redirectURL, name,businessName);
        return res
        .status(201)
        .json({ success: true, message: "Successfully invited..!" });
      }
      try {
        referralCode = referralCode ? referralCode : await generateReferralCode();
  
        const inviteCode = await generateinviteCode()
  
        const inviteUser = new Invite({ parentId, email, role, inviteCode, ownerName,ownerBusinessName,ownerEmail});
  
        await inviteUser.save();
  
        User.updateOne(
          { _id: parentId },
          { $set: { referralCode } }
        ).then(async (result) => {
          if (result) {
            const redirectURL = `${process.env.mailEndpoint}customer/register?inviteCode=${inviteCode}`;
            await sendInviteEmail(email, redirectURL, name,businessName);
            return res
              .status(201)
              .json({ success: true, message: "Successfully invited..!" });
          }
        });
      } catch (err) {
        next(err);
      }
    } catch (err) {
      next(err);
    }
  }
  
  export async function List(req: Request,res: Response,next: NextFunction) {
    try {
      const user = (req as any).user
  
      const { roles, parentId , _id } = user
      let parent = null;
      let inviteList = await Invite.find({parentId: _id})
      if (typeof roles !== "undefined" && roles && (roles.includes(roleStatus.ADMIN) ||roles.includes(roleStatus.OWNER))){
        let userIds = [];
        if (parentId){
          userIds = await User.distinct("_id", { parentId });
          userIds.push(parentId);
          parent = await User.findById({ _id: parentId })
        } else {
          userIds = await User.distinct("_id", { parentId : _id });
          userIds.push(_id); 
        }
        inviteList =await Invite.find({ parentId: { $in: userIds } }).populate({
       path : 'userId',
       model:'User'
      });
       }

      return res.json({ success: true, data: inviteList, parent });
    } catch (err) {
      next(err);
    }
  }

  export async function getInvite(req: Request,res: Response,next: NextFunction) {
    try {
        const { inviteCode } = req.params

        const invite = await Invite.findOne({ inviteCode })
        return res.json({ success: true, data: invite });      
    } catch (err) {
      next(err);
      
    }

  }

  export async function listAllInvitesByParams(req:Request,res:Response,next:NextFunction){
    try{
      console.log('InviteController listAllInvitesByParams>>>>>>>>>>>>')
      const data  = req.body 
      let query = Invite.find(data).sort({createdAt:-1});
  
      
      const totalCount = await Invite.countDocuments(query);
      const invites: IInvite[] = await query
      .populate('user')
        // .populate({
        //  path : 'parentId',
        //  populate:'user'
        // })
        .exec();
        return res.json({
          data: invites,
          totalCount:totalCount
        });
    }
    catch(err){
      console.log("i am in catch",err)
      next(err);
    }
  }
  
  