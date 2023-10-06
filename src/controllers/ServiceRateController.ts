import { Request, Response, NextFunction } from 'express';
import ServiceRate, { IServiceRate } from '../models/ServiceRate';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('ServiceRateController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = ServiceRate.find();

    const totalCount = await ServiceRate.countDocuments(query);
    const serviceRates: IServiceRate[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

    return res.json({
      data: serviceRates,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('ServiceRateController create>>>>>>>>>>>>')
    
    const serviceRate = new ServiceRate(req.body);

    serviceRate.user = (req as any).user._id;

    await serviceRate.save();

    res.status(201).json(serviceRate);
  } catch (err) {
    next(err);
  }
}
