import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IReferalDiscount extends Document {
  name: string;
  customer:string;
  refered_by:string;
  discountType:string;
  discountNumber:number;
  refered_people_count : number;
}

export interface IReferalDiscountModel extends Model<IReferalDiscount> {}

const referalDiscountSchema = new Schema({
  _id: {
    type: String,
    default: () => `rd_${Random.id()}`,
    required: true
  },
  customer: {
    type:String,
    ref:'Customer'
  },
  refered_by: {
    type:String,
    ref:'Customer'
  },
  discountType:String,
  discountNumber:{
    type:Number,
    default:0,
  },
  refered_people_count:{
      type:Number,
      default:0
    }

}, {timestamps: true, toJSON: { virtuals: true } });
referalDiscountSchema.index({customer: 1}, {unique: true});
const referalDiscount = mongoose.model<IReferalDiscount, IReferalDiscountModel>('ReferalDiscount', referalDiscountSchema);

export default referalDiscount;
