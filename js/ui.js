function setStatus(msg) {
    let displayMsg = msg;
    if (msg.toLowerCase().includes('connecting')) {
        displayMsg = 'Connecting';
    } else if (msg.toLowerCase().includes('not connected') || msg.toLowerCase().includes('disconnect')) {
        displayMsg = 'Disconnected';
    } else if (msg.toLowerCase().includes('paused')) {
        displayMsg = 'Paused';
    } else if (msg.toLowerCase().includes('running')) {
        displayMsg = 'Running';
    } else if (msg.toLowerCase().includes('stopped')) {
        displayMsg = 'Stopped';
    }

    if (statusChip) {
        statusChip.querySelector('.mdl-chip__text').textContent = displayMsg;
        statusChip.classList.remove('chip-connected', 'chip-connecting', 'chip-disconnected', 'chip-paused');
        if (displayMsg === 'Running') {
            statusChip.classList.add('chip-connected');
        } else if (displayMsg === 'Connecting') {
            statusChip.classList.add('chip-connecting');
        } else if (displayMsg === 'Paused') {
            statusChip.classList.add('chip-paused');
        } else {
            statusChip.classList.add('chip-disconnected');
        }
    }
}

function updateDashboard(data) {
    speedDiv.textContent = data.speed || '-';
    distanceDiv.textContent = data.distance || '-';
    caloriesDiv.textContent = data.calories || '-';
    if (data.duration && typeof data.duration === 'number') {
        durationDiv.textContent = formatDuration(data.duration);
    } else if (typeof data.duration === 'string' && !isNaN(parseFloat(data.duration))) {
        durationDiv.textContent = formatDuration(parseFloat(data.duration));
    } else {
        durationDiv.textContent = data.duration || '-';
    }
    stepsDiv.textContent = data.steps || '-';
    elevationDiv.textContent = data.elevation || '-';
}

function setPrimaryControls(startEnabled, stopEnabled) {
    startBtn.disabled = !startEnabled;
    stopBtn.disabled = !stopEnabled;
}

function setSpeedControls(enable) {
    speedUpBtn.disabled = !enable;
    speedDownBtn.disabled = !enable;
    speedSlider.disabled = !enable;
}

function shouldEnableSpeedControls() {
    const liveSpeed = treadmillData && treadmillData._raw ? treadmillData._raw.current_speed : 0;
    return connected &&
        runningState === 1 &&
        startBtn.textContent === "Pause" &&
        liveSpeed >= 1500;
}

function refreshSpeedControls() {
    setSpeedControls(shouldEnableSpeedControls());
}

function updateRunningState(state) {
    runningState = state;
    if (!connected) {
        setPrimaryControls(false, false);
        setSpeedControls(false);
        startBtn.textContent = "Start";
        setStatus('Disconnected');
        return;
    }

    switch (state) {
        case 0:
            setPrimaryControls(false, true);
            setSpeedControls(false);
            startBtn.textContent = "Start";
            setStatus('Connecting');
            break;
        case 1:
            setPrimaryControls(true, true);
            startBtn.textContent = "Pause";
            setStatus('Running');
            refreshSpeedControls();
            break;
        case 2:
            setPrimaryControls(true, true);
            setSpeedControls(false);
            startBtn.textContent = "Start";
            setStatus('Paused');
            break;
        case 3:
            setPrimaryControls(true, false);
            setSpeedControls(false);
            startBtn.textContent = "Start";
            setStatus('Stopped');
            break;
        default:
            setPrimaryControls(false, false);
            setSpeedControls(false);
            startBtn.textContent = "Start";
            setStatus('Disconnected');
    }
}

function formatDuration(seconds) {
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(h + 'h');
    if (m > 0 || h > 0) parts.push(m + 'm');
    parts.push(s + 's');
    return parts.join(' ');
}

function syncSpeedSlider() {
    const sliderSpeed = (curTargetSpeed / 1000).toFixed(1);
    speedSlider.value = sliderSpeed;
    sliderValue.textContent = sliderSpeed;
}

function showToast(message, timeout = 4000) {
    if (snackbar && snackbar.MaterialSnackbar) {
        snackbar.MaterialSnackbar.showSnackbar({ message, timeout });
    } else if (snackbar) {
        snackbar.querySelector('.mdl-snackbar__text').textContent = message;
        snackbar.classList.add('mdl-snackbar--active');
        setTimeout(() => snackbar.classList.remove('mdl-snackbar--active'), timeout);
    } else {
        alert(message);
    }
}
