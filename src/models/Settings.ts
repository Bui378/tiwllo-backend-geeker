import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ISettings extends Document {
  version: string;
}

export interface ISettingsModel extends Model<ISettings> {}

const SettingsSchema = new Schema({
  _id: {
    type: String,
    default: () => `set_${Random.id()}`,
    required: true
  },
  version: {
    type: String
  },
},{timestamps: true });


const Settings = mongoose.model<ISettings, ISettingsModel>('Settings', SettingsSchema);

export default Settings;
