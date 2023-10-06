import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ISoftware extends Document {
  name: string;
  comission:number;
  estimatedWait:string;
  estimatedTime:string;
  estimatedPrice:string;
  parent:string;
  rate:number;
  image:string;
  status:string;
  sub_options:string;
  askForCertificate:boolean;
  hourlyComission:number;
  testUrl:string;
  test:string;
  askForDuration:boolean;
  commissions :string[]
}

export interface ISoftwareModel extends Model<ISoftware> {}

const softwareSchema = new Schema({
  _id: {
    type: String,
    default: () => `sof_${Random.id()}`,
    required: true
  },
  name: {
    type: String,
    required: true,
  },
  commissions:[{
    category:String,
    commisionPerHour:Number,
    commissionPerMinute:Number,
  }],
  comission: {
    type: Number,
    required: false,
  },
  estimatedWait: {
    type: String,
    required: false,
  },
  estimatedTime: {
    type: String,
    required: false,
  },
  estimatedPrice: {
    type: String,
    required: false,
  },
  parent: {
    type: String,
    required: false,
  },
  rate: {
    type: Number,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    required: false,
  },
  askForDuration:{
    type:Boolean,
    default:true,
  },
  askForCertificate:{
    type:Boolean,
    default:false,
  },
  sub_options: [{
    type: String,
    required: false,
  }],
  testUrl:{
    type:String,
    default:"None"
  },
  test: {
    type: String,
    ref: 'interview_tests',
  },
  hourlyComission: {
    type: Number,
    required: false,
  },
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });

softwareSchema.virtual('subSoftware', {
  ref: 'Software',
  localField: '_id',
  foreignField: 'parent',
  justOne: false
});

softwareSchema.virtual('expertise', {
  ref: 'Expertise',
  localField: '_id',
  foreignField: 'software',
  justOne: false
});

const Software = mongoose.model<ISoftware, ISoftwareModel>('Software', softwareSchema);

export default Software;
