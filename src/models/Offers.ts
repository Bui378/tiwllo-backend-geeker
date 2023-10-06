import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IOffers extends Document {
  name: string;
  softwares:string[];
  offerType:string;
  value:string;
  userType:string;
  timePeriod:string;
  timeStart:string,
  timeEnd:string,
  status:string,
}

export interface IOffersModel extends Model<IOffers> {}

export const offerSchema = new Schema({
  _id: {
    type: String,
    default: () => `offer_${Random.id()}`,
    required: true
  },
  name:String,
  softwares:{
    type:String,
    ref: 'Software',
  },
  offerType:{
    type:String,
  },
  value: {
    type: String,

  },
  userType:{
    type:String
  },
  timePeriod:String,
  timeStart:String,
  timeEnd:String,
  status:String,
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });




const Offer = mongoose.model<IOffers, IOffersModel>('Offer', offerSchema);

export default Offer;
