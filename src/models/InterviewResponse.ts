import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IInterviewResponse extends Document {
    test: string;
    question: string;
    response: string;
    option: string;
    technician: string;
}

export interface IInterviewResponseModel extends Model<IInterviewResponse> { }

const interviewResponseSchema = new Schema({
    _id: {
        type: String,
        default: () => `resp_${Random.id()}`,
        required: true
    },
    test: {
        type: String,
        ref: 'interview_tests',
        required: true,
    },
    question: {
        type: String,
        ref: 'interview_questions',
        required: true,
    },
    option: {
        type: String,
        required: true,
    },
    response: {
        type: String,
        required: true,
    },
    technician: {
        type: String,
        ref: 'Technician',
        required: true,
    },
}, { timestamps: true });

const InterviewResponse = mongoose.model<IInterviewResponse, IInterviewResponseModel>('interview_responses', interviewResponseSchema);

export default InterviewResponse;
