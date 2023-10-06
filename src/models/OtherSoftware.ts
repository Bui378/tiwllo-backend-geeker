import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IOtherSoftware extends Document {
  name: string;
  status: string;
}

export interface IOtherSoftwareModel extends Model<IOtherSoftware> {}

const softwareSchema = new Schema({
  _id: {
    type: String,
    default: () => `other_soft_${Random.id()}`,
    required: true
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'Active',
  },
}, { _id: false, timestamps: true});

const OtherSoftware = mongoose.model<IOtherSoftware, IOtherSoftwareModel>('other_softwares', softwareSchema);

export default OtherSoftware;
