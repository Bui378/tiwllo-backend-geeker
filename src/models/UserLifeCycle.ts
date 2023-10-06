import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IUserLifeCycle extends Document {
  user: string;
  userType :string;
  actionType:string;
}

export interface IUserLifeCycleModel extends Model<IUserLifeCycle> {}

const userLifeCycleSchema = new Schema({
  _id: {
    type: String,
    default: () => `active_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User',
  },
  userType:{
    type:String
  },
  actionType:{
    type:String
  },

},{timestamps: true});

const UserLifeCycle = mongoose.model<IUserLifeCycle, IUserLifeCycleModel>('UserLifeCycle', userLifeCycleSchema);

export default UserLifeCycle;
