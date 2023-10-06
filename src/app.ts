import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import passport from 'passport';

import strategies from './passport';
import router from './routes';
import httpContext from 'express-http-context';
import fallback from 'express-history-api-fallback';
import errorHandler from './middlewares/errorHandler';
import e from 'express';
const { instrument } = require("@socket.io/admin-ui");
require('newrelic');
const helmet = require('helmet');
console.log('1111111111111111111111111111111111111111')
const app = express();

app.disable('etag');
app.disable('x-powered-by');

app.use(helmet());

app.use(cors());

app.use(passport.initialize());
passport.use('jwt', strategies.jwt);

app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(express.static(`${__dirname}/public`));
app.use('/images', express.static(`./public/uploads`));

const root = `${__dirname}/public`;

app.use(httpContext.middleware);

app.use((req, res, next) => {
  httpContext.set('request', req);
  next(); 
});

const PORT = process.env.PORT || 8080;
var http = require( 'http' ).createServer( app );
exports.io = require( 'socket.io' )( http ,{
  pingTimeout: 30000,
  pingInterval: 25000,
 cors: {
   origin: "*",
   methods: ["GET", "PATCH", "POST", "PUT"],
   credentials: true,
 },
 allowEIO3: false
});

instrument(exports.io, {
  auth: false
});

http.listen( PORT, function() {
  console.log( 'listening on *:' + PORT );
});

app.use('/api', router);
app.use(fallback('index.html', {root}));
app.use('*', (req, res) => {
  console.log('ROUTE NOT FOUND');
  res.sendStatus(400);
});
// app.use(errorHandler);
export default app;
