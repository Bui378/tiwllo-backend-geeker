import JobCycle  from '../models/JobCycle';
let logger = require('../../winston_logger');
logger = logger("DynamicEmailService.ts");
export const createJobTags = async (data) => {
	try {
        const jobtag = new JobCycle(data);
        await jobtag.save(); 
	} catch (err) {
                logger.error("error while saving Jobtag in table",{
                        'err':err,
                })
	}
};
