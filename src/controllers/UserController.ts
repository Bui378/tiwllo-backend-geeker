import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";
import Notification, {INotfication} from "../models/Notifications";
import Customer,{ICustomer} from "../models/Customer";
import InvalidRequestError from "../errors/InvalidRequestError";
var CryptoJS = require("crypto-js");
// const stripe = require('stripe')(process.env.STRIPE_KEY)
const fetch = require('node-fetch');
import {customerDeletedAccount} from "../services/MailService";
import Job, { IJob } from '../models/Job';
let logger = require('../../winston_logger');
logger = logger("UserController.ts");
import * as Services from '../services/SettingService'
import BusinessDetails, { IBusinessDetails } from "../models/BusinessDetails";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('UserController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = User.find();

    const totalCount = await User.countDocuments(query);
    const users: IUser[] = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    return res.json({
      data: users,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('UserController create>>>>>>>>>>>>')

    const user = new User(req.body);

    await user.save();

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function retrieve(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('UserController retrieve>>>>>>>>>>>>')
    const { id }: { id: string } = req.params as any;


    const user: IUser = await User.findById(id)
      .populate("customer")
      .populate("technician")
      .populate({ path: "geekerAdmin", model: "accounts_customuser", select: { 'first_name': 1,'last_name':1, 'email':1},})
      .populate({
        path: "business_details",
        model: "business_details"
      });

    if (!user) {
      throw new InvalidRequestError("User does not exist.");
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function retrievePic(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('UserController retrieve>>>>>>>>>>>>')
    const { id }: { id: string } = req.params as any;


    const user: IUser = await User.findById(id)
      .populate("technician");

    if (!user) {
      throw new InvalidRequestError("User does not exist.");
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try {

    console.log('UserController update>>>>>>>>>>>>')
    const {id}: { id: string } = req.params as any;


    const user: IUser = await User.findById(id);

    if (!user) {
      throw new InvalidRequestError("User does not exist.");
    }

    user.set(req.body);

    await user.save();

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateBusinessDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }: { id: string } = req.params as any;
    const user: IUser = await User.findById(id);

    if (!user) {
      throw new InvalidRequestError("User does not exist.");
    }

    if (req.body.isBusinessTypeAccount) {
      let business_details = ''
      const object = {
        isBusinessTypeAccount: req.body.isBusinessTypeAccount,
        businessName: req.body.businessName,
      }
      // const businessDetails: IBusinessDetails = new BusinessDetails(object);
      const businessDetails: IBusinessDetails = new BusinessDetails(object);
      const newBusinessDetails = await businessDetails.save();
      business_details = newBusinessDetails['_id']

      if (newBusinessDetails) {

        const objectForUserTable = {
          isBusinessTypeAccount: req.body.isBusinessTypeAccount,
          businessName: req.body.businessName,
          business_details: business_details
        }

        user.set(objectForUserTable);
        await user.save();
        res.json(user);

      } else {
        res.json({ 'error': 'error while getting bussiness details' });
      }
    }
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {

    console.log('UserController remove>>>>>>>>>>>>')
    const {id}: { id: string } = req.params as any;

    await User.deleteOne({ _id: id });

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log(">>>>>>>>>>>>me i am getting the current user",req.body)
    const user = (req as any).user;
    // console.log("I am user  >>>>>>>>>>>>>>>>>>>>>> ",user)
    await user
      .populate({ path: "customer", populate: "customer" })
      .populate({
        path: "technician",
        model: "Technician",
        populate: [{
          path: "experiences",
          model: "Experience",
          populate: {
            path: "software",
            model: "Software",
            populate: {
              path: "parent",
              model: "Software",
              populate: {
                path: "expertises",
                model: "Expertise",
              },
            },
          },
        },
        {
          path:"certifiedIn",
          model:"Software"


        }]
      }).populate({
        path: "business_details",
        model: "business_details"
      })
      .execPopulate();
    res.json(user);
  } catch (err) {
    console.log(">>>>>>errr ", err);
    next(err);
  }
}

export async function getUserByParam(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('UserController getUserByParam>>>>>>>>>>>>')
    
     const user = await User.findOne({email: req.body.email});
      res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}



export async function updateUserByParam(req: Request, res: Response, next: NextFunction) {
  try {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> update  user param >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ")
      const user_id = req.body._id
      const updatedData = req.body.data
      const user = await User.updateOne({_id:user_id},{$set:updatedData});
      res.status(201).json(user);
  } catch (err) {
    res.status(201).json({"success":false});
  }
}
export async function deleteUserByParam(req: Request, res: Response, next: NextFunction) {
  try {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> update  user param >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ",req.body)
    const user_id = req.body._id
    const encryptedData = req.body.email
    const stripeId = req.body.stripe_id
    const firstName = req.body.firstName
    const lastName = req.body.lastName
    const phone_number = req.body.phoneNumber
    const custId = req.body.customerId
    const createdAt = req.body.createdAt
    const customerType = req.body.customerType
    let encryptedDataAfter;
    let updatedData1 = {};
    if (stripeId) {
      encryptedDataAfter = decryptData(encryptedData, stripeId, firstName, lastName, phone_number);
      updatedData1 = {
        stripe_id: encryptedDataAfter.encryptedStripeId,
        phoneNumber: encryptedDataAfter.encryptedphoneNumber,
        status:'deleted',
      };
    } else {
      encryptedDataAfter = decryptData(encryptedData, null, firstName, lastName, phone_number);
      updatedData1 = {
        phoneNumber: encryptedDataAfter.encryptedphoneNumber,
        status:'deleted',
      };
    }
   
    const updatedData = {
      email: encryptedDataAfter.encryptedData,
      firstName:encryptedDataAfter.encryptedFirstName,
      lastName:encryptedDataAfter.encryptedLastName,
    };
   
      const user = await User.updateOne({_id:user_id},{$set:updatedData});
      const customer = await Customer.updateOne({user:user_id},{$set:updatedData1});
      logger.info('Information customer deleted userCustomer', {"customer": customer,"user": user});
      const stripeReqObj = {
				"params": {
					"stripe_id": stripeId,
					'liveUser': customerType === 'live' ? true : false,
				}
			}
      let stripe = await Services.getStripeObject(stripeReqObj);
      if(stripeId){
        const deletedCustomer = await stripe.customers.del(stripeId);
        logger.info('Information customer deleted',{"deletedCustomer":deletedCustomer});
      }
      const totalJobCompleted = await Job.count({'customer':custId,'status':'Completed'})
      const totalJobs = await Job.count({'customer':custId})
      const notifyStatus = await Notification.updateMany({ 'customer': custId },{ $set: { 'deleted': true } });
      logger.info('Information customer deleted:',{'totalJobCompleted':totalJobCompleted,"totalJobs":totalJobs,"notifyStatus":notifyStatus});
      await Job.updateMany({ 'customer': custId, 'status': { $ne: 'Completed' }},{
          $set: { 'status': 'Expired' }
        }
      );
      const createdAtFormat = new Date(createdAt);

      const day = String(createdAtFormat.getUTCDate()).padStart(2, "0");
      const month = String(createdAtFormat.getUTCMonth() + 1).padStart(2, "0");
      const year = createdAtFormat.getUTCFullYear();

      const formattedDate = `${day}-${month}-${year}`;
      console.log("check date>>>>>",formattedDate);
      console.log('Customer info>>>>>>>>>:', totalJobCompleted,formattedDate,totalJobs,firstName.concat(' ', lastName),req.body.email);
      logger.info('Information customer deleted Customer info:',{"totalJobCompleted":totalJobCompleted,
    "data":req.body.email 
    })
      let admin_emails = JSON.parse(process.env.adminMails)
      for(var index in admin_emails){
        const email = admin_emails[index]
        // Todo add reason if payment failed for any technician.
        customerDeletedAccount({
          email:email,
          custUserId:user_id,
          custEmail:req.body.email,
          totalJobCompleted:totalJobCompleted,
          createdAt:formattedDate,
          customerName:firstName.concat(' ', lastName),
          totalJobs:totalJobs
    
          })
              	
    } 
      await deleteProfileByEmail(encryptedData);

      // console.log('Stripe customer deleted:', deletedCustomer.id);
      console.log("Information customer deleted before going to send response: ",user,customer);
      if (user.nModified > 0 && customer.nModified > 0) {
        res.status(200).json({ "success": true });
      } else {
        res.status(200).json({ "success": false });
      }
  } catch (err) {
    res.status(200).json({"success":false});
  }
}
const decryptData = (data,stripeId,firstName,lastName,phone_number) => {
  console.log("decryptData: ",data,stripeId,firstName,lastName,phone_number);
  const encryptedData = CryptoJS.AES.encrypt(data, process.env.secretPassKey).toString();
  const encryptedStripeId = CryptoJS.AES.encrypt(stripeId, process.env.secretPassKey).toString();
  const encryptedFirstName = CryptoJS.AES.encrypt(firstName, process.env.secretPassKey).toString();
  const encryptedLastName = CryptoJS.AES.encrypt(lastName, process.env.secretPassKey).toString();
  const encryptedphoneNumber = CryptoJS.AES.encrypt(phone_number, process.env.secretPassKey).toString();


  console.log("decryptedData123: ",encryptedData,encryptedStripeId);
  return { encryptedData, encryptedStripeId,encryptedFirstName,encryptedLastName,encryptedphoneNumber }; // Return the variables as an object
};
async function deleteProfileByEmail(email: string) {
  console.log("deleteProfileByEmail", email);
  const url = 'https://a.klaviyo.com/api/data-privacy-deletion-jobs/';
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      revision: '2023-02-22',
      'content-type': 'application/json',
      Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_TOKEN}`
    },
    body: JSON.stringify({
      data: {
        type: 'data-privacy-deletion-job',
        attributes: {
          email: email
        }
      }
    })
  };

  try {
    const response = await fetch(url, options);
    const responseBody = await response.text();
    console.log("deleteProfileByEmail",responseBody);
    // Handle the response as needed
  } catch (error) {
    console.error('Error deleting Klaviyo profile:', error);
    // Handle the error as needed
  }
}


export async function getOrgUsers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('UserController retrieve>>>>>>>>>>>>')
    const { ownerId }: { ownerId: string } = req.params as any;
    const totalUsers = await User.find({ownerId:ownerId}).count();
    res.json({'success':true,totalUsers:totalUsers+1});
  } catch (err) {
    // next(err);
    res.json({'success':false,totalUsers:1});
  }
}