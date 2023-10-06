import mongoose from 'mongoose';
require("dotenv").config();
let MONGO_URI = ''
if (process.env.REACT_APP_ENV === 'production') {
  MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOSTNAME}/${process.env.MONGO_DB}?authSource=admin&replicaSet=${process.env.MONGO_REPLICA}&tls=true&tlsCAFile=${process.env.CRT_PATH}`;
};
if (process.env.REACT_APP_ENV === 'development') {
  MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOSTNAME}/${process.env.MONGO_DB}?authSource=admin&replicaSet=${process.env.MONGO_REPLICA}&tls=true`;

  // MONGO_URI = `mongodb://winkAdmin:a98tgj5978hjisnmisn7r4niutmniuyhvfynruy@${process.env.MONGO_HOSTNAME}/${process.env.MONGO_DB}?authSource=admin`;
};
if (process.env.REACT_APP_ENV === 'local'){
  MONGO_URI = `mongodb://${process.env.MONGO_HOSTNAME}/${process.env.MONGO_DB}`;
}
console.log("MONGO_URI ::::: ",MONGO_URI)
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

mongoose.connect(MONGO_URI, {useNewUrlParser: true}, (err) => {
  if (err) console.log(err);
});

mongoose.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;

    if (doc.constructor.modelName === 'User') {
      delete ret.password;
    }
    return ret;
  }
});
