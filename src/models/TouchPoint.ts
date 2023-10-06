import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ITouchPoint extends Document {
  name: string;
  level: string;
  status: string;
}

export interface ITouchPointModel extends Model<ITouchPoint> {}

const touchPointsSchema = new Schema({
  _id: {
    type: String,
    default: () => `tp_${Random.id()}`,
    required: true
  },
  level: String,
  status: String
},{timestamps: true});


const TouchPoint = mongoose.model<ITouchPoint, ITouchPointModel>('TouchPoint', touchPointsSchema);

export default TouchPoint;
