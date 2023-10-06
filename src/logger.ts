import onFinished from 'on-finished';
import Request from './models/Request';
import Log from './models/Log';

function getIp(req) {
  return req.ip ||
    req._remoteAddress ||
    (req.connection && req.connection.remoteAddress) ||
    undefined;
}

export default function logger() {
  return (req, res, next) => {
    if (!req.path.startsWith('/requests')) {
      const request = new Request({
        request: {
          ip: getIp(req),
          method: req.method,
          url: req.path,
          user: req.user._id,
          body: req.body,
        }
      });

      req.requestId = request._id;

      process.nextTick(async () => {
        // TODO: try/catch
        await request.save();

        onFinished(res, async () => {
          request.response = {
            status: res.statusCode,
            body: res.body
          };

          await request.save();
        });
      });
    }

    next();
  };
}

export async function logError(err, req?) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(err);
  }

  const log = new Log({
    message: err.message,
    stack: err.stack
  });

  if (req) {
    log.request = req.requestId;
  }

  await log.save();
}