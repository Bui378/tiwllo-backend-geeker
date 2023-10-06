import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IPromo extends Document {
    customer_id : string;
    technician_id : string;
    promo_code : string;
    redeemed : boolean;
    subscription_id : string;
    promo_id: string;
    total_cost:number;
}

export interface IPromoModel extends Model<IPromo> {}

const promoSchema = new Schema({
  _id: {
    type: String,
    default: () => `prom_${Random.id()}`,
    required: true
  },
  customer_id: {
    type: String,
    ref: 'Customer',
  },
  promo_code: {type:String},
  promo_id:{type:String},
  redeemed: {type:Boolean},
  technician_earn: {type:Number},
  technician_id: {
    type: String,
    ref: 'Technician',
  },
  total_cost: Number,
  subscription_id: String,
},{timestamps: true});


const Promo = mongoose.model<IPromo, IPromoModel>('Promo', promoSchema);

export default Promo;
