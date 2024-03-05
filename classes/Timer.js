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
        const startTime = Date.now(); // Record the start time

        this.intervalId = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000; // Calculate elapsed time in seconds
            let remainingDuration = this.duration - elapsedTime; // Adjusted remaining duration

            if (remainingDuration <= 0) {
                clearInterval(this.intervalId);
                remainingDuration = 0; // Ensure remaining duration is non-negative
                setTimeout(() => {
                    this.emit('done', this.notice); // Emit 'done' event after a delay
                }, 1000); // Delay for 1 second to ensure the last tick is printed
            } else {
                let hours = Math.floor(remainingDuration / 3600);
                let minutes = Math.floor((remainingDuration % 3600) / 60);
                let seconds = Math.floor(remainingDuration % 60);

                let timerText = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

                this.emit('tick', timerText, this.timerType, this.motivationLevel);
            }

        }, 1000);
    }


    stop() {
        clearInterval(this.intervalId);
        this.emit('stopped');
    }
}

module.exports = Timer;
