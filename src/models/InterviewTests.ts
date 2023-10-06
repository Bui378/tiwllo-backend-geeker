import mongoose, { Document, Model, Schema } from 'mongoose';
import Random from 'meteor-random-universal';

export interface IInterviewTest extends Document {
    name: string;
    pass_percentage: number;
}

export interface IInterviewTestModel extends Model<IInterviewTest> { }

const interviewTestSchema = new Schema({
    _id: {
        type: String,
        default: () => `test_${Random.id()}`,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    pass_percentage: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

const InterviewTest = mongoose.model<IInterviewTest, IInterviewTestModel>('interview_tests', interviewTestSchema);

export default InterviewTest;