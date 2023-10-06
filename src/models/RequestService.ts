import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IRequestService extends Document {
  user: string;
  typeService: string;
  descriptionProblem: string;
  otherDescription: string;
  assign: any[];
  tech: any;
}

export interface IRequestServiceModel extends Model<IRequestService> {}

const requestServiceSchema = new Schema({
  _id: {
    type: String,
    default: () => `rqs_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User',
  },
  typeService: {
    type: String,
    ref: 'TypeService'
  },
  descriptionProblem: {
    type: String,
    ref: 'DescriptionProblem'
  },
  otherDescription: String,
  assign: [
    {
      user: {
        type: String,
        ref: 'User',
      },
      timeComplete: String,
    }
  ],
  tech: {
    email: String,
    name: String,
    userTechId: String,
    permissionLevel: Number,
    timeComplete: Number,
  },
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });

const RequestService = mongoose.model<IRequestService, IRequestServiceModel>('RequestService', requestServiceSchema);

export default RequestService;
