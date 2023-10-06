import * as JobService from "../services/JobService";
import {NextFunction, Request, Response} from "express";

import QuizModel, { IQuiz, createSubmission, updateSubmission, getSubmissionsResult } from '../models/Quiz';
import UserModel, { IUser, updateUser } from '../models/User';
const axios = require("axios");
const uuid = require("uuid");

const { config } = require('../config/env.config');
const { CANVAS_SPEC_URL, ACCESS_TOKEN, COURSE_ID } = process.env;

export async function list(req: Request, res: Response, next: NextFunction) {
  try{
        console.log('QuizController list>>>>>>>>>>>>')


    const { courseId } = req.params;
    const quizzes = await axios.get(
        `${CANVAS_SPEC_URL}/courses/${courseId}/quizzes?access_token=${ACCESS_TOKEN}`
    );
    return res.json({
      message: "success",
      data: quizzes.data,
    });
  } catch(err) {
    console.log('ERROR: quiz::', err.message);
    next(err);
    return res.status(err.status || err.response.status || 500).send();
  }
};

export async function createQuizSubmission(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('QuizController createQuizSubmission>>>>>>>>>>>>')

    const { courseId, quizId } = req.body
    const questions = await axios.get(
        `${CANVAS_SPEC_URL}/courses/${courseId}/quizzes/${quizId}/questions?access_token=${ACCESS_TOKEN}&page=1&per_page=1000`
    );

    const submission = await createSubmission({
      start_time: Date.now(),
      end_time: Date.now() + 30 * 60 * 1000,
      submission_id: uuid.v1(),
      quizId: req.params.quizId,
      questions: questions.data,
    });

    return res.json({
      message: "success",
      data: {
        questions: questions.data,
        ...submission,
      },
    });
  } catch (err) {
    console.log(err);
    next(err);
    return res.status(err.status || err.response.status || 500).send();
  }
};

export async function updateQuizSubmission(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('QuizController updateQuizSubmission>>>>>>>>>>>>')

    const { _id, submission_id, question_id, answer_id, answer_text } = req.body;
    const submission = await updateSubmission({
      question_id,
      answer_id,
      answer_text,
      submission_id: submission_id,
      quizId: req.body._id,
    });

    return res.json({
      message: "success",
      data: submission,
    });
  } catch (err) {
    next(err);
    return res.status(500).send();
  }
};

export async function quizSubmissionResult(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('QuizController quizSubmissionResult>>>>>>>>>>>>')
    
    const { _id, submission_id } = req.body;
    const result = await getSubmissionsResult(_id);
    const submission = result.submissions.filter((submission) => {
      if (submission && submission.submission_id === submission_id)
        return submission;
    })[0];

    const resultData = {
      score: 0,
      percent: 0,
      max_score: submission.questions.length,
    };

    try {
      submission.submitted_questions.forEach((question) => {
        const filteredQuestion = submission.questions.filter((que) => {
          return que.id == question.question_id;
        })[0];

        const filteredAnswer = filteredQuestion.answers.filter(
            (ans) => ans.id == question.answer_id
        )[0];

        if (filteredAnswer.weight == 100) {
          resultData.score += 1;
        }
      });
    } catch (err) {
      console.log(err);
    }

    // @ts-ignore
    let userId = req && req.user._id;
    resultData.percent = (resultData.score / resultData.max_score) * 100;
    const tier = resultData.percent > 80 ? 2 : (resultData.percent > 60 ? 1 : 0);
    const userData = {
      userId,
      tier
    }
    const userResult = await updateUser(userData);

    return res.json({
      message: "success",
      data: resultData,
    });
  } catch (err) {
    console.log(err);
    next(err);
    return res.status(500).send();
  }
};
