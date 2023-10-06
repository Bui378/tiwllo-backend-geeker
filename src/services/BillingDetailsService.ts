import BillingDetails from '../models/BillingDetails';
let logger = require('../../winston_logger');
logger = logger("JobService.ts");


export const createBillingDetails = async (data) => {
	try {
		// await BillingDetails.create(data);
		console.log("data to save is ::",data)
		const details = new BillingDetails(data);
		await details.save();
		logger.info("createBillingDetails :: ",{'data':data})
	} catch (err) {
		logger.error("createBillingDetails :: catch error",{'err':err, 'data':data})
	}
};

export const findDetailsByJobId = async (jobId) => {
	try {
		const job = await BillingDetails.find({job_id:jobId})
			.populate('job_id')
			.populate('customer_user_id')
			.populate('technician_user_id');
		return job;
	} catch (err) {
		logger.error("BillingDetails findDetailsByJobId :: catch error",{'err':err, 'jobId':jobId})
	}
};


export const updateBillingDetails = async (job, data) => {
	try {
		await BillingDetails.updateOne({ job_id: job.id, customer_user_id: job.customer_user_id,technician_user_id:job.technician_user_id }, data);
		logger.info("update billing details ::",{'job':job, 'data':data})
		let earningDetails =  await findDetailsByJobId(job.id);
		return earningDetails;
	} catch (err) {
    	logger.error("update billing details :: catch error",{'err':err, 'job':job, 'data':data})
	}
};