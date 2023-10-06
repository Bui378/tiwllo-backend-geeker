import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IJobNotificationHistory extends Document {
  job:string[];
  technician:string[];
  jobType:string;
  browser_notification_sent:Boolean;
  browser_notification_sent_at:Date;
  email:string;
  email_sent:Boolean;
  email_sent_at:Date;
  sms_phone_number:string;
  sms_sent:Boolean;
  sms_sent_at:Date;
}

export interface IJobNotificationHistoryModel extends Model<IJobNotificationHistory> {}

export const jobNotificationHistorySchema = new Schema({
  _id: {
    type: String,
    default: () => `notificationHistory_${Random.id()}`,
    required: true
  },
  jobType:{
    type: String,
  },
  job: {
    type: String,
    ref: 'Job',
  },
  technician: {
    type: String,
    ref: 'user',
  },
  browser_notification_sent: {
    type:Boolean,
    default:false
  },
  browser_notification_sent_at:{
    type:Date || null,
    default:null
  },
  email:{
    type: String,
  },
  email_sent :{
    type:Boolean,
    default:false
  },
  email_sent_at:{
    type:Date || null,
    default:null
  },
  sms_phone_number:{
    type: String,
  },
  sms_sent :{
    type:Boolean,
    default:false
  },
  sms_sent_at:{
    type:Date || null,
    default:null
  },
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });




const JobNotificationHistory = mongoose.model<IJobNotificationHistory, IJobNotificationHistoryModel>('JobNotificationHistorys', jobNotificationHistorySchema);

export default JobNotificationHistory;
