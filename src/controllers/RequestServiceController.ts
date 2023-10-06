import { Request, Response, NextFunction } from 'express';
import RequestService, { IRequestService } from '../models/RequestService';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('RequestServiceController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = RequestService.find();

    const totalCount = await RequestService.countDocuments(query);
    const requestServices: IRequestService[] = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('user')
      .populate('typeService')
      .populate('descriptionProblem')
      .exec();

    return res.json({
      data: requestServices,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('RequestServiceController create>>>>>>>>>>>>')

    const requestService = new RequestService(req.body);

    requestService.user = (req as any).user._id;

    await requestService.save();

    res.status(201).json(requestService);
  } catch (err) {
    next(err);
  }
}

export async function assignUser(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('RequestServiceController assignUser>>>>>>>>>>>>')
    
    const { id: serviceId } = req.params;
    const { timeComplete } = req.body;

    const requestService = await RequestService.findById(serviceId);

    if (!requestService) {
      throw new InvalidRequestError('Request Service does not exist.');
    }

    requestService.assign = [...requestService.assign, {
      user: (req as any).user._id,
      timeComplete,
    }];

    await requestService.save();

    res.json(requestService);
  } catch (err) {
    next(err);
  }
}
