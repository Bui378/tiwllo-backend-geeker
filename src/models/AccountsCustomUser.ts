import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IAccountsCustomUsers extends Document {
    first_name:string;
    last_name:string;
    email:string;
    user_role:string;
}

export interface IAccountsCustomUsersModel extends Model<IAccountsCustomUsers> {}

const accountCustomeUserSchema = new Schema({
    id: {
        type: Number,
        required: true
      },
      is_superuser: {
        type: Boolean,
      },
      is_staff: {
        type: Boolean,
      },
      is_active: {
        type: Boolean,
      },
      first_name:[{
        type:String,
      }],
      last_name:{
        type:String
      },
      email:{
        type:String
      },
      username:{
        type:String
      },
      pasword:{
        type:String
      },
      last_login:{
        type:Date
      },
      date_joined:{
        type:Date
      },
      user_role:{
        type:String
      },
},{timestamps: true});

accountCustomeUserSchema.index({ user: 1 }, { unique: true });

const AccountsCustomUsers = mongoose.model<IAccountsCustomUsers, IAccountsCustomUsersModel>('accounts_customuser', accountCustomeUserSchema, "accounts_customuser");

export default AccountsCustomUsers;
