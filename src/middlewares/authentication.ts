import passport from 'passport';
import Customer, { ICustomer } from "../models/Customer";

const handleJWT = (req, res, next) => async (err, user, info) => {
  const error = err || info;
  try {
    if (error || !user) throw error;
    if(user.userType === 'customer') {
    const result = await Customer.findOne({user:user.id})
    if (result.status == 'deleted') {
      throw new Error('Unauthorized');
    }
  }
    await req.login(user, {session: false});
  } catch (e) {
    // return res.sendStatus(401);
    return res.json({'success':false,'message':'Unauthorised'});
  }

  if (err || !user) {
    return res.json({'success':false,'message':'Unauthorised'});
  }

  req.user = user;

  return next();
};

const authentication = (req, res, next) =>
  passport.authenticate(
    'jwt', {session: false},
    handleJWT(req, res, next),
  )(req, res, next);

export default authentication;
