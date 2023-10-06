import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface INotfication extends Document {
  title: string;
  user:string[];
  job:string[];
  actionable:boolean;
  read:boolean;
  type:string;
  estimate_earning:string;
  deleted:boolean;
  customer:string[];
  businessName : string;
}

export interface INotficationModel extends Model<INotfication> {}

export const notificationSchema = new Schema({
  _id: {
    type: String,
    default: () => `notify_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref:'User'
  },
  actionable :{
    type:Boolean
  },
  job: {
    type: String,
    ref: 'Job',
  },
  read :{
    type:Boolean,
    default:false
  },
  title:{
    type: String,
  },
  estimate_earning:{
    type: String,
  },
  type:{
    type: String,
  },
  shownInBrowser :{
    type:Boolean,
    default:false
  },deleted :{
    type:Boolean,
    default:false
  },
  customer: {
    type: String,
    ref:'Customer'
  },
  businessName : {type: String, default:''}
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });




const Notification = mongoose.model<INotfication, INotficationModel>('Notifications', notificationSchema);

export default Notification;
