import { Request, Response, NextFunction } from 'express';
import Software, { ISoftware } from '../models/Software';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('SoftwareController list>>>>>>>>>>>>')

    const query = Software.find({status:'active'}).sort({display_priority:1});

    const totalCount = await Software.countDocuments(query);

    const softwareList: ISoftware[] = await query
      .populate('subSoftware').exec();

    return res.json({
      data: softwareList,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('SoftwareController create>>>>>>>>>>>>')

    const software = new Software(req.body);

    await software.save();

    res.status(201).json(software);
  } catch (err) {
    next(err);
  }
}

export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('SoftwareController retrieve>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const software: ISoftware = await Software.findById(id);

    if (!software) {
      throw new InvalidRequestError('Software does not exist.');
    }

    res.json(software);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('SoftwareController update>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const software: ISoftware = await Software.findById(id);

    if (!software) {
      throw new InvalidRequestError('Software does not exist.');
    }

    software.set(req.body);

    await software.save();

    res.json(software);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('SoftwareController remove>>>>>>>>>>>>')
    
    const {id}: { id: string } = req.params as any;

    await Software.deleteOne({_id: id});

    res.json({deleted: true});
  } catch (err) {
    next(err);
  }
}


export async function serverApi(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({message: "SERVER 1"});
  } catch (err) {
    next(err);
  }
}