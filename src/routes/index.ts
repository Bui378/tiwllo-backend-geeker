import { Router } from 'express';
import usersRouter from './usersRouter';
import inviteRouter from './inviteRouter';
import authRouter from './authRouter';
import authentication from '../middlewares/authentication';
import softwareRouter from './softwareRouter';
import interviewRouter from './interviewRouter';
import customerRouter from './customerRouter';
import technicianRouter from './technicianRouter';
import jobRouter from './jobRouter';
import quizRouter from './quizRouter';
import expertiseRouter from './expertiseRouter';
import experienceRouter from './experienceRouter';
import uploadRouter from './uploadRouter';
import serviceRateRouter from './serviceRateRouter';
import descriptionProblemRouter from './descriptionProblemRouter';
import typeServiceRouter from './typeServiceRouter';
import requestServiceRouter from './requestServiceRouter';
import serviceProviderRouter from './serviceProviderRouter';
import proposalRouter from './propsalRouter';
import feedbackRouter from './feedbackRouter';
import settingsRouter from './settingsRouter';
import ServicesRouter from './extraServicesRouter';
import notificationRouter from './notificationRouter';
import touchPointsRouter from './touchPointsRouter';
import softwareExperiencesRouter from './softwareExperiencesRouter';
import billingDetailsRouter from './billingDetailsRouter';
import earningDetailsRouter from './earningDetailsRouter';
import videoRouter from './videosRouter';
import subscribeRouter from './subscribeRouter';
import contactRouter from './contactRouter';
import webSocketRouter from './webSocketRouter';
import offerRouter from './OfferRouter';
import sourceRouter from './customerSourceRouter';
import otherSoftwareRouter from './otherSoftwareRouter';
import referRouter from './referRouter';
import subscriptionRouter from './subcriptionRouter';
import talkjsRouter from './talkjsRouter';
import webhooksRouter from './webhooksRoutes';
import transactionRouter from './transactionRouter';
import referalDiscountRouter from './referDiscountRouter';
import promoRouter from './promoRouter';
import promoCodeRouter from './promoCodeRoute';
import jobCycleRouter from './jobCycleRouter';
import stripeAccountRouter from './stripeAccountRouter'
import jobNotificationHistoryRouter from './jobNotificationHistoryRouter'
import twilioChatRouter from './TwillioChatRouter';
import publicRouter from './publicRouter';
import accountCustomUserRouter from './accountsCustomUserRouter';
import businessDetailsRouter from './BusinessDetailsRouter';
import appliedCouponRouter from './appliedCoupon';
const router = Router();

router.use('/auth', authRouter);
router.use('/promos',promoRouter)
router.use('/users', authentication, usersRouter);
router.use('/invite', inviteRouter);
router.use('/software', softwareRouter);
router.use('/interview', interviewRouter);
router.use('/customers', authentication, customerRouter);
router.use('/technicians', technicianRouter);
router.use('/jobs', authentication, jobRouter);
router.use('/jobsWithoutAuthenticate', jobRouter);
router.use('/test', authentication, quizRouter);
router.use('/expertise', authentication, expertiseRouter);
router.use('/notification',authentication,notificationRouter)
router.use('/experiences', authentication, experienceRouter);
router.use('/uploads', uploadRouter);
router.use('/service-rate', authentication, serviceRateRouter);
router.use('/description-problems', authentication, descriptionProblemRouter);
router.use('/type-service', authentication, typeServiceRouter);
router.use('/request-service', authentication, requestServiceRouter);
router.use('/service-providers', serviceProviderRouter);
router.use('/proposals',authentication,proposalRouter);
router.use('/feedback',authentication,feedbackRouter);
router.use("/settings",authentication,settingsRouter);
router.use('/referRouter',authentication,referRouter);
router.use("/services",ServicesRouter);
router.use("/touch-points",touchPointsRouter);
router.use("/software-experiences",softwareExperiencesRouter);
router.use("/billing-details",billingDetailsRouter);
router.use("/earning-details",earningDetailsRouter);
router.use("/videos",videoRouter)
router.use('/subscribe', subscribeRouter);
router.use('/contact',contactRouter);
router.use('/web-socket',webSocketRouter);
router.use("/offerRouter",offerRouter)
router.use("/source",sourceRouter);
router.use("/other-software",otherSoftwareRouter);
router.use("/subscriptions",subscriptionRouter)
router.use("/talkjsWebhooks",talkjsRouter)
router.use("/stripeWebhooks", webhooksRouter);
router.use("/transactions",transactionRouter);
router.use("/subscriptions",subscriptionRouter);
router.use("/referalDiscount",referalDiscountRouter);
router.use("/jobsteps",jobCycleRouter);
router.use("/stripeAccount",stripeAccountRouter);
router.use("/promocode",promoCodeRouter );
router.use("/jobNotificationHistory",jobNotificationHistoryRouter );
router.use('/twilio-chat', twilioChatRouter)
router.use("/public", publicRouter);
router.use("/geekerAdmin", accountCustomUserRouter);
router.use("/business-details", businessDetailsRouter)
router.use("/applied-coupon", appliedCouponRouter)
export default router;
