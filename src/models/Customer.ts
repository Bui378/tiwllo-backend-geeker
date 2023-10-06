import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ICustomer extends Document {
  user: string;
  phoneNumber: string;
  stripe_id: string;
  status: string;  
  subscription:{
    plan_id:String,
    plan_name:String,
    total_minutes:Number,
    total_seconds:Number,
    time_used:Number,
    invoice_id:String,
    subscription_id:String,
    status:String,
    plan_purchased_date:Date,
    discount:Number,    
    subscription:any,
    stripe_id:String,
    paidPrice:Number,
    priceOff:Number,
    receiveEmails:boolean,
    askedForBusiness:boolean,
  };
}

export interface ICustomerModel extends Model<ICustomer> {
}

const customerSchema = new Schema({
  _id: {
    type: String,
    default: () => `cus_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User'
  },
  status: String,
  alternatives: [{
    name: String,
    email: String,
    role: String,
  }],
  language : String,
  additionalLanguage : String,
  phoneNumber: String,
  extension: String,
  billing: {
    cardNumber: String,
    expiryDate: String,
    nameOnCard: String,
    cvv: String,
    address: String,
  },
  customerType : {
    type:String,
    default:'live'
  },
  offers :{
    type:[String],
    ref:'Offer'
  },
  receiveEmails: {
    type: Boolean,
    default:true
  },
  askedForBusiness: {
    type: Boolean,
  },
  stripe_id: String,
  
  subscription:{
    plan_id:String,
    plan_name:String,
    total_minutes:Number,
    total_seconds:Number,
    time_used:Number,
    invoice_id:String,
    subscription_id:String,
    status:String,
    plan_purchased_date:Date,
    discount:Number,
    paidPrice:Number,
    priceOff:Number,
    time_from_previous_subscription:Number,
    grand_total_seconds:Number
  },
  subscription_history:[{
    plan_id:String,
    plan_name:String,
    total_minutes:Number,
    total_seconds:Number,
    time_used:Number,
    invoice_id:String,
    subscription_id:String,
    status:String,
    plan_purchased_date:Date,
    plan_inactive_date:Date,
    discount:Number,
  }]

  
},{timestamps: true});


const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);

export default Customer;
