import moment from 'moment';
import Invite from './models/invite';
import User from './models/User'
import Customer from './models/Customer';
import Job, { IJob } from './models/Job';
import Log from './models/Log';
import Stakeholder, { IStakeholder } from './models/Stakeholders';
import { sendStripInfoEmailsToStakeholders } from './services/MailService'
import axios from 'axios'
let logger = require('../winston_logger');
logger = logger("utils.ts");

export function pick(obj: any, array: string[]) {
  // return obj;

  return Object.entries(obj)
    .filter(([key]) => array.includes(key))
    .reduce((obj, [key, val]) => Object.assign(obj, {[key]: val}), {});
}

export function concat(...args: string[]) {
  return args.join(' ').trim();
}

export function formatDateTime(date) {
  return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '';
}

export async function  generateReferralCode() {
  const inviteCode = await Math.random().toString(36).substring(2, 10);
  const user = await User.findOne({ referralCode: inviteCode });
  if (user) {
    this.generateReferralCode();
  } else {
    return inviteCode;
  }
}
export async function  generateinviteCode() {
  const code = await Math.random().toString(36).substring(2, 10);
  const user = await Invite.findOne({ inviteCode: code });
  if (user) {
    this.generateinviteCode();
  } else {
    return code;
  }
}

export const userTypeStatus ={
  CUSTOMER: "customer",
  TECHNICIAN: "technician"
}

export const roleStatus ={
  OWNER:"owner",
  USER:"user",
  ADMIN:"admin",

}


export const InvitStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  DECLINED:"declined"

}

  const getMeasurementId = process.env.REACT_APP_GA_MEASUREMENT_ID
	const getApiSecret = process.env.REACT_APP_GA_API_SECRET
  const headers = {
   'X-Gtm-Server-Preview': 'ZW52LTN8RTREMG9ncTdXeThobzFGY3ctWEZrQXwxODdlMDM5Y2I3OTQ3ZDhiYTI2ZWM=',
   }

/**
 * Function will post the given GTM tag
 * @params = job: object, tagName: String
 * @response : None
 * @author : Vinit
 */

 export const postGTMTag = async (job, tagName) => {
  try {
    job = JSON.parse(JSON.stringify(job))
    // console.log("job object from postGTMTag :: ", job.id)
  
    axios.post(`https://tag.geeker.co/mp?measurement_id=${getMeasurementId}&api_secret=${getApiSecret}`, 
    {
      client_id: job.client_id,
      timestamp_micros: new Date().getTime() * 1000, // Unix time in microseconds
      events: [
        {
          name: tagName,
          params: {
            jobObject: job,
            facebook_fbp: job.facebook_fbp,
            facebook_fbc: job.facebook_fbc,
            environment: process.env.appBaseUrl, 
            customer_id: job.customer.id,
            job_id: job.id,
            session_id: job.session_id,
          },
        },
      ],
    },
    // {
    //   headers: headers
    // }
    )
    
  } catch(err) {
    logger.error('postGTMTag: Catch error in GTM: ', {
      body: job,
      userId: '',
      jobId: job.id,
      err: err,
    })
  }
}


/**
 * Function will post the given GTM tag for a given event
 * @params = data: object, tagName: String
 * @response : None
 * @author : Vinit
 */

 export const postGTMTagForAnEvent = async (data) => {
  try {
    
    logger.info("Going to send data to GTM manager for event "+ data.tagName, {data:data} )

    axios.post(`https://tag.geeker.co/mp?measurement_id=${getMeasurementId}&api_secret=${getApiSecret}`, 
    {
      client_id: data.client_id,
      timestamp_micros: new Date().getTime() * 1000, // Unix time in microseconds
      events: [
        {
          name: data.tagName,
          params: {
            eventObject: data.eventObject,
            facebook_fbp: data.facebook_fbp,
            facebook_fbc: data.facebook_fbc,
            environment: process.env.appBaseUrl, 
            customer_id: data.customer_id,
            session_id: data.session_id,
            customer_ip: data.customer_ip,
            user_agent: data.user_agent,
            value:data.value,
            customerInfo:data.customerInfo,
            customerUserInfo: data.customerUserInfo
          },
        },
      ],
    },
    // {
    //   headers: headers
    // }
    )
    
  } catch(err) {
    console.log("My console to check data in catch", data)
    logger.error('postGTMTag: Catch error in GTM: ', {
      body: data.eventObject,
      customer_id: data.customer_id,
      err: err,
    })
  }
}


/**
 * This function is to post a GTM tag for technician
 * @params = data: object
 * @response : None
 * @author : Vinit
 */

 export const postGTMTagForTechOnboard = async (data) => {
  try {
    
    logger.info("Going to send data to GTM manager for event "+ data.tagName, {data:data} )

    axios.post(`https://tag.geeker.co/mp?measurement_id=${getMeasurementId}&api_secret=${getApiSecret}`, 
    {
      // client_id: data.client_id,
      timestamp_micros: new Date().getTime() * 1000, // Unix time in microseconds
      events: [
        {
          name: data.tagName,
          params: {
            technicianObj:data.technicianObject
          },
        },
      ],
    },
    // {
    //   headers: headers
    // }
    )
    
  } catch(err) {
    console.log("My console to check data in catch", data)
    logger.error('postGTMTag: Catch error in GTM: ', {
      body: data.eventObject,
      customer_id: data.customer_id,
      err: err,
    })
  }
}



/**
 * @returns stripe object
 * @description :Following function is responsible for collect stripe information that payment has failed. 
 * @author : Mritunjay 
 */
export const sendStripInfoToStakeholders = async({status,reason,stripe_id,jobId}) => {
	let JobId;
  let customer_details = await Customer.findOne({stripe_id: stripe_id })
  let customer_id = customer_details.user;
  let user_details = await User.findOne({ '_id': customer_id })
  let customerType = customer_details['customerType']
	if (jobId && jobId !== 'NA') {
		logger.info("stripeInfoToStakholder function is working:>>>", { status: status, reason: reason, stripe_id: stripe_id, jobId: jobId })
		let job: IJob = await Job.findById(jobId)
		 JobId = job.JobId;
	};
	
	Stakeholder.find({ stripe_errors: "active" }, 'email')
		.then(async (results) => {
			const emails = results.map((result) => result.email);
			logger.info("find all stripeholders emails that stripe_errors are in active mode", { emails: emails })
			if(customerType === 'live'){
				await sendStripInfoEmailsToStakeholders({
					 email: emails,
					 JobId:jobId !== 'NA' ? JobId : 'NA',
					 customerName:user_details.firstName,
					 stripe_id:stripe_id,
					 status:status,
					 reason:reason,
					 jobId:jobId
					})
			};
		})
		.catch((error) => {
			logger.info("errors occurs when finding stripeholders emails that stripe_errors are in active mode", { "Error": error })
		});
  };

/**
 * this function will move a particular element of an arr to a desired index.
 * @params : An Arr to work on, index of arr element which is to be moved, index where to move the arr element.
 * @response : Rearranged arr.
 * @author : Vinit
 **/	
export const moveArrElementWitinArr = (arr, fromIndex, toIndex, jobId) => {
  try {
    logger.info("Moving " + arr[fromIndex].id + " at the top of array", {jobId:jobId})
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    return arr
  } catch (error) {
    logger.error("moveArrElementWitinArr : err", {error:error, jobId:jobId})
  }
}
