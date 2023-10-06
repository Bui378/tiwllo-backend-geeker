import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IQuiz extends Document {
  data: object;
  submissions: Array<any>;
}

export interface IQuizModel extends Model<IQuiz> {}

const rateServiceSchema = new Schema({
  _id: {
    type: String,
    default: () => `qz_${Random.id()}`,
    required: true
  },
  data: Object,
  submissions: [Object],
}, { _id: false, timestamps: true, toJSON: { virtuals: true } });

const Quiz = mongoose.model<IQuiz, IQuizModel>('Quiz', rateServiceSchema);

export const findById = (id) => {
  return Quiz.findById(id).then((result) => {
    result = result.toJSON();
    delete result._id;
    delete result.__v;
    return result;
  });
};

export const createObject = async (objectData) => {
  console.log(objectData);
  const quiz = new Quiz({
    data: objectData,
  });
  return await quiz.save();
};

export const createSubmission = async (objectData) => {
  // console.log(objectData);
  console.log('createSubmission')
  const data = new Quiz({
    submissions: [{ ...objectData }],
  });

  await data.save();

  return {
    _id: data._id,
    ...objectData,
  };
};

export const updateSubmission = async (objectData) => {

  const data = await Quiz.findById(objectData.quizId);

  if (!data.submissions) {
    console.log("submission not found")
    throw new Error("submission not found");
  }

  const filteredSubmission = data.submissions.filter((submission) => {
    if (submission)
      return submission["submission_id"] === objectData["submission_id"];
  });

  if (filteredSubmission.length === 0) {
    throw new Error("submission not found");
  }

  const updatedSubmissions = [...data.submissions].map((submission) => {
    console.log(submission, objectData);

    if (
        submission &&
        submission["submission_id"] === objectData["submission_id"]
    ) {
      const questionSubmissionObj = {
        question_id: objectData.question_id,
        answer_id: objectData.answer_id,
        answer_text: objectData.answer_text,
      };

      if (Array.isArray(submission.submitted_questions)) {
        submission.submitted_questions.push(questionSubmissionObj);
      } else {
        submission.submitted_questions = [questionSubmissionObj];
      }
    }
    return submission;
  });

  data.submissions = [...updatedSubmissions];

  data.markModified("submissions");
  await data.save();

  return {
    message: "success",
    start_time: Date.now(),
  };
};

export const getSubmissionsResult = async (quizId) => {
  console.log(quizId);
  return await Quiz.findById(quizId);
};

export const list = (perPage, page) => {
  return new Promise((resolve, reject) => {
    Quiz.find()
        .sort("-createdAt")
        .limit(perPage)
        .skip(perPage * page)
        .exec(function (err, objects) {
          if (err) {
            reject(err);
          } else {
            resolve(objects);
          }
        });
  });
};

export const patchObject = (id, objectData) => {
  return new Promise((resolve, reject) => {
    Quiz.findById(id, function (err, object) {
      if (err) reject(err);
      for (let i in objectData) {
        object[i] = objectData[i];
      }
      object.save(function (err, updatedObject) {
        if (err) return reject(err);
        resolve(updatedObject);
      });
    });
  });
};

export const removeById = (objId) => {
  return new Promise((resolve, reject) => {
    Quiz.deleteMany(
        {
          _id: objId,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(err);
          }
        }
    );
  });
};

export default Quiz;
