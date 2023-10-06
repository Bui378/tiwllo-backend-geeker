import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';
import autoIncrement from 'mongoose-auto-increment';
import Joi, { boolean, string } from 'joi'; // Import Joi for validation

autoIncrement.initialize(mongoose);

export interface ITwilioChat extends Document {
  customer: {
    id: string;
    name: string;
  };
  technician: {
    id: string;
    name: string;
  };
  twilio_chat_service: {
    sid: string;
    chatServiceSid: string;
  };
  new_message_alert : boolean,
  new_message_alert_admin : boolean,
  alertAlreadySend : string,
  lastReadMessageId : string,
  totalMessagesCount : number,
  chatClosed:boolean
}

export interface ITwilioChatModel extends Model<ITwilioChat> { }

const twilioChatSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `twilioChat_${Random.id()}`,
      required: true,
    },
    chat_id: {
      type: String,
    },
    customer: {
      id: {
        type: String,
        ref: 'Customer',
      },
      name: {
        type: String,
      },
    },

    technician: {
      id: {
        type: String,
        ref: 'Technician',
      },
      name: {
        type: String,
      },
    },

    twilio_chat_service: {
      sid: {
        type: String,
      },
      chatServiceSid: {
        type: String,
      },
    },
    new_message_alert:{
      type : Boolean,
      default : false
    },
    new_message_alert_admin:{
      type : Boolean,
      default : false
    },
    alertAlreadySend:{
      type : String,
      default : 'notSent', enum:['notSent','alreadySended']
    },
    lastReadMessageId:{
      type : String
    },
    totalMessagesCount:{
      type : Number
    },
    chatClosed:{
      type : Boolean,
      default : false
    }
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// If you want to use auto-incrementing _id, you can use the autoIncrement plugin like this:
// twilioChatSchema.plugin(autoIncrement.plugin, { model: 'TwilioChat', field: '_id' });

const TwilioChat = mongoose.model<ITwilioChat, ITwilioChatModel>('TwilioChat', twilioChatSchema);

export default TwilioChat;
