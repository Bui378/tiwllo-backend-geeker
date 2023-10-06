import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ISubscribe extends Document {
  email: String;
}

export interface ISubscribeModel extends Model<ISubscribe> {}

const subscribeSchema = new Schema({
  _id: {
    type: String,
    default: () => `s_${Random.id()}`,
    required: true
  },
  email:String,

},{timestamps: true});


const Subscribe = mongoose.model<ISubscribe, ISubscribeModel>('Subscribe', subscribeSchema);

export default Subscribe;
