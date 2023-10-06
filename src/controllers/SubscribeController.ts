import { Request, Response, NextFunction } from 'express';
import Subscribe, { ISubscribe } from '../models/Subscribe';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function subscribeEmail(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('SubscribeController subscribeEmail>>>>>>>>>>>>')
    
    // console.log("req.body (billing create ):::",req.body)
    const subscribeEmailData = await Subscribe.find({'email':req.body.email});
    // console.log("subscribeEmailData",subscribeEmailData)
    if (subscribeEmailData.length > 0) {
      console.log("subscribeEmailData alredas");
      throw new InvalidRequestError('Email already exist.');
    }

    const details = new Subscribe(req.body);
    await details.save();
    // console.log("billing Details are:",details)
    res.status(201).json(details);
  } catch (err) {
    console.log("Error in subscribe is ::",err)
    next(err);
  }
}