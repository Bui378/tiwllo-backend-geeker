import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ITypeService extends Document {
  name: string;
}

export interface ITypeServiceModel extends Model<ITypeService> {}

const typeServiceSchema = new Schema({
  _id: {
    type: String,
    default: () => `ts_${Random.id()}`,
    required: true
  },
  name: {
    type: String,
    required: true,
  },
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });

const TypeService = mongoose.model<ITypeService, ITypeServiceModel>('TypeService', typeServiceSchema);

export default TypeService;
