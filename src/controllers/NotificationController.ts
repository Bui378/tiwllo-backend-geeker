import { Request, Response, NextFunction } from 'express';
import Notifications, { INotfication } from '../models/Notifications';
import User from '../models/User';
import InvalidRequestError from '../errors/InvalidRequestError';
import Customer from '../models/Customer';
let logger = require('../../winston_logger');
logger = logger("JobController.ts");

var request = require('request');

let jobFieldsForNotificationData = "_id customer technician software subSoftware expertise issueDescription estimatedTime estimatedPrice primarySchedule status scheduleDetails updatedIssueDescription guestJob tech_declined_ids declinedByCustomer schedule_accepted is_transferred is_transferred_notification_sent is_transferred_hire_expert post_again_reference_job post_again_reference_technician post_again createdAt updatedAt"

export async function create(req:Request,res:Response,next:NextFunction){
	try {
      console.log('NotificationsController create>>>>>>>>>>>>')

		const notification = new Notifications(req.body);
    	await notification.save();
    	const response = {message:"successfully Created"}
    	return res.json(response);
	}
	catch (err){
		logger.error("catch error : create: ",{'err':err, 'body':req.body});
	}
}

export async function list(req:Request,res:Response,next:NextFunction){

	try{
      	console.log('NotificationsController list>>>>>>>>>>>>')
		
		const query = Notifications.find({}).sort({createdAt:-1});
		const Notifications_res :INotfication[]  = await query
		.populate("user")
		.populate({
			path:"job",
			"select":jobFieldsForNotificationData
		})
		.sort({createdAt:-1})
		.limit(15).exec()
		// const Notifications 

		if (!Notifications_res) {
     		 throw new InvalidRequestError('Feedback does not exist.');
	    }
		
	    return res.json(Notifications_res);

	}
	catch(err){
		logger.error("catch error : list: ",{'err':err, 'body':req.body});
	}
}

export async function addBusinessNameToNotifications(allNotifications){
	try {
		let updatedNotificaiton = []
		allNotifications.forEach(async (item,idx) => {
			// console.log("item is >>>>",item)
			// console.log("idx is >>>>",idx)
			let newItem = item;
			newItem['businessName'] = 'NA';
			if(newItem.user && newItem.user.userType === 'customer'){

				if(newItem.user && newItem.user.isBusinessTypeAccount){
					if(newItem.user.roles && newItem.user.roles.indexOf('owner') !== -1){
						newItem['businessName'] = newItem.user.businessName
					}else if(newItem.user.roles && newItem.user.roles.indexOf('owner') === -1){
						if(newItem.user.ownerId){
							let ownerUserInfo = await User.findOne({_id:newItem.user.ownerId});
							if(ownerUserInfo){
								newItem['businessName'] = ownerUserInfo.businessName
								updatedNotificaiton.push(newItem)
							}else{
								updatedNotificaiton.push(newItem)
							}
						}else{
							updatedNotificaiton.push(newItem)		
						}
					}else{
						updatedNotificaiton.push(newItem)	
					}
				}else{
					updatedNotificaiton.push(newItem)	
				}
			}else{
				updatedNotificaiton.push(newItem)
			}
			// console.log("New Item is after updated ::::",newItem)
			// console.log("New Item is after updated businessName ::::",newItem.businessName)
			if(idx+1 === allNotifications.length){
				console.log("Going to return final notificaitons ::::",updatedNotificaiton)
				return updatedNotificaiton
			}
		});
	}
	catch(err){
		logger.error("catch error : while add business name in notifications: ",{'err':err, 'allNotifications':allNotifications});
		return allNotifications
	}

}

export async function findNotificationByParams(req:Request,res:Response,next:NextFunction){

	try{
      	console.log('NotificationsController findNotificationByParams>>>>>>>>>>>>')
		
		const params = req.body;
		// const query = Notifications.find(params);
		const query = Notifications.find({
			...params,
			deleted: false // Add this condition to exclude deleted notifications
		  });
		const Notifications_res  = await query.populate("user").populate({
			path:"job",
			populate:[{
				path:"customer",
				populate:{
					path:"user",
					model:"User"
				},
				select: ["user"],		
			},
			{
				path:"software",
				populate:"software",
				"select":["id name"]
			}
			],
			"select":jobFieldsForNotificationData
		}).sort({createdAt:-1}).limit(25).exec()
		if (!Notifications_res) {
     		 throw new InvalidRequestError('Feedback does not exist.');
	    }
		// console.log('Notifications_res ::::',Notifications_res)
		try {
			let updatedNotification = [];

			for (let i = 0; i < Notifications_res.length; i++) {
				const newItem = Notifications_res[i];
				const job = Notifications_res[i]['job'];
				const user = Notifications_res[i]['customer']
				// console.log("customer information ",user)				
				const resultCustomer = await Customer.findById(user).populate('user');
				// console.log("customer information particular ",resultCustomer);
				// const jobId = job['id'];
				if (resultCustomer['user'] && resultCustomer['user']['isBusinessTypeAccount'] && resultCustomer['user']['businessName']) {
					const businessName = resultCustomer['user']['businessName'];
					newItem['businessName'] = businessName;

				} else if (resultCustomer['user'] && resultCustomer['user']['ownerId']) {
					const ownerDetails = await User.findById(resultCustomer['user']['ownerId']);
					// console.log("ownerDetails", ownerDetails);
					if (ownerDetails && ownerDetails['businessName']) {
						newItem['businessName'] = ownerDetails['businessName'];
					} else {
						newItem['businessName'] = '';
					}
				} else {
					newItem['businessName'] = '';
				}
	
				// console.log("updatedNotificaitonupdatedNotificaitonupdatedNotificaiton ",{newItem})
				updatedNotification.push(newItem);
			}
			
			return res.json(updatedNotification);
			
		}
		catch(err){
			logger.error("catch error : while add business name in notifications: ",{'err':err, 'allNotifications_count':Notifications_res.length});
			// return allNotifications
			return res.json(Notifications_res);
		}

		/*try{

			let updated_notifications = await addBusinessNameToNotifications(Notifications_res);
			console.log('updated_notifications ::::----------------------------------------------------------------',updated_notifications)
			return res.json(updated_notifications);
		}catch(err2){
			console.log("Error after get upadtd notification is ",err2);
		}*/

	}
	catch(err){
		logger.error("catch error : error in returning notifications by param: ",{'err':err, 'body':req.body});
	}
}

export async function updateReadStatus(req:Request,res:Response,next:NextFunction){
	try{
      	console.log('NotificationsController updateReadStatus>>>>>>>>>>>>')

		const params = req.body
		const status = params.status
		delete params.status
		const query = Notifications.updateMany(params,{"read": status}).exec()

		return res.json({"success":true})
	}

	catch(err){
		logger.error("catch error : updateReadStatus: ",{'err':err, 'body':req.body});
	}
}

export async function updateByParams(req:Request,res:Response,next:NextFunction){
	try{
      	console.log('NotificationsController updateByParams>>>>>>>>>>>>')
		
		const params = req.body
		const status = params.shownInBrowser
		delete params.shownInBrowser
		await Notifications.updateMany(params,{"shownInBrowser": status}).exec()
		
		return res.json({"success":true})
	}catch(err){
		logger.error("catch error : updateByParams: ",{'err':err, 'body':req.body});
	}
}