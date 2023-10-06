import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IActiveusers extends Document {
  user: string;
  ip:string;
  timezone:string;
  userType :string;
  experiences: string[];
  ratings:string;
  jobsSolved:string;
  expertExperiences:string[];
  technicianType:string;
}

export interface IActiveusersModel extends Model<IActiveusers> {}

const activeUserSchema = new Schema({
  _id: {
    type: String,
    default: () => `active_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User',
  },
  experiences:[{
    type:String,
    ref:"Software",
  }],
  ratings:{
    type:String
  },
  jobsSolved:{
    type:String
  },
  ip: {
    type: String,
  },
  userType:{
    type:String
  },
  expertExperiences:[{
    type:String,
    ref:"Software",
  }],
  technicianType:{
    type:String
  },

},{timestamps: true});

activeUserSchema.index({ user: 1 }, { unique: true });
const ActiveUser = mongoose.model<IActiveusers, IActiveusersModel>('ActiveUser', activeUserSchema);

export default ActiveUser;
