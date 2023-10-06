import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IPayCycle extends Document {
    From : Date;
    To : Date;
    createdAt : Date;
    updatedAt : Date;
    Status: string;
}

export interface IPayCycleModel extends Model<IPayCycle> {}

const paycycleSchema = new Schema({
  _id: {
    type: String,
    default: () => `pay_${Random.id()}`,
    required: true
  },
  From: {type:Date},
  To:{type:Date},
  createdAt: {type:Date},
  updatedAt: {type:Date},
  Status:{type:String}
  
},{timestamps: true});


const PayCycle = mongoose.model<IPayCycle, IPayCycleModel>('PayCycle', paycycleSchema);

export default PayCycle;
