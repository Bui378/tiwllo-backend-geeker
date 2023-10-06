import { Request, Response, NextFunction } from 'express';
import DescriptionProblem, { IDescriptionProblem } from '../models/DescriptionProblem';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('DescriptionProblemController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = DescriptionProblem.find();

    const totalCount = await DescriptionProblem.countDocuments(query);
    const descriptionProblems: IDescriptionProblem[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

    return res.json({
      data: descriptionProblems,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('DescriptionProblemController create>>>>>>>>>>>>')
    
    const descriptionProblem = new DescriptionProblem(req.body);

    await descriptionProblem.save();

    res.status(201).json(descriptionProblem);
  } catch (err) {
    next(err);
  }
}
