import { Request, Response, NextFunction } from 'express';
import InterviewQuestion, { IInterviewQuestion } from '../models/InterviewQuestions';
import InterviewTest, { IInterviewTest } from '../models/InterviewTests';
import InterviewResponse, { IInterviewResponse } from '../models/InterviewResponse';
import InvalidRequestError from '../errors/InvalidRequestError';

/**
 * Following function will list all the questions for a specific technician.
 * @params = req: Object
 * @response : Object
 * @author : Vinit
 */
export async function listAllForTech(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('InterviewController list for technician>>>>>>>>>>>>', req.params.id)

        const query = InterviewResponse.find({technician: req.params.id});

        const totalCount = await InterviewResponse.countDocuments(query);

        const questionList = await query.exec();

        return res.json({
            data: questionList,
            totalCount: totalCount,
            technicianId: req.params.id,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Following function will remove a document corresponding to the provided id
 * @params = req: id
 * @response : Boolean
 * @author : Vinit
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('InterviewController removing document with id>>>>>>>>>>>>', req.params.id)

        const query = InterviewResponse.deleteOne({_id: req.params.id});

        const questionList = await query.exec();

        return res.json({
            Success: true,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Function called by api that will get the question data of particular test id
 * @params = req: Type(Object)
 * @response : Type(Object)
 * @author : Kartik
 */
export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('InterviewController list>>>>>>>>>>>>', req.params.id)

        const testArr: IInterviewTest[] = await InterviewTest.find({ _id: req.params.id }).exec();

        const passPercent = testArr[0].pass_percentage;

        const query = InterviewQuestion.find({ test: req.params.id });

        const totalCount = await InterviewQuestion.countDocuments(query);

        const questionList: IInterviewQuestion[] = await query
            .exec();

        return res.json({
            data: questionList,
            totalCount: totalCount,
            testId: req.params.id,
            passPercent: passPercent,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Function called by api that creates the response of interview answers in database
 * @params = req: Type(Object)
 * @response : json object
 * @author : Kartik
 */
export async function create(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('InterviewController create>>>>>>>>>>>>')

        const { ...other } = req.body;

        const interviewResponse = new InterviewResponse(other);

        await interviewResponse.save();

        res.status(201).json(interviewResponse);
    } catch (err) {
        next(err);
    }
}

// export async function retrieve(req: Request, res: Response, next: NextFunction) {
//     try {
//         console.log('InterviewController retrieve>>>>>>>>>>>>')

//         const { id }: { id: string } = req.params as any;

//         const interviewQuestion: IInterviewQuestion = await InterviewQuestion.findById(id);

//         if (!interviewQuestion) {
//             throw new InvalidRequestError('Question does not exist.');
//         }

//         res.json(interviewQuestion);
//     } catch (err) {
//         next(err);
//     }
// }