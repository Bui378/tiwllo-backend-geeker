import { Console } from 'console';
import Job from '../models/Job';
import Technician from '../models/Technician';
import * as JobService from "./JobService";
import { dynamicEmail } from "./MailService";
import { Request, Response, NextFunction } from 'express';
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const fromNumber = process.env.TWILIO_ACTIVE_PHONE_NUMBER;
const axios = require("axios");


const phoneValidate = (value) => {
  const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
  return re.test(String(value));
};

export const conferenceCall = async (jobId) => {
  try {
    const job = await Job.findById(jobId)
      .populate('software')
      .populate('expertise')
      .populate({
        path: 'customer',
        populate: 'user',
      })
      .populate({
        path: 'technician',
        populate: 'user',
      });

    let customer = job.customer as any;
    let technician = job.technician as any;
    let customerPhoneNumber = customer.phoneNumber;
    let technicianPhoneNumber = technician && technician.profile && technician.profile.confirmId && technician.profile.confirmId.phoneNumber;   
    console.log(technicianPhoneNumber,"<<<<<<<<<<<<<technicianPhoneNumber")
    console.log('customerPhoneNumber>>>>>',customerPhoneNumber)
    if (!customerPhoneNumber || !technicianPhoneNumber || !phoneValidate(customerPhoneNumber) || !phoneValidate(technicianPhoneNumber)) return;

    const response = new VoiceResponse();
    const dial = response.dial();
    const roomId = `Room_${jobId}`;
    dial.conference(roomId);
    console.log('roomId>>>>>',roomId)

    client.conferences(roomId)
        .participants
        .create({from: fromNumber, to: customerPhoneNumber})
        .then(participant => console.log('helooooo working number customer',participant.callSid))
        .catch(err => {
        console.log('err.message>>>>>>>>>>',err.message)   
          return {"success":false,"message":err.message}}
          );

    client.conferences(roomId)
        .participants
        .create({from: fromNumber, to: technicianPhoneNumber})
        .then(participant => console.log('helooooo working number technician',participant.callSid))
        .catch(err => {
          console.log('err.message>>>>>>>>>>',err.message)   
          return {"success":false,"message":err.message}}
          );

    await JobService.updateJob(jobId, {'call':'yes'});

    return dial;
  } catch (err) {
    console.error('ERROR: Conference Call::', err);
  }
};


export const add_participant_to_call = async (req: Request, res: Response, next: NextFunction) => {
  try {
   
    let { jobId, participant_number } = req.params;
    if (!phoneValidate(participant_number)) return;

    const roomId = `Room_${jobId}`;
    console.log('participant_number>>>>>',participant_number)

    client.conferences(roomId)
        .participants
        .create({from: fromNumber, to: participant_number})
        .then(participant => console.log('helooooo working number participant',participant.callSid))
        .catch(err => {
        console.log('err.message>>>>>>>>>>',err.message)   
          return {"success":false,"message":err.message}}
          );
  } catch (err) {
    console.error('ERROR: add_participant_to_call::', err);
  }
};


export const end_conference_call = async (req: Request, res: Response, next: NextFunction) => {
  try {
      let full_data  = req.body;
      let userType = full_data.user_type
      let techId = full_data.techId

      var data = {'status':'Available'}
      console.log('upadting status while ending the meeting.',techId,data)

      if( userType == 'technician' || userType == 'customer' ){
        await Technician.updateOne({ _id: techId }, data);
      }

     return res.json({'success':true});

  } catch (err) {
    console.log(err)
    console.error('ERROR: end_conference_call::', err);
  }
};