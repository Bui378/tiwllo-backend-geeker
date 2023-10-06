import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ISoftwareExperience extends Document {
  from: number;
  to: number;
  status: string;
}

export interface ISoftwareExperienceModel extends Model<ISoftwareExperience> {}

const softwareExperiencesSchema = new Schema({
  _id: {
    type: String,
    default: () => `se_${Random.id()}`,
    required: true
  },
  from: Number,
  to: Number,
  status: String
},{timestamps: true});


const SoftwareExperience = mongoose.model<ISoftwareExperience, ISoftwareExperienceModel>('SoftwareExperience', softwareExperiencesSchema);

export default SoftwareExperience;
