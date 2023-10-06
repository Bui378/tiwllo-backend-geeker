import { Request, Response, NextFunction } from 'express';
import SoftwareExperiences, { ISoftwareExperience } from '../models/SoftwareExperience';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        // console.log('SoftwareExperienceController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = SoftwareExperiences.find();

    const totalCount = await SoftwareExperiences.countDocuments(query);
    const softwareExperiencesData: ISoftwareExperience[] = await query.skip((page - 1) * pageSize).limit(pageSize).exec();
    // console.log("query software experiences ::",softwareExperiencesData)

    return res.json({
      data: softwareExperiencesData,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

