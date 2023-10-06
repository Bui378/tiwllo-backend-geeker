import mongoose from 'mongoose';
import User from '../models/User';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/tetch';
mongoose.connect(MONGO_URI, {useNewUrlParser: true});

const USER_DATA = [
  {
    firstName: 'Robin',
    lastName: 'Benzing',
    email: 'robin.benzing.po@gmail.com',
    password: 'password!23',
    role: 'admin'
  }
];

(async () => {
  for (const data of USER_DATA) {
    const isExist = await User.findOne({ email: data.email });

    if (!isExist) {
      const user = new User(data);
      await user.save();
      console.log('Email:', data.email, 'Password:', data.password);
    } else {
      console.log('The email is already exists:', data.email);
    }
  }

  console.log('FINISH!!');
})();
