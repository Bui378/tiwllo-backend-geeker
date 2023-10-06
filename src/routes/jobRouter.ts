import { Router } from 'express';
import { create, list, remove, retrieve, update, sendAcceptEmail,listByParams,sendZohoInvitation,getTotalJobs, 
    getTotalPaidJobs,generateTotalCost,fetchTimer,updateTimer,checkLastJobFeedback,sendSmsForScheduledDeclinedJob,
    sendTextForJobSubmission,sendEmailForJobSubmission,sendEmailForJobApproval,sendEmailForJobRejection,getTotalJobsTechnician,getTotalWithoutAuthenticateJobsTechnician, checkScheduleJobAvailability, scheduleJobCalcellation,getPendingJobs, listAllJobsByParams,getLatestPendingJobs,getTotalInprogressJobs,getLatestJobForCustomer} from '../controllers/JobController';

const jobRouter = Router();

jobRouter.post('/jsonHandling',updateTimer);  
jobRouter.get('/', list);
jobRouter.post('/', create);
jobRouter.get('/sendInvitation/:email', sendZohoInvitation);
jobRouter.post('/jsonFetcher',fetchTimer)
jobRouter.get('/:id', retrieve);
jobRouter.put('/:id', update);
jobRouter.delete('/:id', remove);
jobRouter.post("/fetchjob",listByParams)
jobRouter.post("/fetchAlljobs",listAllJobsByParams)
jobRouter.post('/:id/accept', sendAcceptEmail);
jobRouter.post('/totalJobs',getTotalJobs)
jobRouter.post('/totalInprogressJobs',getTotalInprogressJobs) 
jobRouter.post('/pendingJobs',getPendingJobs)
jobRouter.post('/latestpendingJobs',getLatestPendingJobs)
jobRouter.post('/latestJobForCustomer',getLatestJobForCustomer)
jobRouter.post('/totalJobsTechnician',getTotalJobsTechnician)
jobRouter.post('/totalWithoutAuthenticateJobsTechnician',getTotalWithoutAuthenticateJobsTechnician)
jobRouter.post('/totalPaidJobs',getTotalPaidJobs)
jobRouter.post('/generateTotalCost',generateTotalCost)
jobRouter.post('/checkLastJobFeedback',checkLastJobFeedback)
jobRouter.post('/sendTextForJobSubmission',sendTextForJobSubmission)
jobRouter.post('/sendEmailForJobSubmission',sendEmailForJobSubmission)
jobRouter.post('/sendEmailForJobApproval',sendEmailForJobApproval)
jobRouter.post('/sendEmailForJobRejection',sendEmailForJobRejection)
jobRouter.post('/sendSmsForScheduledDeclinedJob',sendSmsForScheduledDeclinedJob)
jobRouter.get('/checkScheduleJobAvailability/:id',checkScheduleJobAvailability)
jobRouter.post('/scheduleJobCalcellation/:id',scheduleJobCalcellation)

export default jobRouter;