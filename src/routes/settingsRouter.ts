import { Router } from 'express';
import { list,create} from '../controllers/SettingsController';

const settingsRouter = Router()

settingsRouter.post("/getSettings",list)
settingsRouter.post("/",create)
export default settingsRouter;