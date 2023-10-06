import { Request, Response, NextFunction } from 'express';
import ContactUs, { IContactUs } from '../models/Contact';
import {
  sendContactUsEmailAdmin
} from "../services/MailService";
import moment from 'moment';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('ContactController create>>>>>>>>>>>>')

  console.log("req.body :::::: ",req.body)
  let data = req.body
  let dataToBeSent = {}
  for(var k in req.body){
  	dataToBeSent[req.body[k]['name']] = req.body[k]['value']
  }
  console.log("Data ::: ",data)
  console.log("dataToBeSent ::::::::::",dataToBeSent)
	const contact = new ContactUs(data);
	await contact.save();
  await sendContactUsEmailAdmin(dataToBeSent);
	res.status(201).json({msg:"Success"});
  } catch (err) {
  	console.log("err::: ",err)
	next(err);
  }
}

