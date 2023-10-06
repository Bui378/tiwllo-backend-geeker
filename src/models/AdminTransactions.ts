import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IAdminTransactions extends Document {
  paidAmount :number,
  balanceAmount : number,
  paidOn:Date,
  techEarnedAmount:number,
  technician:string,
}

export interface IAdminTransactionsModel extends Model<IAdminTransactions> {}

const adminTransactionSchema = new Schema({
  _id: {
    type: String,
    default: () => `tran_${Random.id()}`,
    required: true
  },
  paidAmount: {
    type: Number,
    default:0,
  },
  balanceAmount:{
    type:Number,
    default:0
  },
  paidOn:{
    type:Date
  },
  techEarnedAmount:{
    type:Number
  },
  technician:{
    type:String,
    ref:"Technician",
  },

},{timestamps: true});

const AdminTransaction = mongoose.model<IAdminTransactions, IAdminTransactionsModel>('AdminTransactions', adminTransactionSchema);

export default AdminTransaction;
