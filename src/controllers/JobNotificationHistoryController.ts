import { Request, Response, NextFunction } from 'express';
import JobNotificationHistory from '../models/JobNotificationHistory';

export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('JobNotificationHistoryController retrieve>>>>>>>>>>>>', req.params.id)

    const query = JobNotificationHistory.find({job:req.params.id});
    // const query = JobNotificationHistory.findById(_id:);

    const totalCount = await JobNotificationHistory.countDocuments(query);
    const jobNotificationHistory = await query.exec();

    return res.json({
      data: jobNotificationHistory,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}