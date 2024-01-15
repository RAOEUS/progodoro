const EventEmitter = require('events');

class Timer extends EventEmitter {
  constructor(duration, notice, timerType, motivationLevel, userMessage) {
    super();
    this.duration = duration;
    this.notice = notice;
    this.timerType = timerType;
    this.motivationLevel = motivationLevel;
    this.intervalId = null;
    this.timeStart = new Date();
    this.canceledEarly = false;
    this.userMessage = userMessage;
  }

  start() {
    this.intervalId = setInterval(() => {
      let hours = Math.floor(this.duration / 3600);
      let minutes = Math.floor((this.duration % 3600) / 60);
      let seconds = this.duration % 60;
      let timerText = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
      this.emit('tick', timerText, this.timerType, this.motivationLevel);
      this.duration--;
      if (this.duration < 0) {
        clearInterval(this.intervalId);
        this.emit('done', this.notice);
      }
    }, 1000);
  }

  stop() {
    clearInterval(this.intervalId);
    this.emit('stopped');
  }
}

module.exports = Timer;