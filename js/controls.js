function updateConnectButtonLabel() {
    connectBtn.textContent = connected ? "Disconnect" : "Connect";
}

connectBtn.addEventListener('click', () => {
    if (!connected) {
        connectBluetooth();
    } else {
        disconnectBluetooth();
    }
});

startBtn.addEventListener('click', () => {
    if (!connected) return;

    if (runningState === 1) {
        send_data(makePacket("pause"));
        return;
    }

    if (countdownOverlay && countdownNumber) {
        countdownOverlay.style.display = 'flex';
        countdownOverlay.style.opacity = '1';
        let count = 3;
        countdownNumber.textContent = count;
        countdownNumber.style.opacity = '1';
        countdownNumber.style.transform = 'scale(1)';

        (async () => {
            for (let i = 0; i < 3; i++) {
                await new Promise(res => setTimeout(res, 700));
                countdownNumber.style.transform = 'scale(1.3)';
                countdownNumber.style.opacity = '0.5';
                await new Promise(res => setTimeout(res, 200));
                count--;
                if (count > 0) {
                    countdownNumber.textContent = count;
                    countdownNumber.style.opacity = '1';
                    countdownNumber.style.transform = 'scale(1)';
                }
            }
            await new Promise(res => setTimeout(res, 400));
            countdownOverlay.style.opacity = '0';
            await new Promise(res => setTimeout(res, 500));
            countdownOverlay.style.display = 'none';
            countdownOverlay.style.opacity = '1';
        })();
    }

    send_data(makePacket("start", curTargetSpeed));
});

stopBtn.addEventListener('click', () => {
    if (!connected) return;
    curTargetSpeed = 1500;
    syncSpeedSlider();
    setSpeedControls(false);
    send_data(makePacket("stop"));
});

speedUpBtn.addEventListener('click', () => {
    if (!connected) return;
    curTargetSpeed = Math.min(curTargetSpeed + 500, 6000);
    syncSpeedSlider();
    send_data(makePacket("set_speed", curTargetSpeed));
});

speedDownBtn.addEventListener('click', () => {
    if (!connected) return;
    curTargetSpeed = Math.max(curTargetSpeed - 500, 1500);
    syncSpeedSlider();
    send_data(makePacket("set_speed", curTargetSpeed));
});

speedSlider.addEventListener('input', () => {
    sliderValue.textContent = speedSlider.value;
});

speedSlider.addEventListener('change', () => {
    curTargetSpeed = Math.round(parseFloat(speedSlider.value) * 1000);
    syncSpeedSlider();
    if (!connected) return;
    send_data(makePacket("set_speed", curTargetSpeed));
});

if (exportHistoryBtn) {
    exportHistoryBtn.addEventListener('click', () => {
        const sessions = loadSessions();
        const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'treadmill_sessions.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        showToast('History exported.');
    });
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        clearSessions();
        showToast('History cleared.');
    });
}

if (importHistoryBtn && importHistoryInput) {
    importHistoryBtn.addEventListener('click', () => {
        importHistoryInput.value = '';
        importHistoryInput.click();
    });

    importHistoryInput.addEventListener('change', () => {
        const file = importHistoryInput.files && importHistoryInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    saveSessions(imported);
                    renderSessionTable();
                    showToast('History imported successfully.');
                } else {
                    showToast('Invalid file format.');
                }
            } catch (err) {
                showToast('Failed to import: ' + err);
            }
        };
        reader.readAsText(file);
    });
}
