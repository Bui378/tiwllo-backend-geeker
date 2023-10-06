import mongoose from 'mongoose';
import TypeService from '../models/TypeService';
import DescriptionProblem from '../models/DescriptionProblem';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/tetch';
mongoose.connect(MONGO_URI, {useNewUrlParser: true});

const typeServices = [
  {
    name: 'Type Service 1',
  },
  {
    name: 'Type Service 2',
  },
  {
    name: 'Type Service 3',
  }
];

const descriptionProblems = [
  {
    name: 'Description Problem1',
  },
  {
    name: 'Description Problem2',
  },
  {
    name: 'Description Problem3',
  }
];

(async () => {
  await TypeService.deleteMany({});
  await DescriptionProblem.deleteMany({});

  await TypeService.create(typeServices);
  await DescriptionProblem.create(descriptionProblems);

  console.log('FINISH!!');
})();
