const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const { Router } = express;
const app = express();
const router = Router();

const PORT = 8888;

const add = require('./invoke');
const query = require('./query');

const idNumber = process.argv[2];
const userId = `user_${idNumber}`;

app.use((req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
});

app.use((req, res, next) => {
  // req.user = 'user260917';
  req.user = userId
  next();
})

app.use(bodyParser.json({ limit: '50mb' }));
app.use(morgan('combined'));

app.use('/',
  router.get('/record/:round', query),
  router.post('/record/', add)
);

app.listen(PORT, () => {
  console.log(`Listening to port ${PORT}`);
});