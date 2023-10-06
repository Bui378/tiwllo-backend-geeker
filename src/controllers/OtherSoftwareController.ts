import { Request, Response, NextFunction } from 'express';
import OtherSoftware, { IOtherSoftware } from '../models/OtherSoftware';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('OtherSoftwareController list>>>>>>>>>>>>')
    
    const query = OtherSoftware.find({})


    const softwareList: IOtherSoftware[] = await query.exec();

    return res.json({
      data: softwareList,
    });
  } catch (err) {
    next(err);
  }
}