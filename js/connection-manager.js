/* =========================================================
   CONNECTION MANAGER

   MODES:
   LOCAL
   BLUETOOTH
   ESP32
   SIMULATOR
========================================================= */

(function () {
    "use strict";

    const P = window.MixerProtocol;

    class ConnectionManager {

        constructor() {

            this.mode = "SIMULATOR";

            this.connected = false;

            this.listeners = new Set();

            this.counters = {
                tx: 0,
                ack: 0,
                rx: 0,
                error: 0
            };

            this.lastTX = null;
            this.lastRX = null;

            this.pending = new Map();

            this.simulator =
                window.ESP32Simulator;

            this.esp32 =
                window.ESP32Connection;

            this.bluetooth =
                window.BluetoothConnection;

            this.bindConnections();

            this.createUI();

            this.loadState();

            this.log(
                "SYSTEM",
                "Connection Manager siap"
            );
        }

        subscribe(callback) {

            if (
                typeof callback !==
                "function"
            ) {
                return () => {};
            }

            this.listeners.add(callback);

            return () => {
                this.listeners.delete(callback);
            };
        }

        emit(event) {

            for (
                const callback
                of this.listeners
            ) {

                try {
                    callback(event);
                } catch (error) {
                    console.error(error);
                }
            }
        }

        bindConnections() {

            if (this.simulator) {

                this.simulator.subscribe(
                    event => {

                        if (
                            event.type ===
                            "FEEDBACK"
                        ) {

                            this.counters.rx++;

                            this.lastRX =
                                event.packet;

                            this.emit({
                                type:
                                    "FEEDBACK",
                                packet:
                                    event.packet
                            });

                            this.updateUI();
                        }

                        if (
                            event.type ===
                            "ACK"
                        ) {

                            this.counters.ack++;

                            this.emit({
                                type:
                                    "ACK",
                                packet:
                                    event.packet
                            });

                            this.updateUI();
                        }

                        if (
                            event.type ===
                            "LOG"
                        ) {

                            this.log(
                                event.data.type,
                                event.data.message,
                                event.data.packet
                            );
                        }
                    }
                );
            }

            if (this.esp32) {

                this.esp32.subscribe(
                    event => {

                        if (
                            event.type ===
                            "CONNECTED"
                        ) {

                            this.connected =
                                true;

                            this.log(
                                "SYSTEM",
                                "ESP32 CONNECTED"
                            );
                        }

                        if (
                            event.type ===
                            "DISCONNECTED"
                        ) {

                            this.connected =
                                false;

                            this.log(
                                "SYSTEM",
                                "ESP32 DISCONNECTED"
                            );
                        }

                        if (
                            event.type ===
                            "MESSAGE"
                        ) {

                            this.handleIncoming(
                                event.packet
                            );
                        }

                        if (
                            event.type ===
                            "TX"
                        ) {

                            this.counters.tx++;

                            this.lastTX =
                                event.packet;

                            this.updateUI();
                        }

                        if (
                            event.type ===
                            "ERROR"
                        ) {

                            this.counters.error++;

                            this.log(
                                "ERROR",
                                event.error?.message ||
                                "ESP32 error"
                            );
                        }

                        this.updateUI();
                    }
                );
            }

            if (this.bluetooth) {

                this.bluetooth.subscribe(
                    event => {

                        if (
                            event.type ===
                            "CONNECTED"
                        ) {

                            this.connected =
                                true;

                            this.log(
                                "SYSTEM",
                                "Bluetooth CONNECTED"
                            );
                        }

                        if (
                            event.type ===
                            "DISCONNECTED"
                        ) {

                            this.connected =
                                false;

                            this.log(
                                "SYSTEM",
                                "Bluetooth DISCONNECTED"
                            );
                        }

                        if (
                            event.type ===
                            "MESSAGE"
                        ) {

                            this.handleIncoming(
                                event.packet
                            );
                        }

                        if (
                            event.type ===
                            "TX"
                        ) {

                            this.counters.tx++;

                            this.lastTX =
                                event.packet;

                            this.updateUI();
                        }

                        this.updateUI();
                    }
                );
            }
        }

        async connect(mode = this.mode) {

            this.mode =
                String(mode).toUpperCase();

            switch (this.mode) {

                case "SIMULATOR":

                    this.simulator.start();

                    this.connected =
                        true;

                    break;

                case "ESP32":

                    await this.esp32.connect();

                    this.connected =
                        true;

                    break;

                case "BLUETOOTH":

                    await this.bluetooth.connect();

                    this.connected =
                        true;

                    break;

                default:

                    throw new Error(
                        `Mode ${this.mode} tidak dikenal`
                    );
            }

            this.saveState();

            this.updateUI();

            this.log(
                "SYSTEM",
                `${this.mode} CONNECTED`
            );

            return true;
        }

        async disconnect() {

            switch (this.mode) {

                case "SIMULATOR":

                    this.simulator.stop();
                    break;

                case "ESP32":

                    await this.esp32.disconnect();
                    break;

                case "BLUETOOTH":

                    await this.bluetooth.disconnect();
                    break;
            }

            this.connected = false;

            this.updateUI();

            this.log(
                "SYSTEM",
                `${this.mode} DISCONNECTED`
            );
        }

        async sendControl(
            channel,
            parameter,
            value,
            extra = {}
        ) {

            const message =
                P.createControl(
                    channel,
                    parameter,
                    value,
                    extra
                );

            this.counters.tx++;

            this.lastTX =
                message;

            this.log(
                "TX",
                `${parameter} CH${channel} = ${value}`,
                message
            );

            this.updateUI();

            try {

                let response;

                switch (this.mode) {

                    case "SIMULATOR":

                        response =
                            await this.simulator
                                .receive(
                                    message
                                );

                        break;

                    case "ESP32":

                        await this.esp32
                            .send(
                                message
                            );

                        return message;

                    case "BLUETOOTH":

                        await this.bluetooth
                            .send(
                                message
                            );

                        return message;

                    default:

                        throw new Error(
                            "Connection mode belum dipilih."
                        );
                }

                if (
                    response?.ack
                ) {

                    this.counters.ack++;

                    this.emit({
                        type: "ACK",
                        packet:
                            response.ack
                    });
                }

                if (
                    response?.feedback
                ) {

                    this.counters.rx++;

                    this.lastRX =
                        response.feedback;

                    this.emit({
                        type:
                            "FEEDBACK",
                        packet:
                            response.feedback
                    });

                    this.applyFeedback(
                        response.feedback
                    );
                }

                this.updateUI();

                return response;

            } catch (error) {

                this.counters.error++;

                this.log(
                    "ERROR",
                    error.message
                );

                this.updateUI();

                throw error;
            }
        }

        async ping() {

            const message =
                P.createPing();

            this.log(
                "TX",
                "PING",
                message
            );

            if (
                this.mode ===
                "SIMULATOR"
            ) {

                const response =
                    await this.simulator
                        .receive(
                            message
                        );

                this.counters.ack++;

                this.log(
                    "ACK",
                    "PONG",
                    response
                );

                this.updateUI();

                return response;
            }

            if (
                this.mode ===
                "ESP32"
            ) {

                await this.esp32.send(
                    message
                );

                return true;
            }

            if (
                this.mode ===
                "BLUETOOTH"
            ) {

                await this.bluetooth.send(
                    message
                );

                return true;
            }
        }

        async requestState() {

            const message =
                P.createMessage(
                    P.TYPES.STATE_REQUEST
                );

            if (
                this.mode ===
                "SIMULATOR"
            ) {

                const response =
                    await this.simulator
                        .receive(
                            message
                        );

                this.emit({
                    type:
                        "STATE_RESPONSE",
                    packet:
                        response
                });

                return response;
            }

            if (
                this.mode ===
                "ESP32"
            ) {

                return this.esp32.send(
                    message
                );
            }

            if (
                this.mode ===
                "BLUETOOTH"
            ) {

                return this.bluetooth.send(
                    message
                );
            }
        }

        applyFeedback(packet) {

            if (!packet) {
                return;
            }

            this.emit({
                type:
                    "CONTROL_FEEDBACK",
                channel:
                    packet.channel,
                parameter:
                    packet.parameter,
                value:
                    packet.value,
                packet
            });

            /*
             * Event umum yang dapat digunakan oleh
             * equalizer.js / UI mixer.
             */

            window.dispatchEvent(
                new CustomEvent(
                    "mixer:feedback",
                    {
                        detail: packet
                    }
                )
            );
        }

        log(
            type,
            message,
            packet = null
        ) {

            this.emit({
                type: "LOG",
                log: {
                    time:
                        new Date()
                            .toLocaleTimeString(),

                    type,
                    message,
                    packet
                }
            });

            this.appendLogToUI(
                type,
                message
            );
        }

        createUI() {

            if (
                document.getElementById(
                    "connectionPanel"
                )
            ) {
                return;
            }

            const panel =
                document.createElement(
                    "section"
                );

            panel.id =
                "connectionPanel";

            panel.innerHTML = `

                <div class="connection-header">
                    <strong>
                        CONNECTION
                    </strong>

                    <span
                        id="connectionStatus"
                        class="connection-status"
                    >
                        DISCONNECTED
                    </span>
                </div>

                <div class="connection-row">

                    <label>
                        MODE
                    </label>

                    <select id="connectionMode">

                        <option value="SIMULATOR">
                            ESP32 SIMULATOR
                        </option>

                        <option value="ESP32">
                            ESP32
                        </option>

                        <option value="BLUETOOTH">
                            BLUETOOTH
                        </option>

                    </select>

                </div>

                <div class="connection-buttons">

                    <button
                        id="connectionConnect"
                        type="button"
                    >
                        CONNECT
                    </button>

                    <button
                        id="connectionDisconnect"
                        type="button"
                    >
                        DISCONNECT
                    </button>

                    <button
                        id="connectionPing"
                        type="button"
                    >
                        PING
                    </button>

                </div>

                <div class="connection-stats">

                    <div>
                        <span>TX</span>
                        <strong id="connectionTX">
                            0
                        </strong>
                    </div>

                    <div>
                        <span>ACK</span>
                        <strong id="connectionACK">
                            0
                        </strong>
                    </div>

                    <div>
                        <span>RX</span>
                        <strong id="connectionRX">
                            0
                        </strong>
                    </div>

                    <div>
                        <span>ERROR</span>
                        <strong id="connectionERROR">
                            0
                        </strong>
                    </div>

                </div>

                <div class="connection-test-buttons">

                    <button
                        id="simLoopbackTest"
                        type="button"
                    >
                        LOOPBACK TEST
                    </button>

                    <button
                        id="simFaderTest"
                        type="button"
                    >
                        FADER TEST
                    </button>

                    <button
                        id="simMuteSoloTest"
                        type="button"
                    >
                        MUTE / SOLO TEST
                    </button>

                    <button
                        id="simStressTest"
                        type="button"
                    >
                        STRESS TEST
                    </button>

                    <button
                        id="simReset"
                        type="button"
                    >
                        RESET SIMULATOR
                    </button>

                </div>

                <div
                    id="connectionLastPacket"
                    class="connection-last-packet"
                >
                    READY
                </div>

                <div
                    id="connectionLog"
                    class="connection-log"
                ></div>
            `;

            /*
             * Tidak mengubah struktur mixer.
             * Panel hanya ditambahkan di awal body.
             */

            document.body.prepend(panel);

            this.installUIEvents();

            this.installStyles();
        }

        installUIEvents() {

            const mode =
                document.getElementById(
                    "connectionMode"
                );

            const connect =
                document.getElementById(
                    "connectionConnect"
                );

            const disconnect =
                document.getElementById(
                    "connectionDisconnect"
                );

            const ping =
                document.getElementById(
                    "connectionPing"
                );

            const loopback =
                document.getElementById(
                    "simLoopbackTest"
                );

            const fader =
                document.getElementById(
                    "simFaderTest"
                );

            const muteSolo =
                document.getElementById(
                    "simMuteSoloTest"
                );

            const stress =
                document.getElementById(
                    "simStressTest"
                );

            const reset =
                document.getElementById(
                    "simReset"
                );

            mode.addEventListener(
                "change",
                () => {

                    this.mode =
                        mode.value;

                    this.saveState();

                    this.log(
                        "SYSTEM",
                        `Mode = ${this.mode}`
                    );
                }
            );

            connect.addEventListener(
                "click",
                async () => {

                    try {

                        await this.connect(
                            mode.value
                        );

                    } catch (error) {

                        this.counters.error++;

                        this.log(
                            "ERROR",
                            error.message
                        );

                        this.updateUI();
                    }
                }
            );

            disconnect.addEventListener(
                "click",
                async () => {

                    try {

                        await this.disconnect();

                    } catch (error) {

                        this.log(
                            "ERROR",
                            error.message
                        );
                    }
                }
            );

            ping.addEventListener(
                "click",
                async () => {

                    try {

                        await this.ping();

                    } catch (error) {

                        this.counters.error++;

                        this.log(
                            "ERROR",
                            error.message
                        );

                        this.updateUI();
                    }
                }
            );

            loopback.addEventListener(
                "click",
                () => {
                    this.runLoopbackTest();
                }
            );

            fader.addEventListener(
                "click",
                () => {
                    this.runFaderTest();
                }
            );

            muteSolo.addEventListener(
                "click",
                () => {
                    this.runMuteSoloTest();
                }
            );

            stress.addEventListener(
                "click",
                () => {
                    this.runStressTest();
                }
            );

            reset.addEventListener(
                "click",
                () => {

                    if (
                        this.simulator
                    ) {

                        this.simulator.reset();
                        this.updateUI();
                    }
                }
            );
        }

        installStyles() {

            if (
                document.getElementById(
                    "connectionManagerStyles"
                )
            ) {
                return;
            }

            const style =
                document.createElement(
                    "style"
                );

            style.id =
                "connectionManagerStyles";

            style.textContent = `

                #connectionPanel {

                    position: relative;

                    width: min(
                        calc(100% - 20px),
                        1100px
                    );

                    margin:
                        10px auto;

                    padding: 12px;

                    box-sizing: border-box;

                    background:
                        #111;

                    border:
                        1px solid #333;

                    border-radius:
                        10px;

                    color:
                        #eee;

                    font-family:
                        Arial,
                        sans-serif;

                    z-index:
                        50;
                }

                #connectionPanel
                .connection-header {

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        space-between;

                    margin-bottom:
                        10px;
                }

                #connectionPanel
                .connection-status {

                    padding:
                        4px 9px;

                    border-radius:
                        20px;

                    background:
                        #333;

                    font-size:
                        11px;
                }

                #connectionPanel
                .connection-status.connected {

                    background:
                        #174d24;

                    color:
                        #7cff91;
                }

                #connectionPanel
                .connection-row {

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        10px;

                    margin-bottom:
                        10px;
                }

                #connectionPanel select,
                #connectionPanel button {

                    min-height:
                        36px;

                    border-radius:
                        6px;

                    border:
                        1px solid #444;

                    background:
                        #202020;

                    color:
                        #fff;

                    padding:
                        7px 10px;
                }

                #connectionPanel button {

                    cursor:
                        pointer;
                }

                #connectionPanel button:hover {

                    background:
                        #303030;
                }

                .connection-buttons,
                .connection-test-buttons {

                    display:
                        flex;

                    flex-wrap:
                        wrap;

                    gap:
                        7px;

                    margin-bottom:
                        10px;
                }

                .connection-stats {

                    display:
                        grid;

                    grid-template-columns:
                        repeat(4, 1fr);

                    gap:
                        7px;

                    margin:
                        10px 0;
                }

                .connection-stats div {

                    background:
                        #191919;

                    border:
                        1px solid #2d2d2d;

                    border-radius:
                        6px;

                    padding:
                        8px;

                    text-align:
                        center;
                }

                .connection-stats span {

                    display:
                        block;

                    font-size:
                        10px;

                    opacity:
                        .65;
                }

                .connection-stats strong {

                    display:
                        block;

                    margin-top:
                        3px;

                    font-size:
                        16px;
                }

                .connection-last-packet {

                    padding:
                        8px;

                    background:
                        #0a0a0a;

                    border:
                        1px solid #222;

                    border-radius:
                        5px;

                    font-family:
                        monospace;

                    font-size:
                        11px;

                    overflow:
                        hidden;

                    text-overflow:
                        ellipsis;

                    white-space:
                        nowrap;
                }

                .connection-log {

                    max-height:
                        160px;

                    overflow:
                        auto;

                    margin-top:
                        8px;

                    padding:
                        7px;

                    background:
                        #080808;

                    border:
                        1px solid #222;

                    border-radius:
                        5px;

                    font-family:
                        monospace;

                    font-size:
                        10px;
                }

                .connection-log-line {

                    padding:
                        2px 0;

                    border-bottom:
                        1px solid #151515;
                }

                @media (
                    max-width: 600px
                ) {

                    .connection-stats {

                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                    .connection-row {

                        flex-direction:
                            column;

                        align-items:
                            stretch;
                    }
                }
            `;

            document.head.appendChild(
                style
            );
        }

        appendLogToUI(
            type,
            message
        ) {

            const log =
                document.getElementById(
                    "connectionLog"
                );

            if (!log) {
                return;
            }

            const line =
                document.createElement(
                    "div"
                );

            line.className =
                "connection-log-line";

            line.textContent =
                `[${new Date().toLocaleTimeString()}] ${type}: ${message}`;

            log.prepend(line);

            while (
                log.children.length >
                100
            ) {
                log.lastChild.remove();
            }
        }

        updateUI() {

            const status =
                document.getElementById(
                    "connectionStatus"
                );

            if (status) {

                status.textContent =
                    this.connected
                        ? `${this.mode} CONNECTED`
                        : `${this.mode} DISCONNECTED`;

                status.classList.toggle(
                    "connected",
                    this.connected
                );
            }

            const tx =
                document.getElementById(
                    "connectionTX"
                );

            const ack =
                document.getElementById(
                    "connectionACK"
                );

            const rx =
                document.getElementById(
                    "connectionRX"
                );

            const error =
                document.getElementById(
                    "connectionERROR"
                );

            if (tx) {
                tx.textContent =
                    this.counters.tx;
            }

            if (ack) {
                ack.textContent =
                    this.counters.ack;
            }

            if (rx) {
                rx.textContent =
                    this.counters.rx;
            }

            if (error) {
                error.textContent =
                    this.counters.error;
            }

            const packet =
                document.getElementById(
                    "connectionLastPacket"
                );

            if (
                packet &&
                this.lastRX
            ) {

                packet.textContent =
                    JSON.stringify(
                        this.lastRX
                    );
            }
        }

        async runLoopbackTest() {

            this.log(
                "TEST",
                "START LOOPBACK TEST"
            );

            if (
                this.mode !==
                "SIMULATOR"
            ) {

                this.log(
                    "TEST",
                    "Loopback internal memakai SIMULATOR"
                );
            }

            if (
                !this.simulator.running
            ) {
                this.simulator.start();
            }

            const before = {
                tx:
                    this.counters.tx,

                ack:
                    this.counters.ack,

                rx:
                    this.counters.rx,

                error:
                    this.counters.error
            };

            const total = 16;

            let passed = 0;

            for (
                let channel = 1;
                channel <= total;
                channel++
            ) {

                const value =
                    -24 +
                    channel;

                try {

                    const response =
                        await this.sendControl(
                            channel,
                            P.PARAMETERS.FADER,
                            value
                        );

                    if (
                        response?.feedback
                            ?.value === value
                    ) {

                        passed++;
                    }

                } catch (error) {

                    this.log(
                        "ERROR",
                        `CH${channel}: ${error.message}`
                    );
                }
            }

            this.log(
                "TEST",
                `LOOPBACK RESULT: ${passed}/${total}`
            );

            return {
                passed,
                total,
                before,
                after: {
                    ...this.counters
                }
            };
        }

        async runFaderTest() {

            this.log(
                "TEST",
                "START FADER CH1-CH16 TEST"
            );

            if (
                !this.simulator.running
            ) {
                this.simulator.start();
            }

            let passed = 0;

            for (
                let channel = 1;
                channel <= 16;
                channel++
            ) {

                const value =
                    Math.round(
                        (
                            -60 +
                            Math.random() *
                            60
                        ) * 10
                    ) / 10;

                const response =
                    await this.sendControl(
                        channel,
                        P.PARAMETERS.FADER,
                        value
                    );

                if (
                    response?.feedback
                        ?.value === value
                ) {
                    passed++;
                }
            }

            this.log(
                "TEST",
                `FADER RESULT: ${passed}/16`
            );

            return passed === 16;
        }

        async runMuteSoloTest() {

            this.log(
                "TEST",
                "START MUTE/SOLO TEST"
            );

            if (
                !this.simulator.running
            ) {
                this.simulator.start();
            }

            let passed = 0;
            let total = 0;

            for (
                let channel = 1;
                channel <= 16;
                channel++
            ) {

                total++;

                const mute =
                    channel % 2 === 0;

                const muteResponse =
                    await this.sendControl(
                        channel,
                        P.PARAMETERS.MUTE,
                        mute
                    );

                if (
                    muteResponse?.feedback
                        ?.value === mute
                ) {
                    passed++;
                }

                total++;

                const solo =
                    channel % 3 === 0;

                const soloResponse =
                    await this.sendControl(
                        channel,
                        P.PARAMETERS.SOLO,
                        solo
                    );

                if (
                    soloResponse?.feedback
                        ?.value === solo
                ) {
                    passed++;
                }
            }

            this.log(
                "TEST",
                `MUTE/SOLO RESULT: ${passed}/${total}`
            );

            return passed === total;
        }

        async runStressTest() {

            this.log(
                "TEST",
                "START STRESS TEST 1000 COMMANDS"
            );

            if (
                !this.simulator.running
            ) {
                this.simulator.start();
            }

            const start =
                performance.now();

            let passed = 0;

            for (
                let i = 0;
                i < 1000;
                i++
            ) {

                const channel =
                    (i % 16) + 1;

                const value =
                    -60 +
                    (
                        i % 60
                    );

                try {

                    const response =
                        await this.sendControl(
                            channel,
                            P.PARAMETERS.FADER,
                            value
                        );

                    if (
                        response?.feedback
                            ?.value === value
                    ) {
                        passed++;
                    }

                } catch (_) {}
            }

            const elapsed =
                performance.now() -
                start;

            this.log(
                "TEST",
                `STRESS RESULT: ${passed}/1000 | ${elapsed.toFixed(0)} ms`
            );

            return {
                passed,
                total: 1000,
                elapsed
            };
        }

        loadState() {

            try {

                const raw =
                    localStorage.getItem(
                        "mixer_connection_state"
                    );

                if (!raw) {
                    return;
                }

                const state =
                    JSON.parse(raw);

                if (
                    state.mode
                ) {

                    this.mode =
                        state.mode;
                }

                const select =
                    document.getElementById(
                        "connectionMode"
                    );

                if (select) {
                    select.value =
                        this.mode;
                }

            } catch (_) {}
        }

        saveState() {

            try {

                localStorage.setItem(
                    "mixer_connection_state",
                    JSON.stringify({
                        mode:
                            this.mode
                    })
                );

            } catch (_) {}
        }
    }

    window.MixerConnection =
        new ConnectionManager();

})();
