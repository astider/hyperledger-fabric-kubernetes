const express = require('express');
const { Router } = express;
const bodyParser = require('body-parser');

const app = express();
const router = Router();

const PORT = 8888;

const add = require('./invoke');
const query = require('./query');

app.use((req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
});

app.use((req, res, next) => {
  req.user = 'user260917';
  next();
})

app.use(bodyParser.json({ limit: '50mb' }));

app.use('/',
  router.get('/record/:round', query),
  router.post('/record/', add)
);

app.listen(PORT, () => {
  console.log(`Listening to port ${PORT}`);
});