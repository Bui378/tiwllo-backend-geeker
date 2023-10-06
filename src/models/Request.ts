import mongoose, { Document, Schema, Model } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IRequest extends Document {
  response: {
    status: string,
    body: any;
  };
}

export interface IRequestModel extends Model<IRequest> {
}

export const RequestSchema = new Schema({
  _id: {
    type: String,
    default: () => `req_${Random.id()}`,
    required: true
  },
  request: {
    ip: String,
    url: String,
    queryString: String,
    user: {
      type: String,
      ref: 'User'
    },
    method: String,
    body: mongoose.SchemaTypes.Mixed
  },
  response: {
    status: String,
    body: mongoose.SchemaTypes.Mixed
  }
}, {_id: false, timestamps: true});

const Request = mongoose.model<IRequest, IRequestModel>('Request', RequestSchema);
export default Request;
