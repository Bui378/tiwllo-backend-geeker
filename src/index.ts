require('dotenv').config({path: __dirname + '/.env'})
import './setupMongoose';
import { logError } from './logger';
import socketServer from './socket';
process.on('uncaughtException', async (err) => {
  await logError(err);
  process.exit(1);
});

socketServer();


