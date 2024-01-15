const CLI = require('./classes/CLI');
const express = require('express'); // Assuming you have Express installed
const Server = require('./Server');
const app = express();

if (process.argv.includes('--cli' || '-cli')) {
  new CLI();
} else {
  new Server();
}