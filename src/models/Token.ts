import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IToken extends Document {
  token: string;
  userId: string;
}

export interface ITokenModel extends Model<IToken> {
}

const tokenSchema = new Schema({
  _id: {
    type: String,
    default: () => `tok_${Random.id()}`,
    required: true
  },
  userId: {
    type: String,
    ref: 'User'
  },
  token: {
    type: String,
    required: true,
  },
});


const Token = mongoose.model<IToken, ITokenModel>('Token', tokenSchema);

export default Token;
