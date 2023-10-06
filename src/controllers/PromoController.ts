import { Request, Response, NextFunction } from 'express';
import Promo, { IPromo } from '../models/Promo';
import {getStripeObject} from '../services/SettingService'
// const stripe = require('stripe')(process.env.STRIPE_KEY)
var request = require('request');
import { roleStatus } from "../utils";
import {invalid_coupon,valid_coupon,already_used_coupon,not_for_product} from "../constant"
let logger = require('../../winston_logger');
logger = logger("JobController.ts");
var myModule = require('../app');
/**
	 * This is a funciton used to save promo code details for a customer.
	 * @params =  promocode (string) && customerId && technicianId && redeemed(boolean)
	 * @response : no response
	 * @author : Sahil
	 */
export async function create(req: Request, res: Response, next: NextFunction) {
    let promo_info = req.body.promo_code;
    let redeem_info = req.body.redeemed
	try {
        let  promo_data = await Promo.find({"customer_id":req.body.customer_id,"promo_code":promo_info,"redeemed":false}) 
        if(promo_data.length > 0){
             res.status(500).json({
                message: 'Coupon Already Used'
            });
        }
        else{
            const promo = new Promo(req.body);
		    await promo.save(); 
        }
	} catch (err) {
        logger.info("Error while creating promotion code details ",{
            "error":err,
            "body":req.body
        })
    }
}


/**
	 * This is a funciton used to retrieve promocode details for a customer.
	 * @params =  customerId
	 * @response : customer promocode details
	 * @author : Sahil
	 */
export async function retrievePromoData(req: Request, res: Response, next: NextFunction) {
    const data = req.body;  
    try {
        const promodata = await Promo.find(data).populate({
            path: 'customer_id',
            populate: 'user',
        });
        return (res.json(promodata));
    } catch (err) {
        logger.info("Error while retrieving promo code details",{
            "error":err,
            "body":req.body
        })
    }
  }

export async function retrieveCustomerPromoCodes(req: Request, res: Response, next: NextFunction) {
    const data = req.body;  
    console.log('dataaaaa>>>>>',data)
    try {
      const promocodes = await Promo.find({"customer_id":req.body.customer_id,"redeemed":false}).select('promo_code promo_id');
      return (res.json(promocodes));
    }
    catch (err) {
        logger.info("Error while retrieving promo code details",{
            "error":err,
            "body":req.body
        })
    }
}


/**
	 * This is a funciton used to retrieve cou[pon-code details for a customer.
	 * @params =  coupon-id
	 * @response : customer coupon-code details
	 * @author : Sahil
	 */
export async function fetchCoupon(req: Request, res: Response, next: NextFunction){
    try{
        let stripe = await getStripeObject(req)
        console.log("coupons::::::::::::::::::::>>>>>>>",req.body)
        const coupon = await stripe.coupons.retrieve(
            req.body.couponCode,
            {expand:['applies_to']}
        );
        res.json({
            success:true,
            coupon:coupon
        })
    }catch(err){
        logger.info("Error while retrieving promo code details",{
            "error":err,
            "body":req.body
        })
        res.json({
            success:false,
        })
    }
}

/**
	 * This is a funciton used to validate coupon-code for a customer.
	 * @params =  {coupon-id,customerId,productId}
	 * @response : customer coupon-code details
	 * @author : Sahil
	 */
export async function validateCoupon(req: Request, res: Response, next: NextFunction){
    let response: object;   
    try{
        let stripe = await getStripeObject(req)
        console.log("Validate Coupon",req.body)
        const {couponCode,customerId,productId} = req.body
        const coupon = await stripe.coupons.retrieve(
            couponCode,
            {expand:['applies_to']}
        );
        if(coupon){
            // console.log("coupon.applies_to.products",coupon.applies_to.products,productId)
            if(coupon.applies_to && coupon.applies_to !== undefined && coupon.applies_to.products.length > 0){
                let isCouponApplicable = coupon.applies_to.products.includes(productId)
                if(isCouponApplicable){
                    response = await validateExpiryAndUserEligiblity(coupon,productId,customerId,stripe)
                    logger.info("response",{"response":response})
                }else{
                    response = not_for_product
                    logger.info("response",{"response":response})
                }
            }else{
                response = await validateExpiryAndUserEligiblity(coupon,productId,customerId,stripe)  
                logger.info("response",{"response":response})
            }
        }else{
            response = invalid_coupon
            logger.info("response",{"response":response})
        } 
    }catch(err){
        logger.info("Error while validating coupon-code details in validateCoupon",{
            "error":err,
            "body":req.body
        })
        response = invalid_coupon
        logger.info("response",{"response":response})
    }
    res.json(response)
}

/**
	 * This is a funciton used to validate expiry and use eligibilty to apply coupon-code for a customer.
	 * @params =  coupon object,customerId,productId
	 * @response : customer coupon-code details
	 * @author : Sahil
	 */
export async function  validateExpiryAndUserEligiblity(coupon,productId,customerId,stripe){
    let response: object;
    let isExpired: boolean;
    try{
        if(coupon.redeem_by){
            isExpired = await checkCouponExpiry(coupon.redeem_by)
        }else{
            isExpired = false
        }

        if(isExpired){
            response = invalid_coupon
            logger.info("response",{"response":response})
            return response
        }else{
            let off_price: object
            console.log("couponCode::::>>>>",coupon)
            if(coupon && coupon.percent_off && coupon.percent_off !== null && coupon.percent_off !== undefined){
                off_price ={
                    discount_by : 'percent',
                    discount : coupon.percent_off
                }
            }else{
                off_price ={
                    discount_by : 'amount',
                    discount : coupon.amount_off
                }
            }
            let discountedPrice = await findProductPrice(productId,off_price,stripe)
            if(Object.keys(coupon.metadata).length >= 1 && coupon.metadata.customer_list && coupon.metadata.customer_list.length > 1){
                console.log("coupon.metadata.customer_list",coupon.metadata.customer_list)
                let isUserEligibleforCoupon = await isCouponAvailableforUser(customerId,coupon.metadata.customer_list)    
                if(isUserEligibleforCoupon){
                    valid_coupon.discountedPrice = discountedPrice
                    response = valid_coupon
                    logger.info("response",{"response":response})
                }else{
                    response = already_used_coupon
                    logger.info("response",{"response":response})
                }
                    
            }else{
                valid_coupon.discountedPrice = discountedPrice
                response = valid_coupon
                logger.info("response",{"response":response})
            }
        }
    }catch(err){
        logger.info("Error while validating expiry and user eligibility for coupon in  validateExpiryAndUserEligiblity",{
            "error":err,
            "coupon":coupon
        })
        response = invalid_coupon
    }
    console.log("response:::::>>>",response)
    return response
}


/**
	 * This is a funciton used to find product discounted Price.
	 * @params =  productId,percent_off using coupon
	 * @response : customer coupon-code details
	 * @author : Sahil
	 */
export async function  findProductPrice(productId,off_price,stripe){
    let discountedPrice= 0;
    let priceOff = 0;
    try{
        const product = await stripe.products.retrieve(
            productId
        );
        const price = await stripe.prices.retrieve(
            product.default_price
        );
        let priceForProduct =  (price['unit_amount']/100);
        console.log("priceForProduct::::::>>>>>",priceForProduct)
        if(off_price.discount_by === 'percent'){
            priceOff = off_price.discount * (priceForProduct/100)
        }
        if(off_price.discount_by === 'amount'){
            priceOff = off_price.discount/100
        }
        console.log("priceOff::::>>>",priceOff)
        discountedPrice = priceForProduct - priceOff
        if(discountedPrice < 0){
            discountedPrice = 0
        }
    // discountedPrice = Math.round(discountedPrice* 100) / 100
   
    }catch(err){
        logger.info("Error while retriving price for product findProductPrice",{
            "error":err,
            "productId":productId
        })
    }
    return discountedPrice.toFixed(2) 
}

/**
	 * This is a funciton used to check coupon expiry date.
	 * @params =  coupon expiry_date
	 * @response : boolean
	 * @author : Sahil
	 */
export async function checkCouponExpiry(expiry_date){
    try{
        let today = new Date().getTime();
        let expiryDate = new Date(expiry_date*1000).getTime()
        if(+today < +expiryDate){
            return false
        }else{
            return true
        }  
    }catch(err){
        logger.info("Error while check expiry of coupon in checkCouponExpiry",{
            "error":err,
            "expiry_date":expiry_date
        })
        return true
    }
}

/**
	 * This is a funciton used to check eligibilty of coupon for a customer.
	 * @params =  {customerId,coupon object metadata}
	 * @response : boolean
	 * @author : Sahil
	 */
export async function isCouponAvailableforUser(customerId,metadata){
    
    try{
        let arr = JSON.parse(metadata)
        for (let property in arr) {
            if(customerId === arr[property]){
                return false
            }         
        }
        return true
    }catch(err){
        logger.info("Error while check is customer eligible to apply coupon in isCouponAvailableforUser",{
            "error":err,
            "customerId":customerId
        })
        return false
    }
}