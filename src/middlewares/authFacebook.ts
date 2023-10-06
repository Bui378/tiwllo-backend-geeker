import axios from 'axios';
import InvalidRequestError from '../errors/InvalidRequestError';

export const authFacebook = (req, res, next) => {
  try {
    const { accessToken, userID } = req.body;
    const BASE_URL = process.env.FACEBOOK_GRAPH_URL || 'https://graph.facebook.com/v2.11';

    axios
      .get(`${BASE_URL}/${userID}?fields=id,name,email&access_token=${accessToken}`)
      .then(response => {
        const { email, name } = response as any;

        req.body = { email, name, provider: 'facebook' };

        return next();
      })
      .catch(err => {
        throw new InvalidRequestError(err);
      });
  } catch (err) {
    throw new InvalidRequestError('Invalid request.');
  }
};
