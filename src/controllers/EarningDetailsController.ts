import { Request, Response, NextFunction } from 'express';
import EarningDetails, { IEarningDetails } from '../models/EarningDetails';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('EarningDetailsController list>>>>>>>>>>>>')

    let { page, pageSize } = req.body;
    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);
    const data = req.body
    delete data.page
    delete data.pageSize
    // console.log("data :: (earningContoller list function)",req.query)
    const query = EarningDetails.find(data).sort({createdAt:-1});

    const totalCount = await EarningDetails.countDocuments(query);
    const earningData: IEarningDetails[] = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate({path:"customer_user_id",model:"User"})
      .populate({path:"technician_user_id",model:"User"})
      .populate({path:"job_id",model:"Job"})
      .exec();
    // console.log("query earnings ::",earningData)

    return res.json({
      data: earningData,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('EarningDetailsController create>>>>>>>>>>>>')
      let earning_details = await EarningDetails.findOne({"job_id":req.body.job_id})
      if (earning_details){
        res.status(201).json(earning_details)
        return;
      }
    // console.log("req.body (earning create ):::",req.body)
    const details = new EarningDetails(req.body);
    await details.save();
    // console.log("earning Details are:",details)
    let earningDetails = await EarningDetails.find({"job_id":req.body.job_id})
    if(earningDetails.length > 1) {
      earningDetails.forEach(async (item, i) => {
        if(i !== 0)await EarningDetails.findByIdAndDelete(item._id)
      })
    }
    res.status(201).json(details);
  } catch (err) {
    console.log("Error in earning is ::",err)
    next(err);
  }
}


export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('EarningDetailsController retrieve>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const details: IEarningDetails = await EarningDetails.findById(id);

    if (!details) {
      throw new InvalidRequestError('Earning Details does not exist.');
    }

    res.json(details);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {

      console.log('EarningDetailsController update>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const earningDetails: IEarningDetails = await EarningDetails.findById(id);

    if (!earningDetails) {
      throw new InvalidRequestError('Earning Details does not exist.');
    }

    earningDetails.set(req.body);

    await earningDetails.save();

    res.json(earningDetails);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('EarningDetailsController remove>>>>>>>>>>>>')
    
    const {id}: { id: string } = req.params as any;

    await EarningDetails.deleteOne({_id: id});

    res.json({deleted: true});
  } catch (err) {
    next(err);
  }
}


export async function retrieveByJob(req: Request, res: Response, next: NextFunction) {
  try {

      console.log('EarningDetailsController retrieveByJob>>>>>>>>>>>>')

    // const {id}: { id: string } = req.params as any;
    // console.log(":req.params.id :",req.params.id)
    const details: IEarningDetails = await EarningDetails.findOne({job_id:req.params.id});

    if (!details) {
      throw new InvalidRequestError('Earning Details does not exist.');
    }

    let earningDetails = await EarningDetails.find({"job_id":req.params.id})
    if(earningDetails.length > 1) {
      earningDetails.forEach(async (item, i) => {
        if(i !== 0)await EarningDetails.findByIdAndDelete(item._id)
      })
    }

    res.json(details);
  } catch (err) {
    console.log('EarningDetailsController retrieveByJob error>>>>>>>>>>>',err)
    res.json({});
  }
}