
import EmailFormat from '../models/EmailFormat';
import {user_keys} from '../constant';
let logger = require('../../winston_logger');
logger = logger("DynamicEmailService.ts");
export const filteredTags = async(type)=>{
	try{
		let emailFormatObj = await EmailFormat.findOne({"type":type})
		let contentValue = emailFormatObj['email']['html'].replace(/(\r\n|\n|\r)/gm, "")
		let subjectValue = emailFormatObj['email']['subject']
		let {tags,subTags} = fetchContentValue(user_keys,contentValue,subjectValue)
		console.log("subTags :::::::::",subTags)
		return {tags,subTags,contentValue,subjectValue}
	}
	catch(err){
		console.log("error::::",err)
		logger.error("Error in filteredTags",{
            'err':err,
          })
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
		if(email_keys[k] == 'user_name'){
					while (mainContent.includes(filteredTags[email_keys[k]])){
						mainContent = mainContent.replace(filteredTags[email_keys[k]],data['name'])
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
				if(email_keys[k] == 'jobDescription'){
					while (mainContent.includes(filteredTags[email_keys[k]])){
						mainContent = mainContent.replace(filteredTags[email_keys[k]],data['issue-description'])
					}
				}
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
				if(email_keys[k] == 'programeName'){
					mainContent = mainContent.replace(filteredTags[email_keys[k]],data['programName'])
				}
				if(email_keys[k] == 'caseNumber'){
					mainContent = mainContent.replace(filteredTags[email_keys[k]],data['caseNumber'])
				}
		return mainContent
		}
		

	catch(err){
		console.log("it is error :::",err)
		return mainContent
	}
}