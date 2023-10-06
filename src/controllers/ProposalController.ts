import { Request, Response, NextFunction } from 'express';
import Proposal, { IProsposalModel , IProposal } from '../models/Proposal';
import InvalidRequestError from '../errors/InvalidRequestError';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
        console.log('ProposalController list>>>>>>>>>>>>')

    let { page, pageSize } = req.params;

    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    const query = Proposal.find();

    const totalCount = await Proposal.countDocuments(query);
    const proposals: IProposal[] = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('software')
      .populate({
       path : 'subSoftware',
       populate:'software'
      })
      .populate({
        path: 'customer',
        populate: 'user',
      })
      .populate({
        path: 'technician',
        populate: 'user',
      })
      .populate({
          path:"job",
          populate:"Job"
      })
      .exec();
      
    return res.json({
      data: proposals,
      totalCount
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
    try {

        console.log('ProposalController create>>>>>>>>>>>>')

      const proposal = new Proposal(req.body);
  
      await proposal.save();
  
      res.status(201).json(proposal);
    } catch (err) {
      next(err);
    }
  }
  
  export async function retrieve(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('ProposalController retrieve>>>>>>>>>>>>')

      const {id}: { id: string } = req.params as any;
  
      const proposal: IProposal = await Proposal.findById(id).populate('customer').populate('technician');
  
      if (!proposal) {
        throw new InvalidRequestError('User does not exist.');
      }
  
      res.json(proposal);
    } catch (err) {
      next(err);
    }
  }
  
  export async function update(req: Request, res: Response, next: NextFunction) {
    try {

        console.log('ProposalController update>>>>>>>>>>>>')

      const {id}: { id: string } = req.params as any;
  
      const proposal: IProposal = await Proposal.findById(id);
  
      if (!proposal) {
        throw new InvalidRequestError('User does not exist.');
      }
  
      proposal.set(req.body);
  
      await proposal.save();
  
      res.json(proposal);
    } catch (err) {
      next(err);
    }
  }
  
  export async function remove(req: Request, res: Response, next: NextFunction) {
    try {
        console.log('ProposalController remove>>>>>>>>>>>>')
      
      const {id}: { id: string } = req.params as any;
  
      await Proposal.deleteOne({_id: id});
  
      res.json({deleted: true});
    } catch (err) {
      next(err);
    }
  }
  