// Express router for handling timers
const router = require('express').Router();
const { startTimer, stopTimer } = require('../controllers/timers');

router
  .post('/', startTimer)
  .delete('/', stopTimer);

module.exports = router;