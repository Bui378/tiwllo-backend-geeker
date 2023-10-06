
import Proposal from '../models/Proposal';

export const createProposal = async (data) => {
  try {
    await Proposal.create(data);
  } catch (err) {
    console.error('createProposal::', err);
  }
};