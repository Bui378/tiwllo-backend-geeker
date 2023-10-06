import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IContactUs extends Document {
  email: string;
  firstName: string;
  lastName : String;
  message:String;
}

export interface IContactUsModel extends Model<IContactUs> {
}

const contactUsSchema = new Schema({
  _id: {
    type: String,
    default: () => `contact_${Random.id()}`,
    required: true
  },
  email: {
    type: String,
    ref: 'User'
  },
  firstName: String,
  lastName : String,
  message : String,
  
},{timestamps: true});


const ContactUs = mongoose.model<IContactUs, IContactUsModel>('ContactUs', contactUsSchema);

export default ContactUs;
