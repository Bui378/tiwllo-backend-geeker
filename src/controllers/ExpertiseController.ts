import { Request, Response, NextFunction } from 'express';
import Expertise, { IExpertise } from '../models/Expertise';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExpertiseController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = Expertise.find();

    const totalCount = await Expertise.countDocuments(query);
    const expertises: IExpertise[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

    return res.json({
      data: expertises,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExpertiseController create>>>>>>>>>>>>')

    const expertise = new Expertise(req.body);

    await expertise.save();

    res.status(201).json(expertise);
  } catch (err) {
    next(err);
  }
}

export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExpertiseController retrieve>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const expertise: IExpertise = await Expertise.findById(id);

    if (!expertise) {
      throw new InvalidRequestError('Expertise does not exist.');
    }

    res.json(expertise);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExpertiseController update>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const expertise: IExpertise = await Expertise.findById(id);

    if (!expertise) {
      throw new InvalidRequestError('Expertise does not exist.');
    }

    expertise.set(req.body);

    await expertise.save();

    res.json(expertise);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExpertiseController remove>>>>>>>>>>>>')
    
    const {id}: { id: string } = req.params as any;

    await Expertise.deleteOne({_id: id});

    res.json({deleted: true});
  } catch (err) {
    next(err);
  }
}
