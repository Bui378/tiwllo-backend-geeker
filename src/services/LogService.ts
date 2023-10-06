const logger = require('../../winston_logger');
var req = require('request');


export const logs = async (action, fileName, requestBody = null, errorType, description, errorInfo=null, userId =null, JobId=null) =>{
	// let logInfo = {
	// 		'level':errorType,
	// 		'logDescription': description,
	// 		'fileName': fileName,
	// 		'action': action,
	// 		'requestBody': requestBody,
	// 		'detailInfo':errorInfo,
	// 		'userId': userId,
	// 		'JobId': JobId,
	// 		'createdAt':new Date(),
	// 	}
	// logger.log(errorType,logInfo);
	
}

