import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IWebSocket extends Document {
  user:string[];
  job:string[];
  hitFromCustomerSide:boolean;
  hitFromTechnicianSide:boolean;
  socketType:string;
  errorMessage:string;
  dataVariable:string;
  retried:number;
  retryExpired:boolean
}

export interface IWebSocketModel extends Model<IWebSocket> {}

export const webSocketSchema = new Schema({
  _id: {
    type: String,
    default: () => `web_socket_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref:'User'
  },
  userType :{
    type: String,
  },
  job: {
    type: String,
    ref: 'Job',
  },
  socketType:{
    type: String,
  },
  hitFromCustomerSide:{
    type: Boolean,
    default:false,
  },
  hitFromTechnicianSide:{
    type: Boolean,
    default:false,
  },
  errorMessage :{
    type:String
  },
  dataVariable : {
    type:String,
  },
  retried :{
    type:Number,
    default :1
  },
  retryExpired :{
    type:Boolean,
    default:false
  }

}, { _id: false, timestamps: true, toJSON: { virtuals: true } });



const WebSocket = mongoose.model<IWebSocket, IWebSocketModel>('WebSocket', webSocketSchema);

export default WebSocket;
