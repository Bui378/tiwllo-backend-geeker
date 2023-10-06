import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IBillingDetails extends Document {
  job_id: string;
  customer_user_id: string;
  technician_user_id: string;
  total_amount: Number;
  transaction_type: String;
  transaction_status: String;
  is_stripe_called : Boolean;
}

export interface IBillingDetailsModel extends Model<IBillingDetails> {}

const billingDetailsSchema = new Schema({
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
  transaction_type:String,
  transaction_status:String,
  is_stripe_called:Boolean
},{timestamps: true});


const BillingDetails = mongoose.model<IBillingDetails, IBillingDetailsModel>('BillingDetails', billingDetailsSchema);

export default BillingDetails;
