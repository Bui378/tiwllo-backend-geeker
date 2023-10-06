import { Request, Response, NextFunction } from 'express';
import Offers, { IOffers } from '../models/Offers';
import moment from 'moment';

export async function list(req: Request, res: Response, next: NextFunction) {
   try {
        console.log('OffersController list>>>>>>>>>>>>')
    
    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = Offers.find();

    const totalCount = await Offers.countDocuments(query);
    const offers: IOffers[] = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('software')
      .populate({
       path : 'subSoftware',
       populate:'software'
      })
      .exec();
      
    return res.json({
      data: offers,
      totalCount
    });
  } catch (err) {
    next(err);
  }

}

