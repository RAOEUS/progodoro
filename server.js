const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

// Default motivation configuration (hh:mm:ss)
const defaultConfig = {
  'lo': ['00:10:00', '00:20:00'],
  'med': ['00:15:00', '00:15:00'],
  'hi': ['00:25:00', '00:10:00'],
  'flow': ['00:00:00', '00:10:00']
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to return configuration data
app.get('/config-data', (req, res) => {
  res.json(defaultConfig);
});

// Logs
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
const logFile = path.join(logDir, 'timer_log.json');

app.post('/log', (req, res) => {
  let logEntry = req.body;
  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  logEntry.id = logs.length ? logs[logs.length - 1].id + 1 : 1;
  logs.push(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  res.sendStatus(200);
});

app.get('/logs-data', (req, res) => {
  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  res.json(logs);
});

// Serve the base layout
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve partials for HTMX swaps
app.get('/partials/:name', (req, res) => {
  const name = req.params.name;
  res.sendFile(path.join(__dirname, 'public', 'partials', `${name}.html`));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

