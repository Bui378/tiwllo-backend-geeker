import { Request, Response, NextFunction } from 'express';
import PromoCode, { IPromoCode } from '../models/PromoCode';
import InvalidRequestError from '../errors/InvalidRequestError';
var request = require('request');
import { roleStatus } from "../utils";
let logger = require('../../winston_logger');
logger = logger("PromoCodeController.ts");


export async function retrievePromoData(req: Request, res: Response, next: NextFunction) {
    try {
          const promodata = await PromoCode.findOne({'promo_code' : {$regex: new RegExp('^' +(req.params.coupon).replace(/[-\/\\^$*%+?.()|[\]{}]/g, '\\$&') + '$', 'i')}});
          if(promodata === null){
              res.json({
                  message: 'Invalid Promo Code !!'
              })
          }else if(promodata && promodata.promocode_status == 'inactive'){
              res.json({
                  message: 'Promo Code is Inactive !!'
              })
          }else{
              res.status(200).json(promodata)
          }          
        
    } catch (err) {
        logger.error("Error while retrieving promo code details",{
            "error":err,
            "body":req.params,
        })
    }
  }
  

export async function update(req: Request, res: Response, next: NextFunction) {
  // console.log("req--req--req",req)

  try {
    // console.log("req--req--req",req.params);
    const {id}: { id: string } = req.params as any;
    // console.log('id------>', typeof id)
    // const promocode: IPromoCode = await PromoCode.findById(id);
    const promocode = await PromoCode.findById(id);
     console.log('promocode--promocode',promocode)
    if (!promocode) {
      throw new InvalidRequestError('Promo Code does not exist.');
    }

    promocode.used_by.push(req.body)
    await promocode.save();

    res.json(promocode);
    logger.info("Successful updating promo code details",{
      "promocode":promocode,
      "body":req.body,
    });
  } catch (err) {
     logger.error("Error while updating promo code details",{
            "error":err,
            "body":req.body,
            "job-id" : req.body.job_id
        });
  }
}
  
  
