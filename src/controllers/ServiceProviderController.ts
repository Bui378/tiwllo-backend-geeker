import { Request, Response, NextFunction } from 'express';
import ServiceProvider, { IServiceProvider } from '../models/ServiceProvider';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('ServiceProviderController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = ServiceProvider.find();

    const totalCount = await ServiceProvider.countDocuments(query);
    const serviceProviders: IServiceProvider[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

    return res.json({
      data: serviceProviders,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('ServiceProviderController create>>>>>>>>>>>>')
    
    const serviceProvider = new ServiceProvider(req.body);

    await serviceProvider.save();

    res.status(201).json(serviceProvider);
  } catch (err) {
    next(err);
  }
}


