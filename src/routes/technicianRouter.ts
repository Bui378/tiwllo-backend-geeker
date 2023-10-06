import { Router } from 'express';
import { create, list, remove, retrieve, update, updateResult, updateAccountInfo,retrieveByParams,updateAvatar,getTechnicianRating,getLiveTechnicians ,updateByParams ,getOnlineTechnicianById,getTechnicianDetailesByUserId} from '../controllers/TechnicianController';
import upload from '../multer';

const technicianRouter = Router();

technicianRouter.get('/', list);
technicianRouter.post('/', create);
technicianRouter.get('/:id', retrieve);
technicianRouter.put('/:id', update);
technicianRouter.put('/params/:id', updateByParams);
technicianRouter.put('/updateavatar/:id', updateAvatar);
technicianRouter.put('/updateResult/:id', updateResult);
technicianRouter.post('/getTechByParams', retrieveByParams);
technicianRouter.post('/onlineTechs',getLiveTechnicians)
technicianRouter.get('/onlineTechByid/:id',getOnlineTechnicianById)
technicianRouter.get('/getTechByUserid/:id',getTechnicianDetailesByUserId)
technicianRouter.delete('/:id', remove);
technicianRouter.get('/rating/:id',getTechnicianRating)
// technicianRouter.get('/totalCustomerRating/:id',numberOfCustomerForRating)
technicianRouter.post('/:id/update-account', upload.fields([
  { name: 'w9File', maxCount: 1 },
  { name: 'photoDOL', maxCount: 2 }]
), updateAccountInfo);

export default technicianRouter;
