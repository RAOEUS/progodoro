const readline = require('readline');
const fs = require('fs');
const path = require('path');

class TimerLog {
  constructor() {
    this.filePath = path.join(__dirname, 'log.json');
    this.logs = [];

    if (fs.existsSync(this.filePath)) {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      this.logs = JSON.parse(data);
    } else {
      fs.writeFileSync(this.filePath, JSON.stringify(this.logs, null, 2));
    }

    this.currentId = this.logs.length > 0 ? Math.max(...this.logs.map(log => log.id)) + 1 : 1;
  }

  addLog(type, timeStart, timeEnd, message = '', canceledEarly = false, motivationLevel, duration, originalLength) {
    const log = {
      id: this.currentId++,
      type,
      timeStart,
      timeEnd,
      canceledEarly,
      motivationLevel,
      duration: this.formatDuration(duration),
      originalLength: this.formatDuration(originalLength)
    };

    if (type !== 'Break timer') {
      log.message = message;
    }

    this.logs.push(log);
    fs.writeFileSync(this.filePath, JSON.stringify(this.logs, null, 2));
  }

  formatDuration(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
}

class Timer {
  constructor(duration, message, callback, timerType, motivationLevel, timerLog, logMessage = '') {
    this.originalLength = duration;
    this.duration = duration;
    this.message = message;
    this.callback = callback;
    this.timerType = timerType;
    this.motivationLevel = motivationLevel;
    this.intervalId = null;
    this.timerLog = timerLog;
    this.timeStart = new Date();
    this.canceledEarly = false;
    this.logMessage = logMessage;
  }

  start() {
    this.intervalId = setInterval(() => {
      let hours = Math.floor(this.duration / 3600);
      let minutes = Math.floor((this.duration % 3600) / 60);
      let seconds = this.duration % 60;
      process.stdout.write('\r' + this.timerType + ' - ' + this.motivationLevel + ' motivation - ' + (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds + ' remaining');
      this.duration--;
      if (this.duration === 0) {
        const elapsedTime = this.originalLength - this.duration;
        this.timerLog.addLog(this.timerType, this.timeStart, new Date(), this.logMessage, this.canceledEarly, this.motivationLevel, elapsedTime, this.originalLength);
        console.log("\n" + this.message);
        clearInterval(this.intervalId); // Clear the interval
        this.callback(); // Call the callback function
      }
    }, 1000);
  }

  stop() {
    this.canceledEarly = true;
    const elapsedTime = this.originalLength - this.duration;
    this.timerLog.addLog(this.timerType, this.timeStart, new Date(), this.logMessage, this.canceledEarly, this.motivationLevel, elapsedTime, this.originalLength);
    clearInterval(this.intervalId);
  }
}

class Pomodoro {
  constructor() {
    this.timerLog = new TimerLog();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.motivationConfig = {
      'lo': ['00:03:00', '00:15:00'],
      'med': ['00:15:00', '00:12:00'],
      'hi': ['00:30:00', '00:10:00'],
      'flow': ['00:00:00', '00:05:00']
    };

    this.currentTimer = null;
    this.isWorkPeriod = true;

    this.rl.on('SIGINT', () => {
      if (this.currentTimer) {
        this.currentTimer.stop();
      }

      this.rl.question('Do you want to quit? (y/N) ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          this.rl.close();
          process.exit();
        } else {
          if (this.isWorkPeriod) {
            this.rl.question('You interrupted a work period. Do you want to start a break (b), quit (q), or start a new work period (w)? ', this.handleWorkPeriodAnswer.bind(this));
          } else {
            this.rl.question('You interrupted a break period. Do you want to start a work period (w) or quit (q)? ', this.handleBreakPeriodAnswer.bind(this));
          }
        }
      });
    });

    this.rl.question('What is your motivation level? (lo, med, hi, flow) ', (answer) => {
      this.startPomodoro(answer);
    });
  }

  startPomodoro(motivationLevel, startWithWorkPeriod = true) {
    let [workTime, breakTime] = this.motivationConfig[motivationLevel].map(time => this.convertToSeconds(time));

    const startWorkPeriod = (message = '') => {
      this.isWorkPeriod = true;
      this.currentTimer = new Timer(workTime, "Work time is over! Take a break.", startBreakPeriod, 'Work timer', motivationLevel, this.timerLog, message);
      this.currentTimer.start();
    }

    const startBreakPeriod = () => {
      this.isWorkPeriod = false;
      this.currentTimer = new Timer(breakTime, "Break time is over! Back to work.", askMotivationLevel, 'Break timer', motivationLevel, this.timerLog);
      this.currentTimer.start();
    }

    const askMotivationLevel = () => {
      this.rl.question('What is your motivation level? (lo, med, hi, flow) ', (answer) => {
        this.startPomodoro(answer);
      });
    }

    if (startWithWorkPeriod) {
      this.rl.question('Optional message for this work period: ', (message) => {
        startWorkPeriod(message);
      });
    } else {
      startBreakPeriod();
    }
  }

  convertToSeconds(time) {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  handleWorkPeriodAnswer(answer) {
    if (answer === 'b') {
      this.startPomodoro('lo', false);
    } else if (answer === 'w') {
      this.rl.question('What is your motivation level? (lo, med, hi, flow) ', (answer) => {
        this.startPomodoro(answer);
      });
    } else if (answer === 'q') {
      this.rl.close();
      process.exit();
    }
  }

  handleBreakPeriodAnswer(answer) {
    if (answer === 'w') {
      this.rl.question('What is your motivation level? (lo, med, hi, flow) ', (answer) => {
        this.startPomodoro(answer, true);
      });
    } else if (answer === 'q') {
      this.rl.close();
      process.exit();
    }
  }
}

new Pomodoro();