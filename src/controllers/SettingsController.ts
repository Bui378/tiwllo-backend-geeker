import { Request, Response, NextFunction } from 'express';
import Settings, { ISettings } from '../models/Settings';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req:Request,res:Response,next:NextFunction){
    try{

        console.log('SettingsController list>>>>>>>>>>>>')

        let { page, pageSize } = req.params;
        let condition = req.body
        console.log("this is the condition",condition)
    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = Settings.find(condition);

    const totalCount = await Settings.countDocuments(query);
    const settings: ISettings[] = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
      
    return res.json({
      data: settings,
      totalCount
    });

    }
    catch(err){
        console.log(err)
    }
}



export async function create(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('SettingsController create>>>>>>>>>>>>')
        
      const settings = new Settings(req.body);
      await settings.save();
  
      res.status(201).json();
    } catch (err) {
      next(err);
    }
  }