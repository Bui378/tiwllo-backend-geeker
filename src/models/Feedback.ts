import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IFeedback extends Document {
  user: string;
  job: string;
  is_solved: boolean,
  rating:Number,
  comments:string,
  issues:string[],
  to :string,
  whereHeComeFrom:string,
  systemRating:number,
  otherSoftwares:string[];
  absentSoftwares:string[];
}

export interface IFeedbackModel extends Model<IFeedback> {}

const feedbackSchema = new Schema({
  _id: {
    type: String,
    default: () => `feed_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User',
  },
  job: {
    type: String,
    ref: 'Job',
  },
  to : {
    type: String,
    ref: 'User',
  },
  is_solved: Boolean,
  rating: Number,
  systemRating:Number,
  comments: String, 
  issues:[String],
  whereHeComeFrom:String,
  otherSoftwares:[],
  absentSoftwares:[],
},{timestamps: true});


const Feedback = mongoose.model<IFeedback, IFeedbackModel>('Feedback', feedbackSchema);

export default Feedback;
