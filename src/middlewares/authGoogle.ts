import { OAuth2Client } from 'google-auth-library';
import InvalidRequestError from '../errors/InvalidRequestError';

const googleAudience = process.env.GOOGLE_AUDIENCE || '128256599846-1f342aku7g5mo1418tft6e6evbc2b7dt.apps.googleusercontent.com';
const client = new OAuth2Client(googleAudience);

export const authGoogle = (req, res, next) => {
  try {
    const { tokenId } = req.body;

    client.verifyIdToken({
      idToken: tokenId,
      audience: googleAudience,
    }).then(response => {
      const {email_verified, name, email} = (response as any).payload;
      if (email_verified) {
        req.body = { email, name, provider: 'google' };

        return next();
      }
      throw new InvalidRequestError('Email is not verified.');
    }).catch(err => {
      throw new InvalidRequestError(err);
    });
  } catch (err) {
    throw new InvalidRequestError('Invalid request.');
  }
};
