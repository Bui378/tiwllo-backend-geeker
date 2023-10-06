import EmailFormat from '../models/EmailFormat';
import {user_keys} from '../constant';
let logger = require('../../winston_logger');
logger = logger("DynamicEmailService.ts");
export const filteredTags = async(type)=>{
	try{
		logger.info(" filteredTags :: ",{'type':type })
		let emailFormatObj = await EmailFormat.findOne({"type":type})
		// console.log("eeeeeeeeeeeeeeeeeeeee",emailFormatObj)
		let contentValue = emailFormatObj['email']['html'].replace(/(\r\n|\n|\r)/gm, "")
		let subjectValue = emailFormatObj['email']['subject']
		let {tags,subTags} = fetchContentValue(user_keys,contentValue,subjectValue)
		logger.info(" filteredTags :: ",{'tags':tags })
		return {tags,subTags,contentValue,subjectValue}
	}
	catch(err){
		console.log("Error in filteredTags",err)
		logger.error("Error in filteredTags",{'err':err})
	}

	
}

export const changeSubjectValue = async (email_keys,data,filteredTags,subject)=>{
	try{
		let mainContent = subject
		for (var k in email_keys){
			if (Object.keys(filteredTags).includes(email_keys[k])){
				mainContent = updateMainContentWithConditions(email_keys,k,mainContent,filteredTags,data)
			}
		}
		return mainContent
	}
	catch(err){
		logger.error("Error in Change subject",{
            'err':err,
          })
		return subject
	}
}

let fetchContentValue = (email_keys,contentValue,subjectValue)=>{
	try{
		/**
	 	* This function is returs a object which consist of email_keys as key of object content tags as value
	 	* for eg {"user_name":[[user_name]]}
	 **/

		let mainValueArr = contentValue.split(" ")
		let words_arr_demo = []
		let prettify_arr_demo = new Set()
		let tagValue = {}
		let subjectValueArr = subjectValue.split(" ")
		let subject_value_demo = []
		let subject_prettify_arr_demo = new Set()
		let subTagValue = {}

		/** 
		 * Fetching subjects issues
		 * */ 
		for (var k in subjectValueArr){
			let str = subjectValueArr[k]
			var mySubString = str.substring(
			    str.indexOf("[[") + 1, 
			    str.lastIndexOf("]]")
			);
			if (mySubString != ''){
				subject_value_demo.push(mySubString)
			}
		}

		for (var k in subject_value_demo){
			subject_prettify_arr_demo.add(subject_value_demo[k].replace("[",""))
			let tag = "[["+subject_value_demo[k].replace("[","").trim()+"]]"
			for (var j in email_keys){
					subTagValue[subject_value_demo[k].replace("[","").trim()] = tag
			}
		}



		/** 
		 * for Loop which is spilliting the tags 
		 * */
		for (var k in mainValueArr){
			let str = mainValueArr[k]
			var mySubString = str.substring(
			    str.indexOf("[[") + 1, 
			    str.lastIndexOf("]]")
			);
			if (mySubString != ''){
				words_arr_demo.push(mySubString)
			}
		}


		/** 
		 * for Loop which is removing extra tags and creating the object 
		 * */
		for (var k in words_arr_demo){
			// console.log("words_arr_demo ::::::::::",words_arr_demo[k])
			prettify_arr_demo.add(words_arr_demo[k].replace("[",""))
			// console.log("error no 2:::::::::::::::")
			let tag = "[["+words_arr_demo[k].replace("[","")+"]]"
			// console.log("error no 3:::::::::::::::")
			for (var j in email_keys){
					tagValue[words_arr_demo[k].replace("[","").trim()] = tag
			}
		}
		return {tags:tagValue,subTags:subTagValue}
	}
	catch(err){
		console.log("error 1:::::::::",err)
		logger.error("Error in fetch Content Value",{
            'err':err,
          })
	}
}

export const filteredContent = async(email_keys,data,filteredTags,content)=>{
	/**
	 * This function is replcaing the dynamic tags to the real value
	 **/
	try{
		let mainContent = content
		for (var k in email_keys){
			if (Object.keys(filteredTags).includes(email_keys[k])){
				mainContent = updateMainContentWithConditions(email_keys,k,mainContent,filteredTags,data)
			}
		}
		return mainContent
	}
	catch(e){
		console.log("error in filtering Content",e)
		logger.error("error in filtering Content",{
            'err':e,
          })
		return content
	}
}

function updateMainContentWithConditions(email_keys,k,mainContent,filteredTags,data){
	try{
		console.log("email_keys[k]  :::::::",email_keys[k] )
		if(email_keys[k] == 'customerEmail'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['customerEmail'])
			}
		}
		if(email_keys[k] == 'businessName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['businessName'])
			}
		}
		if(email_keys[k] == 'businessWebsite'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['businessWebsite'])
			}
		}
		if(email_keys[k] == 'industry'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['industry'])
			}
		}
		if(email_keys[k] == 'teamSize'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['teamSize'])
			}
		}
		if(email_keys[k] == 'recipientName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['recipientName'])
			}
		}
		if(email_keys[k] == 'jobDescription'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['jobDescription'])
			}
		}
		if(email_keys[k] == 'software'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['software'])
			}
		}
		if(email_keys[k] == 'totalCost'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['totalCost'])
			}
		}
		if(email_keys[k] == 'totalTime'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['totalTime'])
			}
		}
		if(email_keys[k] == 'customerName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['customerName'])
			}
		}
		if(email_keys[k] == 'event'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['event'])
			}
		}
		if(email_keys[k] == 'user_name'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['name'])
			}
		}
		if(email_keys[k] =='reason'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['reason'])
			}
		}
		if(email_keys[k] =='techName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['techName'])
			}
		}
		if(email_keys[k] =='jobLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['jobLink'])
			}
		}
		if(email_keys[k] =='dontChargeReason'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['dontChargeReason'])
			}
		}
		if(email_keys[k] =='customerComment'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['customerComment'])
			}
		}
		if(email_keys[k] =='jobLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['jobLink'])
			}
		}
		if(email_keys[k] =='adminJobDetailLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['adminJobDetailLink'])
			}
		}	
		if(email_keys[k] == 'verify'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['verification_link'])
			}
		}
		if(email_keys[k] == 'resetPassword'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['reset-link'])
			}
		}
		if(email_keys[k] == 'acceptJob'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['accept-job'])
			}
		}
		// if(email_keys[k] == 'jobDescription'){
		// 	while (mainContent.includes(filteredTags[email_keys[k]])){
		// 		mainContent = mainContent.replace(filteredTags[email_keys[k]],data['jobDescription'])
		// 	}
		// }

		if(email_keys[k] == 'Name'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['Name'])
			}
		}
		if(email_keys[k] == 'transferDate'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['transferDate'])
			}
		}
		if(email_keys[k] == 'transactionNumber'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['transactionNumber'])
			}
		}

		if(email_keys[k] == 'fromto'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['fromto'])
			}
		}
		if(email_keys[k] == 'issue-description'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['issue-description'])
			}
		}
		// if(email_keys[k] == 'jobDescription'){
		// 	while (mainContent.includes(filteredTags[email_keys[k]])){
		// 		mainContent = mainContent.replace(filteredTags[email_keys[k]],data['issue-description'])
		// 	}
		// }
		if(email_keys[k] == 'firstName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['firstName'])
			}
		}
		if(email_keys[k] == 'scheduledTime'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['timer'])
			}
		}
		if(email_keys[k] == 'addToCalendar'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['calendar-link'])
			}
		}
		if(email_keys[k] == 'programName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['programName'])
			}
		}
		if(email_keys[k] == 'programeName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['programeName'])
			}
		}
		if(email_keys[k] == 'caseNumber'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['caseNumber'])
			}
		}
		if(email_keys[k] == 'referrLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['referrLink'])
			}
		}
		if(email_keys[k] == 'invitLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['invitLink'])
			}
		}
		if(email_keys[k] == 'lastName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['lastName'])
			}
		}
		if(email_keys[k] == 'mailEndpoint'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['mailEndpoint'])
			}
		}
		if(email_keys[k] == 'createdAt'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['createdAt'])
			}
		}
		if(email_keys[k] == 'primaryTime'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['primaryTime'])
			}
		}
		if(email_keys[k] == 'dashboardLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['dashboardLink'])
		}}
		if(email_keys[k] == 'stripeError'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['stripeError'])
		}}
		if(email_keys[k] == 'jobTotalCost'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['jobTotalCost'])
		}}
		if(email_keys[k] == 'amountToPaid'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['amountToPaid'])
		}}
		if(email_keys[k] == 'jobStatus'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['jobStatus'])
		}}
		if(email_keys[k] == 'JobId'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['JobId'])
		}}
		// 'totalCharge','meetingTime','paymentStatus','technicianCharges'
		if(email_keys[k] == 'totalCharge'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['totalCharge'])
		}}
		if(email_keys[k] == 'discountedCharge'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['discountedCharge'])
		}}
		if(email_keys[k] == 'meetingTime'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['meetingTime'])
		}}
		if(email_keys[k] == 'paymentStatus'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['paymentStatus'])
		}}
		if(email_keys[k] == 'technicianCharges'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['technicianCharges'])
		}}
		if(email_keys[k] == 'comment'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['comment'])
		}}
		if(email_keys[k] == 'issueText'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['issueText'])
		}}
		if(email_keys[k] == 'messageCount'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['messageCount'])
		}}
		if(email_keys[k] == 'senderName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['senderName'])
		}}
		if(email_keys[k] == 'login'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['login'])
		}}
    if(email_keys[k] == 'purchased_label'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['purchased_label'])
		}}
		if(email_keys[k] == 'renewalDate'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['renewalDate'])
		}}
		if(email_keys[k] == 'product_info_name'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['product_info_name'])
		}}
		if(email_keys[k] == 'plan_price'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['plan_price'])
		}}
		if(email_keys[k] == 'purchasedAt'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['purchasedAt'])
		}}
		if(email_keys[k] == 'cust_name'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['cust_name'])
		}}		
		if(email_keys[k] == 'plan_name'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['plan_name'])
		}}
		if(email_keys[k] == 'benefits'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['benefits'])
		}}	

		if(email_keys[k] == 'sharingLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['sharingLink'])
		}}
		if(email_keys[k] == 'testLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['testLink'])
		}}
		if(email_keys[k] == 'userName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['userName'])
		}}
		if(email_keys[k] == 'accountLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['accountLink'])
		}}
		if(email_keys[k] == 'userPhoneNumber'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['userPhoneNumber'])
		}}

		if(email_keys[k] == 'secondryTime'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['secondryTime'])
		}}
		if(email_keys[k] == 'acceptLink'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['acceptLink'])
		}}

		if(email_keys[k] == 'primaryTime'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['primaryTime'])
		}}
		if(email_keys[k] == 'secondaryTime'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['secondaryTime'])
		}}

		if(email_keys[k] == 'issueDesc'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['issueDesc'])
		}}
		if(email_keys[k] == 'programName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['programName'])
		}}
		if(email_keys[k] == 'planName'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['planName'])
		}}
		if(email_keys[k] == 'convertedTotal'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['convertedTotal'])
		}}
		if(email_keys[k] == 'convertedRemaining'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['convertedRemaining'])
		}}
		if(email_keys[k] == 'usedFromSubscription'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['usedFromSubscription'])
		}}
		if(email_keys[k] == 'amountPaid'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['amountPaid'])
		}}
		if(email_keys[k] == 'totalEarnings'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['totalEarnings'])
		}}
		if(email_keys[k] == 'lastAmountPaid'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['lastAmountPaid'])
		}}
		if(email_keys[k] == 'transferRecordTable'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['transferRecordTable'])
		}}
		if(email_keys[k] =='date'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
				mainContent = mainContent.replace(filteredTags[email_keys[k]],data['date'])
			}
		}
		if(email_keys[k] == 'stripe_id'){
			while (mainContent.includes(filteredTags[email_keys[k]])){
			mainContent = mainContent.replace(filteredTags[email_keys[k]],data['stripe_id'])
		}}
		if (email_keys[k] == 'status') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['status'])
			}
		}

		if (email_keys[k] == 'customerName') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['customerName'])
			}
		}
		if (email_keys[k] == 'invitLink') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['invitLink'])
			}
		}
		if (email_keys[k] == 'email') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['email'])
			}
		}
		if (email_keys[k] == 'userType') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['userType'])
			}
		}
		if (email_keys[k] == 'message') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['message'])
			}
		}
		if (email_keys[k] == 'custName') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['custName'])
			}
		}
		if (email_keys[k] == 'customer_user_id') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['customer_user_id'])
			}
		}
		if (email_keys[k] == 'customerEmail') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['customerEmail'])
			}
		}
		if (email_keys[k] == 'totalJobs') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['totalJobs'])
			}
		}
		if (email_keys[k] == 'totalCompletedJobs') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['totalCompletedJobs'])
			}
		}
		if (email_keys[k] == 'failedReason') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['failedReason'])
			}
		}
		if (email_keys[k] == 'businessName') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['businessName'])
			}
		}
		
		if (email_keys[k] == 'transferReason') {
			while (mainContent.includes(filteredTags[email_keys[k]])) {
				mainContent = mainContent.replace(filteredTags[email_keys[k]], data['transferReason'])
			}
		}
		return mainContent
	}catch(err){
		logger.error("error in updateMainContentWithConditions ",{'err':err})
		return mainContent
	}
}