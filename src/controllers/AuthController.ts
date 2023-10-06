//AuthController.tss
import { Request, Response, NextFunction } from "express";
import moment, { Moment } from "moment";
import User, { IUser } from "../models/User";
import RefreshToken, { IRefreshToken } from "../models/RefreshToken";
import Customer, { ICustomer } from "../models/Customer";
import Technician, { ITechnician } from "../models/Technician";
import Offers, { IOffers } from "../models/Offers";
import Notifications, {
  INotfication,
  notificationSchema,
} from "../models/Notifications";
import Job, { IJob } from "../models/Job";
import { pick, roleStatus } from "../utils";
import InvalidRequestError from "../errors/InvalidRequestError";
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendVerificationEmailCustomer,
  alertToTheAdmins,
  sendDetailedMail
} from "../services/MailService";
import * as TextService from "../services/TextService";
import * as JobTagService from "../services/JobTagService";
import {jobTags} from '../constant';
import joi from "joi";
import { validateRegisterBody } from "../middlewares/validation";
import Invite from "../models/invite";
import { InvitStatus, userTypeStatus } from "../utils";
import Refer, { IRefer } from '../models/Refer';
const Mixpanel = require('mixpanel');
var mixpanel = Mixpanel.init(process.env.MIXPANEL_KEY,{debug:true});
let logger = require('../../winston_logger');
logger = logger("AuthController.ts");
var request = require('request');
var CryptoJS = require("crypto-js");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const VoiceResponse = require("twilio").twiml.VoiceResponse;
import UserLifeCycle from '../models/UserLifeCycle';
import { track, identify } from '../services/klaviyo'
import BusinessDetails, { IBusinessDetails } from "../models/BusinessDetails";

const maskEmail = (email = '') => {
  const [name, domain] = email.split('@');
  const { length: len } = name;
  const maskedName = name[0] + '...' + name[len - 1];
  const maskedEmail = maskedName + '@' + domain;
  return maskedEmail;
};

async function generateTokenResponse(user: IUser, accessToken: string) {
  try{
    console.log('generateTokenResponse>>>>>>>>>>>>')
     const tokenType: string = 'Bearer';

    const refreshToken: string = (await RefreshToken.generate(user)).token;
    const expiresAt: Moment = moment().add(
      process.env.JWT_EXPIRATION_MINUTES,
      "minutes"
    );

    return {
      tokenType,
      accessToken,
      refreshToken,
      expiresAt,
    };
  } catch (err) {
    console.log("AuthController generateTokenResponse err::", err);
    return {};
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
        // console.log('login>>>>>>>>>>>>')
        // console.log(req.body)

        let user_dict = {'data':req.body,'function': 'login-user','message':'login() : req.body information'}        
        send_logs_to_new_relic(JSON.stringify(user_dict))    
        let {
            email,
            password,
            refreshObject,
        }: { email: string; password: string; refreshObject: IRefreshToken } = req.body as any;
        var bytes = CryptoJS.AES.decrypt(password, process.env.secretPassKey);
        var decryptedPass = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        // var bytes2 = CryptoJS.AES.decrypt('', process.env.secretPassKey);
        // var decryptedPass3 = JSON.parse(bytes2.toString(CryptoJS.enc.Utf8));
        // console.log("decryptedPass3 >>>>>>>>>>>>>>>>>>",decryptedPass3)
        password = decryptedPass
        if (!email || !password) {
            throw new InvalidRequestError("Email and Password should be required.");
        }

        const user_data: IUser = await User.findOne({'email' :email.toLowerCase() });

        user_dict = {'data':user_data,'function': 'login-user','message':'login() : user_data information'}        
        send_logs_to_new_relic(JSON.stringify(user_dict))    
        if (user_data) {
            if (user_data.blocked) {
              logger.error("login: User has been blocked by admin : ",{
                'userId':user_data.id
              });
                return res.json({
                    success: false,
                    error: "User has been blocked by admin.",
                    inputError: false,
                    userError: false,
                    passwordError: false,
                });

            }

            const { user, accessToken }: { user: IUser, accessToken: string } = await User.findAndGenerateToken({
                email:email.toLowerCase(),
                password,
                refreshObject
            });

            const token = await generateTokenResponse(user, accessToken);
            logger.info("login: user successfully logined : ",{
              'userId':user_data.id
            });

            // await JobTagService.createJobTags(user_data)

            
            const userLifeCycleStates = {}
            userLifeCycleStates['user'] = user_data.id;
            userLifeCycleStates['userType'] = user_data.userType;
            userLifeCycleStates['actionType']= "logged_in"
            // console.log("present user", userLifeCycleStates);
            const userLifeCycle = new UserLifeCycle(userLifeCycleStates)
            userLifeCycle.save()

            if(user_data.userType == 'customer'){
              track({
                event: 'User Login',
                email: user_data.email,
                properties: {
                  $first_name: user_data.firstName,
                  $last_name: user_data.lastName
                }
              })
            }
            if (user_data.userType === 'technician') {
              user[user_data.userType] = await Technician.find({ user: user_data.id })
            }
            else {
              user[user_data.userType] = await Customer.find({ user: user_data.id })
            }
            // console.log("user['customer'] ::", user);
            return res.json({
              success: true,
              user,
              token,
            });
        } else {
            user_dict = {'data':user_data,'function': 'login-user','message':'login() : user_data not found'}        
            send_logs_to_new_relic(JSON.stringify(user_dict)) 
            logger.error("login: User not found with this email : ",{
              'body':{'email':maskEmail(email)}
            });
            return res.json({
                success: false,
                error: "User not found with this email.",
                inputError: true,
                userError: true,
                passwordError: false,
            });
        }
    } catch (err) {
        // next(err);
        let error_dict = {'data':{'error':err.message},'function': 'login-user','message':'login() : catch error'}        
        send_logs_to_new_relic(JSON.stringify(error_dict)) 
        let message = err.message
        let inputError = false;
        let passwordError = false;
        if (message == "Incorrect email or password") {
            message = "Invalid password";
            inputError = true;
            passwordError = true;
        }
        logger.error("login: Catch Error: while login : ",{
          'body':{'email':maskEmail(req.body.email)},
          'err':error_dict
        });
        return res.json({
            success: false,
            error: message,
            inputError: inputError,
            userError: false,
            passwordError: passwordError,
        });
    }
}


export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
    try {
        console.log('register>>>>>>>>>>>>')
        console.log("AuthController register req.body::", req.body);
        mixpanel.track(`${req.body.userType}- New user Registerd`,{"distinct_id":req.body.email,"Email":req.body.email})
        logger.info("AuthController register req.body:: ",{
              'body':req.body,
              'info':{}
            });
        let user_dict = {'data':req.body,'function': 'new-user-register','message':'register() : req.body information'}        
        send_logs_to_new_relic(JSON.stringify(user_dict))    
        const { email, password,inviteCode, userType } = req.body;
        let validate = {firstName: joi.string().required(),
          lastName: joi.string().required(),
          email: joi.string().required(),
          password: joi.string().required(),
          confirm_password: joi.string().valid(password).required(),
          userType: joi.string().valid(userTypeStatus.CUSTOMER, userTypeStatus.TECHNICIAN).required(),
          inviteCode: joi.string().allow(null, ''),
          referred_by: joi.string().allow(null, ''),
          billing: joi.object({}).unknown(),
          extension: joi.string().allow(null, ''),
          jobId: joi.string().allow(null, ''),
          language: joi.any().allow(null, ''),
          phoneNumber: joi.string().allow(null, ''),
          phonenumber: joi.string().allow(null, ''),
          scheduleJob: joi.boolean(),
          status: joi.string().allow(null, ''),
          timezone: joi.string().allow(null, ''),
          receiveEmails:joi.boolean(),
          businessName : joi.string().allow(null, ''),
          isBusinessTypeAccount : joi.boolean(),
          askedForBusiness : joi.boolean(),
          customerType:joi.string(),
          referred_code : joi.string().allow(null, '')
        }

        let bodyData = req.body
        if(userType == 'customer'){
          validate['additionalLanguage']= joi.string().allow(null, '');
          validate['isBusinessTypeAccount']= joi.boolean();
        }else{
          // validate['additionalLanguage']= joi.string().allow(null, '');
          // validate['additionalLanguage']= [];
          delete bodyData['additionalLanguage']
        }
        // console.log(validate);

        let validateRes = await validateRegisterBody(validate,req.body,res);
        if(validateRes){

          let user_email_lowercase = req.body.email.toLowerCase();
          const isExist: boolean = await User.exists({ email:user_email_lowercase });

          if (isExist) {
              user_dict = {'data':{'isExist':isExist.toString()},'function': 'new-user-register','message':'register() : user already exist'}        
              send_logs_to_new_relic(JSON.stringify(user_dict)) 
              logger.info("register: register user already exist : ",{
                'body':{'email':maskEmail(req.body.email)},
                'info':{'data':{'isExist':isExist.toString()}}
              });
              res
                  .status(200)
                  .json({ success: false, message: "The email already exists." });

              // throw new InvalidRequestError('The email already exists.');
          }else{
              let parentId = null;
              let ownerId = null;
              let roles = [];
              console.log('inviteCode>>>>>>>>>>>',inviteCode)
              const invite = await Invite.findOne({ inviteCode});
              if (inviteCode != 'nothing' && inviteCode != undefined) {
                  parentId = invite.parentId;
                  roles.push(invite.role);
              } else {
                  roles.push(roleStatus.OWNER)
              }

              if(inviteCode != 'nothing' && inviteCode != undefined){
                parentId = invite.parentId;
                const parentUserInfo: IUser = await User.findOne({'_id' : parentId});
                console.log('user user_data id ::::',parentUserInfo)
                console.log('user user_data id2 ::::',parentUserInfo.roles)

                if(parentUserInfo.roles.includes("admin")) {
                  const ownerInfo: IUser = await User.findOne({'_id' : parentUserInfo.parentId});
                  ownerId = ownerInfo.id
                  console.log('for  console 1::::',ownerId)
                }

                if(parentUserInfo.roles.includes('owner') && !parentUserInfo.roles.includes('admin')) {
                  ownerId = parentId
                  console.log('for  console 2::::',ownerId)
                }
                
              }


              let user_data  = {}
              console.log('req.body.referred_by>>>>>>>>>>>>',req.body.referred_by)

               user_data = pick(req.body, [
                  "firstName",
                  "lastName",
                  "email",
                  "password",
                  "userType",
                  "timezone", 
                  "referred_by",  
                  "businessName",
                  "isBusinessTypeAccount",
                  "referred_code",               
              ]);
              
              let business_details =''
              if(user_data['isBusinessTypeAccount']){
                const object ={
                  isBusinessTypeAccount : user_data['isBusinessTypeAccount'],
                  businessName : user_data['businessName'],
                }
                const businessDetails : IBusinessDetails  = new  BusinessDetails(object);
                const newBusinessDetails = await businessDetails.save();
                console.log("response of business details", newBusinessDetails['_id'],newBusinessDetails);
                business_details = newBusinessDetails['_id']
              }
             
              user_data['email'] = user_email_lowercase;
              const user: IUser = new User({ ...user_data, parentId, roles,ownerId,business_details });
              const newUser = await user.save();
              if (invite) {
                  Invite.updateOne(
                      { _id: invite._id },
                      { $set: { status: InvitStatus.COMPLETED, userId: newUser._id } }
                  ).then(async (result) => {
                      if (result) {
                          console.log("result", result);
                      }

                  });
                logger.info("register: invite update status complete and update user id : ",{
                  'body':{'referred_by':req.body.referred_by},
                  'info':{ 'status': InvitStatus.COMPLETED, 'userId': newUser._id }
                });
              }


              let admin_emails = JSON.parse(process.env.adminMails)
              let admin_email = ""
              for(var k in admin_emails){
                  admin_email = admin_emails[k]
                  alertToTheAdmins(admin_email,{"fullName":user_data['firstName'] +" "+user_data['lastName'],"userType":user_data['userType']})
              }
              const accessToken = user.token();
              // const  query = Offers.find({"offerType":"New-Customer"});
              // const offer = await query
              // console.log("offer ::::: ",offer)
              const token = await generateTokenResponse(user, accessToken);
              let alertPreferenceInfo = {
                "complete" : true,
                "settings" : {
                  "Job" : {
                    "Browser" : {
                      "toggle" : true,
                      "value" : true,
                      "type" : "button",
                      "error" : null
                    },
                    "Email" : {
                      "toggle" : true,
                      "value" : req.body.email,
                      "type" : "email",
                      "error" : null
                    },
                    "Text" : {
                      "toggle" : false,
                      "value" : req.body.phoneNumber,
                      "type" : "number",
                      "error" : null
                    },
                    "Whatsapp" : {
                      "toggle" : false,
                      "value" : "",
                      "type" : "number",
                      "error" : null
                    },
                  },
                  "Techs" : {
                    "Browser" : {
                      "toggle" : true,
                      "value" : true,
                      "type" : "button",
                      "error" : null
                    },
                    "Email" : {
                      "toggle" : true,
                      "value" : req.body.email, 
                      "type" : "email"
                    },
                    "Text" : {
                      "toggle" : false,
                      "value" : req.body.phoneNumber,
                      "type" : "number"
                    },
                    "Whatsapp" : {
                      "toggle" : false,
                      "value" : "",
                      "type" : "number",
                      "error" : null
                    },
                  }
                }
              }
              if(Object.keys(token).length !== 0){
                  if(userType == 'technician'){
                      console.log("creating technician>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
                      const technician = new Technician({user: user.id,
                        profile: { confirmId: { phoneNumber: req.body.phoneNumber },
                                  alertPreference:alertPreferenceInfo
                                },
                        extension:req.body.extension,
                        status:req.body.status,
                        promo_code : (req.body.firstName + req.body.lastName).replace(/ /g,'').toLocaleUpperCase(),
                        registrationStatus:"update_technician"
                      })
                      await technician.save()
                      user['technician'] = technician
                      let notificationData = {
                        "user":user.id,
                        'title':'Thanks for signing up, We look forward working with you, We will reach out to you with next steps.',
                        'type':'from_admin',
                        "read":false,
                        "actionable":false,
                    }
                    let notiFy = new Notifications(notificationData)
                    await notiFy.save()
                    // sending message to customer for successfull registration starts
                    let correctedNumber = req.body.phoneNumber
                    TextService.sendSmsToNumber(correctedNumber,'Hi '+req.body.firstName+', You have been successfully registered on Geeker.')
                     // sending message to customer for successfull registration ends
                  }
                  if(userType == 'customer'){
                      console.log('creating customer>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
                      const customer = new Customer({ user: user.id,
                          phoneNumber:req.body.phoneNumber,
                          extension:req.body.extension,
                          receiveEmails:req.body.receiveEmails,
                          language:req.body.language,
                          additionalLanguage:req.body.additionalLanguage,
                          status:req.body.status,
                          askedForBusiness:req.body.askedForBusiness,
                          customerType:req.body.customerType
                      });
                      await customer.save()
                      user['customer'] = customer
                      let notificationData = {
                          "user":user.id,
                          'title':'Welcome to Geeker. Please post a job to get started.',
                          'type':'from_admin',
                          "read":false,
                          "actionable":false,
                      }
                      let notiFy = new Notifications(notificationData)
           
                      await notiFy.save()

                      // sending message to customer for successfull registration starts
                      let correctedNumber = req.body.phoneNumber
                      TextService.sendSmsToNumber(correctedNumber,'Hi '+req.body.firstName+', You have been successfully registered on Geeker.')
                       // sending message to customer for successfull registration ends

                      // User.updateOne(({"_id":user.id,{}}))
                      user_dict = {'data':customer,'function': 'new-user-register','message':'register() : customer create successfully'} 
                      logger.info("register: customer created successfully : ",{
                          'body':maskEmail(user.email), 
                          'userId':user.id
                        }
                      );
                      send_logs_to_new_relic(JSON.stringify(user_dict))    

                      // User.update({_id:user.id},{"customer":customer.id})
                      if(req.body.jobId && req.body.jobId != ''){
                          Job.updateOne({ "_id": req.body.jobId },{'customer':customer.id},function(err, response) {
                              console.log('Update job after customer create response :: ',response)
                          })
                        logger.info("register: Update job after customer create response : ",{
                            'body':{'customer':customer.id}, 
                            'userId':user.id,
                            'jobId':req.body.jobId
                          }
                        );
                        let datatoTags = {};
                        datatoTags['Tag'] = jobTags.USER_REGISTERED;
                        datatoTags['JobId'] = req.body.jobId;
                        JobTagService.createJobTags(datatoTags)
                        mixpanel.track('Customer- Assigning guest job with customer',{"distict_id":req.body.jobId,"Email":req.body.email})
                      }

                      
                      identify({
                        email: user.email,
                        properties: {
                          $first_name: user.firstName,
                          $last_name: user.lastName
                        },
                        post: true //defaults to false
                      })
                      track({
                        event: 'User Registration',
                        email: user.email,
                      })

                      if(req.body.receiveEmails){
                        track({
                          event: 'Opt-In',
                          email: user.email,
                        })
                      }
                  }   

                
              } else {
                  console.log("AuthController generateTokenResponse error and deleting user::");
                  user_dict = {'data':{'email':user_email_lowercase},'function': 'new-user-register','message':'register() : AuthController generateTokenResponse error and deleting user::'}        
                  send_logs_to_new_relic(JSON.stringify(user_dict)) 
                  logger.info("register: AuthController generateTokenResponse error and deleting user : ",{
                    'body':{ 'email': maskEmail(user_email_lowercase)}, 
                  });
                  await User.deleteOne({ email: user_email_lowercase });
                  res.status(200).json({
                      success: false,
                      message: "Failed to save . Please reload your page and try again.",
                  });
              }

              console.log('333333333333333333333333333333333333333333333')

              if( req.body.referred_by !== null){
                logger.info("register: referal status updated as completed : ",{
                  'body':{'user':req.body.referred_by}, 
                  'userId':user.id,
                  'jobId':req.body.jobId
                });
                await Refer.updateOne({'user':req.body.referred_by,'email':req.body.email},{'status':'Completed'})
              }
                
              console.log('444444444444444444444444444444444444444444444')
              logger.info("register: User register successfully and return user and token : ",{
                'body':{ 'email':maskEmail(req.body.email), 'inviteCode':req.body.inviteCode, 'userType':req.body.userType }, 
                'userId':user.id,
                'jobId':req.body.jobId
              }
            );
            
              
              return res.status(200).json({
                  user,
                  token,
              });
          }
        }else{
          res
            .status(200)
            .json({ success: false, message: "The information you pass has invalid data." });
        }
    }    
    catch (err) {
        console.log("AuthController register err::", err);
        let error_dict = {'error':err.message,'function': 'new-user-register','message':'register() : Inside catch 1'}        
        send_logs_to_new_relic(JSON.stringify(error_dict)) 
        try {
            console.log("user<<<<<<<<<<");
            logger.error("register: register user deleted by email: ",{
                  'body':{ 
                    'email':maskEmail(req.body.email), 
                    'inviteCode':req.body.inviteCode, 
                    'userType':req.body.userType 
                  }, 
                  'err':err.message
                }
              );
            if(req.body.email){
              await User.deleteOne({ email: req.body.email.toLowerCase() });
            }
        } catch (err_one) {
            console.log("AuthController register user not deleted with err_one::",err_one);
            error_dict = {'error':err_one.message,'function': 'new-user-register','message':'register() : Inside catch 2'}        
            send_logs_to_new_relic(JSON.stringify(error_dict))   
            logger.error("register: register user not deleted with err_one: ",{
                'body':{ 'email':maskEmail(req.body.email), 'inviteCode':req.body.inviteCode, 'userType':req.body.userType }, 
                'err':err_one.message
              }
            );

            return next(err_one);
        }
        logger.error("register: Catch error: while register : ",{
                'body':{ 'email':maskEmail(req.body.email), 'inviteCode':req.body.inviteCode, 'userType':req.body.userType }, 
                'err':err.message
              }
            );
        return next(err);
    }
}

export async function requestResetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('requestResetPassword>>>>>>>>>>>>')
    // console.log(req.body,">>>>>>")
    const { email } = req.body;


    if (!email) {
      // throw new InvalidRequestError('Email should be required.');
      res
        .status(200)
        .json({ success: false, message: "Email should be required." });
    }

    let user_email_lowercase = req.body.email.toLowerCase();
    const user: IUser = await User.findOne({email:user_email_lowercase});


    if (!user) {
      // throw new InvalidRequestError('We were unable to find a user with the email');
      res.status(200).json({
        success: false,
        message: "We were unable to find a user with the email.",
      });
    }

    if (user.blocked) {
      // throw new InvalidRequestError('User has been blocked by admin.');
      res
        .status(200)
        .json({ success: false, message: "User has been blocked by admin." });
    }

    const token: string = user.passwordToken();
    const expires: Date = moment().add(1, "hours").toDate();

    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    await user.save();

    await sendResetPasswordEmail({email:user_email_lowercase, redirectURL: 'https://dev-front.tetchaccess.com', token});


    return res.json({
      success: true,
      message: "We have just sent instructions to your email",
    });
  } catch (error) {
    // console.log(error);
    res.status(200).json({ success: false, message: error.message });
  }
}

export async function EmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

    console.log('EmailVerification>>>>>>>>>>>>')
    const {email} = req.body ;
    console.log("email:::",email);
    if(!email){
      throw new InvalidRequestError("User email not received")
    }
    let user_email_lowercase = req.body.email.toLowerCase();
    console.log("user_email_lowercase:::",user_email_lowercase);
    const user: IUser = await User.findOne({email:user_email_lowercase});


    if (!user) {
      throw new InvalidRequestError(
        "We were unable to find a user with the email"
      );
    }
    let DATE_OPTIONS = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: user.timezone,
    };

    const token = user.emailVerificationToken();
    const expires: Date = moment().add(1, "hours").toDate();

    user.emailVerifyToken = token;
    user.emailVerifyTokenExpires = expires;
    const myDateValue = new Date();
    myDateValue.setHours(myDateValue.getHours() + 1);
    let expire1 = myDateValue.toLocaleString("en-US", DATE_OPTIONS);
    const name = user.firstName + " "+ user.lastName
    await user.save();

    if (user.userType == "technician") {
      await sendVerificationEmail({user, email, token, expire1 });
      
    } else {
      await sendVerificationEmailCustomer({ user, email, token, expire1 });
    }

    return res.json({ message: "Sent the verification email successfully" });
  } catch (error) {
    console.log(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('resetPassword>>>>>>>>>>>>')
    const { token, password } = req.body;
    console.log(token, password);

    if (!token) {
      throw new InvalidRequestError("Password reset token is required.");
    }

    const user = await User.findOne({ passwordResetToken: token })
      .where("passwordResetExpires")
      .gt(Date.now())
      .exec();

    if (!user) {
      throw new InvalidRequestError(
        "Password reset token is invalid or has expired."
      );
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.json({ message: "Your password has been changed." });
  } catch (error) {
    console.log(error);
    return next(error);
  }
}

export async function checkEmail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

      console.log('checkEmail>>>>>>>>>>>>')

    // const { email } = req.body;
    let user_email_lowercase = req.body.email.toLowerCase();
    const user = await User.findOne({ email : user_email_lowercase });
    res.json({ success: !user });
  } catch (err) {
    next(err);
  }
}

export async function loginSocial(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('loginSocial>>>>>>>>>>>>')
    const { email, name, provider, type } = req.body;
    let userType = type;
    console.log("login :::::::::: ", req.body);

    const user = await User.findOne({ email, provider });
    if (!user && type == "defaultSelect") {
      res.json({
        token: null,
        user: null,
        registered: false,
      });
    }

    if (!user) {
      const firstName = name.split(" ")[0];
      const lastName = name.substring(firstName.length).trim();

      const newUser = new User({
        firstName,
        lastName,
        email,
        provider,
        userType,
      });

      await newUser.save();

      const accessToken = newUser.token();
      if (type === "customer") {
        const customer = new Customer({
          user: newUser.id,
          language: "English",
        });

        await customer.save();
      }
      if (type === "technician") {
        const technician = new Technician({
          user: newUser.id,
          registrationStatus: "send_test",
          tag:'signedUp'
        });
        technician.save();
        let notificationData = {
          user: newUser.id,
          actionable: false,
          title:
            "Kindly select softwares from settings menu to receive a test from admin",
          type: "from_admin",
        };
        const notify = new Notifications(notificationData);
        notify.save();
      }

      const token = await generateTokenResponse(newUser, accessToken);

      res.json({
        token,
        user: newUser,
        registered: false,
      });
    } else {
      const accessToken = user.token();

      const token = await generateTokenResponse(user, accessToken);

      res.json({
        token,
        user,
        registered: true,
      });
    }
  } catch (err) {
    next(err);
  }
}


export async function get_zoho_data(
  req: Request,
  res: Response,
  next: NextFunction
) {
   console.log('get_zoho_data>>>>>>>>>>>>')
  // console.log('11111111111111111111111111111',req)
  // console.log('req>>>>>>>>>>>>>>',req.params)
  console.log("req.body>>>>>>>>>>>>>>>>>>", req.query);
  // console.log('req>>>>>>>>>>>>>>>>>>>',res)
  ("1000.d934a6eaf8f822eb93dc043b97eb786d.44c25935c9328eeaa2e2938e4cea2a5e");
  res.json({});

}


export function send_logs_to_new_relic(dataString) {
      console.log('send_logs_to_new_relic>>>>>>>>>>>>')
  
  if(process.env.SERVER_TYPE == 'production'){

    var options = {
        url: process.env.RELIC_END_POINT,
        method: 'POST',
        body: dataString
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }
    console.log('options>>>>>>>>>>>>>>>>>>>>>>>>>',options)
    request(options, callback);
   }
}
