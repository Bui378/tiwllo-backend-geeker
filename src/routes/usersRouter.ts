import { Router } from 'express';
import { create, getCurrentUser, retrieve, list, update,getUserByParam,updateUserByParam,deleteUserByParam,retrievePic,getOrgUsers,updateBusinessDetails} from '../controllers/UserController';
const usersRouter = Router();

usersRouter.get('/', list);
usersRouter.post('/', create);
usersRouter.post('/get_user_by_param', getUserByParam);
usersRouter.post('/updateUserByParam',updateUserByParam);
usersRouter.post('/deleteUserByParam',deleteUserByParam);
usersRouter.post('/:id', update);
usersRouter.post('/updateUserBusinessDetails/:id', updateBusinessDetails);
usersRouter.get('/current', getCurrentUser);
usersRouter.get('/retrieve/:id', retrieve);
usersRouter.get('/retrievePic/:id', retrievePic);
usersRouter.get('/getOrgUsers/:ownerId', getOrgUsers);

export default usersRouter;
