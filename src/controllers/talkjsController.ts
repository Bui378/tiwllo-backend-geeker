  /**
	 * This controller handles the webhooks from talkjs.com.
	 * @params =  req from talkjs.com
	 * @response : res to talkjs.com
	 * @author : Vinit
	 */
  import User from "../models/User";
  import Customer from "../models/Customer"
  import Technician from "../models/Technician"
  import Job from "../models/Job"
  import Software from "../models/Software"
  import Notification from "../models/Notifications";
  import {sendSmsToNumber} from "../services/TextService"
  import {sendMailThroughSendgrid,newEmail} from "../services/MailService";
  var myModule = require('../app');
  require('dotenv').config();
   let logger = require('../../winston_logger');
   logger = logger("talkjsController.ts");
   export const handleWebHooks = async (req,res) => {
     const obj = req.body;
     const event = obj.type;

     if(event === "notification.triggered"){
       const recipient_id = obj.data.recipient.id;
       logger.info("id of recipient from chat ", {'recipient_id': recipient_id });
       const sender_name = obj.data.sender.name;
       
       var regExp = /\(([^)]+)\)/;
       const id_arr = regExp.exec(obj.data.conversation.subject);
       const job_id = id_arr[1];

       logger.info("id of job from chat ", {'job_id': job_id });

      const job_data = await Job.findOne({_id: job_id});
      const software_data = await Software.findOne({_id: job_data.software})
      const userData = await User.findOne({_id: recipient_id})
      if(userData !== null){
        const num_of_messages = obj.data.messages.length;
        logger.info("Number of messages send", {'num of messages': num_of_messages });
        const tech_data = await Technician.findOne({user: userData._id})
        const cust_data = await Customer.findOne({user: userData._id})
        const send_to_email = userData.email;   
        
       /**
       * This function sends text message notification to user.
       * @author : Vinit
       */
        const sendTextMessage = (job_id) => {
          let phoneNumber;
          let link =`${process.env.mailEndpoint}dashboard?&checkJobId=${job_id}`;
          if(tech_data !== null){
            phoneNumber = tech_data.profile.confirmId.phoneNumber;
            logger.info("Data of technician", {'tech_data': tech_data });
          }
          else if(cust_data !== null){
            phoneNumber = cust_data.phoneNumber;
            logger.info("Data of customer", {'cust_data': cust_data });
          }
          
          let jobType = job_data && job_data.is_long_job && job_data.is_long_job === true ? 'Long Job' : 'Schedule job'

          const message = `Geeker - Hi you have received new message from ${sender_name} on ${jobType} with ${software_data.name} `
          sendSmsToNumber(phoneNumber, message, job_id);
         }
         
         const savingNotification = async () => {
          const save_data = {
            user: userData._id,
            actionable : true,
            job: job_id,
            read: false,
            title: `${num_of_messages} unread messages`,
            type: 'long_job_notification',
            shownInBrowser: false,
          }
          const notification = new Notification(save_data);
          await notification.save((err)=>{
            if(err){
              console.log(err);
            }
          })
         }

        sendTextMessage(job_id);
        let messagecount = num_of_messages;
        let sendername = sender_name;
        let sendtoEmail = send_to_email;
        let software = software_data['name']
        let link =`${process.env.mailEndpoint}dashboard?&checkJobId=${job_id}`;
        await newEmail({
          messageCount: messagecount,
          senderName: sendername,
          login : link,
          email : sendtoEmail,
          programeName : software
        });
        await savingNotification();
        myModule.io.emit("refresh-notifications")
      }
     
     res.status(200).send('Success');
     
    }
   }