import mongoose, { Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export const logSchema = new Schema({
  _id: {
    type: String,
    default: () => `log_${Random.id()}`,
    required: true
  },
  severity: {
    type: String,
    default: 'error'
  },
  request: {type: String, ref: 'Request'},
  message: String,
  stack: String
}, {_id: false, timestamps: true});

const Log = mongoose.model<any, any>('Log', logSchema);
export default Log;
