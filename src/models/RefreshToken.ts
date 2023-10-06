import mongoose, { Document, Model, Schema } from 'mongoose';
import crypto from 'crypto';
import moment from 'moment';
import Random from 'meteor-random-universal';

import { IUser } from './User';

export interface IRefreshToken extends Document {
  token: string;
  userEmail: string;
  expires: Date;
}

export interface IRefreshTokenModel extends Model<IRefreshToken> {
  generate: (user: IUser) => IRefreshToken;
}

const refreshTokenSchema = new Schema({
  _id: {
    type: String,
    default: () => `ref_${Random.id()}`,
    required: true
  },
  token: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: 'String',
    ref: 'User',
    required: true,
  },
  expires: {type: Date},
});

refreshTokenSchema.statics = {
  async generate(user: IUser) {
    const userId = user._id;
    const userEmail = user.email;
    const token = `${userId}.${crypto.randomBytes(40).toString('hex')}`;
    const expires = moment().add(30, 'days').toDate();
    const tokenObject = new RefreshToken({
      token, userId, userEmail, expires,
    });
    await tokenObject.save();
    return tokenObject;
  }
};

const RefreshToken = mongoose.model<IRefreshToken, IRefreshTokenModel>('RefreshToken', refreshTokenSchema);

export default RefreshToken;
