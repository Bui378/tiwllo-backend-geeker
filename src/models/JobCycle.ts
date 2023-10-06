import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IJobCycle extends Document {
    JobId : string;
    Step : number;
    Tag : string;
    UserId: string;
}

export interface IJobCycleModel extends Model<IJobCycle> {}

const jobCycleSchema = new Schema({
  _id: {
    type: String,
    default: () => `tag_${Random.id()}`,
    required: true
  },
  JobId: {
    type: String,
  },
  Step: {type:Number},
  Tag:{type:String},
  UserId:{type:String},
},{timestamps: true});


const JobCycle = mongoose.model<IJobCycle, IJobCycleModel>('JobCycle', jobCycleSchema);

export default JobCycle;
