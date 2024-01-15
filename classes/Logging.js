const fs = require('fs');
const path = require('path');

class Log {
  constructor() {
    this.logs = [];
    this.currentId = this.logs.length > 0 ? Math.max(...this.logs.map(log => log.id)) + 1 : 1;
  }

  addLog(log) {
    if (typeof log !== 'object' || log === null) {
      console.error('Invalid log: log must be an object');
      return;
    }

    // Define the structure of the log object
    const structuredLog = {
      id: this.currentId++,
      type: log.type,
      timeStart: log.timeStart,
      timeEnd: log.timeEnd,
      canceledEarly: log.canceledEarly,
      motivationLevel: log.motivationLevel,
      elapsedTime: log.elapsedTime,
      originalLength: log.originalLength,
      message: log.message
    };

    this.logs.push(structuredLog);
  }
}

class LogCLI extends Log {
  constructor() {
    super();
    if (!fs.existsSync(path.join(__dirname, '../logs'))) {
      fs.mkdirSync(path.join(__dirname, '../logs'));
    }
    this.filePath = path.join(__dirname, '../logs/timer_log.json');

    if (fs.existsSync(this.filePath)) {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      this.logs = JSON.parse(data);
      this.currentId = this.logs.length > 0 ? Math.max(...this.logs.map(log => log.id)) + 1 : 1;
    } else {
      fs.writeFileSync(this.filePath, JSON.stringify(this.logs, null, 2));
    }
  }

  addLog(type, timeStart, timeEnd, userMessage, canceledEarly = false, motivationLevel, elapsedTime, originalLength) {
    const log = {
      type,
      timeStart,
      timeEnd,
      canceledEarly,
      motivationLevel,
      elapsedTime: this.formatTime(elapsedTime),
      originalLength: this.formatTime(originalLength),
      message: type !== 'Break timer' ? userMessage : undefined
    };

    super.addLog(log);
    fs.writeFileSync(this.filePath, JSON.stringify(this.logs, null, 2));
  }

  formatTime(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;

    return (hours < 10 ? '0' : '') + hours.toString() + ':' +
      (minutes < 10 ? '0' : '') + minutes.toString() + ':' +
      (seconds < 10 ? '0' : '') + seconds.toString();
  }
}

class LogLocalStorage extends Log {
  constructor() {
    super();
    this.logs = JSON.parse(localStorage.getItem('logs')) || [];
    this.currentId = this.logs.length > 0 ? Math.max(...this.logs.map(log => log.id)) + 1 : 1;
  }

  addLog(type, timeStart, timeEnd, userMessage, canceledEarly = false, motivationLevel, elapsedTime, originalLength) {
    const log = {
      type,
      timeStart,
      timeEnd,
      canceledEarly,
      motivationLevel,
      elapsedTime,
      originalLength,
      userMessage: type !== 'Break timer' ? userMessage : undefined
    };

    const newLog = super.addLog(log);
    localStorage.setItem('logs', JSON.stringify(this.logs));
    return newLog;
  }
}

module.exports = { Log, LogCLI, LogLocalStorage };