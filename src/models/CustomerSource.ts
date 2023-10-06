import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ICustomerSource extends Document {
  name: string;
  user: string;
  source: string;
}

export interface ICustomerSourceModel extends Model<ICustomerSource> {}

const customerSourceFromSchema = new Schema({
  _id: {
    type: String,
    default: () => `cs_${Random.id()}`,
    required: true
  },
   user: {
    type: String,
    ref: 'User',
  },
  source:String 
},{timestamps: true});


const CustomerSource = mongoose.model<ICustomerSource, ICustomerSourceModel>('CustomerSource', customerSourceFromSchema);

export default CustomerSource;

