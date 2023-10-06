import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IVideoDetails extends Document {
  title : string;
  videoUrl:string;
}

export interface IVideoDetailsModel extends Model<IVideoDetails> {}

const videoDetailsSchema = new Schema({
  _id: {
    type: String,
    default: () => `vid_${Random.id()}`,
    required: true
  },
  title :{
    type :String,
  },
  videoUrl:{
    type:String
  }

},{timestamps: true});


const VideosDetails = mongoose.model<IVideoDetails, IVideoDetailsModel>('VideoDetails', videoDetailsSchema);

export default VideosDetails;
