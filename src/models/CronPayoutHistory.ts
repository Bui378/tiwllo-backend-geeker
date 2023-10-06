import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ICronPayoutHistory extends Document {
  tech_id : string;
  tech_name : string;
  tech_email : string;
  total_earnings : Number;
  last_paid_amount: Number;
  transferDate : Date;
  From: Date;
  To: Date;
  Status: string;
  Reason:string
}

export interface ICronPayoutHistoryModel extends Model<ICronPayoutHistory> {}

const CronPayoutHistorySchema = new Schema({
  _id: {
    type: String,
    default: () => `cp_${Random.id()}`,
    required: true
  },
  techId : {type:String},
  techName : {type:String},
  techEmail : {type:String},
  total_earnings : {type:Number},
  transferDate:{type:Date},
  From:{type:Date},
  To:{type:Date},
  Status:{type:String},
  Reason:{type:String}
},{timestamps: true});


const CronPayoutHistory = mongoose.model<ICronPayoutHistory, ICronPayoutHistoryModel>('CronPayoutHistory', CronPayoutHistorySchema);

export default CronPayoutHistory;
