import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';
import Customer from './Customer';
import Job from './Job';
export interface IDiscountHistory extends Document {
  customer:string;
  modelType:string;
  spentAmount:number;
  spentType:number;
  spentOn:number;
  initalAmount:number;
  newAmount:number;
  spentFor:string;
  transactionFor:any;

}

export interface IDiscountHistoryModel extends Model<IDiscountHistory> {
}

const discountHistorySchema = new Schema({
  _id: {
    type: String,
    default: () => `discount_${Random.id()}`,
    required: true
  },
  modelType:{
    type:String,
    enum : ['Customer','Subscribe','Job']
  },
  customer:{
    type:String,
    ref:"Customer"
  },
  spentFor:{
      type:String,
      enum : ['job','subscription','referal']
  },
  spentAmount:{
    type:Number,
    default:0,
  },
  spentType:{
    type:String,
    enum:['credit','debit']
  },
  spentOn:{
    type:String,
    refPath:'modelType',
  },
  initalAmount :{
    type:Number,
    default : 0,
  },
  newAmount :{
    type:Number,
    default:0,
  }
  
},{timestamps: true});



discountHistorySchema.virtual("job", {
  ref: "Job",
  localField: "spentFor",
  foreignField: "_id",
  justOne: true,
});
discountHistorySchema.virtual("referedCustomer", {
  ref: "Customer",
  localField: "spentFor",
  foreignField: "_id",
  justOne: true,
});


const DiscountHistory = mongoose.model<IDiscountHistory, IDiscountHistoryModel>('DiscountHistory', discountHistorySchema);

export default DiscountHistory;
