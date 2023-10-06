import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';
import { ITechnician } from './Technician';

export interface IExperience extends Document {
  technician: ITechnician;
  software :string[];
  rating:Number;

}

export interface IExperienceModel extends Model<IExperience> {}

const experienceSchema = new Schema({
  _id: {
    type: String,
    default: () => `exr_${Random.id()}`,
    required: true
  },
  software: {
    type: String,
    ref: 'Software',
  },
  expertises: {
    expertise: {
      type: String,
      ref: 'Expertise',
    },
    rate: Number,
  },

   rating : {
    type:Number,
    default: 0,
  },

  experienceYearArea: String,
},{timestamps: true});

experienceSchema.virtual('technician', {
  ref: 'Technician',
  localField: '_id',
  foreignField: 'experiences',
  justOne: true,
});

const Experience = mongoose.model<IExperience, IExperienceModel>('Experience', experienceSchema);

export default Experience;
