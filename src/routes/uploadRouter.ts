import { Router } from 'express';
import upload from '../multer';

const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), (req, res) => {
  res.json((req as any).file.filename);
});

export default uploadRouter;
