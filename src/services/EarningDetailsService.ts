import EarningDetails from '../models/EarningDetails';
let logger = require('../../winston_logger');
logger = logger("JobService.ts");


export const createEarningDetails = async (data) => {
	try {
		// await EarningDetails.create(data);
		logger.info("createEarningDetails ::",{'data':data})
		const details = new EarningDetails(data);
		await details.save();
	} catch (err) {
		logger.error("createEarningDetails :: catch error",{'err':err, 'data':data})
	}
};

export const findDetailsByJobId = async (jobId) => {
	try {
		const job = await EarningDetails.find({job_id:jobId})
			.populate('job_id')
			.populate('customer_user_id')
			.populate('technician_user_id');
		return job;
	} catch (err) {
		logger.error("Earning findDetailsByJobId :: catch error",{'err':err, 'jobId':jobId})
	}
};

export const updateEarningDetails = async (job, data) => {
	try {
		await EarningDetails.updateOne({ job_id: job.id, customer_user_id: job.customer_user_id,technician_user_id:job.technician_user_id }, data);
		logger.info("update earning details ::",{'job':job, 'data':data})
		let earningDetails =  await findDetailsByJobId(job.id);
		return earningDetails;
	} catch (err) {
		logger.error("update earning details :: catch error",{'err':err, 'job':job, 'data':data})
	}
};