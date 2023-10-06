import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IServiceProvider extends Document {
  name: string;
}

export interface IServiceProviderModel extends Model<IServiceProvider> {}

const serviceProviderSchema = new Schema({
  _id: {
    type: String,
    default: () => `sp_${Random.id()}`,
    required: true
  },
  name: String,
  phone: String,
  email: String,
  address: {
    city: String,
    state: String,
  },
  specialities: Array,
  stateId: String,
  education: String,
  certificate: String,
  expertise: String,
  message: String,
  user: {
    type: String
  },
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });

const ServiceProvider = mongoose.model<IServiceProvider, IServiceProviderModel>('ServiceProvider', serviceProviderSchema);

export default ServiceProvider;
