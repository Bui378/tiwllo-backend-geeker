import { Request, Response, NextFunction } from 'express';
import BillingDetails, { IBillingDetails } from '../models/BillingDetails';
import InvalidRequestError from '../errors/InvalidRequestError';
import User from '../models/User';
import { roleStatus } from '../utils';
import Customer from '../models/Customer';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {

      console.log('BillingDetails list>>>>>>>>>>>>')

    let { page, pageSize } = req.body;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);
    const data = req.body
    console.log("data :: BillingDetailsController ",req.body)
    delete data.page
    delete data.pageSize
    const user = await User.findById({_id:data.customer_user_id})
    const { parentId, roles, _id,ownerId} = user
    let query = BillingDetails.find(data).sort({createdAt:-1});
    if (typeof roles !== "undefined" && roles && (roles.includes(roleStatus.ADMIN) || roles.includes(roleStatus.OWNER))) {
      let userIds = [];
      if (parentId || ownerId) {
        if (ownerId) {
          userIds = await User.distinct("_id", { ownerId });
          for (var uId in userIds) {
            let tempUserIds = await User.distinct("_id", { ownerId: userIds[uId] });
            userIds = [...userIds.concat(tempUserIds)]
          }
        } else {
          userIds = await User.distinct("_id", { parentId });
          for (var uId in userIds) {
            let tempUserIds = await User.distinct("_id", { parentId: userIds[uId] });
            userIds = [...userIds.concat(tempUserIds)]
          }
        }
      } else {
        userIds = await User.distinct("_id", { ownerId : _id });
        userIds.push(_id);
        for(var uId in userIds){
          let tempUserIds = await User.distinct("_id", { ownerId : userIds[uId] });
          userIds = [...userIds.concat(tempUserIds)]
        }
      }
      query = BillingDetails.find({ ...data, customer_user_id : { $in : userIds }}).sort({createdAt:-1});     
    }
    const totalCount = await BillingDetails.countDocuments(query);
    const billingData: IBillingDetails[] = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({path:"customer_user_id",model:"User"})
      .populate({path:"technician_user_id",model:"User"})
      .populate({path:"job_id",model:"Job"})
      .exec();
    // console.log("query billings ::",billingData)

    billingData.forEach(item => {
      let jobDetail = item.job_id
      let subscriptionSecondsUsed = jobDetail['total_subscription_seconds']
      if ((subscriptionSecondsUsed !== 0 && subscriptionSecondsUsed === jobDetail['total_seconds']) || (subscriptionSecondsUsed !== 0 && subscriptionSecondsUsed < jobDetail['total_seconds'] && jobDetail['is_free_job'] && jobDetail['discounted_cost'] === 0)) {
        item['total_amount'] = 0
      }
      else if (subscriptionSecondsUsed !== 0 && subscriptionSecondsUsed < jobDetail['total_seconds'] && jobDetail['discounted_cost'] > 0) {
        item['total_amount'] = jobDetail['discounted_cost']
      }
      else if (jobDetail['is_free_job']) {
        item['total_amount'] = jobDetail['free_session_total']
      }
      else {
        item['total_amount'] = item['total_amount']
      }
    });
    
    return res.json({
      data: billingData,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('BillingDetails create>>>>>>>>>>>>')
    let billing_details = await BillingDetails.findOne({"job_id":req.body.job_id})
    if(billing_details){
      res.status(201).json(billing_details)
       return;
    }
    // console.log("req.body (billing create ):::",req.body)
    const details = new BillingDetails(req.body);
    await details.save();
    // console.log("billing Details are:",details)
    res.status(201).json(details);
  } catch (err) {
    console.log("Error in billing is ::",err)
    next(err);
  }
}


export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {

      console.log('BillingDetails retrieve>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const details: IBillingDetails = await BillingDetails.findById(id);

    if (!details) {
      throw new InvalidRequestError('Billing Details does not exist.');
    }

    res.json(details);
  } catch (err) {
    next(err);
  }
}
export async function retrieveByJob(req: Request, res: Response, next: NextFunction) {
  try {

      console.log('BillingDetails retrieveByJob>>>>>>>>>>>>')

    // const {id}: { id: string } = req.params as any;
    // console.log(":req.params.id :",req.params.id)
    const details: IBillingDetails = await BillingDetails.findOne({job_id:req.params.id});

    if (!details) {
      throw new InvalidRequestError('Billing Details does not exist.');
    }

    res.json(details);
  } catch (err) {
    res.json({});
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {

      console.log('BillingDetails update>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const billingDetails: IBillingDetails = await BillingDetails.findById(id);

    if (!billingDetails) {
      throw new InvalidRequestError('Billing Details does not exist.');
    }

    billingDetails.set(req.body);

    await billingDetails.save();

    res.json(billingDetails);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('BillingDetails remove>>>>>>>>>>>>')
    
    const {id}: { id: string } = req.params as any;

    await BillingDetails.deleteOne({_id: id});

    res.json({deleted: true});
  } catch (err) {
    next(err);
  }
}