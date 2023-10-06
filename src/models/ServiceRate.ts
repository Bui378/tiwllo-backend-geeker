import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IServiceRate extends Document {
  rate: string;
  user: string;
}

export interface IServiceRateModel extends Model<IServiceRate> {}

const serviceRateSchema = new Schema({
  _id: {
    type: String,
    default: () => `rs_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User',
  },
  serviceId: String,
  rate: String,
  recording: String,
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });

const ServiceRate = mongoose.model<IServiceRate, IServiceRateModel>('ServiceRate', serviceRateSchema);

export default ServiceRate;
