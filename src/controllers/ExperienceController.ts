import { Request, Response, NextFunction } from 'express';
import Experience, { IExperience } from '../models/Experience';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExperienceController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = Experience.find();

    const totalCount = await Experience.countDocuments(query);
    const experiences: IExperience[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();

    return res.json({
      data: experiences,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExperienceController create>>>>>>>>>>>>')

    const experience = new Experience(req.body);

    await experience.save();

    res.status(201).json(experience);
  } catch (err) {
    next(err);
  }
}

export async function retrieve(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExperienceController retrieve>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const experience: IExperience = await Experience.findById(id);

    if (!experience) {
      throw new InvalidRequestError('Experience does not exist.');
    }

    res.json(experience);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExperienceController update>>>>>>>>>>>>')

    const {id}: { id: string } = req.params as any;

    const experience: IExperience = await Experience.findById(id);

    if (!experience) {
      throw new InvalidRequestError('Experience does not exist.');
    }

    experience.set(req.body);

    await experience.save();

    res.json(experience);
  } catch (err) {
    next(err);
  }
}

export async function editSoftware(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExperienceController editSoftware>>>>>>>>>>>>')

    // const {id}: { id: string } = req.params as any;

    // const experience: IExperience = await Experience.findById(id);

    // if (!experience) {
    //   throw new InvalidRequestError('Experience does not exist.');
    // }

    // experience.set(req.body);

    // await experience.save();

    // res.json(experience);
    console.log(req.body);
    
    const experience: IExperience = await Experience.findById(req.body[1].id);
    console.log(experience, 'software');
    
    if (!experience) {
      throw new InvalidRequestError('Experience does not exist.');
    }

    experience.set(req.body[1]);

    await experience.save();

    res.json(experience);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ExperienceController remove>>>>>>>>>>>>')
    
    const {id}: { id: string } = req.params as any;

    await Experience.deleteOne({_id: id});

    res.json({deleted: true});
  } catch (err) {
    next(err);
  }
}
