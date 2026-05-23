function send_data(packet) {
    pendingData = packet;
}

async function connectBluetooth() {
    setStatus('Connecting');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        console.log("Requesting Bluetooth device...");
        device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }],
            services: [SERVICE_UUID]
        });

        console.log("Device selected:", device);
        setStatus('Connecting');
        device.addEventListener('gattserverdisconnected', onDisconnected);
        server = await device.gatt.connect();

        console.log("GATT server connected:", server);
        const services = await server.getPrimaryServices();
        console.log("Primary services:", services.map(s => s.uuid));

        notifyChar = await server.getPrimaryService(SERVICE_UUID).then(
            service => service.getCharacteristic(NOTIFY_CHAR_UUID)
        ).catch(async () => {
            const fallbackServices = await server.getPrimaryServices();
            for (const service of fallbackServices) {
                try {
                    const characteristic = await service.getCharacteristic(NOTIFY_CHAR_UUID);
                    if (characteristic) return characteristic;
                } catch {}
            }
            throw new Error("Notify characteristic not found");
        });

        writeChar = await server.getPrimaryService(SERVICE_UUID).then(
            service => service.getCharacteristic(WRITE_CHAR_UUID)
        ).catch(async () => {
            const fallbackServices = await server.getPrimaryServices();
            for (const service of fallbackServices) {
                try {
                    const characteristic = await service.getCharacteristic(WRITE_CHAR_UUID);
                    if (characteristic) return characteristic;
                } catch {}
            }
            throw new Error("Write characteristic not found");
        });

        await notifyChar.startNotifications();
        notifyChar.addEventListener('characteristicvaluechanged', handleNotification);

        connected = true;
        setStatus('Stopped');
        connectBtn.textContent = "Disconnect";
        updateRunningState(3);
    } catch (err) {
        console.error("Bluetooth connection error:", err);
        showToast("Bluetooth error: " + err);
        setStatus('Disconnected');
        connected = false;
        connectBtn.textContent = "Connect";
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

function disconnectBluetooth() {
    if (device && device.gatt.connected) {
        device.gatt.disconnect();
    }
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    setStatus('Disconnected');
}

function onDisconnected() {
    connected = false;
    setStatus('Disconnected');
    connectBtn.textContent = "Connect";
    updateRunningState(3);
    if (sessionActive && sessionStartData) {
        finishSession();
    }
}

function handleNotification(event) {
    const value = event.target.value;
    console.log("Received notification, byteLength:", value.byteLength);

    const hexStr = [];
    for (let i = 0; i < value.byteLength; ++i) {
        hexStr.push(value.getUint8(i).toString(16).padStart(2, "0"));
    }
    console.log("Payload (hex):", hexStr.join(" "));

    if (value.byteLength < 31) {
        treadmillData = {
            speed: "-",
            distance: "-",
            calories: "-",
            duration: "-",
            status: "Invalid"
        };
        updateDashboard(treadmillData);
        updateRunningState(3);
        if (sessionActive && sessionStartData) {
            finishSession();
        }
        return;
    }

    function u16(offset) {
        return (value.getUint8(offset) << 8) | value.getUint8(offset + 1);
    }

    function u32(offset) {
        return (value.getUint8(offset) << 24) |
            (value.getUint8(offset + 1) << 16) |
            (value.getUint8(offset + 2) << 8) |
            value.getUint8(offset + 3);
    }

    const current_speed = u16(3);
    const distance = u32(7);
    const calories = (value.getUint8(18) << 8) | value.getUint8(19);
    const duration = u32(20);
    const flags = value.getUint8(26);
    const unit_mode = (flags & 128) === 128 ? 1 : 0;
    const running_state_bits = flags & 24;

    // Calcular nuevas métricas
    const steps = Math.floor(distance / 0.45);
    const elevation = Math.floor(distance * 0.06);

    let nextRunningState = 3;
    if (running_state_bits === 24) nextRunningState = 0;
    else if (running_state_bits === 8) nextRunningState = 1;
    else if (running_state_bits === 16) nextRunningState = 2;

    const statusArr = ["Starting", "Running", "Paused", "Stopped"];
    const speed_unit = unit_mode === 1 ? "mph" : "kph";
    const distance_unit = unit_mode === 1 ? "mi" : "km";

    treadmillData = {
        speed: (current_speed / 1000).toFixed(2) + " " + speed_unit,
        distance: (distance / 1000).toFixed(2) + " " + distance_unit,
        calories: calories + " kcal",
        duration: Math.round(duration / 1000),
        steps: steps + " steps",
        elevation: elevation + " m",
        status: statusArr[nextRunningState] || "Unknown",
        _raw: { current_speed, distance, calories, duration, steps, elevation, speed_unit }
    };

    console.log("Parsed treadmill data:", treadmillData);
    updateDashboard(treadmillData);
    updateRunningState(nextRunningState);
    refreshSpeedControls();

    if (nextRunningState === 1 && !sessionActive) {
        sessionActive = true;
        sessionStartData = {
            date: Date.now(),
            calories,
            distance,
            duration: Math.round(duration / 1000),
            steps,
            elevation,
            speedSum: current_speed,
            speedCount: 1,
            speedUnit: speed_unit
        };
        const avgSpeed = (sessionStartData.speedSum / sessionStartData.speedCount) / 1000;
        upsertLiveSession({
            date: sessionStartData.date,
            duration: sessionStartData.duration,
            calories: sessionStartData.calories + ' kcal',
            avgSpeed,
            steps: sessionStartData.steps,
            elevation: sessionStartData.elevation,
            speedUnit: sessionStartData.speedUnit || ''
        });
    } else if (nextRunningState === 1 && sessionActive && sessionStartData) {
        sessionStartData.calories = calories;
        sessionStartData.distance = distance;
        sessionStartData.duration = Math.round(duration / 1000);
        sessionStartData.steps = steps;
        sessionStartData.elevation = elevation;
        sessionStartData.speedSum += current_speed;
        sessionStartData.speedCount += 1;
        const avgSpeed = (sessionStartData.speedSum / sessionStartData.speedCount) / 1000;
        upsertLiveSession({
            date: sessionStartData.date,
            duration: sessionStartData.duration,
            calories: sessionStartData.calories + ' kcal',
            avgSpeed,
            steps: sessionStartData.steps,
            elevation: sessionStartData.elevation,
            speedUnit: sessionStartData.speedUnit || ''
        });
    } else if ((nextRunningState === 3 || nextRunningState === 2) && sessionActive && sessionStartData) {
        finishSession();
    }

    if (writeChar) {
        if (pendingData) {
            console.log("Sending pending data packet:", Array.from(pendingData).map(b => b.toString(16).padStart(2, "0")).join(" "));
            writeChar.writeValue(pendingData).then(() => {
                console.log("Pending data sent.");
                pendingData = null;
            }).catch(err => {
                console.error("Failed to send pending data:", err);
            });
        } else {
            const heartbeat = new Uint8Array([0x6a, 0x05, 0xfd, 0xf8, 0x43]);
            console.log("Sending heartbeat packet:", Array.from(heartbeat).map(b => b.toString(16).padStart(2, "0")).join(" "));
            writeChar.writeValue(heartbeat).catch(err => {
                console.error("Failed to send heartbeat:", err);
            });
        }
    }
}

function makePacket(type, speed = 1500) {
    const arr = new Uint8Array(23);
    arr[0] = 0x6A;
    arr[1] = 0x17;
    arr[6] = (speed >> 8) & 0xFF;
    arr[7] = speed & 0xFF;
    arr[8] = type === "set_speed" ? 5 : 1;
    arr[9] = 0;
    arr[10] = 80;
    arr[11] = 0;

    const cmd = type === "pause" ? 2 : type === "stop" ? 0 : 4;
    arr[12] = cmd & 0xF7;

    const userId = 58965456623n;
    for (let i = 0; i < 8; ++i) {
        arr[13 + i] = Number((userId >> BigInt(56 - i * 8)) & 0xFFn);
    }

    let checksum = 0;
    for (let i = 1; i <= 20; ++i) {
        checksum ^= arr[i];
    }
    arr[21] = checksum;
    arr[22] = 0x43;
    return arr;
}
