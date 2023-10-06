import mongoose ,{Document,Model,Schema} from 'mongoose';
import Random from 'meteor-random-universal';
import {InvitStatus} from '../utils'

export interface IInvite extends Document {
    email: string,
    role: string,
    parentId: string,
    inviteCode:string,
    ownerName:string,
    ownerBusinessName:string
   
  }
  
  export interface IInviteModel extends Model<IInvite> {
      
  }


const inviteSchema = new Schema({

    _id: {
        type: String,
        default: () => `inv_${Random.id()}`,
        required: true
      },
    parentId:{
        type:String,
    },
    email:{
        type:String,
        required: true,
    },
    role:{
        type:String,
        enum:['owner','user','admin'],
        required:true
    },
    status:{
        type:String,
        default: InvitStatus.PENDING
    },
    userId:{
        type:String

    },
    inviteCode:{
        type:String
    },
    ownerName:String,
    ownerBusinessName:String,
    ownerEmail:String

},
{
    timestamps:true
})

const Invite = mongoose.model<IInvite, IInviteModel>('Invite', inviteSchema);

export default Invite
