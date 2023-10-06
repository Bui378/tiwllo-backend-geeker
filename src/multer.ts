import multer from 'multer';

const multerConfig = {
  storage: multer.diskStorage({
    destination: './public/uploads',
    filename: (req, file, next) => {
      const {user} = req.body

      console.log(req.body,">>this is request")
      const ext = file.mimetype.split('/')[1];
      next(null, `${user}-.${ext}`);
    }
  })
};


const upload = multer(multerConfig);

export default upload;
