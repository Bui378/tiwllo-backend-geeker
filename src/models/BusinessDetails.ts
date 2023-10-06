import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

// Interface for Business Details Schema
export interface IBusinessDetails extends Document {
    _id : string,
    isBusinessTypeAccount : boolean,
    businessName: string,
    businessWebsite: string,
    industry: string,
    teamSize : string,
    ownerId :string,
    businessInfoMessage:string,
    businessInfoMessageForTech:string,
    businessMessNofication:any,
}

export interface BusinessDetails extends Model<IBusinessDetails> {}

// Business Details Schema
const businessDetailsSchema = new Schema({
  _id: {
    type: String,
    default: () => `business_${Random.id()}`,
    required: true,
    unique:true,
  },
  isBusinessTypeAccount: {
    type:Boolean,
    default : false
  },
  businessName:{type : String},
  businessWebsite:{type : String},
  industry:{type : String},
  teamSize:{type : String},
  ownerId:{type : String},
  businessInfoMessage:{type:String},
  businessInfoMessageForTech:{type:String},
  businessMessNofication:{
    ownerNotify:Boolean,
    userNotify:Boolean,
    adminNotify:Boolean
  },
 
},{timestamps: true});

// Setting Up Business Details Mongoose Table that inherit Business Details Schema and Interface
const BusinessDetails = mongoose.model<IBusinessDetails, BusinessDetails>('business_details', businessDetailsSchema);

export default BusinessDetails;

