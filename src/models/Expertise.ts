import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IExpertise extends Document {
  name: string;
  software: string;
  levels: any[];
}

export interface IExpertiseModel extends Model<IExpertise> {}

const expertiseSchema = new Schema({
  _id: {
    type: String,
    default: () => `exp_${Random.id()}`,
    required: true
  },
  name: String,
  levels: {
    beginner: {
      from: Number,
      to: Number,
    },
    intermediate: {
      from: Number,
      to: Number,
    },
    advanced: {
      from: Number,
      to: Number,
    },
    expert: {
      from: Number,
      to: Number,
    }
  },
  software: {
    type: String,
    ref: 'Software'
  },
});


const Expertise = mongoose.model<IExpertise, IExpertiseModel>('Expertise', expertiseSchema);

export default Expertise;
