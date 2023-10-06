import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IProposal extends Document {
  customer: string;
  technician: string;
  software: string;
  subSoftware: string;
  job: string;
  charges: string;
}

export interface IProsposalModel extends Model<IProposal> {}

const ProposalSchema = new Schema({
  _id: {
    type: String,
    default: () => `prop_${Random.id()}`,
    required: true
  },
  customer: {
    type: String,
    ref: 'Customer',
  },
  technician: {
    type: String,
    ref: 'Technician'
  },
  software: {
    type: String,
    ref: 'Software',
  },
  subSoftware: {
    type: String,
    ref: 'Software',
  },
  job: {
    type: String,
    ref: 'Job'
  },
  charges:String,

});


const Proposal = mongoose.model<IProposal, IProsposalModel>('Proposal', ProposalSchema);

export default Proposal;
