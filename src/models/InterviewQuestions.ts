import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IInterviewQuestion extends Document {
    test: string;
    question: string;
    answer: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
}

export interface IInterviewQuestionModel extends Model<IInterviewQuestion> { }

const interviewQuestionSchema = new Schema({
    _id: {
        type: String,
        default: () => `ques_${Random.id()}`,
        required: true
    },
    test: {
        type: String,
        ref: 'interview_tests',
        required: true,
    },
    question: {
        type: String,
        required: true,
    },
    answer: {
        type: String,
        required: true,
    },
    option_a: {
        type: String,
        required: true,
    },
    option_b: {
        type: String,
        required: true,
    },
    option_c: {
        type: String,
        required: true,
    },
    option_d: {
        type: String,
        required: true,
    },
}, { timestamps: true });

const InterviewQuestion = mongoose.model<IInterviewQuestion, IInterviewQuestionModel>('interview_questions', interviewQuestionSchema);

export default InterviewQuestion;