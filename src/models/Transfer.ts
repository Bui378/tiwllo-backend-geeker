import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ITransfer extends Document {
  TransferId : string;
  amount : number;
  destination : string;
  currency:string;
  created: Date;
  livemode: boolean;
  destination_payment:string;
  source_type:string;
  amount_reversed:boolean;
}

export interface ITransferModel extends Model<ITransfer> {}

const TransferSchema = new Schema({
  TransferId:{
    type: String,
  },
  amount: {
    type: Number,
  },
  destination: {type:String},
  currency:{type:String},
  livemode: {type:Boolean},
  created:{type:Date},
  destination_payment:{type:String},
  source_type:{type:String},
  amount_reversed:{type:Boolean}
});


const Transfer = mongoose.model<ITransfer, ITransferModel>('Transfer', TransferSchema);

export default Transfer;

