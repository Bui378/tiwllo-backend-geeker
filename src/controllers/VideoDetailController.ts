import { Request, Response, NextFunction } from 'express';
import VideosDetails, { IVideoDetails } from '../models/VideoDetails';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('VideoDetailsController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);
    const data = req.query
    console.log("data :: VideosDetailsController ",data)
    const query = VideosDetails.find().sort({createdAt:1});

    const totalCount = await VideosDetails.countDocuments(query);
    const VideoData: IVideoDetails[] = await query
      .exec();
    // console.log("query billings ::",billingData)

    return res.json({
      data: VideoData,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('VideoDetailsController create>>>>>>>>>>>>')

    console.log("req.body (billing create ):::",req.body)
    const details = new VideosDetails(req.body);
    await details.save();

    res.status(201).json();
  } catch (err) {
    next(err);
  }
}


export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('VideoDetailsController retrieve>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const details: IVideoDetails = await VideosDetails.findById(id);

    if (!details) {
      throw new InvalidRequestError('Billing Details does not exist.');
    }

    res.json(details);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {

        console.log('VideoDetailsController update>>>>>>>>>>>>')

    const VideosDetails = []
    // const {id}: { id: string } = req.params as any;

    // const VideosDetails: IVideoDetails = await VideosDetails.findById(id);

    // if (!VideosDetails) {
    //   throw new InvalidRequestError('Billing Details does not exist.');
    // }

    // VideosDetails.set(req.body);

    // await VideosDetails.save();

    res.json(VideosDetails);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('VideoDetailsController remove>>>>>>>>>>>>')
    
    const {id}: { id: string } = req.params as any;

    await VideosDetails.deleteOne({_id: id});

    res.json({deleted: true});
  } catch (err) {
    next(err);
  }
}