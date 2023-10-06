module.exports.user_keys = ['user_name','verify','resetPassword','acceptJob','jobDescription','firstName','programeName',
'caseNumber','addToCalendar','scheduledTime','login','referrLink','invitLink','lastName','mailEndpoint','createdAt',
'primaryTime','secondryTime','dashboardLink','createdAt','JobId','jobStatus','jobTotalCost','stripeError',
'totalCharge', 'discountedCharge','meetingTime','paymentStatus','technicianCharges','comment','issueText','messageCount','senderName',
'cust_name', 'product_info_name', 'purchasedAt', 'plan_price','plan_name','benefits','purchased_label','sharingLink',
'testLink','userName','userPhoneNumber','primaryTime','secondaryTime','acceptLink','issueDesc','programName','planName',
'convertedTotal','convertedRemaining','usedFromSubscription','totalEarnings','reason','techName', 'lastAmountPaid', 'amountPaid',
'accountLink', 'dontChargeReason','date', 'jobLink','fromto','transferRecordTable','Name','transferDate','transactionNumber','renewalDate',
                            'amountToPaid','stripe_id','status','customerName','event', 'software','renewalDate','amountToPaid', 'recipientName',

                            'customerComment', 'adminJobDetailLink', 'businessName', 'businessWebsite', 'industry', 'teamSize', 'customerEmail', 'customer_user_id', 'custName', 'totalJobs','totalCompletedJobs','totalCost','totalTime','failedReason','message','email','userType','transferReason' ]


module.exports.dataBase_emailKeys ={
	TECH_SIGN_UP:"Technician-Signup-Email",
	VERIFICATION_EMAIL_CUSTOMER:"verification-email-customer",
	VERIFICATION_EMAIL_TECHNICIAN:"verification-email-technician",
	RESET_PASSWORD:"resetPassword",
	NEW_JOB_ALERT:'new-job-alert',
	NEW_EXPERT_JOB_ALERT:"new-job-alert-expert",
	SCHEDULE_JOB_CUSTOMER:'schedule-job-posted',
	SCHEDULE_JOB_ALERT_TECHNICIAN:'schedule-job-alert-technician',
	SCHEDULE_CANCEL_JOB_ALERT_TECHNICIAN:'schedule-cancel-job-alert-technician',
	SCHEDULE_CANCEL_JOB_ALERT_CUSTOMER:'schedule-cancel-job-alert-customer',
	TECHNICIAN_DECLINED_SCHEDULE_EMAIL:'technician-declined-schedule-email',
	MEETING_IN_10:'meeting-in-10',
	NO_TECHNICIAN_FOUND:'no-technician-found',
	REFER_LINK:'refer-link',
	INVIT_LINK:'invit-link',
	CUSTOMER_IS_WAITING:'customer-is-waiting',
	TECHNICIAN_ACCEPTED_JOB:'technician-accepted-job',
	CUSTOMER_DECLINED_THE_TECHNICIAN:'customer-declined-the-technician',
	SEND_SCHEDULE_ALERTS:'send-schedule-email',
	TECHNICIAN_NOT_FOUND:'technician-not-found',
	PAYMENT_INFORMATION_EMAIL:'payment-information-completed-job',
	PAYMENT_INFORMATION_WITH_SUBSCRIPTION_EMAIL:'payment-information-with-subscription-completed-job',
	CUSTOMER_NOT_JOINED:'customer-not-joined', 
    SCHEDULE_JOB_ACCEPTED_BY_TECHNICIAN:'accept-by-technician',
    CUSTOMER_DECLINED_JOB:'customer-declined',
    PAYMENT_FAILED_LIVE_CUSTOMER:'payment-failed-live-customer',
	TECHNICIAN_JOB_COMPLETED_EMAIL:'technician-job-completed-email',
	SEND_ISSUE_NOT_SOLVED_EMAIL:'send-issue-not-solved-email',
	NEW_MESSAGE:"long-job-chat-message",
	SEND_BUY_SUBSCRIPTION_EMAIL_TO_CUSTOMER:"buy-subscripiton-email-to-customer",
	Send_Buy_Subscription_Email_Admin:"buy-subscription-email-admin",
	AFTER_JOB_REFFERAL :'referral-email',
	Additional_Hour_Long_Job_Email_Customer:"additional-hour-long-job-email-customer",
	SOFTWARE_TEST_EMAIL : 'software-test-email',
	REFERAL_REWARD_EMAIL:'referal-reward-email',
	SEND_USER_REVIEW_EMAIL: 'send-user-review-email',
	ADMIN_REVIEW_JOB:'admin-review-job',
	ADMIN_REVIEW_JOB_CUSTOMER_ALERT:'admin-review-job-customer-alert',
	ADMIN_REVIEW_REFUND_CUSTOMER_ALERT:'admin-review-refund-customer-alert',
	ADMIN_REVIEW_CHARGE_DONE:'admin-review-charge-customer',
	ADMIN_REVIEW_DONT_CHARGE_CUSTOMER_ALERT:'admin-review-dont-charge-customer-alert',
	SEND_TRANSFER_FUNDS_EMAIL: 'send-transfer-funds-email',
	SEND_TRANSFER_FUNDS_EMAIL_TO_ADMIN: 'send-transfer-funds-email-to-admin',
	SCHEDULE_LOOKING_FOR_TECHNICIAN:'schedule-looking-for-technician',
	TECHNICIAN_SUBMIT_LONG_JOB:'technician-submit-long-job',
	CUSTOMER_APPROVE_LONG_JOB:'customer-approve-long-job',
	CUSTOMER_REJECT_LONG_JOB:'customer-reject-long-job',
	DONT_CHARGE_WITHOUT_REVIEW_ALERT:'dont-charge-without-review-alert',
	UPDATED_SCHEDULE_JOB_ACCEPTED_TECHNICIAN_EMAIL:'updated-schedule-job-accepted-technician-email',
	SCHEDULE_JOB_UPDATED_BY_TECHNICIAN_TO_CUSTOMER_EMAIL:'schedule-job-updated-by-technician-to-customer-email',
	MOBILE_TABLET_JOB_POST_EMAIL:'mobile-tablet-job-post-email',
	ADDITIONAL_HOURS_REJECTED:'long-job-additional-hours-rejected',
	ADDITIONAL_HOURS_ACCEPTED:'long-job-additional-hours-accepted',
	CUSTOMER_CANCEL_JOB:'customer-cancel-job',
	New_JOB_ALERT_FOR_SAME_TECH:'new-job-alert-same-tech',
	New_JOB_ALERT_FOR_TRANSFER_CASE:'new-job-alert-for-transfer-case',
	STRIPE_INFO_EMAIL_TO_STAKEHOLDERS:'stripe-info-email-to-stakeholders',
  	EMAIL_ADMIN_FOR_LEAVING_CUSTOMER:'email-admin-for-leaving-customer',
  	EMAIL_ADMIN_BUSINESS_INFO:'email-admin-business-info',
  	CUSTOMER_DELETED_ACCOUNT:'customer-deleted-account',
	INFORM_GEEKER_STAKEHOLDER_WHEN_JOB_POSTED:'inform-geeker-stakeholder-when-job-posted',
	INFORM_GEEKER_STAKEHOLDER_WHEN_JOB_ACCEPTED:'inform-geeker-stakeholder-when-job-accepted',
	INFORM_GEEKER_STAKEHOLDER_WHEN_JOB_CANCELLED_BY_CUSTOMER:'inform-geeker-stakeholder-when-job-cancelled-by-customer',
	INFORM_GEEKER_STAKEHOLDER_WHEN_CUSTOMER_DECLINED_TECHNICIAN:'inform-geeker-stakeholder-when-customer-declined-technician',
	INFORM_GEEKER_STAKEHOLDER_WHEN_CUSTOMER_CANCELLED_ACCEPTED_SCH_JOB:'inform-geeker-stakeholder-when-customer-cancelled-accepted-sch-job',
	INFORM_GEEKER_STAKEHOLDER_WHEN_CUSTOMER_CANCELLED_SCH_JOB:'inform-geeker-stakeholder-when-customer-cancelled-sch-job',
	INFORM_GEEKER_STAKEHOLDER_WHEN_TECH_CANCELLED_ACCEPTED_SCH_JOB:'inform-geeker-stakeholder-when-tech-cancelled-accepted-sch-job',
	INFORM_GEEKER_STAKEHOLDERS_JOB_COMPLETED:'inform-geeker-stakeholders-job-completed',
	INFORM_GEEKER_STAKEHOLDER_WHEN_TECH_DECLINED_SCH_JOB:'inform-geeker-stakeholder-when-tech-declined-sch-job',
	INFORM_GEEKER_STAKEHOLDERS_JOB_COMPLETED_PAYMENT_FAILED:'inform-geeker-stakeholder-job-complete-payment-failed',
	INFORM_GEEKER_STAKEHOLDER_TECHNICIAN_NOT_CHARGED:'inform-geeker-stakeholder-technician-not-charge',
	SEND_CONTACT_US_EMAIL_TO_ADMIN:'send-contact-us-email-to-admin',
	SEND_INVITATION_EMAIL:'send-email-invitation',
	SEND_ALERT_TO_ADMIN:'send-alert-to-admin'
}
module.exports.jobTags={
	DRAFT_JOB_CREATED:'draft_job_created',
	USER_REGISTERED:'user_registered',
	USER_LOGIN:'user_login',
	PAYMENT_DEDUCTED:'payment_deducted',
	PAYMENT_DEDUCTED_AFTER_TRANSFER:'payment_deducted_transferred_job',
	SUBSCRIPTION_DEDUCTED:'subscription_deducted',
	SUBSCRIPTION_DEDUCTED_AFTER_TRANSFER:'subscription_deducted_transferred_job',
	JOB_DECLINED_AFTER_KEEP_SEARCHING: 'job_declined_after_keep_searching' // Add in db
}

module.exports.scheduleExpiredMinutes = 20
module.exports.ITSupport="soft_cf26a990-2cf6-11ec-8c4c-5346fd03eb93"
module.exports.EmailOutlook="soft_8d7523aa-6e55-11ec-8c4c-5346fd03eb93"
module.exports.invalid_coupon={
	isValid: false,
	message: "Invalid Coupon"
}
module.exports.valid_coupon={
	isValid: true,
	message: "Promo Applied Successfully"
}
module.exports.already_used_coupon={
	isValid: false,
	message: "Already used by customer"
}
module.exports.not_for_product={
	isValid: false,
	message: "Not valid for this product"
}
module.exports.JOB_STATUS = {
	PENDING: 'Pending',
	WAITING: 'Waiting',
	SCHEDULED: 'Scheduled',
	IN_PROGRESS: 'Inprogress',
	COMPLETED: 'Completed',
	EXPIRED: 'Expired',
	DECLINED: 'Declined',
	LONGJOB: 'long-job',
	ACCEPTED:'Accepted'
}
module.exports.ALERT_TYPE = {
	WEB_NOTIFICATION:"webNotification",
	SMS:"smsAlert",
	EMAIL:"emailAlert"
}
module.exports.JOB_TYPE = {
	LIVE:"live",
	TEST:"test",
}
module.exports.TECHNICIAN_REGISTRATION_STATUS = {
	UPDATE_TECHNICIAN: 'update_technician',
	SELECT_SOFTWARES: 'select_softwares',
	LEVEL_OF_EXPERTISE: 'level_of_expertise',
	AVAILABILITY: 'availability',
	DEMO_VIDEO: 'demo_video',
	INSTRUCTIONS: 'instructions',
	EXAM: 'exam',
	EXAM_FAIL: 'exam_fail',
	FINALIZE_PROFILE:'finalize_profile',
	SCHEDULE_INTERVIEW:'schedule_interview',
	INCOMPLETE_PROFILE:'incomplete_profile',
	COMPLETE:'complete',
}
module.exports.numberOfTimesToRunTechSearchLoop = 6
module.exports.secondsToWaitBeforeRunningTechSearchAgain = 20000
module.exports.blastAwaitTime = 180000
module.exports.management_team_technicians_emails = [
	"tech@129tech.com",
	"email123@email.com",
]

module.exports.twilioChatTokenExpiraySeconds = 7200

module.exports.TWILIO_DETAILS ={
	TWILIO_ACCOUNT_SID_CHAT : process.env.TWILIO_ACCOUNT_SID_CHAT,
    TWILIO_API_KEY_CHAT : process.env.TWILIO_API_KEY_CHAT,
    TWILIO_API_SECRET_CHAT : process.env.TWILIO_API_SECRET_CHAT,
	TWILIO_AUTH_TOKEN_CHAT : process.env.TWILIO_AUTH_TOKEN_CHAT,
	TWILIO_TOKEN_EXPIRY_SECONDS : 7200,
	TWILIO_CHAT_SERVICE_SID : process.env.TWILIO_CHAT_SERVICE_SID
}

module.exports.TECHNICIAN_NOTIFICATION_LIMIT = 25;