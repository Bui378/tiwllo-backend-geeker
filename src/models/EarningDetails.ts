import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IEarningDetails extends Document {
  job_id: string;
  customer_user_id: string;
  technician_user_id: string;
  total_amount: Number;
  commision: Number;
  amount_earned: Number;
  transaction_type: String;
  transaction_status: String;
}

export interface IEarningDetailsModel extends Model<IEarningDetails> {}

const earningDetailsSchema = new Schema({
  _id: {
    type: String,
    default: () => `bd_${Random.id()}`,
    required: true
  },
  job_id: {
    type: String,
    ref: 'Job',
  },
  customer_user_id: {
    type: String,
    ref: 'User',
  },
  technician_user_id: {
    type: String,
    ref: 'User',
  },
  total_amount:Number,
  commision:Number,
  amount_earned:Number,
  transaction_type:String,
  transaction_status:String,

},{timestamps: true, toJSON: { virtuals: true }} );


const EarningDetails = mongoose.model<IEarningDetails, IEarningDetailsModel>('EarningDetails', earningDetailsSchema);

export default EarningDetails;
