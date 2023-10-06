import { Request, Response, NextFunction } from 'express';
import BusinessDetails,{IBusinessDetails} from '../models/BusinessDetails';
let logger = require('../../winston_logger');
logger = logger("BusinessDetailsController.ts");

export const upDateBusinessDetilsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id }: { id: string } = req.params as any;
        const dataToUpdate = req.body;
        // This is temporary fix but later we have to change the flow 
        const businessName = req.body.businessName
        const updatedResponse = await BusinessDetails.findOneAndUpdate({ _id: id }, { $set: dataToUpdate }, { new: true });
        if (updatedResponse) {
            return res.status(201).send({ success: true, message: 'Successfully Updated' });
        }

    } catch (error) {
        logger.error("Error While Updating Business Details by Id", { error: error, data: req.body, id: req.params.id });
        return res.send({ success: false, message: 'Something Went Wrong', reason: error })
    }
}