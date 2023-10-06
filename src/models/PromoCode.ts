import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IPromoCode extends Document {
    promo_code : string,
    description : string,
    discount_type : string,
    discount_value: number,
    expiry_date: Date,
    promocode_status: string,
    max_discount : number,
    created_at: Date,
    updated_at:Date,
    used_by : any,
    min_discount : number,
}

export interface PromoCodeModal extends Model<IPromoCode> {}

const promoCodeSchema = new Schema({
  _id: {
    type: String,
    default: () => `promocode_${Random.id()}`,
    required: true,
  },
  promo_code: {
    type:String,
    unique:true,
    immutable : true,
  },
  description:{type : String},
  discount_type:{
    type: String,
    enum:['fixed', 'percentage']
  },
  discount_value:{type : Number},
  max_discount:{type : Number},
  expiry_date:{type: Date},
  promocode_status:{
    type: String,
    enum: ['active', 'inactive' , 'expired']
  },
  created_at:{type: Date},
  updated_at:{type: Date},
  used_by:[
    {
    user_id : {type: String},
    job_id : {type : String},
    used_date :{type : Date},
    min_discount:{type : Number},
  }]
},{timestamps: true});

const PromoCode = mongoose.model<IPromoCode, PromoCodeModal>('coupons', promoCodeSchema);

export default PromoCode;