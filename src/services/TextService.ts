let logger = require('../../winston_logger');
logger = logger("TextService.ts");

/**
 * Function is used to add plus sign from phone number being passed as parameter.
 * @params = phoneNumber (Type:String)
 * @response : Will return phone number with plus sign
 * @author : Kartar Singh
 */

function addPlusToPhoneNumber(phoneNumber) {
  console.log('newPhoneNumber with + ::',phoneNumber)
  if (!phoneNumber.startsWith("+")) {
    phoneNumber = "+" + phoneNumber;
    console.log('newPhoneNumber without + ::',phoneNumber)
  }
  return phoneNumber;
}

/**
 * Function is used to send sms to a number using twilio library. It will send smsBody to the destinationNumber.
 * @params = destinationNumber (Type:String), smsBody (Type:String),jobId (Type:String)
 * @author : Kartar Singh
 */
 export const sendSmsToNumber = async (destinationNumber, smsBody, jobId = false) => {
  try {
    destinationNumber = addPlusToPhoneNumber(destinationNumber)
    const accountSid = process.env.TWILLIO_ACCOUNT_SID;
    const authToken = process.env.TWILLIO_AUTH_TOKEN;
    const twillioPhoneNumber = process.env.TWILLIO_PHONE_NUMBER;
    const client = require('twilio')(accountSid, authToken);
    console.log("sendSmsToNumber :::", destinationNumber, smsBody)
    client.messages
      .create({
        body: smsBody,
        from: twillioPhoneNumber,
        to: destinationNumber
      })
      .then(message => logger.info("sendSmsToNumber: text message successfully sent: ", { 'destinationNumber': destinationNumber, 'smsBody': smsBody, 'jobId': jobId, 'message': message }))
      .catch(err =>
        logger.error("sendSmsToNumber: text message not successful: ", { 'err': err, 'jobId': jobId }))

  } catch (func_err) {
    logger.error("sendSmsToNumber: message not sent: ", {
      'err': func_err,
    });
  }
}

