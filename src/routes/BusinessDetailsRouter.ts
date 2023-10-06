import { Router } from 'express';
import { upDateBusinessDetilsById } from '../controllers/BusinessDetailsController';

// Initialize Router for Business Details
const businessDetailsRouter = Router();

// API end Point of Business Details
businessDetailsRouter.post('/update/:id',upDateBusinessDetilsById);

export default businessDetailsRouter;
