const readline = require('readline');
const Color = require('./Color');
const Timer = require('./Timer');
const notifier = require('node-notifier')
const { LogCLI } = require('./Logging');
const { motivationConfig } = require('../config');

class CLI {
    constructor() {
        this.timerLog = new LogCLI();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.motivationConfig = motivationConfig;

        this.isWorkPeriod = true;

        this.rl.on('SIGINT', () => {
            if (this.currentTimer) {
                this.currentTimer.stop();
                let type = this.isWorkPeriod ? 'work' : 'break';
                this.addLog(type, true, this.userMessage);
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

        const motivationLevels = Object.keys(this.motivationConfig).join(', ');
        this.rl.question('What is your motivation level? ( ' + Color.colorize(motivationLevels, Color.yellow, true) + ' ) ', (answer) => {
            this.startProgodoro(answer);
        });
    }


    addLog(type, canceledEarly, logMessage) {
        let timeStart = this.currentTimer.timeStart;
        let timeEnd = new Date();
        let motivationLevel = this.currentTimer.motivationLevel;
        let elapsedTime = this.currentTimer.originalLength - this.currentTimer.duration;
        let originalLength = this.currentTimer.originalLength;
        let message = this.currentTimer.message ? ` - ${this.currentTimer.message}` : '';
        this.timerLog.addLog(type, timeStart, timeEnd, logMessage + message, canceledEarly, motivationLevel, elapsedTime, originalLength);
    }

    clearTerminal() {
        process.stdout.write('\x1Bc');
    }

    startProgodoro(motivationLevel, startWithWorkPeriod = true) {
        const motivationLevels = Object.keys(this.motivationConfig).join(', '); // Define motivationLevels here

        if (!Object.keys(this.motivationConfig).includes(motivationLevel)) {
            // If the motivation level is not in the list of options, prompt the user again
            console.log("Invalid motivation level. Please choose from the options: " + motivationLevels); // Use motivationLevels here
            this.rl.question('What is your motivation level? ( ' + Color.colorize(motivationLevels, Color.yellow, true) + ' ) ', (answer) => {
                this.startProgodoro(answer);
            });
            return;
        }

        let [workTime, breakTime] = this.motivationConfig[motivationLevel].map(time => this.convertToSeconds(time));

        const startWorkPeriod = (userMessage) => {
            this.clearTerminal();
            this.isWorkPeriod = true;
            this.currentTimer = new Timer(workTime, "Work time is over! Take a break.", 'WORK', motivationLevel, userMessage);
            this.currentTimer.on('tick', this.handleTick.bind(this));
            this.currentTimer.on('done', this.handleDone.bind(this));
            this.currentTimer.start();
        }

        const startBreakPeriod = () => {
            this.clearTerminal();
            this.isWorkPeriod = false;
            this.currentTimer = new Timer(breakTime, "Break time is over! Back to work.", 'BREAK', motivationLevel);
            this.currentTimer.on('tick', this.handleTick.bind(this));
            this.currentTimer.on('done', this.handleDone.bind(this));
            this.currentTimer.start();
        }

        if (startWithWorkPeriod) {
            this.rl.question('Optional message for this work period: ', (userMessage) => {
                this.userMessage = userMessage;
                startWorkPeriod(this.userMessage);
            });
        } else {
            startBreakPeriod();
        }
    }

    handleTick(timerText, timerType, motivationLevel) {
        timerText = Color.colorize(timerText, Color.yellow, true); // Make the timer bold and yellow
        let message = this.currentTimer.userMessage ? ` - ${this.currentTimer.userMessage}` : '';
        process.stdout.write('\r[ ' + timerText + ' ] - ' + Color.colorize(timerType, Color.cyan, true) + ' - ' + Color.colorize(motivationLevel.toUpperCase() + ' MOTIVATION', Color.green, true) + message);
    }

    handleDone(message) {
        this.clearTerminal(); // Clear the terminal

        // Print the message with a newline character
        console.log(`${message}\n`);

        let type = this.isWorkPeriod ? 'work' : 'break';
        let userMessage = this.userMessage || '';
        this.addLog(type, this.currentTimer.canceledEarly, userMessage);
        let breakTimeLength = this.motivationConfig[this.currentTimer.motivationLevel][1];

        // Send a system notification
        notifier.notify({
            title: 'Progodoro',
            message: this.isWorkPeriod ? `Work period ended. Take a [ ${breakTimeLength} ] break.` : 'Break period ended. Please return to the terminal to start a new work period.',
            // icon: path.join(__dirname, 'icon.png'), // Path to your icon
            sound: true, // Only Notification Center or Windows Toasters
            wait: this.isWorkPeriod // Wait for User Action against notification if work timer
        });

        // If the timer that just ended was a work timer, start a break timer
        if (this.isWorkPeriod) {
            this.startProgodoro(this.currentTimer.motivationLevel, false);
        } else { // If it was a break timer, ask for motivation level and start a new work timer
            const motivationLevels = Object.keys(this.motivationConfig).join(', ');
            this.rl.question('What is your motivation level? ( ' + Color.colorize(motivationLevels, Color.yellow, true) + ' ) ', (answer) => {
                this.clearTerminal(); // Clear the terminal before starting a new timer
                this.startProgodoro(answer);
            });
        }
    }


    convertToSeconds(time) {
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    handleWorkPeriodAnswer(answer) {
        if (answer === 'b') {
            this.startProgodoro(this.currentTimer.motivationLevel, false);
        } else if (answer === 'w') {
            const motivationLevels = Object.keys(this.motivationConfig).join(', ');
            this.rl.question('What is your motivation level? ( ' + Color.colorize(motivationLevels, Color.yellow, true) + ' ) ', (answer) => {
                this.startProgodoro(answer);
            });
        } else if (answer === 'q') {
            this.addLog('work', true);
            this.rl.close();
            process.exit();
        }
    }

    handleBreakPeriodAnswer(answer) {
        if (answer === 'w') {
            const motivationLevels = Object.keys(this.motivationConfig).join(', ');
            this.rl.question('What is your motivation level? ( ' + Color.colorize(motivationLevels, Color.yellow, true) + ' ) ', (answer) => {
                this.startProgodoro(answer, true);
            });
        } else if (answer === 'q') {
            this.addLog('break', true);
            this.rl.close();
            process.exit();
        }
    }
}

module.exports = CLI;
