import { getMaxListeners } from "process";
import {filteredTags,filteredContent,changeSubjectValue} from './DynamicEmailService';
import {user_keys,dataBase_emailKeys} from '../constant';
import { Console } from "console";
let logger = require('../../winston_logger');
logger = logger("DynamicEmailService.ts");
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const fs = require('fs');
const moment = require('moment');
export const sendResetPasswordEmail = async ({email, redirectURL, token}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.RESET_PASSWORD)
		console.log("reset pass tags ::::::",tags)
		let content = await filteredContent(user_keys,{"email":email,"reset-link":`<a href=${process.env.mailEndpoint}reset-password?t=${token}>Reset Password</a>`},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{"email":email,"reset-link":`<a href=${process.env.mailEndpoint}reset-password?t=${token}>Reset Password</a>`},subTags,subjectValue)
		const msg = {
		 	from: 'Geeker Support Team <notifications@geeker.co>',
			to: email,
			text: subjectContent,
			subject: subjectContent,
			html: content,
		}
		
		sendMailThroughSendgrid(msg,'sendResetPasswordEmail')
	} catch (error) {
		console.log(">>>error in sending email",error)
		
	}
};

export const sendVerificationEmail = async ({user,email,token,expire1}) =>{

	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.VERIFICATION_EMAIL_TECHNICIAN)
		let content = await filteredContent(user_keys,{"email":email,"firstName":user.firstName,"lastName":user.lastName,"verification_link":`<a style="color:white;" href=${process.env.mailEndpoint}verify-email?t=${token}>Verify Email</a>`},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{"email":email,"firstName":user.firstName,"lastName":user.lastName},subTags,subjectValue)
		 const msg = {
			from: 'Geeker Support Team <notifications@geeker.co>',
			to: email,
			text: 'Please verify your email',
			subject: subjectContent,
			html: content,
		}

		// console.log("email in sendVerificationEmail :::",email)
		// const msg = {
		// 	from: 'Geeker Support Team <notifications@geeker.co>',
		// 	to: email,
		// 	text: 'Please verify your email',
		// 	subject: 'You’re one click away from Geekdom',
		// 	html: ` <p style="font-size:26px;font-weight:bold;text-align:center">Welcome to the team, Geek!</p>
		// 			<p style="text-align:center;font-size:15px;">We’re thrilled to have you and your expertise on board.</p> 
		// 			<p style="text-align:center;font-size:15px;">Soon, you’ll be earning around your schedule.</p> 
		// 			<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
		// 				<p style="text-align:center;font-weight:bold;font-size:15px;">But first...please verify your email</p>
		// 				<p style="text-align:center;font-size:15px;"><a href=${process.env.mailEndpoint}verify-email?t=${token}>Verify Email</a> </p>
		// 			</div>
		// 			<p style="font-weight:bold;text-align:center;font-size:15px;">What’s next?</p>
		// 			<p style="text-align:center;font-size:15px;">As soon as a job request comes in matching your skill-set, we’ll send you a notification.</p>
		// 			<p style="text-align:center;font-size:15px;"> In the meantime, if you haven’t already, complete your account setup, and  watch our “Policies & Procedures” video to familiarize yourself with the process. </p>
		// 			<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
		// 				<p style="text-align:center;font-weight:bold;font-size:15px;">Complete your Account Setup</p>
		// 				<p style="text-align:center;font-size:15px;"><a href=${process.env.mailEndpoint}login>Login</a> </p>
		// 			</div>

		// 			<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
		// 				<p style="font-weight:bold;text-align:center;font-size:15px;">Questions? Contact us anytime</p>
		// 				<p style="text-align:center;font-size:15px;">geeksupport@geeker.co</p>
		// 			</div>
		// 			`
		// }

		sendMailThroughSendgrid(msg,'sendVerificationEmail')
	}
	catch (error) {
		console.log('error sendVerificationEmail :::',error)
		
	}
}

export const sendDetailedMail = async ({email,name,testLink}) =>{

	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.TECH_SIGN_UP)
		let content = await filteredContent(user_keys,{"email":email,"name":name,"testLink":testLink},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{"email":email,"name":name,"testLink":testLink},subTags,subjectValue)
		const msg = {
			from: 'Geeker Support Team <notifications@geeker.co>',
			to: email,
			text: subjectContent,
			subject: subjectContent,
			html: `<html>${content}</html>`
		}
		
		sendMailThroughSendgrid(msg,'sendVerificationEmail')
	}
	catch (error) {
		console.log('error sendVerificationEmail :::',error)
		
	}
}

export const sendVerificationEmailCustomer = async ({user,email,token,expire1}) =>{

	try {

		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.VERIFICATION_EMAIL_CUSTOMER)
		let content = await filteredContent(user_keys,{"email":email,"firstName":user.firstName,"lastName":user.lastName,"verification_link":`<a style="color:white;" href=${process.env.mailEndpoint}verify-email?t=${token}>Verify Email</a>`},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{"email":email,"firstName":user.firstName,"lastName":user.lastName},subTags,subjectValue)
		const msg = {
			from: 'Geeker Support Team <notifications@geeker.co>',
			to: email,
			text: 'Please verify your email',
			subject: subjectContent,
			html: content,
		}

		sendMailThroughSendgrid(msg,'sendVerificationEmailCustomer')
	}
	catch (error) {
		console.log('error sendVerificationEmail :::',error)
		logger.error("error in sendVerificationEmail",{
            'err':error,
          })
		
	}
}

export const sendJobAlertEmail = async ({ userData, jobData,redirectURL }) => {
	try {
	

		if( ! userData.blocked){
			let programName = jobData.subOption && jobData.subOption !== '' ? jobData.software.name+" " + "-" + jobData.subOption : jobData.software.name
			let acceptLink = `<a href="${process.env.mailEndpoint}login?email=${userData.email}&jobId=${jobData.id}&status=${'acceptjob'}" style="background-color: #4CAF50; 
								border: none;
								color: white;
								padding: 14px 49px;
								text-decoration: none;
								display: inline-block;
								font-size: 16px;
								margin: 4px 2px;
								cursor: hand;">Accept Job</a>`
			let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.NEW_JOB_ALERT)
			let content = await filteredContent(user_keys,{
				"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"jobDescription":jobData.issueDescription,
				"accept-job":acceptLink,
				"firstName":userData.firstName,
				
				
			},tags,contentValue)
			let subjectContent = await changeSubjectValue(user_keys,{
				"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"programName":programName,
				"caseNumber":jobData.JobId,
				

			},subTags,subjectValue)
			const msg = {
				from: 'Geeker Support Team <notifications@geeker.co>',
				to: userData.email,
				text: ' Are you available?',
				subject: subjectContent,
				html: content,
			}

			sendMailThroughSendgrid(msg,'sendJobAlertEmail')
		}    
	} catch (error) {
		logger.error("error in New job alert",{
            'err':error,
          })
	}
};

export const sendJobAlertEmailToExpert = async ({ userData, jobData,redirectURL }) => {
	try {
		
		if( ! userData.blocked){
			console.log("sendJobAlertEmailToExpert", jobData.reasons[0])
			let transferReason ='';
			if(jobData.is_transferred){
				transferReason = jobData.reasons[0];
			}
			let programName = jobData.subOption && jobData.subOption !== '' ? jobData.software.name+" " + "-" + jobData.subOption : jobData.software.name
			let acceptLink = `<a href="${process.env.mailEndpoint}login?email=${userData.email}&jobId=${jobData.id}&status=${'acceptjob'}" style="background-color: #4CAF50; 
								border: none;
								color: white;
								padding: 14px 49px;
								text-decoration: none;
								display: inline-block;
								font-size: 16px;
								margin: 4px 2px;
								cursor: hand;">Accept Job</a>`
			let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.NEW_EXPERT_JOB_ALERT)
			let content = await filteredContent(user_keys,{"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"jobDescription":jobData.issueDescription,
				"accept-job":acceptLink,
				"firstName":userData.firstName,
				"transferReason":transferReason
			},tags,contentValue)
			let subjectContent = await changeSubjectValue(user_keys,{
				"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"programName":programName,
				"caseNumber":jobData.JobId,
				"transferReason":transferReason

			},subTags,subjectValue)
			const msg = {
				from: 'Geeker Support Team <notifications@geeker.co>',
				to: userData.email,
				text: ' Are you available?',
				subject: subjectContent,
				html: content,
			}

			sendMailThroughSendgrid(msg,'sendJobAlertEmail')
		}    
	} catch (error) {
		logger.error("error in sendJobAlertEmailToExpert",{
            'err':error,
          })
	}
};

export const sendJobAlertEmailToAllTech = async ({ userData, jobData,redirectURL }) => {
	try {
		console.log("sendJobAlertEmailToAllTech",jobData.reasons[0])
		if( ! userData.blocked){
			let transferReason ='';
			if(jobData.is_transferred){
				transferReason = jobData.reasons[0];
			}
			let programName = jobData.subOption && jobData.subOption !== '' ? jobData.software.name+" " + "-" + jobData.subOption : jobData.software.name
			let acceptLink = `<a href="${process.env.mailEndpoint}login?email=${userData.email}&jobId=${jobData.id}&status=${'acceptjob'}" style="background-color: #4CAF50; 
								border: none;
								color: white;
								padding: 14px 49px;
								text-decoration: none;
								display: inline-block;
								font-size: 16px;
								margin: 4px 2px;
								cursor: hand;">Accept Job</a>`
			let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.New_JOB_ALERT_FOR_TRANSFER_CASE)
			let content = await filteredContent(user_keys,{"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"jobDescription":jobData.issueDescription,
				"accept-job":acceptLink,
				"firstName":userData.firstName,
				"transferReason":transferReason,

			},tags,contentValue)
			let subjectContent = await changeSubjectValue(user_keys,{
				"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"programName":programName,
				"caseNumber":jobData.JobId,
				"transferReason":transferReason,

			},subTags,subjectValue)
			const msg = {
				from: 'Geeker Support Team <notifications@geeker.co>',
				to: userData.email,
				text: ' Are you available?',
				subject: subjectContent,
				html: content,
			}

			sendMailThroughSendgrid(msg,'sendJobAlertEmail')
		}    
	} catch (error) {
		logger.error("error in sendJobAlertEmailToExpert",{
            'err':error,
          })
	}
};



// export const sendScheduleEmail = async ({ job_user,job_data, primary_time, secondary_time }) => {
// 	try {

// 		if(! job_user.blocked){

// 			const msg = {
// 					from: 'Geeker Support Team <notifications@geeker.co>',
// 					to: job_user.email,
// 					text: 'Searching technician',
// 					subject: 'Job Posted',
// 					html: `<h3>Thanks for submitting a job.</h3>
// 								<p> Job description : <b>${job_data.issueDescription}</b></p>
// 								<p>We will confirm as soon as we get a technician at your given time <b>${primary_time}</b>.</p>
// 								<p>If no technician found till <b>${primary_time}</b> then we will try to findout technician by <b>${secondary_time}</b>.</p>
// 					`,
// 			}

// 			sendMailThroughSendgrid(msg,'sendScheduleEmail')
// 		}
	 
// 	} catch (error) {
// 		console.log("error")
		
// 	}
// };

export const sendSearchEmail = async ({ userData,jobData}) => {
	try {
			if(! userData.blocked){
				const msg = {
						from: 'Geeker Support Team <notifications@geeker.co>',
						to: userData.email,
						text: 'Searching technician',
						subject: 'Search in  Progress',
						html: `<h3>Thanks for submitting a job.</h3>
									<p> Job description -> ${jobData.issueDescription}</p>
									<p>Our Servers are finding  techincian for next 30 minutes.We will notify you if we found one </p>
						`,
				}
				sendMailThroughSendgrid(msg,'sendSearchEmail')
			}
	 
		} catch (error) {
			console.log("error")
			
		}
};


export const foundTechInThirty = async ({ email,jobUser,jobData}) => {
	try {

		 if( ! jobUser.blocked){
				const msg = {
					from: 'Geeker Support Team <notifications@geeker.co>',
					to: email,
					text: 'Technician found for your job',
					subject: 'Technician found',
					html: `<h3>Technician found for your job.</h3>   
								<p> Job description -> ${jobData.issueDescription}</p>
								<p>Click here to start meeting.</p>
								<a href="${process.env.mailEndpoint}login?email=${email}&password=${jobUser.password}&jobId=${jobData.id}&status=${'foundin30min'}" style="background-color: #4CAF50; 
								border: none;
								color: white;
								padding: 10px 16px;
								text-align: center;
								text-decoration: none;
								display: inline-block;
								font-size: 16px;
								margin: 4px 2px;
								border-radius:10%;
								cursor: hand;">Accept</a>
					`,           

				}
			sendMailThroughSendgrid(msg,'foundTechInThirty')
		}
	} catch (error) {
		console.log("error  in foundTechInThirty")
		// throw new InvalidRequestError(error);
	}
};

export const notFoundTechInThirty = async ({ email,jobUser,jobData}) => {
	try {

			if( ! jobUser.blocked){
				const msg = {
					from: 'Geeker Support Team <notifications@geeker.co>',
					to: email,
					text: 'Technician not found for your job',
					subject: 'Technician not found',
					html: ` <h3>No technician is available for your job. Sorry for inconvenience.</h3>   
									<p> Job description -> ${jobData.issueDescription}</p>
									<p>Click here to choose option.</p>
									<a href="${process.env.mailEndpoint}login?email=${email}&password=${jobUser.password}&jobId=${jobData.id}&status=${'notfoundin30min'}" style="background-color: #4CAF50; 
									border: none;
									color: white;
									padding: 10px 30px;
									text-align: center;
									text-decoration: none;
									display: inline-block;
									font-size: 16px;
									margin: 4px 2px;
									border-radius:10%;
									cursor: hand;">Accept</a>
					`,           

				}
				sendMailThroughSendgrid(msg,'notFoundTechInThirty')
			}
	} catch (error) {
		console.log("error  in notFoundTechInThirty")
		
	}
};

export const dynamicEmail = async ({ email,subject,text,previewtext},attachments=null) => {
	try {
		const msg = {
			from: 'Geeker Support Team <notifications@geeker.co>',
			to: email,
			text:previewtext,
			subject: subject,
			html: text,           

		}
		sendMailThroughSendgrid(msg,'dynamicEmail',attachments)
	} catch (error) {
		console.log("error  in dynamicEmail with subject>>>>>", error)
		return false
	}
};

// export const alertToTheAdmins = async(email,cred)=>{
// 	try {
// 		const msg = {
// 			from: 'Geeker Support Team <notifications@geeker.co>',
// 			to: email,
// 			text:"previewtext",
// 			subject: "New user on geeker.co",
// 			html: `<p style="font-size:26px;font-weight:bold;text-align:center">Hy Admin</p>
// 				<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
// 					<p style="font-weight:bold;text-align:center;font-size:15px;">A New User Joined Geeker</p>
// 					<p style="text-align:center;">A new ${cred.userType} named ${cred.fullName} has Joined us  on geeker.co</p>
// 				</div>
// 				`,           

// 		}

// 		sendMailThroughSendgrid(msg,'alertToTheAdmins')
// 	} catch (error) {

// 		console.log("error  in alertToTheAdmins", error)
// 	}
// }

/**
 * Following function for sending to admin that a new user joined geeker
 * @params: email, cred
 * @author:Mamta
 */

export const alertToTheAdmins =async(email, cred)=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_ALERT_TO_ADMIN);
		let content = await filteredContent(user_keys,{
			'email':email,
			'userType':cred.userType,
			'customerName':cred.fullName
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
		   'email':email,
			'userType':cred.userType,
			'customerName':cred.fullName
	   },subTags,subjectValue)
	   await dynamicEmail({email:email,subject:subjectContent,text:content,previewtext:subjectContent})

	}catch(error){
		console.log("Error in alertToTheAdmins ", error);
	}
}


/**
* Following function for sending email invitation to customer
* @params: email, redirectUrl, name
* @author : Mamta
*/
// <button style="background-color: #5DADE2;display: block; margin: auto; color: white;padding:10px 20px;border:none;outline:none;border-radius:5px;font-weight: bold;">
export const sendInviteEmail =async(email:string, redirectURL:string, name:string, businessName :string)=>{
	try{
		let invitedLink = `<a style="text-decoration:none;color:white;background-color: #5DADE2;display: block; margin: auto; color: white;padding:10px 20px;border:none;outline:none;border-radius:5px;font-weight: bold;width: 6rem;justify-content: center;display: flex;" href=${redirectURL}>Join Now</a>`
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_INVITATION_EMAIL);
		let content = await filteredContent(user_keys,{
			'customerName':name,
			'invitLink':invitedLink,
			'email':email,
			"businessName" :businessName ? businessName : ''
		},tags, contentValue);
		let subjectContent = await changeSubjectValue(user_keys,{
	   'customerName':name,
			'invitLink':invitedLink,
			'email':email,
			"businessName" :businessName ? businessName : ''
	   },subTags,subjectValue)
		   await dynamicEmail({email:email,subject:subjectContent,text:content,previewtext:subjectContent})
	}catch(error){
		console.log("Error in sendInviteEmail ", error);
	}
}

// export const sendInviteEmail = async (
// 	email: string,
// 	redirectURL: string,
// 	name: string,
// 	businessName : string
//   ) => {
// 	try {
// 	  const msg = {
// 		from: '"Geeker Support Team" <notifications@geeker.co>',
// 		to: email,
// 		text: "Join Us on Geeker",
// 		subject: "You have been invited to join Geeker",
		// html: `<p style="font-size:26px;font-weight:bold;text-align:center">Welcome to Geeker</p>
		// 	  <p style="font-size:18px;font-weight:bold;text-align:center">Hi!</p>
			  
		// 						  <p style="text-align:center;font-size:16px">${name}  ${businessName && businessName!='' ? `from ${businessName}` : ''} has invited you to use Geeker to collaborate with them on a shared subscription plan.</p> 
		// 						  <p style="text-align:center;font-size:16px">Click below to get started:</p> 
		// 						  <button style="background-color: #5DADE2;display: block; margin: auto; color: white;padding:10px 20px;border:none;outline:none;border-radius:5px;font-weight: bold;"><a style="text-decoration:none;color:white" href=${redirectURL}>Join Now</a></button>
		// 						  <div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
		// 							  <p style="font-weight:bold;text-align:center;font-size:15px;">Need more help?</p>
		// 							  <p style="text-align:center;font-size:15px;">Feel free to reach out anytime!</p>						
		// 							  <p style="text-align:center;font-size:15px;">support@geeker.co</p>
		// 						  </div>`,
// 	  };
  
// 	  sendMailThroughSendgrid(msg, "sendInviteEmail");
// 	} catch (error) {
// 	  console.error("Email not send::", error);
// 	}
// };

/**
 * Following function for contactEmail to admin 
 * @params:object
 * @author:Mamta
 */

export const sendContactUsEmailAdmin=async(data)=>{
	try{
		let contact_emails = JSON.parse(process.env.contactUsMails)
		let custName = data.firstName + " "+ data.lastName;
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_CONTACT_US_EMAIL_TO_ADMIN)
		let content =await filteredContent(user_keys,{
			'customerEmail':data.email,
			'customerName':custName,
			'message':data.message
		}, tags, contentValue);
			let subjectContent = await changeSubjectValue(user_keys,{
			'customerEmail':data.email,
			'customerName':custName,
			'message':data.message
		},subTags,subjectValue)
			await dynamicEmail({email:contact_emails,subject:subjectContent,text:content,previewtext:subjectContent})
	}catch(error){
		console.log('Error in sendContactUsEmailAdmin ', error)
	}
}

// export const sendContactUsEmailAdmin = async (data) =>{

// 	try {
// 		console.log("email in sendContactUsEmailAdmin :::",data)
// 		 const msg = {
// 			from: 'Geeker Support Team <notifications@geeker.co>',
// 			to: '',
// 			text: 'Contact us email',
// 			subject: `Contact us request: ${data.firstName}`,
// 			html: ` <p style="font-size:26px;font-weight:bold;text-align:center">Hy Admin</p>
// 					<p style="text-align:center;font-size:15px;">New Contact request has been raised</p> 
					
// 					<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
// 						<p style="text-align:center;font-size:15px;"> First Name : ${data.firstName} </p>
// 						<p style="text-align:center;font-size:15px;"> Last Name : ${data.lastName} </p>
// 						<p style="text-align:center;font-size:15px;"> Email : ${data.email} </p>
// 						<p style="text-align:center;font-weight:bold;font-size:15px;">${data.message}</p>
// 					</div>					
// 					`
// 		}
// 		let contact_emails = JSON.parse(process.env.contactUsMails)
// 		console.log("contact_emails ::::::::",contact_emails)
// 		for (var k in contact_emails){
// 			msg['to'] = contact_emails[k]
// 			sendMailThroughSendgrid(msg,'sendContactUsEmailAdmin')
// 		}
		
// 	}
// 	catch (error) {
// 		console.log('error sendContactUsEmail :::',error)
		
// 	}
// }


export const sendBuySubscriptionEmailToCustomer= async (data, product_info, purchasedAt, price,promocodePrice )=>{
	
	try{
       console.log("email to customer purchased subscription ::::",data,product_info, "purchasedAt", purchasedAt);
		const custName = data.name;
		const productName = product_info.name;
		const purchasedDate = data.plan_purchased_date;
		const purchasedLabel = purchasedAt.label;
		
       let benefits ="";
       let key_features = JSON.parse(product_info.metadata.key_features)
       key_features.forEach(function(features){
       	if(features == 'Monday-Friday 9-9'){
       		let time_stats = 'Monday-Friday 9AM-9PM';
      		benefits += "<p style='text-align:left;font-size:15px'>"+ time_stats+'</p>';
       	}else{
       		
       	benefits += "<p style='text-align:left;font-size:15px'>" +features+'</p>';
       	}
       });
       
		
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_BUY_SUBSCRIPTION_EMAIL_TO_CUSTOMER)
	    let content = await filteredContent(user_keys,{
			"email":data.email,
			"cust_name":custName,
			"plan_name":productName,
			"purchasedAt":purchasedDate,
			"plan_price":price,
			"purchased_label":purchasedLabel,
			"benefits":benefits,
			"renewalDate":purchasedAt.date,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":data.email,
			"cust_name":custName,
			"plan_name":productName,
			"purchasedAt":purchasedDate,
			"plan_price":price,
			"renewalDate":purchasedAt.date,
			"benefits":benefits
		},subTags,subjectValue)

		await dynamicEmail({email:data.email,subject:subjectContent,text:content,previewtext:subjectContent})
		
		
	}catch(error){
		logger.error("error in sending email to customer for buy subscription ", {error})
        	console.log('error sendContactUsEmail :::',error)
	}
}


export const sendBuySubscription = async (data, product_info, purchasedAt, price, promocodePrice) =>{

	try {
		console.log("email in sendContactUsEmailAdmin :::",data,product_info)
		let benefits ="";
		let key_features = JSON.parse(product_info.metadata.key_features);
		key_features.forEach(function(features){
			benefits += '<p style="text-align:left;font-size:15px">'+features+'</p>';
		});
		let promocodePriceHtml = "";
		if(promocodePrice){
			let youSave = price - promocodePrice
			promocodePriceHtml = '<tr> <th width="150"><p style="text-align:left;font-size:15px;">You Save </p> </th><th><p style="text-align:left;font-size:15px;"> : </p></th><td><p style="text-align:left;font-size:15px;">$'+youSave+'</p> </td></tr>';
			promocodePriceHtml += '<tr> <th width="150"><p style="text-align:left;font-size:15px;">You paid </p> </th><th><p style="text-align:left;font-size:15px;"> : </p></th><td><p style="text-align:left;font-size:15px;">$'+promocodePrice+'</p> </td></tr>';
		}
		const msg = {
			from: '"Geeker Support Team" <notifications@geeker.co>',
			to: data.email,
			text: "Thank you for purchasing",
			subject: "Thank you for purchasing subscription from geeker",
			html: `<p style="font-size:26px;font-weight:bold;text-align:center">Thank you for purchasing subscription from geeker.</p>
				<p style="font-size:18px;font-weight:bold;text-align:left">Hi!</p>
				<p style="font-size:18px;font-weight:bold;text-align:left">Following are details of your subscription:</p>
				<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
					<table style="width: 100%;margin: 0 auto;">
						<tr>
							<th width="150"><p style="text-align:left;font-size:15px;">Name </p> </th>
							<th><p style="text-align:left;font-size:15px;"> : </p></th>
							<td><p style="text-align:left;font-size:15px;">${product_info.name}</p> </td>
						</tr>
						<tr>
							<th width="150"><p style="text-align:left;font-size:15px;">Subscription cost </p> </th>
							<th><p style="text-align:left;font-size:15px;"> : </p></th>
							<td><p style="text-align:left;font-size:15px;">$${price}</p> </td>
						</tr>
						${promocodePriceHtml}
						<tr>
							<th width="150"><p style="text-align:left;font-weight:bold;font-size:15px;">Benefits </p> </th>
							<th><p style="text-align:left;font-size:15px;"> : </p></th>
							<td>${benefits} </td>
						</tr>
						<tr>
							<th width="150"><p style="text-align:left;font-weight:bold;font-size:15px;">Purchased Date </p> </th>
							<th><p style="text-align:left;font-size:15px;"> : </p></th>
							<td><p style="text-align:left;font-size:15px;">${data.plan_purchased_date}</p></td>
						</tr>
						<tr>
							<th width="150"><p style="text-align:left;font-weight:bold;font-size:15px;">${purchasedAt.label} </p> </th>
							<th><p style="text-align:left;font-size:15px;"> : </p></th>
							<td><p style="text-align:left;font-size:15px;">${purchasedAt.date}</p></td>
						</tr>
					</table>
				</div>					
				
									
				<div style="background-color:#EFEFEF; padding:20px;margin-top:20px;">
					<p style="font-weight:bold;text-align:center;font-size:15px;">Need more help?</p>
					<p style="text-align:center;font-size:15px;">Feel free to reach out anytime!</p>						
					<p style="text-align:center;font-size:15px;">support@geeker.co</p>
				</div>`,
		};
	
		await sendMailThroughSendgrid(msg, "sendBuySubscription");
	}
	catch (error) {
		console.log('error sendContactUsEmail :::',error)
		
	}
}

export const sendBuySubscriptionEmailAdmin = async (cust_name, product_info_name, renewal_date,purchased_label,plan_price,email,product_info_data,plan_purchased_date) =>{
	try {
		// console.log("email in sendContactUsEmailAdmin :::",data,product_info)
		console.log('dcbhjdefvguygvrughtorihj',product_info_data)
		let benefits ="";
		let key_features = product_info_data;
		console.log('key_features',product_info_data)
		key_features.forEach(function(features){
			benefits += '<p style="text-align:left;font-size:15px">'+features+'</p>';
			console.log("benefits",benefits)
		});
    
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.Send_Buy_Subscription_Email_Admin)
		let content = await filteredContent(user_keys,{
			"email":email,
			"cust_name":cust_name,
			"plan_name":product_info_name,
			"purchasedAt":plan_purchased_date,
			"plan_price":plan_price,
			"purchased_label":purchased_label,
			"benefits":benefits,
			"renewalDate":renewal_date
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,product_info_name,
			"cust_name":cust_name,
			"plan_name":product_info_name,
			"purchasedAt":plan_purchased_date,
			"plan_price":plan_price,
			"purchased_label":purchased_label,
			"benefits":benefits,
			"renewalDate":renewal_date
		},subTags,subjectValue)

		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
		
	}
	catch (error) {
		console.log('error sendContactUsEmail :::',error)
		
	}
}

export const sendMailThroughSendgrid = async(msg,type,pathToAttachment=null)=> {
	if(pathToAttachment!=null){
		let fileAttachment = pathToAttachment;
		let attachment = fs.readFileSync(pathToAttachment).toString("base64");
		msg['attachments'] = [{
      	content: attachment,
      	filename: "invoice.pdf",
      	type: "application/pdf",
      	disposition: "attachment"
    	}
    	]
	}
	

	// console.log('msg>>>>>>>>>>>',msg,type)
	const sgEmailRes = await sgMail
	  .send(msg)
	  .then(() => {
	    console.log('Email sent sendgridddddddddddddd',msg.to)
	  })
	  .catch((error) => {
	    console.error('Email not sent sendgrid::',type,error)
	  })
}

export const sendScheduleAlertToCustomer = async({email,techName,softwareName,scheduleTimer,calendarLink,login})=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_JOB_CUSTOMER)
		let content = await filteredContent(user_keys,{
			"firstName":techName,
			"calendar-link":calendarLink,
			"programName":softwareName,
			"timer":scheduleTimer,
			"login":login
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"firstName":techName,
			"calendar-link":calendarLink,
			"programName":softwareName,
			"timer":scheduleTimer,
			"login":login
		},subTags,subjectValue)

		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		console.log("error in sendScheduleAlertToCustomer",err)
		logger.error("error in sendScheduleAlertToCustomer",{
            'err':err,
          })
	}
}

export const sendMobileJoinLink = async(user_email,jobID)=>{
	try{
		let email = user_email
		let subject = "Kindly Join the meeting"
		let previewtext = "join"
		let text = `Join this meeting from pc ${process.env.mailEndpoint}/${jobID}`

		await dynamicEmail({email,subject:subject,text:text,previewtext:previewtext})
	}
	catch(err){
		logger.error("error in sendMobileJoinLink :::",{
			'err':err
		})
	}
}

export const sendTechnicianDeclinedEmail = async()=>{
	try{
		console.log("pass")
	}
	catch(err){
		console.log("error in err",err)
	}
}

export const technicianAcceptJobIn10 = async ({email,jobData,techName,dashboardLink}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.MEETING_IN_10)
		let content = await filteredContent(user_keys,{
            "firstName":techName,
			"jobDescription":jobData.issueDescription,
			"dashboardLink":dashboardLink
        },tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
            "firstName":techName,
			"jobDescription":jobData.issueDescription,
			"dashboardLink":dashboardLink
        },subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in technicianAcceptJob",error)
	}
};

export const noTechnicianFound = async ({email,jobData,techName,timer}) => {

	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.NO_TECHNICIAN_FOUND)
		let content = await filteredContent(user_keys,{
			"firstName":techName,
			"jobDescription":jobData.issueDescription,
			"timer":timer,
        },tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"firstName":techName,
			"jobDescription":jobData.issueDescription,
			"timer":timer,
        },subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>>>>>>>>>error in noTechnicianFound>>>>>>>>>>>>>>>",error)
	}
};

export const referrLink = async ({email, referrLink}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.REFER_LINK)
		let content = await filteredContent(user_keys,{
			"email":email,
			"referrLink":referrLink
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"referrLink":referrLink
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		logger.error("error in Refer Link Email :::::",
			{
				'err':error,
			}
		);	
	}
};

export const inviteLink = async ({email, token ,sendToLink}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.INVIT_LINK)
		let content = await filteredContent(user_keys,{
			"email":email,
			"invitLink":sendToLink
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"invitLink":sendToLink
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in invit Link Email >>>>>>>>>>>>>>>>",error)
		
	}
};

export const customerIsWaiting = async ({email,jobData,lastName,firstName}) => {

	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.CUSTOMER_IS_WAITING)
		let content = await filteredContent(user_keys,{
			"email":email,
			"jobDescription":jobData.issueDescription,
			"firstName":firstName,
			"lastName":lastName,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"jobDescription":jobData.issueDescription,
			"firstName":jobData.technician.user.firstName,
			"lastName":jobData.technician.user.lastName,
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in customerIsWaiting Email >>>>>>>>>>>>>>>>",error)
		
	}
};

export const technicianAcceptJob = async ({email,firstName,mailEndpoint}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.TECHNICIAN_ACCEPTED_JOB)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"mailEndpoint":mailEndpoint,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"mailEndpoint":mailEndpoint,
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in technicianAcceptJob Email >>>>>>>>>>>>>>>>",error)
		
	}
};

export const jobCancelByCustomer = async ({email,firstName}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.CUSTOMER_CANCEL_JOB)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in jobCancelByCustomer Email >>>>>>>>>>>>>>>>",error)
		
	}
};


export const customerDeclinedTheTechnician = async ({email,firstName,programeName,jobDescription,createdAt,businessName}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.CUSTOMER_DECLINED_THE_TECHNICIAN)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programeName,
			"jobDescription":jobDescription,
			"createdAt":createdAt,
			"businessName":businessName,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programeName,
			"jobDescription":jobDescription.issueDescription,
			"createdAt":createdAt,
			"businessName":businessName,

		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in customerDeclinedTheTechnician Email >>>>>>>>>>>>>>>>",error)
		
	}
};


export const sendScheduleEmail = async ({email,programeName,jobDescription,primaryTime,secondaryTime,name}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_SCHEDULE_ALERTS)
		let content = await filteredContent(user_keys,{
			"email":email,
			"programName":programeName,
			"jobDescription":jobDescription,
			"secondaryTime":secondaryTime,
			"primaryTime":primaryTime,
			"firstName":name,
			"name":name
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"programName":programeName,
			"jobDescription":jobDescription,
			"secondaryTime":secondaryTime,
			"firstName":name,
			"primaryTime":primaryTime,
			"name":name
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in customerDeclinedTheTechnician Email >>>>>>>>>>>>>>>>",error)
		
	}
};

export const techincianNotFound = async ({email,firstName,jobDescription}) => {
	try {
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.TECHNICIAN_NOT_FOUND)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"jobDescription":jobDescription,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"jobDescription":jobDescription,
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in techincianNotFound Email >>>>>>>>>>>>>>>>",error)
		
	}
};

export const paymentInformationEmail = async({
	email,
	totalCharge,
	discountedCharge,
	meetingTime,
	paymentStatus,
	issueDescription,
	softwareName,
	technicianCharges,
	user_name},pdf=null) =>{
	try{
		console.log('email>>>>>>>>>>>>>>',email)
		console.log('totalCharge>>>>>>>>',totalCharge)
		console.log('meetingTime>>>>>>>>',meetingTime)

		console.log('paymentStatus>>>>>>>>',paymentStatus)
		console.log('issueDescription>>>>>>>>',issueDescription)

		console.log('technicianCharges>>>>>>>>',technicianCharges)
		console.log('user_name>>>>>>>>',user_name)
		console.log('discountedCharge>>>>', discountedCharge)
		

		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.PAYMENT_INFORMATION_EMAIL)
		let content = await filteredContent(user_keys,{
			"email":email,
			"totalCharge":totalCharge,
			"discountedCharge":discountedCharge,
			"meetingTime":meetingTime,
			"name":user_name,
			"jobDescription":issueDescription,
			"programName":softwareName,
			"technicianCharges":technicianCharges,
			"paymentStatus":paymentStatus
		},tags,contentValue)

		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"totalCharge":totalCharge,
			"discountedCharge":discountedCharge,
			"meetingTime":meetingTime,
			"name":user_name,
			"jobDescription":issueDescription,
			"programName":softwareName,
			"technicianCharges":technicianCharges,
			"paymentStatus":paymentStatus
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent},pdf)
	}
	catch(err){
		console.log("error in paymentInformationEmail :::::",err)
	}
}

/**
   * Following function is responsible for sending payment information email to customer with active subscription upon job completion.
   * @params = (email, paymentStatus) =>(Type:HTML), (issuedescription, softwareName, technicianCharges, user_name, planName) =>(Type:String), (totalCharge, meetingTime, convertedTotal, convertedRemaining,usedfromSubscription) =>(Type:Number)
   * @response : no response
   * @author : Kartik
*/
export const paymentInformationWithSubscriptionEmail = async({
	email,
	totalCharge,
	meetingTime,
	paymentStatus,
	issueDescription,
	softwareName,
	technicianCharges,
	user_name,
	planName,
	convertedTotal,
	convertedRemaining,
	usedFromSubscription},pdf=null) =>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.PAYMENT_INFORMATION_WITH_SUBSCRIPTION_EMAIL)
		let content = await filteredContent(user_keys,{
			"email":email,
			"totalCharge":totalCharge,
			"meetingTime":meetingTime,
			"name":user_name,
			"jobDescription":issueDescription,
			"programName":softwareName,
			"technicianCharges":technicianCharges,
			"paymentStatus":paymentStatus,
			"planName":planName,
			"convertedTotal":convertedTotal,
			"convertedRemaining":convertedRemaining,
			"usedFromSubscription":usedFromSubscription
		},tags,contentValue)

		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"totalCharge":totalCharge,
			"meetingTime":meetingTime,
			"name":user_name,
			"jobDescription":issueDescription,
			"programName":softwareName,
			"technicianCharges":technicianCharges,
			"paymentStatus":paymentStatus,
			"planName":planName,
			"convertedTotal":convertedTotal,
			"convertedRemaining":convertedRemaining,
			"usedFromSubscription":usedFromSubscription
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent},pdf)
	}
	catch(err){
		logger.error("error in paymentInformationWithSubscriptionEmail :::::",err)
	}
}

export const techincianCompletedJob = async({email,programName,jobDescription,meetingTime,jobTotalCost,technicianCharges}) =>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.TECHNICIAN_JOB_COMPLETED_EMAIL)
		let content = await filteredContent(user_keys,{
			"email":email,
			"meetingTime":meetingTime,
			"technicianCharges":technicianCharges,
			"programName":programName,
			"jobDescription":jobDescription,
			"jobTotalCost":jobTotalCost
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"meetingTime":meetingTime,
			"technicianCharges":technicianCharges,
			"programName":programName,
			"jobDescription":jobDescription,
			"jobTotalCost":jobTotalCost
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("error in techincianCompletedJob :::::",
			{
				'err':err,
			}
		);
	}
}


// Sahil Code Start
export const customerNotJoinedEmail = async({email,dash,date})=>{
    try{
        let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.CUSTOMER_NOT_JOINED)
        let content = await filteredContent(user_keys,{
            "email":email,
            "timer":date,
            "dashboardLink":dash,

        },tags,contentValue)
        let subjectContent = await changeSubjectValue(user_keys,{
            "email":email,
            "timer":date,
            "dashboardLink":dash,
        },subTags,subjectValue)

        await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
    }
    catch(err){
        // logger.error("error in technicianNotJoinedEmail :::::: ",err)
		logger.error("error in technicianNotJoinedEmail :::::: ",{
            'err':err
        })
    }
}

export const scheduleJobAcceptTechnician = async({email,firstName,jobDescription,programeName,scheduleTimer,businessName})=>{
    try{
        let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_JOB_ACCEPTED_BY_TECHNICIAN)
        let content = await filteredContent(user_keys,{
            "email":email,
            "timer":scheduleTimer,
            "jobDescription":jobDescription,
            "firstName":firstName,
            "programName":programeName,
			"businessName":businessName ? ', ' + businessName:'',
        },tags,contentValue)
        let subjectContent = await changeSubjectValue(user_keys,{
            "email":email,
            "timer":scheduleTimer,
            "jobDescription":jobDescription,
            "firstName":firstName,
            "programName":programeName,
			"businessName":businessName ? ', ' + businessName:'',

        },subTags,subjectValue)

        await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
    }
    catch(err){
        logger.error("error in technicianNotAppliedForJob :::::: ",{
            'err':err
        })
    }
}

export const customerDeclinedJobEmail = async({email,firstName,jobDescription,programeName,jobCreatedAt})=>{
    try{
        // console.log('!@#$%^&*&^%$#@#$%^&*',jobDescription)
        let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.CUSTOMER_DECLINED_JOB)
        let content = await filteredContent(user_keys,{
            "email":email,
            "jobCreatedAt":jobCreatedAt,
            "jobDescription":jobDescription,
            "firstName":firstName,
            "programName":programeName,
        },tags,contentValue)
        let subjectContent = await changeSubjectValue(user_keys,{
            "email":email,
            "jjobCreatedAt":jobCreatedAt,
            "jobDescription":jobDescription,
            "firstName":firstName,
            "programName":programeName,
        },subTags,subjectValue)

        await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
    }
    catch(err){
        // console.log("error in technicianNotAppliedForJob :::::: ",err)
		logger.error("error in customerDeclinedJobEmail  :::::: ",{
            'err':err
        })
    }
}

export const paymentFailedLiveCustomerEmail = async({email,JobId,jobStatus,stripeError,createdAt,jobTotalCost})=>{
    try{

        let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.PAYMENT_FAILED_LIVE_CUSTOMER)
        let content = await filteredContent(user_keys,{
            "email":email,
            "JobId":JobId,
            "jobStatus":jobStatus,
            "jobTotalCost":jobTotalCost,
            "stripeError":stripeError,
            "createdAt":createdAt,
        },tags,contentValue)
        let subjectContent = await changeSubjectValue(user_keys,{
            "email":email,
            "jobId":JobId,
            "jobStatus":jobStatus,
            "jobTotalCost":jobTotalCost,
            "stripeError":stripeError,
            "createdAt":createdAt,
        },subTags,subjectValue)

        await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
    }
    catch(err){
        // console.log("error in technicianNotAppliedForJob :::::: ",err)
		logger.error("error in  paymentFailedLiveCustomerEmail :::::: ",{
            'err':err
        })
    }
}

// Sahil Code End


export const sendIssueNotSolvedEmail = async (data) =>{
	try{

		let issues = data.issues
		let name = data.userName
		let jobDescription = data.jobDesciption
		let issueText = ''
		let email = process.env.EMAIL_FOR_NOT_SOLVED_SCENARIO
		for(let k=0;k<issues.length;k++){
			let number = k+1
			issueText += '<p style="text-align:left;font-size:15px">'+number+'. '+issues[k]+'</p>' 	
		}
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_ISSUE_NOT_SOLVED_EMAIL)
			let content = await filteredContent(user_keys,{
				"email":email,
				"jobDescription":jobDescription,
				"name":name,
				"comment":data.comments,
				"issueText":issueText
			},tags,contentValue)
			let subjectContent = await changeSubjectValue(user_keys,{
				"email":email,
				"jobDescription":jobDescription,
				"name":name,
				"comment":data.comments,
				"issueText":issueText
			},subTags,subjectValue)
			await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("error in sendIssueNotSolvedEmail :::::",
			{
				'err':err,
			}
		);
	}
}

 /**
	* Following funciton is responsible for sending email notification.
	* @params = (messageCount, senderName, programeName) =>(Type:String), login (Type:url)
	* @response : no response
	* @author : Sahil Sahrma
 */
export const newEmail = async ({messageCount,senderName,login,email,programeName}) =>{
	try{
		
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.NEW_MESSAGE)
		let content = await filteredContent(user_keys,{
			"email":email,
			"login":login,
			"senderName":senderName,
			"messageCount":messageCount,
			"programName":programeName
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"login":login,
			"senderName":senderName,
			"messageCount":messageCount,
			"programName":programeName
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("error in new Email :::::",
			{
				'err':err,
			}
		);
	}
}

/**
  * function that sends email to customer after the job is completed with refferal link
  * @params : email(Type:String) , link(Type:String)
  * @response : {void}
  * @author : Sahil Nagpal
  */
export const referrallinkEmail = async({email,link})=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.AFTER_JOB_REFFERAL)
		let content = await filteredContent(user_keys,{
			"email":email,
			"sharingLink":link,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"sharingLink":link,
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("error in referrallinkEmail ::::",{
			"error":err
		})
	}
}

/**

* Following function is reasponsible for sending email to customer regarding the additional hour(s) in long-job.
* @params : email(Type:String) , link(Type:String)
* @response : {void}
* @author : Vinit Verma
*/
export const additionalHourLongJobEmailCustomer = async (data) => {
	try {
		let fetchEmail = await filteredTags(dataBase_emailKeys.Additional_Hour_Long_Job_Email_Customer)
		console.log("subjectValue:::::",fetchEmail.subjectValue)
		const email = data.email;
		const subjectContent = fetchEmail.subjectValue;
		console.log("subjectValue:::::",fetchEmail.contentValue)
		const content = fetchEmail.contentValue;
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		console.log(">>>error in techincianNotFound Email >>>>>>>>>>>>>>>>",error)
		
	}
};


/**
 * function that sends reward email to customer if he is rewarded 
 * @params : email(Type:String) 
 * @response : {void},
 * @author : Sahil Nagpal
 */
 export const referalRewardEmail = async(email)=>{
 	try{
 		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.REFERAL_REWARD_EMAIL)
		let content = await filteredContent(user_keys,{
			"email":email,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
 	}
 	catch(err){
 		console.log("error in referalRewardEmail :::: ",err)
 	}
 }

/** 
 * This function sends email to test emails to technicians
 * @params : email(Type:String),link(Type:String)
 * @response : {void}
 * @author : Sahil Nagpal
 */
 export const sendTechnicianTestEmails = async({email,name,programeName,testLink})=>{
 	try{
 		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SOFTWARE_TEST_EMAIL)
		let content = await filteredContent(user_keys,{
			"email":email,
			"name":name,
			"testLink":testLink,
			"programName":programeName,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"name":name,
			"testLink":testLink,
			"programName":programeName
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
 	}
 	catch(err){
 		console.log("error in sendTechnicianTestEmails ::::::: ",err)
 	}
 }

 	/**
	* This function sends email to admin when user submits request for a callback.
	* @params : User Input of Name & Phone Number & Admin Emails from .env
	* @response : Email
	* @author : Kartik
	*/
 export const sendUserReviewEmailAdmin = async (userName, userPhoneNumber,email) =>{
	try {
		logger.info('send-user-review-email: ', {
			body: {'userName':userName, 'userPhoneNumber':userPhoneNumber},
		})
		    
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_USER_REVIEW_EMAIL)
		let content = await filteredContent(user_keys,{
			"userName":userName,
			"userPhoneNumber":userPhoneNumber,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"userName":userName,
			"userPhoneNumber":userPhoneNumber,
		},subTags,subjectValue)

		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
		
	}
	catch (error) {
		console.log('error sendUserReviewEmail :::',error)
		logger.error("error sendUserReviewEmail :::", {
			'err': error,
		})
	}
}

	/**
	* This function sends email alert to Techncians for Schedule Job 
	* @params : Object
	* @response : Email
	* @author : sahil sharma
	*/
	export const acceptJobEmail = async({firstName,Jobuser,email,jobId,primaryDate,secondaryDate,issueDesc,programName})=>{
		let acceptLink = `<a href="${process.env.mailEndpoint}login?email=${email}&jobId=${jobId}&status=${'acceptjob'}" style="background-color: #4CAF50; 
									border: none;
									color: white;
									padding: 14px 49px;
									text-decoration: none;
									display: inline-block;
									font-size: 16px;
									margin: 4px 2px;
									cursor: hand;">Accept Job</a>`
		try{
			let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_JOB_ALERT_TECHNICIAN)
			let content = await filteredContent(user_keys,{
				"email":email,
				"issueDesc":issueDesc,
				"firstName":firstName,
				"primaryTime": primaryDate,
				"secondaryTime":secondaryDate,
				"acceptLink":acceptLink,
				"programName":programName
			},tags,contentValue)
			let subjectContent = await changeSubjectValue(user_keys,{
				"email":email,
				"issueDesc":issueDesc,
				"firstName":firstName,
				"primaryTime": primaryDate,
				"secondaryTime":secondaryDate,
				"acceptLink":acceptLink,
				"programName": programName
	
			},subTags,subjectValue)
	
			await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
		}
		catch(err){
			logger.error("error in sending email to technicians for schedule job :::::: ",{
				'err':err
			})
		}
	}
	


/**
* This function sends cancel email alert to Techncians for Schedule Job 
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const scheduleCancelJobAlertTechnician = async({email,firstName,reason,programName,name="Null",date})=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_CANCEL_JOB_ALERT_TECHNICIAN)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"reason":reason,
			"programName":programName,
			"name":name,
			"date":date
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"reason":reason,
			"programName": programName,
			"name":name,
			"date":date
		},subTags,subjectValue)

		logger.info("scheduleCancelJobAlertTechnician :::::: ",{'email':email, 'reason':reason})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in scheduleCancelJobAlertTechnician :::::: ",{'err':err, 'email':email, 'reason':reason})
	}
}
/**
	* This function sends email alert to Techncians for Schedule Job 
	* @params : Object
	* @response : Email
	* @author : sahil sharma
	*/
	export const scheduleJobAlertTechnician = async({firstName,email,primaryDate,secondryDate,issueDesc,JobId,programName,name="Null"})=>{
		let acceptLink = `<a href="${process.env.mailEndpoint}login?email=${email}&jobId=${JobId}&status=${'acceptjob'}" style="background-color: #4CAF50; 
									border: none;
									color: white;
									padding: 14px 49px;
									text-decoration: none;
									display: inline-block;
									font-size: 16px;
									margin: 4px 2px;
									cursor: hand;">Accept Job</a>`
		try{
			let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_JOB_ALERT_TECHNICIAN)
			let content = await filteredContent(user_keys,{
				"email":email,
				"issueDesc":issueDesc,
				"firstName":firstName,
				"primaryTime": primaryDate,
				"secondaryTime":secondryDate,
				"acceptLink":acceptLink,
				"programName":programName,
				"name":name,
		
			},tags,contentValue)
			let subjectContent = await changeSubjectValue(user_keys,{
				"email":email,
				"issueDesc":issueDesc,
				"firstName":firstName,
				"primaryTime": primaryDate,
				"secondaryTime":secondryDate,
				"acceptLink":acceptLink,
				"programName": programName,
				"name":name,
	
			},subTags,subjectValue)
	
			await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
    }
    catch(err){
        logger.error("error in sending email to technicians for schedule job :::::: ",{
            'err':err
        })
		return false
    }
}

export const sendTransferFundEmailAdmin = async ({email,transferRecordTable,from_to_date}) =>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_TRANSFER_FUNDS_EMAIL_TO_ADMIN)
        let content = await filteredContent(user_keys,{
			'email' : email,
			"fromto" :from_to_date,
			'transferRecordTable' : transferRecordTable
        },tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			'email' : email,
			"fromto":from_to_date,
			'transferRecordTable' : transferRecordTable
        },subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
		return {success:true}
	}catch (err){
		logger.error("error while sending sendTransferFundEmailAdmin email  to technicians",{
            'err':err
        })
  }
}


/**
* This function sends cancel email alert to Techncians for Schedule Job 
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const scheduleCancelJobAlertCustomer = async({email,firstName,reason,programName,name="Null"}) => {
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_CANCEL_JOB_ALERT_CUSTOMER)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"reason":reason,
			"programName":programName,
			"name":name
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"reason":reason,
			"programName": programName,
			"name":name
		},subTags,subjectValue)

		logger.info("scheduleCancelJobAlertCustomer :::::: ",{'email':email, 'reason':reason})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in scheduleCancelJobAlertCustomer :::::: ",{'err':err, 'email':email, 'reason':reason})
	}
}

/**
* This function sends cancel email alert to Techncians for Schedule Job 
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const scheduleCancelByTechJobAlertCustomer = async({firstName,email,reason,programName,jobDescription,name="Null"}) => {
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.TECHNICIAN_DECLINED_SCHEDULE_EMAIL)
		let content = await filteredContent(user_keys,{
			"firstName":firstName,
			"email":email,
			"reason":reason,
			"jobDescription":jobDescription,
			"programName":programName,
			"name":name
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"firstName":firstName,
			"email":email,
			"reason":reason,
			"jobDescription":jobDescription,
			"programName":programName,
			"name":name
		},subTags,subjectValue)
		logger.info("scheduleCancelByTechJobAlertCustomer :::::: ",{'email':email, 'reason':reason})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in scheduleCancelByTechJobAlertCustomer :::::: ",{'err':err, 'email':email, 'reason':reason})
	}
}

/**
* This function sends alert to customer saying that we are still looking for a technician 
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const scheduleLookingForTechnician = async({email,firstName,programName,name="Null"})=>{
	
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_LOOKING_FOR_TECHNICIAN)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programName,
			"name":name
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programName,
			"name":name
		},subTags,subjectValue)
		logger.info("scheduleLookingForTechnician :::::: ",{'email':email,'programName':programName})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in scheduleLookingForTechnician :::::: ",{'err':err, 'email':email})
	}
}

/**
* This function sends alert to admin with completed job which is under review
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const adminReviewJob = async({email,firstName,programName,jobDescription,techName,dontChargeReason,adminJobDetailLink,name="Null",customerComment})=>{
	
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.ADMIN_REVIEW_JOB)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name,
			"dontChargeReason":dontChargeReason,
			"customerComment":customerComment,
			"adminJobDetailLink":adminJobDetailLink,
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"dontChargeReason":dontChargeReason,
			"customerComment":customerComment,
			"adminJobDetailLink":adminJobDetailLink,
			"name":name
		},subTags,subjectValue)
		logger.info("scheduleLookingForTechnician :::::: ",{'email':email,'subjectContent':content})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in scheduleLookingForTechnician :::::: ",{'err':err, 'email':email})
	}
}

/**
* This function sends alert to customer with completed job which is under review
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const adminReviewJobCustomerAlert = async({email,firstName,programName,jobDescription,techName,name="Null"})=>{
	
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.ADMIN_REVIEW_JOB_CUSTOMER_ALERT)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name
		},subTags,subjectValue)
		logger.info("scheduleLookingForTechnician :::::: ",{'email':email,'subjectContent':subjectContent})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in scheduleLookingForTechnician :::::: ",{'err':err, 'email':email})
	}
}

/**
* This function sends alert to customer with completed job which is under review
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const dontChargeWithoutReview = async({email,firstName,programName,jobDescription,techName,dontChargeReason,name="Null"})=>{
	
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.DONT_CHARGE_WITHOUT_REVIEW_ALERT)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name,
			"dontChargeReason":dontChargeReason
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name,
			"dontChargeReason":dontChargeReason
		},subTags,subjectValue)
		logger.info("dontChargeWithoutReview :::::: ",{'email':email,'subjectContent':subjectContent})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in dontChargeWithoutReview :::::: ",{'err':err, 'email':email})
	}
}

/**
* This function sends refund alert to customer with completed job which is under review
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const adminReviewRefundCustomerAlert = async({email,firstName,programName,jobDescription,techName,name="Null",reason="NA"})=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.ADMIN_REVIEW_REFUND_CUSTOMER_ALERT)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name,
			"reason":reason
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name,
			"reason":reason
		},subTags,subjectValue)
		logger.info("scheduleLookingForTechnician :::::: ",{'email':email,'subjectContent':subjectContent})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in scheduleLookingForTechnician :::::: ",{'err':err, 'email':email})
	}
}

/**
* This function sends refund alert to customer with completed job which is under review
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const adminReviewDontChargeCustomerAlert = async({email,firstName,programName,jobDescription,techName,name="Null",reason="NA",customerComment="NA"})=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.ADMIN_REVIEW_DONT_CHARGE_CUSTOMER_ALERT)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name,
			"reason":reason,
			"customerComment":customerComment
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programName,
			"jobDescription":jobDescription,
			"techName":techName,
			"name":name,
			"reason":reason,
			"customerComment":customerComment
		},subTags,subjectValue)
		logger.info("adminReviewDontChargeCustomerAlert :::::: ",{'email':email,'subjectContent':subjectContent})
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("catch error in adminReviewDontChargeCustomerAlert :::::: ",{'err':err, 'email':email})
	}
} 

export const adminReviewApproveChargeForCustomer = async({email,firstName,softwareName,issueDescription,techName,reason="NA",totalCost,amountToPaid}) =>{
	try{
		console.log(">>>adminReviewApproveChargeForCustomer>>>>>>>>>>>",email,firstName,softwareName,issueDescription,techName,totalCost,amountToPaid)
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.ADMIN_REVIEW_CHARGE_DONE)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName":softwareName,
			"jobDescription":issueDescription,
			"techName":techName,
			"reason":reason,
			"jobTotalCost":totalCost,
			"amountToPaid":amountToPaid
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": softwareName,
			"jobDescription":issueDescription,
			"techName":techName,
			"reason":reason,
			"totalCost":totalCost,
			"amountToPaid":amountToPaid
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("error in adminReviewApproveChargeForCustomer :::::",
			{
				'err':err,
			}
		);
	}
}

export const sendTransferFundsEmail = async ({email,Name,amountPaid,transferDate,transactionNumber}) =>{
	try{
		logger.info("Transfer Data inside mail function", {'email':email, 'name':Name, 'amountPaid':amountPaid,'transferDate':transferDate,'transactionNumber':transactionNumber});

		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SEND_TRANSFER_FUNDS_EMAIL)
        let content = await filteredContent(user_keys,{
			'email':email,
			'Name':Name,
			'amountPaid':amountPaid,
			'transferDate':transferDate,
			'transactionNumber':transactionNumber,
        },tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			'email':email,
			'Name':Name,
			'amountPaid':amountPaid,
			'transferDate':transferDate,
			'transactionNumber':transactionNumber,
        },subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
		return {success:true}	
	}catch (err){
		logger.error("error while sending sendTransferFundsEmail  to technicians",{
            'err':err
        })
	}
}


/**
* This function sends email to customer when technician submits request for completing long job.
* @params : Object
* @response : Email
* @author : Kartik
*/
export const technicianSubmitLongJob = async ({ email, firstName, lastName }) => {
	try {
		let { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.TECHNICIAN_SUBMIT_LONG_JOB)
		let content = await filteredContent(user_keys, {
			"email": email,
			"firstName": firstName,
			"lastName": lastName,
		}, tags, contentValue)
		let subjectContent = await changeSubjectValue(user_keys, {
			"email": email,
			"firstName": firstName,
			"lastName": lastName,
		}, subTags, subjectValue)
		await dynamicEmail({ email, subject: subjectContent, text: content, previewtext: subjectContent })
	} catch (error) {
		logger.error(">>>error in technicianSubmitLongJob Email >>>>>>>>>>>>>>>>", error)

	}
};


/**
* This function sends email to technician when customer approves request for completing long job.
* @params : Object
* @response : Email
* @author : Kartik
*/
export const customerApproveLongJob = async ({ email, firstName, lastName, date, JobId,businessName }) => {
	try {
		let { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.CUSTOMER_APPROVE_LONG_JOB)
		let content = await filteredContent(user_keys, {
			"email": email,
			"firstName": firstName,
			"lastName": lastName,
			"date": date,
			"JobId": JobId,
			"businessName": businessName ? ', ' + businessName:'',
		}, tags, contentValue)
		let subjectContent = await changeSubjectValue(user_keys, {
			"email": email,
			"firstName": firstName,
			"lastName": lastName,
			"date": date,
			"JobId": JobId,
			"businessName": businessName ? ', ' + businessName:'',
		}, subTags, subjectValue)
		await dynamicEmail({ email, subject: subjectContent, text: content, previewtext: subjectContent })
	} catch (error) {
		logger.error(">>>error in customerApproveLongJob Email >>>>>>>>>>>>>>>>", error)

	}
};


/**
* This function sends email to technician when customer rejects request for completing long job.
* @params : Object
* @response : Email
* @author : Kartik
*/
export const customerRejectLongJob = async ({ email, firstName, date }) => {
	try {
		let { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.CUSTOMER_REJECT_LONG_JOB)
		let content = await filteredContent(user_keys, {
			"email": email,
			"firstName": firstName,
			"date": date,
		}, tags, contentValue)
		let subjectContent = await changeSubjectValue(user_keys, {
			"email": email,
			"firstName": firstName,
			"date": date,
		}, subTags, subjectValue)
		await dynamicEmail({ email, subject: subjectContent, text: content, previewtext: subjectContent })
	} catch (error) {
		logger.error(">>>error in customerRejectLongJob Email >>>>>>>>>>>>>>>>", error)

	}
};

/**
* This function sends email to customer when customer try to post job from mobile or tablet.
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const updatedScheduleJobAcceptedTechnician = async({firstName,email,primaryDate,secondryDate,programName,jobLink, jobDescription})=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.UPDATED_SCHEDULE_JOB_ACCEPTED_TECHNICIAN_EMAIL)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"primaryTime": primaryDate,
			"secondaryTime":secondryDate,
			"jobLink":jobLink,
			"programName":programName,
			"jobDescription":jobDescription
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"primaryTime": primaryDate,
			"secondaryTime":secondryDate,
			"jobLink":jobLink,
			"programName": programName,
			"jobDescription":jobDescription
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("error in sending email to technicians for meeting time updation :::::: ",{
			'err':err
		})
	}
}

/**
* This function sends email alert to customer for meeting time updation
* @params : Object
* @response : Email
* @author : Ridhima Dhir
*/
export const scheduleJobUpdatedByTechnicianToCustomer = async({firstName,email,primaryDate,secondryDate,programName,jobLink,jobDescription})=>{
	try{
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.SCHEDULE_JOB_UPDATED_BY_TECHNICIAN_TO_CUSTOMER_EMAIL)
		let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"primaryTime": primaryDate,
			"secondaryTime":secondryDate,
			"jobLink":jobLink,
			"programName":programName,
			"jobDescription":jobDescription
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"primaryTime": primaryDate,
			"secondaryTime":secondryDate,
			"jobLink":jobLink,
			"programName": programName,
			"jobDescription":jobDescription
		},subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
	}
	catch(err){
		logger.error("error in sending email to customer for meeting time updation :::::: ",{'err':err})
  }
}
export const mobileTabletJobPostEmail = async ({email, firstName, jobDescription, jobCreatedAt, programeName, jobLink}) =>{
	try{
		console.log('mobileTabletJobPostEmail::::',email, firstName, jobDescription, jobCreatedAt, programeName, jobLink)
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.MOBILE_TABLET_JOB_POST_EMAIL)
        let content = await filteredContent(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programeName,
			"jobDescription":jobDescription,
			"createdAt":jobCreatedAt,
			"jobLink":jobLink
        },tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"firstName":firstName,
			"programName": programeName,
			"jobDescription":jobDescription,
			"createdAt":jobCreatedAt,
			"jobLink":jobLink
        },subTags,subjectValue)
		await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
		return {success:true}	
	}catch (err){
		logger.error("error while sending mobileTabletJobPostEmail  to customer",{
            'err':err
        })
	}
}

/**
* Following function is responsible for sending email to technician regarding the additional hour(s) in long-job.
* @params : email(Type:String) , link(Type:String)
* @response : {void}
* @author : Sahil Sharma
*/

export const customerRejectAdditionalHours = async (email,firstName,programName,issueDescription,jobId) => {
    try {
        let link = `${process.env.mailEndpoint}dashboard?&checkJobId=${jobId}`
        let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.ADDITIONAL_HOURS_REJECTED)
        let content = await filteredContent(user_keys,{
            "email":email,
            "firstName":firstName,
            "programName":programName,
            "issueDesc":issueDescription,
            "login":link,
        },tags,contentValue)

        let subjectContent = await changeSubjectValue(user_keys,{
            "email":email,
            "firstName":firstName,
            "programName":programName,
            "issueDesc":issueDescription
        },subTags,subjectValue)
        await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})

    } catch (error) {
        console.log(">>>error in customerRejectAdditionalHours Email >>>>>>>>>>>>>>>>",error)
    }

};




/**

* Following function is responsible for sending email to technician regarding the additional hour(s) in long-job.
* @params : email(Type:String) , link(Type:String)
* @response : {void}
* @author : Sahil Sharma
*/

export const customerApproveAdditionalHours = async (email,firstName,programName,issueDescription,jobId) => {

    try {
        let link = `${process.env.mailEndpoint}dashboard?&checkJobId=${jobId}`
        let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.ADDITIONAL_HOURS_ACCEPTED)
        let content = await filteredContent(user_keys,{
            "email":email,
            "firstName":firstName,
            "programName":programName,
            "issueDescription":issueDescription,
            "login":link,
        },tags,contentValue)

        let subjectContent = await changeSubjectValue(user_keys,{
            "email":email,
    	    "firstName":firstName,
            "programName":programName,
            "issueDescription":issueDescription
        },subTags,subjectValue)
        await dynamicEmail({email,subject:subjectContent,text:content,previewtext:subjectContent})
    } catch (error) {
      	console.log(">>>error in customerApproveAdditionalHours Email >>>>>>>>>>>>>>>>",error)
    }

};


export const sendJobAlertEmailForSameTech = async ({ userData, jobData,redirectURL }) => {
	try {
		if( ! userData.blocked){
			let programName = jobData.subOption && jobData.subOption !== '' ? jobData.software.name+" " + "-" + jobData.subOption : jobData.software.name
			let acceptLink = `<a href="${process.env.mailEndpoint}login?email=${userData.email}&jobId=${jobData.id}&status=${'acceptjob'}" style="background-color: #4CAF50; 
								border: none;
								color: white;
								padding: 14px 49px;
								text-decoration: none;
								display: inline-block;
								font-size: 16px;
								margin: 4px 2px;
								cursor: hand;">Accept Job</a>`
			let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.New_JOB_ALERT_FOR_SAME_TECH)
			let content = await filteredContent(user_keys,{"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"jobDescription":jobData.issueDescription,
				"accept-job":acceptLink,
				"firstName":userData.firstName,

			},tags,contentValue)
			let subjectContent = await changeSubjectValue(user_keys,{
				"email":userData.email,
				"name":userData.firstName + " " + userData.lastName,
				"programName":programName,
				"caseNumber":jobData.JobId,
			},subTags,subjectValue)
			const msg = {
				from: 'Geeker Support Team <notifications@geeker.co>',
				to: userData.email,
				text: ' Are you available?',
				subject: subjectContent,
				html: content,
			}

			sendMailThroughSendgrid(msg,'sendJobAlertEmail')
		}    
	} catch (error) {
		logger.error("error in New job alert",{
            'err':error,
          })
	}
};

/**
* Following function is responsible for sending emails to all active stakeholders regarding the failed payments.
* @params : email(Type:String) , link(Type:String)
* @response : {void}
* @author : Mritunjay
*/
export const sendStripInfoEmailsToStakeholders = async({email,JobId,customerName,stripe_id,reason,status,jobId}) =>{

	try{
		let {tags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.STRIPE_INFO_EMAIL_TO_STAKEHOLDERS)
		let content = await filteredContent(user_keys,{
			"email":email,
			"JobId" : jobId !== 'NA' ? `<a href="${process.env.REACT_APP_ADMIN_URL}${jobId}">${JobId}</a>` : 'NA',
			"customerName":customerName,
			"stripe_id":stripe_id,
			"status":status,
			"reason":reason,

		},tags,contentValue)
		await dynamicEmail({email,subject:subjectValue,text:content,previewtext:subjectValue})
	}
	catch(err){
		logger.error("error in send emails to stakeholders",
			{
				'err':err,
			}
		);
	};
};

/**
* Following function is responsible for sending emails to all admin for deleted customer account.
* @params : email(Type:String) , link(Type:String)
* @response : {void}
* @author : Nafees
*/
export const customerDeletedAccount = async({email,custUserId,custEmail,totalJobCompleted,createdAt,customerName,totalJobs}) =>{
console.log("Customer deleted Account",email,custEmail);
	try{
		const encodedLink = `${process.env.REACT_APP_ADMIN_URL_DELETE}user_details/${custUserId}`;
		console.log("link124>>>>>>",encodedLink);
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.CUSTOMER_DELETED_ACCOUNT)
		let content = await filteredContent(user_keys,{
			"email":email,
			"customer_user_id":custUserId,
			"customerEmail":`<a href="${encodedLink}">${custEmail}</a>`,
			"createdAt":createdAt,
			"custName":customerName,
			"totalJobs":totalJobs,
			"totalCompletedJobs":totalJobCompleted
		},tags,contentValue)
		let subjectContent = await changeSubjectValue(user_keys,{
			"email":email,
			"customer_user_id":custUserId,
			"customerEmail":`<a href="${encodedLink}">${custEmail}</a>`,
			"createdAt":createdAt,
			"custName":customerName,
			"totalJobs":totalJobs,
			"totalCompletedJobs":totalJobCompleted
        },subTags,subjectValue)
		await dynamicEmail({email,subject:subjectValue,text:content,previewtext:subjectValue})
	}
	catch(err){
		logger.error("error in send emails to stakeholders",
			{
				'err':err,
			}
		);
	};
};

/**
* Following function is responsible for sending email to management team members regarding the job posted.
* @params : email(Type:String), event(Type:String),  job(Type:Object)
* @response : {void}
* @author : Vinit
*/
export const sendEmailToManagementTeamMember = async (stakeholder, event, job) => {
	try {
		logger.info("Preparing email for " + stakeholder.email + " for " + event, {email:stakeholder.email, event})
		let { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDER_WHEN_JOB_POSTED)
		let	adminJobDetailLink  = "<a href='"+process.env.REACT_APP_ADMIN_PAGE+"/service_details/"+job.id+"'>"+`${process.env.REACT_APP_ADMIN_PAGE}/service_details/${job.id}`+"</a>"
		logger.info("vars from filteredTags()", {tags, subTags, contentValue, subjectValue})
		let content = await filteredContent(user_keys,{
			"event":event,
			"customerName":job.customer.user.firstName + " " + job.customer.user.lastName ,
			"software":job.software.name,
			"JobId":job.JobId,
			"jobDescription":job.issueDescription,
			'adminJobDetailLink':adminJobDetailLink,
			"recipientName":stakeholder.name
		},tags,contentValue)
		 let subjectContent = await changeSubjectValue(user_keys,{
            "event":event,
			"customerName":job.customer.user.firstName + " " + job.customer.user.lastName ,
			"software":job.software.name,
			"jobDescription":job.issueDescription,
			'JobId':job.JobId,
			"recipientName":stakeholder.name
        },subTags,subjectValue)
		logger.info("Final content to send in email	", content)
		await dynamicEmail({email:stakeholder.email,subject:subjectContent,text:content,previewtext:subjectContent})
	} catch (error) {
		logger.error("Error in sendEmailToManagementTeamMember ", {error})
	}
}

/**
* Following function is responsible for sending email to admin emails regarding the business info provided by user.
* @params : 
* @response : {void}
* @author : Vinit
*/
export const sendEmailToaAdminForBusinessInfo = async (data) => {
	try {
		logger.info("Preparing email for admin with business info ", {data:data})
		let { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.EMAIL_ADMIN_BUSINESS_INFO)
		logger.info("vars from sendEmailToaAdminForBusinessInfo", {tags, subTags, contentValue, subjectValue, data})
		let content = await filteredContent(user_keys,{
			"customerName":data.userName,
			"businessName":data.businessName,
			"businessWebsite":data.businessWebsite,
			"industry":data.industry,
			"teamSize":data.teamSize
		},tags,contentValue)
		logger.info("Final content to send in email	", {content})
		const all_admin_emails = JSON.parse(process.env.adminMails)
		all_admin_emails.forEach(async (email)=>{
			console.log("My console at sendEmailToaAdminForBusinessInfo is ", email)
			await dynamicEmail({email:email,subject:subjectValue,text:content,previewtext:subjectValue})
		})
		
	} catch (error) {
		logger.error("Error in sendEmailToManagementTeamMember ", {error})
  }
}

/**
 * Following function is for sending email for job accept by tech to management team 
 * @params: email, event, data, custName
 * @author: Mamta
 */

export const sendEmailForTechAcceptJobToManagementTeamMembers = async (stakeholder, data, event, custName) =>{
	
	try{
		let jobId = data.mainJob.JobId;
		let jobIssue = data.mainJob.issueDescription;
		let techName = data.technicianName;
		let softName = data.mainJob.software.name;
		let	adminJobDetailLink  = "<a href='"+process.env.REACT_APP_ADMIN_PAGE+"/service_details/"+data.mainJob.id+"'>"+`${process.env.REACT_APP_ADMIN_PAGE}/service_details/${data.mainJob.id}`+"</a>"
		logger.info("Preparing Email for " + stakeholder.email + "for" + event, {email:stakeholder.email, event})
		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDER_WHEN_JOB_ACCEPTED)
		logger.info("vars from filteredTags()", {tags, subTags, contentValue, subjectValue})
	    let content = await filteredContent(user_keys,{
			"event":event,
			"caseNumber": jobId, 
			"customerName":custName,
			"jobDescription":jobIssue,
			"techName":techName,
			'software':softName,
			'adminJobDetailLink':adminJobDetailLink,
			"recipientName":stakeholder.name
		},tags,contentValue)
	    let subjectContent = await changeSubjectValue(user_keys,{
            "event":event,
			"caseNumber": jobId, 
			"customerName":custName,
			"jobDescription":jobIssue,
			"techName":techName,
			'software':softName,
			"recipientName":stakeholder.name
        },subTags,subjectValue)
		logger.info('Final content to send in email for job accept ', content)
       await dynamicEmail({email:stakeholder.email,subject:subjectContent,text:content,previewtext:subjectContent})
	}catch(err){
		logger.error("Error in sendEmailForTechAcceptJobToManagementTeamMembers ", err);
		console.log("Error in sendEmailForTechAcceptJobToManagementTeamMembers ", err)
	}
}

/**
* Following function is responsible for sending email to admin emails regarding the business info provided by user.
* @params : 
* @response : {void}
* @author : Vinit
*/
export const sendEmailToaAdminForLeavingUser = async (data) => {
	try {
		logger.info("Preparing email for admin about leaving user ", {data:data})
		let { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.EMAIL_ADMIN_FOR_LEAVING_CUSTOMER)
		logger.info("vars from sendEmailToaAdminForLeavingUser", {tags, subTags, contentValue, subjectValue, data})
		let content = await filteredContent(user_keys,{
			"customerEmail":data.customerEmail
		},tags,contentValue)
		logger.info("Final content to send in email	", {content})
		const all_admin_emails = JSON.parse(process.env.adminMails)
		all_admin_emails.forEach(async (email)=>{
			console.log("My console at sendEmailToaAdminForLeavingUser is ", email)
			await dynamicEmail({email:email,subject:subjectValue,text:content,previewtext:subjectValue})
		})
		
	} catch (error) {
		logger.error("Error in sendEmailToManagementTeamMember ", {error})
	}
}

  /**
 * following function is for sending jobCancelByCustomer to management team
 * @params:stakeholder, data,customerName
 * @author:Mamta
 */
 export const sendEmailToManagementTeamForJobCancelledByCustomer = async (stakeholder, data, customerName)=> {
 	try{
 		let softName = data.software.name;
 		let jobId = data.JobId;
 		let jobDes = data.issueDescription;
 		let	adminJobDetailLink  = "<a href='"+process.env.REACT_APP_ADMIN_PAGE+"/service_details/"+data.id+"'>"+`${process.env.REACT_APP_ADMIN_PAGE}/service_details/${data.id}`+"</a>"
 		logger.info("Preparing Email for "+ stakeholder.email + "for job Cancelled by customer");
 		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDER_WHEN_JOB_CANCELLED_BY_CUSTOMER)
		logger.info("vars from filteredTags()", {tags, subTags, contentValue, subjectValue})
	    let content = await filteredContent(user_keys,{
			"software":softName,
			"caseNumber": jobId, 
			"customerName":customerName,
			"jobDescription":jobDes,
			'adminJobDetailLink':adminJobDetailLink,
			"recipientName":stakeholder.name
		},tags,contentValue)
         let subjectContent = await changeSubjectValue(user_keys,{
           "software":softName,
			"caseNumber": jobId, 
			"customerName":customerName,
			"jobDescription":jobDes,
			"recipientName":stakeholder.name
        },subTags,subjectValue)
 		logger.info('Final content to send in email for job cancellation ', content)
        await dynamicEmail({email:stakeholder.email,subject:subjectContent,text:content,previewtext:subjectContent})
 	}catch(error){
 		logger.info('Error in sendEmailToManagementTeamForJobCancelledByCustomer ', {error});
 		console.log('Error in sendEmailToManagementTeamForJobCancelledByCustomer ', error);
 	}
 }

/**
 * following function is for sending CustomerDeclined the tech to management team
 * @params:stakeholder, jobType,techName,custName
 * @author:Mamta
 */
 
 export const sendEmailToManagmentTeamForCustDeclinedTech = async(stakeholder,job, jobType,techName,custName)=>{
 	try{
 		let softName = job.job.software.name;
 		let jobId = job.job.JobId;
 		let jobDes = job.job.issueDescription;
 		let	adminJobDetailLink  = "<a href='"+process.env.REACT_APP_ADMIN_PAGE+"/service_details/"+job.job.id+"'>"+`${process.env.REACT_APP_ADMIN_PAGE}/service_details/${job.job.id}`+"</a>"
 		let {tags,subTags,contentValue,subjectValue} = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDER_WHEN_CUSTOMER_DECLINED_TECHNICIAN)
 	    let content = await filteredContent(user_keys,{
 	    	'software':softName,
 	    	'caseNumber': jobId,
 	    	'techName':techName,
 	    	'customerName':custName,
 	    	"jobDescription":jobDes,
  			"adminJobDetailLink":adminJobDetailLink,
 	      "recipientName":stakeholder.name,
 	    },tags, contentValue);
 		 let subjectContent = await changeSubjectValue(user_keys,{
           'software':softName,
 	    	'caseNumber': jobId,
 	    	'techName':techName,
 	    	'customerName':custName,
 	    	"jobDescription":jobDes,
			"adminJobDetailLink":adminJobDetailLink,
 	        "recipientName":stakeholder.name,
        },subTags,subjectValue)
 		logger.info('Finally content to send in email for job cancellation ', content)
        await dynamicEmail({email:stakeholder.email,subject:subjectContent,text:content,previewtext:subjectContent})
 	}catch(error){
 		console.log('Error in sendEmailToManagmentTeamForCustDeclinedTech ', error);
 	}
 	
 }
 
/**
 * Following function sending email to stakers for job complete
 * @params:(stakeholder,event, jobData, JobId, jobDes,custName, techName,totalTime,totalCost,paymentStatus,jobId,softName
 * @author:Mamta
 */
 
 export const sendEmailToStakeholdersForCompleteJob=async(stakeholder,event, jobData, JobId, jobDes,custName, techName,totalTime,totalCost,payments,jobId,softName,payment_failed_reason='NA')=>{
 	try{
 		//console.log('stakeholder >>>>>>>>>>>>>>>>>>>>type', event,jobData)
 		let paymentStatus = (typeof payments !== 'undefined') ? payments : 'NA';
 	    let	adminJobDetailLink  = "<a href='"+process.env.REACT_APP_ADMIN_PAGE+"/service_details/"+jobId+"'>"+`${process.env.REACT_APP_ADMIN_PAGE}/service_details/${jobId}`+"</a>"
  		logger.info("Preparing email for " + stakeholder.email + " for job Started")
  		const { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDERS_JOB_COMPLETED)
  		
  		 const content= await filteredContent(user_keys,{
			'software':softName,
  			'issueText':jobDes,
  			'JobId':JobId,
  			'event':event,
  			'techName':techName,
  			'customerName':custName,
  			'totalTime':totalTime,
  			'totalCost':totalCost,
  			'paymentStatus':paymentStatus,
  			'recipientName':stakeholder.name,
  			'adminJobDetailLink':adminJobDetailLink,
			'failedReason':payment_failed_reason
  		},tags,contentValue)
  		let subjectContent = await changeSubjectValue(user_keys,{
  			'software':softName,
  			'issueText':jobDes,
  			'JobId':JobId,
  			'event':event,
  			'techName':techName,
  			'customerName':custName,
  			'totalTime':totalTime,
  			'totalCost':totalCost,
  			'paymentStatus':paymentStatus,
  			'recipientName':stakeholder.name,
  			'adminJobDetailLink':adminJobDetailLink,
			'failedReason':payment_failed_reason

        },subTags,subjectValue)
  		
  		await dynamicEmail({ email:stakeholder.email, subject: subjectContent, text: content, previewtext: subjectContent })
  	}catch(error){
  		console.log("Error in sendEmailToStakeholdersForCompleteJob ", error)
  	}
 }

 /**
 * Following function sending email to stakers for job complete but payment failed with reason
 * @params:(stakeholder,event, jobData, JobId, jobDes,custName, techName,totalTime,totalCost,paymentStatus,jobId,softName
 * @author:Nafees
 */
 
 export const sendEmailToStakeholdersForCompleteJobPaymentFailed=async(stakeholder,event, jobData, JobId, jobDes,custName, techName,totalTime,totalCost,payments,jobId,softName,payment_failed_reason='NA')=>{
	try{
		//console.log('stakeholder >>>>>>>>>>>>>>>>>>>>type', event,jobData)
		let paymentStatus = (typeof payments !== 'undefined') ? payments : 'NA';
		let	adminJobDetailLink  = "<a href='"+process.env.REACT_APP_ADMIN_PAGE+"/service_details/"+jobId+"'>"+`${process.env.REACT_APP_ADMIN_PAGE}/service_details/${jobId}`+"</a>"
		 logger.info("Preparing email for " + stakeholder.email + " for job Started")
		 const { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDERS_JOB_COMPLETED_PAYMENT_FAILED)
		 
		  const content= await filteredContent(user_keys,{
		   'software':softName,
			 'issueText':jobDes,
			 'JobId':JobId,
			 'event':event,
			 'techName':techName,
			 'customerName':custName,
			 'totalTime':totalTime,
			 'totalCost':totalCost,
			 'paymentStatus':paymentStatus,
			 'recipientName':stakeholder.name,
			 'adminJobDetailLink':adminJobDetailLink, 
			 'failedReason':payment_failed_reason
		 },tags,contentValue)
		 let subjectContent = await changeSubjectValue(user_keys,{
			 'software':softName,
			 'issueText':jobDes,
			 'JobId':JobId,
			 'event':event,
			 'techName':techName,
			 'customerName':custName,
			 'totalTime':totalTime,
			 'totalCost':totalCost,
			 'paymentStatus':paymentStatus,
			 'recipientName':stakeholder.name,
			 'adminJobDetailLink':adminJobDetailLink,
		    'failedReason':payment_failed_reason

	   },subTags,subjectValue)
		 
		 await dynamicEmail({ email:stakeholder.email, subject: subjectContent, text: content, previewtext: subjectContent })
	 }catch(error){
		 console.log("Error in sendEmailToStakeholdersForCompleteJob ", error)
	 }
}
 
export const stakeHolderMailTechnicianChargeNo=async(stakeholder,event,JobId, jobDes,custName, techName,totalTime,totalCost,payments,jobId,softName,techReason)=>{
	try{
		console.log('stakeHolderMailTechnicianChargeNo', techReason)
		let paymentStatus = (typeof payments !== 'undefined') ? payments : 'NA';
		let	adminJobDetailLink  = "<a href='"+process.env.REACT_APP_ADMIN_PAGE+"/service_details/"+jobId+"'>"+`${process.env.REACT_APP_ADMIN_PAGE}/service_details/${jobId}`+"</a>"
		 logger.info("Preparing email for " + stakeholder.email + " for job Started")
		 const { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDER_TECHNICIAN_NOT_CHARGED)
		 
		  const content= await filteredContent(user_keys,{
		   	'software':softName,
			 'issueText':jobDes,
			 'JobId':JobId,
			 'event':event,
			 'techName':techName,
			 'customerName':custName,
			 'totalTime':totalTime,
			 'totalCost':totalCost,
			 'recipientName':stakeholder.name,
			 'adminJobDetailLink':adminJobDetailLink,
			 'reason':techReason,
		   
		 },tags,contentValue)
		 let subjectContent = await changeSubjectValue(user_keys,{
			 'software':softName,
			 'issueText':jobDes,
			 'JobId':JobId,
			 'event':event,
			 'techName':techName,
			 'customerName':custName,
			 'totalTime':totalTime,
			 'totalCost':totalCost,
			 'recipientName':stakeholder.name,
			 'adminJobDetailLink':adminJobDetailLink,
			 'reason':techReason,

	   },subTags,subjectValue)
		 
		 await dynamicEmail({ email:stakeholder.email, subject: subjectContent, text: content, previewtext: subjectContent })
	 }catch(error){
		 console.log("Error in sendEmailToStakeholdersForCompleteJob ", error)
	 }
}
 
 /**
 * Following function is responsible to send email to stakeholders that tech declined sch job which is not he/she interested to take
 * @params:stakeholder, job, techName
 * @author:Mamta
 */
 export const sendEmailToStakeholderTechDeclinedSchJob=async(stakeholder, job,techName)=>{
 	try{
 		let custName = job.customer.user.firstName +" "+ job.customer.user.lastName;
  		let softname = job.software.name;
  		let jobDes = job.issueDescription;
  		let jobId = job.JobId;
 		logger.info("Sending email " + stakeholder.email + " for SchJob declined by tech")
    	const { tags, subTags, contentValue, subjectValue } = await filteredTags(dataBase_emailKeys.INFORM_GEEKER_STAKEHOLDER_WHEN_TECH_DECLINED_SCH_JOB)
    	const content= await filteredContent(user_keys,{
			'software':softname,
  			'issueText':jobDes,
  			'JobId':jobId,
  			'customerName':custName,
  			'techName':techName,
  			'recipientName':stakeholder.name
  		},tags,contentValue)
  		let subjectContent = await changeSubjectValue(user_keys,{
            'issueText':jobDes,
  			'JobId':jobId,
  			'customerName':custName,
  			'recipientName':stakeholder.name
        },subTags,subjectValue)
  		
  		await dynamicEmail({ email:stakeholder.email, subject: subjectContent, text: content, previewtext: subjectContent })
 	}catch(error){
 		console.log('Error in sendEmailToStakeholderTechDeclinedSchJob ', error)
 	}
 }
 