import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IAppliedCoupons extends Document {
  customer:string,
  user:string,
  coupon_id:string,
  subscription_id:string,
}

export interface IAppliedCouponsModel extends Model<IAppliedCoupons> {}

const appliedCouponSchema = new Schema({
  _id: {
    type: String,
    default: () => `appliedCoupon_${Random.id()}`,
    required: true
  },
  customer:{
    type:String,
    ref:"Customer",
  },
  user:{
    type:String,
    ref:"User",
  },
  coupon_id:{
    type:String,
  },
  subscription_id:{
    type:String,
  },

},{timestamps: true});

const AppliedCoupon = mongoose.model<IAppliedCoupons, IAppliedCouponsModel>('AppliedCoupons', appliedCouponSchema);

export default AppliedCoupon;
