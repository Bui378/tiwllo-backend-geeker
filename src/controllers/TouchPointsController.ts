import { Request, Response, NextFunction } from 'express';
import TouchPoints, { ITouchPoint } from '../models/TouchPoint';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('TouchPointController list>>>>>>>>>>>>')
    
    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = TouchPoints.find().sort({createdAt:1});

    const totalCount = await TouchPoints.countDocuments(query);
    const touchPointsData: ITouchPoint[] = await query.exec();
    // console.log("query touch points ::",touchPointsData)

    return res.json({
      data: touchPointsData,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

