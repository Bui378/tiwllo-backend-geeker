import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IDescriptionProblem extends Document {
  name: string;
}

export interface IDescriptionProblemModel extends Model<IDescriptionProblem> {}

const descriptionProblemSchema = new Schema({
  _id: {
    type: String,
    default: () => `dp_${Random.id()}`,
    required: true
  },
  name: String,
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });

const DescriptionProblem = mongoose.model<IDescriptionProblem, IDescriptionProblemModel>('DescriptionProblem', descriptionProblemSchema);

export default DescriptionProblem;
