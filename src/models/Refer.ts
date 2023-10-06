import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IRefer extends Document {
  user: string;
  email:string;
  schedule_accepted :string;
  
}

export interface IReferModel extends Model<IRefer> {}

const referSchema = new Schema({
  _id: {
    type: String,
    default: () => `refer_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User',
  },
  email: String, 
  status : {
    type:String,
    default:'pending'
  },
},{timestamps: true});


const Refer = mongoose.model<IRefer, IReferModel>('Refer', referSchema);

export default Refer;
