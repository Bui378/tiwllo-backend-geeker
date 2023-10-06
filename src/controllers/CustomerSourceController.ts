import { Request, Response, NextFunction } from 'express';
import CustomerSource, { ICustomerSourceModel } from '../models/CustomerSource';
import InvalidRequestError from '../errors/InvalidRequestError';
import ActiveUser,{IActiveusersModel} from '../models/Activeusers';



export async function create(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('CustomerSourceController create>>>>>>>>>>>>')

    // console.log("req.body (earning create ):::",req.body)
    const details = new CustomerSource(req.body);
    await details.save();
    // console.log("earning Details are:",details)
    res.status(201).json(details);
  } catch (err) {
    console.log("Error in creating CustomerSource ::",err)
    next(err);
  }
}



export async function getAllLiveTechnicians(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('CustomerSourceController getAllLiveTechnicians>>>>>>>>>>>>')
    
    const ActiveUsers = await ActiveUser.find({'userType':'technician'}).populate({
      path:"user",
      populate:{
          path:"technician",
          model:"Technician"
        }
      })

    // console.log('all_users>>>>>>',ActiveUsers)
    res.json(ActiveUsers);

  } catch (err) {
    next(err);
  }
}


export async function checkIfCustomerSourceExists(req: Request, res: Response, next: NextFunction) {
  try {
      console.log('CustomerSourceController getAllLiveTechnicians>>>>>>>>>>>>')
    let {user_id} = req.body
    let exists = false
    const countOfSourceCustomer = await CustomerSource.find({'user':user_id}).count()
    if(countOfSourceCustomer >= 1){
      exists = true
    }
    else{
      exists = false
    }
    // console.log('all_users>>>>>>',ActiveUsers)
    res.json({"sourceAlreadyGiven":exists});

  } catch (err) {
    next(err);
  }
}
