import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IEmailFormat extends Document {
  type: String;
}

export interface IEmailFormatModel extends Model<IEmailFormat> {
}

const EmailFormatSchema = new Schema({
  _id: {
    type: String,
    default: () => `em_${Random.id()}`,
    required: true
  },
  type: {
    type: String,
  },
  name:{
    type:String,
  },
  email:{
    subject :String,
    text:String,
    html:String,
  }
  
},{timestamps: true});


const EmailFormat = mongoose.model<IEmailFormat, IEmailFormatModel>('EmailFormat', EmailFormatSchema);

export default EmailFormat;
