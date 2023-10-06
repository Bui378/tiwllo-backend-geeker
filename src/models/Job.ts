import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';
import autoIncrement from 'mongoose-auto-increment';
import { string } from 'joi';
autoIncrement.initialize(mongoose)
export interface IJob extends Document {
	customer: string;
	technician: string;
	software: string;
	subSoftware: string;
	expertise: string;
	subOption: string;
	issueDescription: string;
	level: string;
	status:string;
	primarySchedule:Date;
	secondrySchedule:Date;
	tech_declined_ids:string[];
	total_time:string;
	total_cost:number;
	free_session_total : number;
	total_seconds:number;
	total_subscription_seconds:number;
	start_call_time :Date;
	meeting_end_time :Date;
	meeting_start_time :Date;
	acceptedJobTime:Date;
	call:string;
	screenshare:string;
	remote_desktop:string;
	timezone:string;
	declinedByCustomer:string[];
	payment_id:string;
	stripe_error_status_code:string;
	stripe_error_type:string;
	payment_status:string;
	error_message:string;
	schedule_accepted_by_technician:string;
	allNotes:string;
	notifiedTechs:string[];
	scheduleDetails:string[];
	twilio_chat_service :any;
	custCancellation:string[];
	techCancellation:string[];
	confirmedNotes:string;
	schedule_accepted_on:string;
	schedule_accepted :boolean;
	updatedIssueDescription:string[];
	callStartType:string;
	customerContiuedHisFirstMeeting:boolean;
	jobCompleteEmailSent:boolean;
	freeMinutes:number;
	technician_paused_timer : boolean;
	customer_paused_timer : boolean;
	discounted_cost:number;
	discount_percent:number;
	discount: number;
	technician_charged_customer:string,
	hire_expert:boolean;
	initial_hire_value:boolean;
	chatRoomId:number;
	groupRoomId:number;
	is_long_job :boolean;
	tech_message_dashbord :boolean;
	long_job_hours :string;
	long_job_cost :number;
	customer_approved_long_job:string;  
	submission:string;
	approval_status:string;
	tag:string;
	post_again:boolean;
	post_again_reference_job:string;
	post_again_reference_technician:string;
	long_job_with_minutes:string;
	referalDiscount:number,
	JobId:number,
	is_transferred: boolean,
	is_transferred_hire_expert: boolean,
	jobDuration: string,
	meetingStarted :boolean,
	adminReview:boolean,
	adminReviewActionTaken:boolean,
	adminReviewComment:string,
	long_job_sent_approval_at:Date,
	adminReviewDetails:string[],
  	long_job_notification_send:boolean,
	isReturningCustomer:boolean,
	GA_revenue_event_called:string,
	transfer_reference_job:string,
	cardPreAuthorization:boolean,
	GA_conversion_event_called:string,
	GA_start_call_event_called:boolean,
	GA4_job_posted_tag_sent:boolean,
	shareASale:boolean,
	coupon_id : string,
	coupon_code : string,
	coupon_code_discount :number,
	discount_type: string,
	total_discounted_cost : number,
	hour_history : any[],
	saved_discounted_value : number,
	is_transferred_notification_sent : boolean, // This is created in order to stop sending notification for that tech who is transferred to another job
  	payment_hold_id : string, // This is created to record the id of payment that is holded in stripe and refunded when meeting is completed.
	hold_payment_status : string, // This is created to record the status of payment that is holded in stripe
	client_id : string,
	session_id : string,
	facebook_fbp : string,
	facebook_fbc : string,
	customer_ip : string,
	user_agent : string,
	meeting_service : string
	customer_holded_payments : any[]  // Here we record all the holded payment details of customer
	payment_hold_date : Date
	add_card_timer_starts_at: Date,
	payment_type : string
	failed_payments: any [] // Here we record all the holded failed payments
	ownerId : string,
	job_posted_at: Date,
	tech_search_update_min : Date,
	message_send_count: Number,		
}

export interface IJobModel extends Model<IJob> {}

const jobSchema = new Schema({
	_id: {
		type: String,
		default: () => `job_${Random.id()}`,
		required: true
	},
	customer: {
		type: String,
		ref: 'Customer',
	},
	technician: {
		type: String,
		ref: 'Technician'
	},
	software: {
		type: String,
		ref: 'Software',
	},
	subSoftware: {
		type: String,
		ref: 'Software',
	},
	expertise: {
		type: String,
		ref: 'Expertise'
	},
	jobDuration:{
		type:String,
	},
	subOption: String,
	issueDescription: String,
	level: {
		type: String,
		values: ['beginner', 'intermediate', 'advanced', 'expert'],
		default: 'beginner',
	},
	referalDiscount:Number,
	tag:String,
	estimatedTime: String,
	estimatedPrice: String,
	primarySchedule:Date,
	secondrySchedule:Date,
	solutions: [String],
	reasons: [String],
	status: { type: String, default: 'Draft' },
	tech_declined_ids:[String],
	total_time:String,
	total_cost:Number,
	isReturningCustomer:{
		type:Boolean,
		default:false
	},
	technician_started_call:{
		type:Boolean,
		default:false,
	},
	total_seconds: {
		type:Number,
		default:0
	},
	total_subscription_seconds: {
		type:Number,
		default:0
	},
	chatRoomId:{
		type:Number,
		default:null
	},
	groupRoomId:{
		type:Number,
		default:null
	},
	free_session_total : {
		type:Number,
		default:0
	},
	start_call_time:Date,
	meeting_end_time:Date,
	meeting_start_time:Date,  
	acceptedJobTime:Date,
	call:String,
	screenshare:String,
	remote_desktop:String,
	add_card_timer_starts_at: Date,
	declinedByCustomer:[String],
	payment_id:String,
	stripe_error_status_code:String,
	stripe_error_type:String,
	payment_status:String,
	error_message:String,
	schedule_accepted_by_technician : String,
	allNotes:String,
	long_job_sent_approval_at:Date,
  long_job_notification_send:{
    type:Boolean,
    default:false,
  },
  slack_notification_send:{
    type:Boolean,
    default:false,
  },
	notifiedTechs:[
	{
		'techId' : {
			type: String,
			ref: 'Technician',
		},
		'techStatus': String,
		'notifyAt' : Date,
		'jobStatus' : String,
		'notifyEndAt' : Date,
	}
	],
	scheduleDetails:{
		'primaryTimeAvailable':{
			type:Boolean,
			default:true
		},
		'primaryTimeExpiredAt':{
			type:Date || null,
			default:null
		},
		'secondaryTimeAvailable':{
			type:Boolean,
			default:true
		},
		'secondaryTimeExpiredAt':{
			type:Date || null,
			default:null
		},
		'scheduleExpired':{
			type:Boolean,
			default:false
		},
		'scheduleExpiredAt':{
			type:Date
		}
	},
	twilio_chat_service: {
		sid: {
		  type: String,
		},
		chatServiceSid: {
		  type: String,
		}
	  },
	  
	techCancellation:[
	{
		'technician':{
		type: String,
			ref: 'Technician',
			default:null
		},
		'reason':String,
		'cancellationDate':{
			type: Date, 
			default: Date.now
		}
	}
	],
	custCancellation:{
		'reason':String,
		'cancellationDate':{
			type: Date, 
			default: Date.now
		}
	},
	confirmedNotes:String,
	schedule_accepted_on : String,
	technician_paused_timer : Boolean,
	customer_paused_timer : Boolean,
	callStartType: {
		type:String,
		default:"ComputerAudio"
	},
	schedule_accepted : {
		type:Boolean,
		default:false
	},
	customerConfirmedNotes:{
		type:Boolean,
		default:false
	},
	customerDeclinedNotes:{
		type:Boolean,
		default:false
	},
	technicianSubmitNotes:{
		type:Boolean,
		default:false
	},
	meeting_pause : {
		type:Boolean,
		default:false
	},
	pause_start_time : Date,
	total_pause_seconds: {
		type:Number,
		default:0
	},
	updatedIssueDescription: [{
		technician: {
			type: String,
			ref: 'Technician'
		},
		technicianName:String,
		issueDescription: String,
		updatedAt:Date
	}],
	guestJob : {
		type:Boolean,
		default:false
	},
	customerContiuedHisFirstMeeting:{
		type:Boolean,
		default:false
	},
	is_free_job:{
		type:Boolean,
		default:false
	},
	freeMinutes :{
		type:Number,
		default:6
	},
	jobCompleteEmailSent:{
		type:Boolean,
		default:false
	},
	discounted_cost:{
		type:Number,
		default:0
	},
	discount_percent:{
		type:Number,
		default:0
	},
	tech_search_time:{
		type:Number,
		default:900000
	},
	tech_search_start_at : {
		type: Date,
		default: Date.now
	},
	discount: {
		type:Number,
		default:0
	},
	hire_expert:Boolean,
	initial_hire_value:Boolean,
	technician_charged_customer:String,
	GA_revenue_event_called:String,
	transfer_reference_job:String,
	GA_conversion_event_called:String,
	GA_start_call_event_called:{
		type:Boolean,
		default:false
	},
	GA4_job_posted_tag_sent:{
		type:Boolean,
		default:false
	},
	is_long_job:{
		type:Boolean,
		default:false
	},
	tech_message_dashbord:{
		type:Boolean,
		default:false
	},
	meetingStarted:{
		type:Boolean,
		default:false
	},
	long_job_hours :String,
	hour_history : [{
		_id:{type: String,
			default: () => `hour_${Random.id()}`,
			required: true
		},
		date:{ type: Date, default: Date.now },
		extra_hours_added: Number,
		extra_cost: Number,
		extra_hours_submission:String,
		extra_hours_payment_id:String,
		extra_hours_payment_status:String
	}],
	long_job_cost :Number,
	customer_approved_long_job:String,
	submission:String,
	additional_hours_submission:String,
	approval_status:String,
	post_again:{
		type:Boolean,
		default:false,
	},
	post_again_reference_job:String,
	post_again_reference_technician:String,
	long_job_with_minutes: String,
	is_transferred: {
		type: Boolean,
		default: false,
	},
	is_transferred_hire_expert: {
		type: Boolean,
		default:false
	},
	adminReview:{
		type: Boolean,
		default: false,
	},
	adminReviewActionTaken:{
		type: Boolean,
		default: false,
	},
	adminReviewDetails:{
		reason:String,
		total_cost:Number,
		free_session_total:Number,
		total_subscription_seconds:Number,
		createdAt:{
			type: Date,
			default: Date.now
		}
	},
	shareASale:{
		type:Boolean,
		default: false,
	},
  cardPreAuthorization:{
		type:Boolean,
		default: false,
	},
	coupon_id : {type : String},
	coupon_code : {type : String},
	coupon_code_discount :{type : Number},
	discount_type:{
    type: String,
    enum:['fixed', 'percentage']
  },
  total_discounted_cost : Number,
  saved_discounted_value: Number,
  is_transferred_notification_sent:{type : Boolean, default : false},
  payment_hold_id : {type : String},
  hold_payment_status :{type : String, enum:['requires_capture','succeeded','canceled', 'deduct-specific-and-refund-remaining-amount']},
  client_id : String,
  session_id : String,
  facebook_fbp : String,
  facebook_fbc : String,
  meeting_service :{ type : String ,default:'winkitaway' ,enum:['winkitaway','jaas8x8','getgeeker']},
  // Here we record all the holded payment details of customer
  customer_holded_payments: [{
	payment_hold_id: { type: String },
	hold_payment_status: { type: String, enum: ['requires_capture', 'succeeded', 'canceled', 'deduct-specific-and-refund-remaining-amount'] },
	payment_hold_date : Date
  }],
  payment_type : { type  : String  ,default  : 'card_only', enum:['subscription_only','card_only','subscription_and_card']},
  failed_payments : [{
	payment_hold_id : {type : String},
	payment_hold_reason :{type : String},
	payment_failed_date : Date
  }],
  customer_ip : String,
  user_agent : String,
  ownerId : String,
  job_posted_at: Date,
  tech_search_update_min :  Date,
  message_send_count: { type: Number, default: 0 },		
},{timestamps: true , toJSON: { virtuals: true } });

jobSchema.post('save',async (doc, next)=>{
	let job_count = await Job.count({"customer":doc['customer'],"meetingStarted":true,"status":"Completed"})
	if(job_count >= 1){
		let query = await Job.updateOne({"_id":doc['_id']},{"$set":{"isReturningCustomer":true}})
 	}
	next()

})

jobSchema.plugin(autoIncrement.plugin, { 
	model: 'Job',
	field: 'JobId',
	startAt: 1001
});

const Job = mongoose.model<IJob, IJobModel>('Job', jobSchema);

export default Job;