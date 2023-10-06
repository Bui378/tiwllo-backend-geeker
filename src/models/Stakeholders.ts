import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IStakeholder extends Document {
    name:string;
    email:string;
    phone:string;
    job_flow:string;
    stripe_errors:string;
    notification_preferences:string;
}

export interface IStakeholderModel extends Model<IStakeholder> {}

export const StakeholderSchema = new Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
  },
  email:{
    type: String,
  },
  phone:{
    type: String,
  },
  job_flow:{
    type: String,
  },
  stripe_errors:{
    type: String,
  },
  notification_preferences:{
    type:String,
  },
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });




const Stakeholder = mongoose.model<IStakeholder, IStakeholderModel>('Stakeholders', StakeholderSchema);

export default Stakeholder;
