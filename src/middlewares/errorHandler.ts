import InvalidRequestError from '../errors/InvalidRequestError';
import { logError } from '../logger';
import UnauthorizedError from '../errors/UnauthorizedError';
import ForbiddenError from '../errors/ForbiddenError';
let logger = require('../../winston_logger');
logger = logger("errorHandler.ts");

export default async function errorHandler(err, req, res, next) {

  logger.error("Inside errorHandler : ",{
    'body':req, 
    'err':err
  });

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof InvalidRequestError) {
    return res.status(400).json({
      error: {
        message: err.message
      }
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      error: {
        message: err.message
      }
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      error: {
        message: err.message
      }
    });
  }

  res.status(500).json({
    error: {
      message: 'Username or password is incorrect.'
    }
  });

  await logError(err, req);
}
