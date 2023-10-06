import { Router } from 'express';
import {
  login, register, requestResetPassword, resetPassword, checkEmail, loginSocial,EmailVerification
} from '../controllers/AuthController';
import { authFacebook } from '../middlewares/authFacebook';
import { authGoogle } from '../middlewares/authGoogle';

const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/forgot-password', requestResetPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/check-email', checkEmail);
authRouter.post('/facebook', authFacebook, loginSocial);
authRouter.post('/google', authGoogle, loginSocial);
authRouter.post('/verify-email',EmailVerification)

export default authRouter;
