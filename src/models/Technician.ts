import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface ITechnician extends Document {
  user: string;
  experiences: string[];
  general: any;
  profile: any;
  photoDOL: string[];
  w9File: string;
  bankAccount: string;
  nameAccount: string;
  status: string;
  language:string;
  additionalLanguage:string[];
  registrationStatus:string;
  otherSoftwares:string[];
  absentSoftwares:string[];
  emailAlertsWithoutLogin:boolean;
  resume : string;
  tag:string;
  paidAmount:number,
  promo_code:string,
  promo_id:string,
  expertise:any,
  // testHistory:any,
  technicianSource: string,
  accountId:string,
  commissionCategory : string,
  rating:Number,
  profileDescription:string,
}

export interface ITechnicianModel extends Model<ITechnician> { }

const technicianSchema = new Schema({
  _id: {
    type: String,
    default: () => `tech_${Random.id()}`,
    required: true
  },
  user: {
    type: String,
    ref: 'User',
  },
  experiences: [{
    type: String,
    ref: 'Experience',
  }],
 
  photoDOL: [String],
  w9File: String,
  resume : String,
  bankAccount: {
    completed: Boolean,
    accountNumber: String,
    routingNumber: String,
    complete: Boolean
  },
  technicianType: {
    type: String,
    default: 'live',
  },
  certifiedIn:[{
      type:String,
      ref:'Software'
    }],
  experience: String,
  nameAccount: String,
  general: {
    freelancerProfiles: [String],
    employmentProfiles: [String],
    otherLangList: [{
      name: String,
      level: Number,
    }],
    englishLevel: String,
    certifications: [String],
  },
  commissionCategory:String,
  language:String,
  rating:Number,
  profileDescription:String,
  tag:String,
  additionalLanguage:[],
  profile: {
    image: String,
    agreement: {
      acceptTerms: String,
      rate: String,
    },

    confirmId: {
      imageUrl: String,
      confirmed: Boolean,
      street: String,
      city: String,
      cityObject: Object,
      state: String,
      stateObject: Object,
      cityCode: String,
      phoneNumber: String,
      address1:String,
      address2:String,
      zip:String,
      country:String,
      countryObject:Object,
      DD: String,
    },
    bankAccount: {
      accountNumber: String,
      routingNumber: String,
    },
    schedule: {
      timezone: String,
      customization: Boolean,
      availableTimes: {
        Sunday: {
          available: Boolean,
          startTime: String,
          endTime: String,
          timezone: String,
          value: String,
          timeStartValue: String,
          timeEndValue: String,
          otherTimes: Array,
        },
        Monday: {
          available: Boolean,
          startTime: String,
          endTime: String,
          timezone: String,
          value: String,
          timeStartValue: String,
          timeEndValue: String,
          otherTimes: Array,
        },
        Tuesday: {
          available: Boolean,
          startTime: String,
          endTime: String,
          timezone: String,
          value: String,
          timeStartValue: String,
          timeEndValue: String,
          otherTimes: Array,
        },
        Wednesday: {
          available: Boolean,
          startTime: String,
          endTime: String,
          timezone: String,
          value: String,
          timeStartValue: String,
          timeEndValue: String,
          otherTimes: Array,
        },
        Thursday: {
          available: Boolean,
          startTime: String,
          endTime: String,
          timezone: String,
          value: String,
          timeStartValue: String,
          timeEndValue: String,
          otherTimes: Array,
        },
        Friday: {
          available: Boolean,
          startTime: String,
          endTime: String,
          timezone: String,
          value: String,
          timeStartValue: String,
          timeEndValue: String,
          otherTimes: Array,
        },
        Saturday: {
          available: Boolean,
          startTime: String,
          endTime: String,
          timezone: String,
          value: String,
          timeStartValue: String,
          timeEndValue: String,
          otherTimes: Array,
        },
      }
    },
    systemRequirement: {
      complete: Boolean,
    },
    alertPreference: {
      complete: Boolean,
      settings: Object,
    },
    reviewGuide: {
      complete: Boolean,
    },
  },
  rate: Number,
  status: { type: String, default: 'Available' },
  registrationStatus:String,
  expertise:[
    {

      _id: {
        type: String,
        default: () => `exps_${Random.id()}`,
        required: true
      },
      software_id:String,
      experience:String,
      result:String,
      sub_options:[{
        option:String,
        touch_point:String,
        touch_point_id:String,
        current_num:Number
      }],
      parent:String,
      two_tier_value :String,
      
    }
  ],
  testHistory:[],
  paidAmount : Number,
  promo_code : String,
  promo_id : String,
  otherSoftwares:[],
  absentSoftwares:[],
  emailAlertsWithoutLogin:{
    type:Boolean,
    default:true
  },
  technicianSource: String,
  accountId: String,
},{timestamps: true});


const Technician = mongoose.model<ITechnician, ITechnicianModel>('Technician', technicianSchema);

export default Technician;
