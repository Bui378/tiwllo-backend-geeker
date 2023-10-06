import mongoose, { Document, Model, Schema } from "mongoose";
import Random from "meteor-random-universal";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import moment from "moment";
import jwt from "jwt-simple";
import InvalidRequestError from "../errors/InvalidRequestError";
import { IRefreshToken } from "./RefreshToken";
import autoIncrement from 'mongoose-auto-increment';
autoIncrement.initialize(mongoose)

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  zip: string;
  resetPasswordToken: string;
  resetPasswordExpires: string;
  passwordResetToken: string;
  passwordResetExpires: Date;
  passwordToken: () => string;
  emailVerifyToken: String;
  emailVerifyTokenExpires: Date;
  token: () => string;
  provider: string;
  emailVerificationToken: () => string;
  blocked: boolean;
  activeStatus: boolean;
  userChatId:number;
  timezone: string;
  verified: boolean;
  userType: string;
  availableForJob: boolean;
  referred_by:string;
  inviteCode: string;
  referralCode:string;
  parentId:string;
  ownerId:string;
  roles:[string];
  userChatUsername:string;
  userIntId:number;
  referalData:any;
  isBusinessTypeAccount:boolean;
  businessName:string;
  businessInfoMessage:string
  businessMessNofication:any,
  business_id : string,
  referred_code: string;
}

export interface IUserModal extends Model<IUser> {
  findAndGenerateToken: (arg: {
    email: string;
    password: string;
    refreshObject: IRefreshToken;
  }) => { user: IUser; accessToken: string };
  
}

export const userSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => `usr_${Random.id()}`,
      required: true,
    },
    firstName: String,
    lastName: String,
    email: {
      type: String,
      unique: true,
    },
    password: String,
    zip: String,
    resetPasswordToken: String,
    resetPasswordExpires: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerifyToken: String,
    emailVerifyTokenExpires: Date,
    userType: String,
    userChatId:{
      type:String,
      default:null
    },
    userChatUsername:{
      type:String,
      default:null
    },

    userIntId:{
      type:Number,
      default:null
    },
    referalData:{
      campaign:String,
      url:String,
    },
    provider: {
      type: String,
      values: ["email", "facebook", "google"],
      default: "email",
    },
    role: {
      type: String,
      values: ["customer", "technician", "admin"],
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    activeStatus:{
      type: Boolean,
      default: true,
    },
    availableForJob: {
      type: Boolean,
      default: true,
    },
    inviteCode: {
      type:String,
      default: () => `inv_${Random.id()}`,
      unique: true,
    },
    referralCode: {
      type:String,
      default: () => `iref_${Random.id()}`,
      unique: true,
    },
    parentId:{
       type:String
    },
    ownerId:{
      type:String
   },
    roles:{
      type:[String],
      enum:["admin","user","owner"]
    },
    referred_by: {
      type: String,
      ref: 'User',
    },
    geekerAdmin: {
      type: String,
      ref: 'accountsCustomuser',
    },
    timezone: String,
    businessName:{
      type : String,
    },
    isBusinessTypeAccount:{
      type : Boolean,
      default : false
    },
    businessInfoMessage:{
      type:String
    },
    businessInfoMessageForTech:{
      type:String
    },
    businessMessNofication:{
      ownerNotify:Boolean,
      userNotify:Boolean,
      adminNotify:Boolean
    },
    unreadTwilioMessages:{
      type:Number,
    },
    business_details : {
      type : String,
      ref  : 'BusinessDetails'
    },
    referred_code:{
      type : String,
    }
    
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });



userSchema.plugin(autoIncrement.plugin, { 
    model: 'User',
    field: 'userIntId',
    startAt: 3000});

userSchema.virtual("customer", {
  ref: "Customer",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

userSchema.virtual("technician", {
  ref: "Technician",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

userSchema.pre<IUser>("save", async function save(next) {
  try {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    return next();
  } catch (error) {
    return next(error);
  }
});



userSchema.method({
  token() {
    const playload = {
      exp: moment().add(process.env.JWT_EXPIRATION_MINUTES, "minutes").unix(),
      iat: moment().unix(),
      sub: this._id,
    };
    return jwt.encode(playload, process.env.JWT_SECRET);
  },

  passwordToken() {
    return crypto.randomBytes(40).toString("hex");
  },
  emailVerificationToken() {
    return crypto.randomBytes(64).toString("hex");
  },

  async passwordMatches(password, oldPassword) {
    return bcrypt.compare(password, oldPassword);
  },
});

userSchema.statics = {
 async findAndGenerateToken({
    email,
    password,
    refreshObject,
  }: {
    email: string;
    password: string;
    refreshObject: IRefreshToken;
  }) {
    if (!email) throw new InvalidRequestError('An email is required to generate a token');
    // console.log("email to find :::",email)
    const user = await this.findOne({'email' :email }).exec();
    // console.log("User in findAndGenerateToken >>>",user)
    // console.log(user.password,"the generate password")
    // console.log(password,">>>>>>")

    if (!user) {
      throw new InvalidRequestError("Incorrect Email");
    }
    if (password) {
      console.log(await user.passwordMatches(password, user.password), ">>>>");
      if (
        user &&
        ((await user.passwordMatches(password, user.password)) ||
          user.password == password)
      ) {
        return { user, accessToken: user.token() };
      }
      throw new InvalidRequestError("Incorrect email or password");
    } else if (refreshObject && refreshObject.userEmail === email) {
      if (moment(refreshObject.expires).isBefore()) {
        throw new InvalidRequestError("Invalid refresh token.");
      } else {
        return { user, accessToken: user.token() };
      }
    }
    throw new InvalidRequestError("No password and refresh token");
  },
};

const User = mongoose.model<IUser, IUserModal>("User", userSchema);

export const updateUser = (data) => {
  return new Promise((resolve, reject) => {
    User.findById(data.userId).then((findResult) => {
      const { userId, ...restObj } = data;
      const updateData = {
        ...JSON.parse(JSON.stringify(findResult)),
        ...restObj,
      };

      User.updateOne({ _id: data.userId }, updateData, (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  });
};

export default User;
