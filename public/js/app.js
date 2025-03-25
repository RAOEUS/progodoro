import {Timer} from 'https://cdn.jsdelivr.net/npm/easytimer.js@4.6.0/+esm'

(function(){
    // ---------------------------
    // Global State and Config
    // ---------------------------
    let currentTimer = null; // This will hold the EasyTimer instance
    let timerStartTime = null;
    let configData = null;   // Loaded from server or localStorage
    let currentTimerData = { 
        active: false, 
        motivation: null, 
        message: "", 
        duration: 0,           // Duration in seconds (preset for countdown mode)
        mode: "countdown",     // "countdown" (for work/break) or "stopwatch" (for FLOW)
        phase: "work"          // "work" or "break"
    };

    // Reset our global timer state.
    function resetTimerState() {
        currentTimerData = { 
            active: false, 
            motivation: null, 
            message: "", 
            duration: 0, 
            mode: "countdown", 
            phase: "work"
        };
    }

    // ---------------------------
    // Persistent Timer Display
    // ---------------------------
    const persistentTimerEl = document.getElementById('persistentTimer');

    function renderStopButton() {
        return `<button id="stopTimerButton">Stop Timer</button>`;
    }

    // This function now just updates the content without triggering an animation each time.
    function updatePersistentTimer() {
        if (!currentTimerData.active) {
            gsap.set("#persistentTimer", { display: "none" });
            return;
        }
        gsap.set("#persistentTimer", { display: "block" });
        const notifMsg =
            Notification.permission !== "granted"
                ? " [Notifications disabled]"
                : "";
        let phaseLabel = currentTimerData.phase === "work" ? "Work" : "Break";
        let formattedTime = currentTimer.getTimeValues().toString();
        persistentTimerEl.innerHTML = `<div>
<strong>${phaseLabel} Timer:</strong> ${formattedTime} | 
<strong>Motivation:</strong> ${currentTimerData.motivation.toUpperCase()} | 
<strong>Comment:</strong> ${currentTimerData.message || ""}${notifMsg}
</div>` + renderStopButton();
        document.title = "Progodoro - " + formattedTime;
    }

    function clearPersistentTimer() {
        persistentTimerEl.style.display = 'none';
        document.title = "Progodoro";
    }

    // ---------------------------
    // Configuration Loading and Select Population
    // ---------------------------
    function loadConfig() {
        return fetch('/config-data')
            .then(res => res.json())
            .then(defaultConfig => {
                // Use stored config if available; otherwise use default.
                configData = JSON.parse(localStorage.getItem('motivationConfig')) || defaultConfig;
                return configData;
            });
    }

    function populateMotivationSelect() {
        loadConfig().then(config => {
            const select = document.getElementById('motivation');
            if (!select) return;
            select.innerHTML = '';
            for (let level in config) {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = level.toUpperCase();
                select.appendChild(option);
            }
        });
    }

    // Listen for custom config update events.
    document.addEventListener("configUpdated", function(e) {
        configData = e.detail;
        populateMotivationSelect();
    });

    // ---------------------------
    // Timer Logic Using easytimer.js
    // ---------------------------
    // Start a new timer instance based on the currentTimerData settings.
    function startNewTimer() {
        // Create a new EasyTimer instance.
        currentTimer = new Timer();

        // Start timer based on mode.
        if (currentTimerData.mode === "countdown") {
            currentTimer.start({ countdown: true, startValues: { seconds: currentTimerData.duration } });
        } else {
            currentTimer.start();
        }

        // Animate persistent timer only once when the timer starts.
        gsap.fromTo(
            "#persistentTimer",
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5 }
        );

        // Update display on every second.
        currentTimer.addEventListener('secondsUpdated', function(e) {
            updatePersistentTimer();
        });

        // When the target is reached (only for countdown timers), handle completion.
        currentTimer.addEventListener('targetAchieved', function(e) {
            timerDone();
        });
    }

    // Stop the current timer and mark it as canceled early if needed.
    function stopCurrentTimer(canceledEarly = false) {
        if (currentTimer) {
            currentTimer.stop();
            timerDone(canceledEarly);
        }
    }

    // Handle the completion (or manual stop) of a timer.
    function timerDone(canceledEarly = false) {
        updatePersistentTimer();
        const endTime = new Date();
        const logData = {
            type: currentTimerData.phase, // "work" or "break"
            motivation: currentTimerData.motivation,
            message: currentTimerData.message,
            timeStart: timerStartTime,
            timeEnd: endTime,
            duration: currentTimerData.duration,
            canceledEarly: canceledEarly
        };
        // Send log data to the server.
        fetch('/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });

        if (canceledEarly) {
            currentTimerData.active = false;
            currentTimerData.phase = "work"; // Always reset to work mode.
            clearPersistentTimer();
            const form = document.getElementById('timerForm');
            if (form) form.querySelector('button').disabled = false;
            return;
        }

        // If a work period completes normally, auto-start the break timer.
        if (currentTimerData.phase === "work" && currentTimerData.mode === "countdown") {
            if (Notification.permission === 'granted') {
                new Notification("Progodoro", { 
                    body: `Work period complete! Take a break for ${configData[currentTimerData.motivation][1]}.`
                });
            }
            // Switch to break phase.
            currentTimerData.phase = "break";
            const breakTimeStr = configData[currentTimerData.motivation][1];
            const parts = breakTimeStr.split(':').map(Number);
            const breakDuration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            currentTimerData.duration = breakDuration;
            timerStartTime = new Date();
            startNewTimer();
            return;
        }

        // When a break period completes normally, notify and reset state.
        if (currentTimerData.phase === "break") {
            if (Notification.permission === 'granted') {
                new Notification("Progodoro", { 
                    body: "Break period complete! Return to work when you're ready." 
                });
            }
            currentTimerData.active = false;
            currentTimerData.phase = "work"; // Reset for future work timers.
            clearPersistentTimer();
            const form = document.getElementById('timerForm');
            if (form) form.querySelector('button').disabled = false;
            return;
        }

        // For FLOW mode (stopwatch), manual stop triggers timerDone.
        currentTimerData.active = false;
        clearPersistentTimer();
        const form = document.getElementById('timerForm');
        if (form) form.querySelector('button').disabled = false;
        if (Notification.permission === 'granted') {
            new Notification("Progodoro", { 
                body: (currentTimerData.mode === "stopwatch") ? "Stopwatch stopped." : "Work period complete!" 
            });
        }
    }

    // ---------------------------
    // Notification Permission
    // ---------------------------
    function checkNotificationPermission() {
        if (Notification.permission !== 'granted') {
            const notifMsg = document.createElement('div');
            notifMsg.style.fontSize = '0.8em';
            notifMsg.style.color = 'red';
            notifMsg.textContent = "System notifications are disabled. Please allow notifications to receive alerts.";
            document.body.insertBefore(notifMsg, document.body.firstChild);
        }
    }

    if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            checkNotificationPermission();
        });
    }

    // ---------------------------
    // Event Listeners
    // ---------------------------
    // Handle timer form submission.
    document.addEventListener('submit', function(e) {
        if (e.target && e.target.id === 'timerForm') {
            e.preventDefault();
            // Always reset state on new submission.
            resetTimerState();

            const form = e.target;
            const motivation = form.motivation.value;
            const message = form.message.value;
            if (!motivation || !configData[motivation]) {
                alert("Please select a valid motivation level.");
                return;
            }
            timerStartTime = new Date();
            // Force new timer to start in work mode.
            currentTimerData = {
                active: true,
                motivation: motivation,
                message: message,
                duration: 0,
                mode: (motivation === 'flow') ? "stopwatch" : "countdown",
                phase: "work"
            };
            form.querySelector('button').disabled = true;
            if (currentTimer) {
                currentTimer.stop();
            }
            // For countdown mode, set work duration from config.
            if (currentTimerData.mode === "countdown") {
                const timeStr = configData[motivation][0];
                const parts = timeStr.split(':').map(Number);
                const duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                currentTimerData.duration = duration;
            }
            startNewTimer();
        }
    });

    // Stop Timer button click handler is attached above on persistentTimerEl.

    // ---------------------------
    // HTMX Swap Listener
    // ---------------------------
    document.body.addEventListener('htmx:afterSwap', (e) => {
        if (e.detail.target.id === 'content' && document.getElementById('timerForm')) {
            resetTimerState();
            populateMotivationSelect();
        }
    });

    document.addEventListener('DOMContentLoaded', function() {
        populateMotivationSelect();
        clearPersistentTimer();
    });

    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'stopTimerButton') {
            stopCurrentTimer(true);
        }
    });
})();

