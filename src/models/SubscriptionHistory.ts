import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ISubscribe extends Document {
  customer_id:String,
  plan_id: String,
  plan_name: String,
  total_minutes:Number,
  total_seconds:Number,
  time_used:Number,
  invoice_id: String,
  subscription: String,
  status: String,
  plan_purchased_date: Date,
  plan_inactive_date: Date,
  discount:Number
}

export interface ISubscribeModel extends Model<ISubscribe> {}

const subscriptionHistorySchema = new Schema({
    _id: {
        type: String,
        default: () => `sub_${Random.id()}`,
        required: true
      },
      customer_id:{
        type:String
      },
      plan_id: {
          type: String
      },
      plan_name:{
          type:String
      },
      total_minutes:{
          type:Number
      },
      total_seconds:{
          type:Number
      },
      time_used:{
          type:Number
      },
      invoice_id:{
          type:String
      },
      subscription_id:{
          type:String
      },
      status:{
          type:String
      },
      plan_purchased_date:{
          type:Date
      },
      plan_inactive_date:{
          type:Date
      },
      discount:{
          type:Number
      },

},{timestamps: true});


const SubscriptionHistory = mongoose.model<ISubscribe, ISubscribeModel>('SubscriptionHistory', subscriptionHistorySchema);

export default SubscriptionHistory;
