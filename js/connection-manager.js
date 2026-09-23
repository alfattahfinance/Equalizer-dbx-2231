/* =========================================================
   CONNECTION MANAGER
   Universal connection router

   WEB
    ↕
   ┌─────────────────────────────────────┐
   │ CONNECTION MANAGER                  │
   └─────────────────────────────────────┘
       ↕              ↕              ↕
   SIMULATOR        ESP32        BLUETOOTH

   Protocol:
   MixerProtocol

   Version: 1.1
========================================================= */

(function () {
    "use strict";

    const P = window.MixerProtocol;

    if (!P) {
        console.error(
            "[CONNECTION MANAGER] MixerProtocol belum dimuat."
        );
        return;
    }

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

            this.started = false;

            this.simulator =
                window.ESP32Simulator || null;

            this.esp32 =
                window.ESP32Connection || null;

            this.bluetooth =
                window.BluetoothConnection || null;

            this.unsubscribeSimulator = null;
            this.unsubscribeESP32 = null;
            this.unsubscribeBluetooth = null;

            this.panel = null;

            this.bindConnections();

            this.restoreMode();
        }

        /* =====================================================
           EVENT SYSTEM
        ===================================================== */

        subscribe(callback) {

            if (
                typeof callback !==
                "function"
            ) {
                return () => {};
            }

            this.listeners.add(
                callback
            );

            return () => {

                this.listeners.delete(
                    callback
                );
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

                    console.error(
                        "[CONNECTION MANAGER]",
                        error
                    );
                }
            }
        }

        /* =====================================================
           CONNECTION BINDING
        ===================================================== */

        bindConnections() {

            /*
             * SIMULATOR
             */

            if (
                this.simulator &&
                typeof this.simulator
                    .subscribe === "function"
            ) {

                this.unsubscribeSimulator =
                    this.simulator.subscribe(
                        event => {

                            if (!event) {
                                return;
                            }

                            switch (event.type) {

                                case "ACK":

                                    /*
                                     * Simulator ACK sudah
                                     * ditangani oleh sendControl().
                                     *
                                     * Jangan hitung ulang.
                                     */

                                    this.emit({
                                        type: "ACK",
                                        packet:
                                            event.packet ||
                                            event
                                    });

                                    break;

                                case "FEEDBACK":

                                    /*
                                     * Feedback simulator
                                     * tetap diproses agar
                                     * hardware simulation
                                     * bisa mengubah Web.
                                     */

                                    if (event.packet) {

                                        this.applyFeedback(
                                            event.packet
                                        );
                                    }

                                    break;

                                case "ERROR":

                                    this.counters.error++;

                                    this.emit({
                                        type: "ERROR",
                                        error:
                                            event.error ||
                                            event
                                    });

                                    break;

                                case "LOG":

                                    this.emit({
                                        type: "LOG",
                                        message:
                                            event.message ||
                                            event
                                    });

                                    break;

                                default:

                                    this.emit(
                                        event
                                    );
                            }
                        }
                    );
            }

            /*
             * ESP32 SERIAL
             */

            if (
                this.esp32 &&
                typeof this.esp32
                    .subscribe === "function"
            ) {

                this.unsubscribeESP32 =
                    this.esp32.subscribe(
                        event => {

                            if (!event) {
                                return;
                            }

                            switch (event.type) {

                                case "CONNECTED":

                                    this.emit({
                                        type:
                                            "ESP32_CONNECTED"
                                    });

                                    break;

                                case "DISCONNECTED":

                                    if (
                                        this.mode ===
                                        "ESP32"
                                    ) {
                                        this.connected =
                                            false;
                                    }

                                    this.emit({
                                        type:
                                            "ESP32_DISCONNECTED"
                                    });

                                    break;

                                case "TX":

                                    /*
                                     * TX dari ESP32
                                     * connection sudah
                                     * dihitung oleh
                                     * sendControl().
                                     */

                                    this.emit({
                                        type: "TX",
                                        packet:
                                            event.packet
                                    });

                                    break;

                                case "MESSAGE":

                                    this.handleIncoming(
                                        event.packet
                                    );

                                    break;

                                case "ERROR":

                                    this.counters.error++;

                                    this.emit({
                                        type: "ERROR",
                                        error:
                                            event.error
                                    });

                                    break;

                                default:

                                    this.emit(
                                        event
                                    );
                            }
                        }
                    );
            }

            /*
             * BLUETOOTH
             */

            if (
                this.bluetooth &&
                typeof this.bluetooth
                    .subscribe === "function"
            ) {

                this.unsubscribeBluetooth =
                    this.bluetooth.subscribe(
                        event => {

                            if (!event) {
                                return;
                            }

                            switch (event.type) {

                                case "CONNECTED":

                                    this.emit({
                                        type:
                                            "BLUETOOTH_CONNECTED"
                                    });

                                    break;

                                case "DISCONNECTED":

                                    if (
                                        this.mode ===
                                        "BLUETOOTH"
                                    ) {
                                        this.connected =
                                            false;
                                    }

                                    this.emit({
                                        type:
                                            "BLUETOOTH_DISCONNECTED"
                                    });

                                    break;

                                case "TX":

                                    this.emit({
                                        type: "TX",
                                        packet:
                                            event.packet
                                    });

                                    break;

                                case "MESSAGE":

                                    this.handleIncoming(
                                        event.packet
                                    );

                                    break;

                                case "ERROR":

                                    this.counters.error++;

                                    this.emit({
                                        type: "ERROR",
                                        error:
                                            event.error
                                    });

                                    break;

                                default:

                                    this.emit(
                                        event
                                    );
                            }
                        }
                    );
            }
        }

        /* =====================================================
           MODE
        ===================================================== */

        restoreMode() {

            try {

                const saved =
                    localStorage.getItem(
                        "mixer_connection_mode"
                    );

                if (
                    saved === "SIMULATOR" ||
                    saved === "ESP32" ||
                    saved === "BLUETOOTH"
                ) {

                    this.mode = saved;
                }

            } catch (_) {}
        }

        saveMode() {

            try {

                localStorage.setItem(
                    "mixer_connection_mode",
                    this.mode
                );

            } catch (_) {}
        }

        setMode(mode) {

            const allowed = [
                "SIMULATOR",
                "ESP32",
                "BLUETOOTH"
            ];

            if (
                !allowed.includes(mode)
            ) {

                throw new Error(
                    "Mode koneksi tidak valid."
                );
            }

            this.mode = mode;

            this.saveMode();

            this.emit({
                type: "MODE_CHANGED",
                mode
            });

            this.updatePanel();
        }

        /* =====================================================
           CONNECT
        ===================================================== */

        async connect(mode = this.mode) {

            this.setMode(mode);

            /*
             * Pastikan koneksi lama tidak
             * mengganggu koneksi baru.
             */

            if (this.connected) {

                await this.disconnect();
            }

            switch (mode) {

                case "SIMULATOR":

                    if (!this.simulator) {

                        throw new Error(
                            "ESP32 Simulator tidak tersedia."
                        );
                    }

                    if (
                        !this.simulator.running &&
                        typeof this.simulator.start ===
                        "function"
                    ) {

                        this.simulator.start();
                    }

                    this.connected = true;

                    this.emit({
                        type: "CONNECTED",
                        mode
                    });

                    break;

                case "ESP32":

                    if (!this.esp32) {

                        throw new Error(
                            "ESP32Connection tidak tersedia."
                        );
                    }

                    await this.esp32.connect();

                    this.connected =
                        Boolean(
                            this.esp32.connected
                        );

                    this.emit({
                        type: "CONNECTED",
                        mode
                    });

                    break;

                case "BLUETOOTH":

                    if (!this.bluetooth) {

                        throw new Error(
                            "BluetoothConnection tidak tersedia."
                        );
                    }

                    await this.bluetooth.connect();

                    this.connected =
                        Boolean(
                            this.bluetooth.connected
                        );

                    this.emit({
                        type: "CONNECTED",
                        mode
                    });

                    break;

                default:

                    throw new Error(
                        "Mode koneksi tidak dikenal."
                    );
            }

            this.updatePanel();

            return this.connected;
        }

        /* =====================================================
           DISCONNECT
        ===================================================== */

        async disconnect() {

            try {

                if (
                    this.mode ===
                    "ESP32" &&
                    this.esp32
                ) {

                    await this.esp32.disconnect();
                }

                if (
                    this.mode ===
                    "BLUETOOTH" &&
                    this.bluetooth
                ) {

                    await this.bluetooth.disconnect();
                }

            } catch (error) {

                console.error(
                    "[CONNECTION MANAGER] disconnect",
                    error
                );
            }

            this.connected = false;

            this.emit({
                type: "DISCONNECTED",
                mode: this.mode
            });

            this.updatePanel();
        }

        /* =====================================================
           SEND CONTROL
        ===================================================== */

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

            /*
             * Tandai source sebagai WEB.
             */

            message.source =
                P.SOURCES.WEB;

            this.lastTX =
                message;

            this.counters.tx++;

            this.emit({
                type: "TX",
                packet: message
            });

            /*
             * Simpan pending request.
             */

            this.pending.set(
                message.id,
                {
                    message,
                    timestamp: Date.now()
                }
            );

            try {

                /*
                 * SIMULATOR
                 */

                if (
                    this.mode ===
                    "SIMULATOR"
                ) {

                    if (
                        !this.simulator
                    ) {

                        throw new Error(
                            "ESP32 Simulator tidak tersedia."
                        );
                    }

                    if (
                        !this.simulator.running &&
                        typeof this.simulator.start ===
                        "function"
                    ) {

                        this.simulator.start();
                    }

                    const response =
                        await this.simulator.receive(
                            message
                        );

                    if (
                        response &&
                        response.ack
                    ) {

                        this.handleIncoming(
                            response.ack
                        );
                    }

                    if (
                        response &&
                        response.feedback
                    ) {

                        this.handleIncoming(
                            response.feedback
                        );
                    }

                    this.pending.delete(
                        message.id
                    );

                    return response;
                }

                /*
                 * ESP32 FISIK
                 */

                if (
                    this.mode ===
                    "ESP32"
                ) {

                    if (
                        !this.esp32 ||
                        !this.esp32.connected
                    ) {

                        throw new Error(
                            "ESP32 belum terhubung."
                        );
                    }

                    await this.esp32.send(
                        message
                    );

                    return message;
                }

                /*
                 * BLUETOOTH
                 */

                if (
                    this.mode ===
                    "BLUETOOTH"
                ) {

                    if (
                        !this.bluetooth ||
                        !this.bluetooth.connected
                    ) {

                        throw new Error(
                            "Bluetooth belum terhubung."
                        );
                    }

                    await this.bluetooth.send(
                        message
                    );

                    return message;
                }

                throw new Error(
                    "Mode koneksi tidak valid."
                );

            } catch (error) {

                this.pending.delete(
                    message.id
                );

                this.counters.error++;

                this.emit({
                    type: "ERROR",
                    error,
                    packet: message
                });

                throw error;
            }
        }

        /* =====================================================
           INCOMING PACKETS
        ===================================================== */

        handleIncoming(packet) {

            if (!packet) {
                return;
            }

            this.lastRX =
                packet;

            switch (packet.type) {

                case P.TYPES.ACK:

                    this.counters.ack++;

                    if (
                        packet.replyTo
                    ) {

                        this.pending.delete(
                            packet.replyTo
                        );
                    }

                    this.emit({
                        type: "ACK",
                        packet
                    });

                    break;

                case P.TYPES.FEEDBACK:

                    this.counters.rx++;

                    this.applyFeedback(
                        packet
                    );

                    break;

                case P.TYPES.PONG:

                    this.emit({
                        type: "PONG",
                        packet
                    });

                    break;

                case P.TYPES.STATE_RESPONSE:

                    this.counters.rx++;

                    this.emit({
                        type:
                            "STATE_RESPONSE",
                        packet
                    });

                    /*
                     * Jika state response
                     * membawa daftar control,
                     * teruskan juga ke UI.
                     */

                    if (
                        Array.isArray(
                            packet.controls
                        )
                    ) {

                        for (
                            const control
                            of packet.controls
                        ) {

                            this.applyFeedback(
                                control
                            );
                        }
                    }

                    break;

                case P.TYPES.ERROR:

                    this.counters.error++;

                    if (
                        packet.replyTo
                    ) {

                        this.pending.delete(
                            packet.replyTo
                        );
                    }

                    this.emit({
                        type: "ERROR",
                        packet
                    });

                    break;

                case P.TYPES.CONNECT:

                    this.emit({
                        type: "REMOTE_CONNECTED",
                        packet
                    });

                    break;

                case P.TYPES.DISCONNECT:

                    this.emit({
                        type: "REMOTE_DISCONNECTED",
                        packet
                    });

                    break;

                default:

                    this.counters.rx++;

                    this.emit({
                        type: "MESSAGE",
                        packet
                    });
            }
        }

        /* =====================================================
           APPLY FEEDBACK
        ===================================================== */

        applyFeedback(packet) {

            if (!packet) {
                return;
            }

            this.lastRX =
                packet;

            /*
             * Normalisasi parameter/value
             */

            const parameter =
                String(
                    packet.parameter || ""
                ).toUpperCase();

            const normalizedValue =
                P.normalizeValue(
                    parameter,
                    packet.value
                );

            const normalized = {
                ...packet,
                parameter,
                value:
                    normalizedValue
            };

            this.emit({
                type:
                    "CONTROL_FEEDBACK",
                packet:
                    normalized
            });

            /*
             * Event global.
             *
             * DSPControlBridge menangkap
             * event ini.
             */

            window.dispatchEvent(
                new CustomEvent(
                    "mixer:feedback",
                    {
                        detail:
                            normalized
                    }
                )
            );

            /*
             * Event tambahan untuk UI.
             */

            window.dispatchEvent(
                new CustomEvent(
                    "mixer:control-feedback",
                    {
                        detail:
                            normalized
                    }
                )
            );
        }

        /* =====================================================
           PING
        ===================================================== */

        async ping() {

            const message =
                P.createPing();

            this.lastTX =
                message;

            this.counters.tx++;

            this.emit({
                type: "TX",
                packet: message
            });

            try {

                if (
                    this.mode ===
                    "SIMULATOR"
                ) {

                    const response =
                        await this.simulator.receive(
                            message
                        );

                    if (
                        response
                    ) {

                        this.handleIncoming(
                            response
                        );
                    }

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

                throw new Error(
                    "Mode koneksi tidak valid."
                );

            } catch (error) {

                this.counters.error++;

                this.emit({
                    type: "ERROR",
                    error
                });

                throw error;
            }
        }

        /* =====================================================
           REQUEST STATE
        ===================================================== */

        async requestState() {

            const message =
                P.createMessage(
                    P.TYPES.STATE_REQUEST
                );

            this.lastTX =
                message;

            this.counters.tx++;

            this.emit({
                type: "TX",
                packet: message
            });

            try {

                if (
                    this.mode ===
                    "SIMULATOR"
                ) {

                    const response =
                        await this.simulator.receive(
                            message
                        );

                    if (
                        response
                    ) {

                        this.handleIncoming(
                            response
                        );
                    }

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

                throw new Error(
                    "Mode koneksi tidak valid."
                );

            } catch (error) {

                this.counters.error++;

                this.emit({
                    type: "ERROR",
                    error
                });

                throw error;
            }
        }

        /* =====================================================
           RESET
        ===================================================== */

        async resetRemote() {

            const message =
                P.createMessage(
                    P.TYPES.RESET
                );

            this.lastTX =
                message;

            this.counters.tx++;

            this.emit({
                type: "TX",
                packet: message
            });

            if (
                this.mode ===
                "SIMULATOR"
            ) {

                const response =
                    await this.simulator.receive(
                        message
                    );

                if (
                    response
                ) {

                    this.handleIncoming(
                        response
                    );
                }

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

            throw new Error(
                "Mode koneksi tidak valid."
            );
        }

        /* =====================================================
           TEST: LOOPBACK 16 CH
        ===================================================== */

        async runLoopbackTest() {

            const results = [];

            for (
                let channel = 1;
                channel <= 16;
                channel++
            ) {

                try {

                    const value =
                        Number(
                            (
                                channel /
                                16
                            ).toFixed(4)
                        );

                    const response =
                        await this.sendControl(
                            channel,
                            P.PARAMETERS.FADER,
                            value
                        );

                    results.push({
                        channel,
                        ok:
                            Boolean(response)
                    });

                } catch (error) {

                    results.push({
                        channel,
                        ok: false,
                        error:
                            error.message
                    });
                }
            }

            const passed =
                results.filter(
                    result =>
                        result.ok
                ).length;

            const result = {
                test:
                    "16CH LOOPBACK",
                passed,
                total: 16,
                success:
                    passed === 16,
                results
            };

            this.emit({
                type: "TEST_RESULT",
                result
            });

            return result;
        }

        /* =====================================================
           TEST: FADER 16 CH
        ===================================================== */

        async runFaderTest() {

            const results = [];

            for (
                let channel = 1;
                channel <= 16;
                channel++
            ) {

                const value =
                    Number(
                        (
                            0.1 +
                            (
                                channel /
                                16
                            ) *
                            0.8
                        ).toFixed(4)
                    );

                try {

                    await this.sendControl(
                        channel,
                        P.PARAMETERS.FADER,
                        value
                    );

                    results.push({
                        channel,
                        value,
                        ok: true
                    });

                } catch (error) {

                    results.push({
                        channel,
                        value,
                        ok: false,
                        error:
                            error.message
                    });
                }
            }

            const passed =
                results.filter(
                    r => r.ok
                ).length;

            return {
                test:
                    "FADER 16CH",
                passed,
                total: 16,
                success:
                    passed === 16,
                results
            };
        }

        /* =====================================================
           TEST: MUTE / SOLO
        ===================================================== */

        async runMuteSoloTest() {

            const results = [];

            for (
                let channel = 1;
                channel <= 16;
                channel++
            ) {

                try {

                    await this.sendControl(
                        channel,
                        P.PARAMETERS.MUTE,
                        true
                    );

                    await this.sendControl(
                        channel,
                        P.PARAMETERS.MUTE,
                        false
                    );

                    await this.sendControl(
                        channel,
                        P.PARAMETERS.SOLO,
                        true
                    );

                    await this.sendControl(
                        channel,
                        P.PARAMETERS.SOLO,
                        false
                    );

                    results.push({
                        channel,
                        ok: true
                    });

                } catch (error) {

                    results.push({
                        channel,
                        ok: false,
                        error:
                            error.message
                    });
                }
            }

            const passed =
                results.filter(
                    r => r.ok
                ).length;

            return {
                test:
                    "MUTE/SOLO 16CH",
                passed,
                total: 16,
                success:
                    passed === 16,
                results
            };
        }

        /* =====================================================
           TEST: STRESS
        ===================================================== */

        async runStressTest(
            count = 1000
        ) {

            let passed = 0;

            const start =
                performance.now();

            for (
                let i = 0;
                i < count;
                i++
            ) {

                const channel =
                    (
                        i % 16
                    ) + 1;

                const value =
                    Number(
                        (
                            Math.sin(i) *
                            0.5 +
                            0.5
                        ).toFixed(4)
                    );

                try {

                    await this.sendControl(
                        channel,
                        P.PARAMETERS.FADER,
                        value
                    );

                    passed++;

                } catch (_) {}
            }

            const elapsed =
                performance.now() -
                start;

            return {
                test:
                    "STRESS",
                passed,
                total: count,
                elapsed,
                success:
                    passed === count
            };
        }

        /* =====================================================
           COUNTERS
        ===================================================== */

        resetCounters() {

            this.counters = {
                tx: 0,
                ack: 0,
                rx: 0,
                error: 0
            };

            this.lastTX = null;
            this.lastRX = null;

            this.pending.clear();

            this.updatePanel();

            this.emit({
                type:
                    "COUNTERS_RESET"
            });
        }

        getStats() {

            return {
                mode:
                    this.mode,

                connected:
                    this.connected,

                counters:
                    {
                        ...this.counters
                    },

                pending:
                    this.pending.size,

                lastTX:
                    this.lastTX,

                lastRX:
                    this.lastRX
            };
        }

        /* =====================================================
           UI PANEL
        ===================================================== */

        createPanel() {

            if (this.panel) {
                return this.panel;
            }

            const panel =
                document.createElement(
                    "section"
                );

            panel.id =
                "connectionManagerPanel";

            panel.innerHTML = `
                <div class="cm-header">
                    <strong>CONNECTION MANAGER</strong>
                    <span id="cmStatus">
                        DISCONNECTED
                    </span>
                </div>

                <div class="cm-row">

                    <select id="cmMode">
                        <option value="SIMULATOR">
                            ESP32 SIMULATOR
                        </option>

                        <option value="ESP32">
                            ESP32 SERIAL
                        </option>

                        <option value="BLUETOOTH">
                            BLUETOOTH
                        </option>
                    </select>

                    <button id="cmConnect">
                        CONNECT
                    </button>

                    <button id="cmDisconnect">
                        DISCONNECT
                    </button>

                </div>

                <div class="cm-row">

                    <button id="cmPing">
                        PING
                    </button>

                    <button id="cmState">
                        STATE
                    </button>

                    <button id="cmReset">
                        RESET
                    </button>

                </div>

                <div class="cm-row">

                    <button id="cmLoopback">
                        RUN 16CH LOOPBACK
                    </button>

                    <button id="cmFader">
                        RUN FADER 16CH
                    </button>

                    <button id="cmMuteSolo">
                        RUN MUTE/SOLO
                    </button>

                    <button id="cmStress">
                        RUN STRESS
                    </button>

                </div>

                <div class="cm-counters">

                    <span>
                        TX:
                        <b id="cmTX">0</b>
                    </span>

                    <span>
                        ACK:
                        <b id="cmACK">0</b>
                    </span>

                    <span>
                        RX:
                        <b id="cmRX">0</b>
                    </span>

                    <span>
                        ERR:
                        <b id="cmERR">0</b>
                    </span>

                </div>

                <pre id="cmLog"></pre>
            `;

            document.body.prepend(
                panel
            );

            this.panel =
                panel;

            this.injectPanelCSS();

            const modeSelect =
                panel.querySelector(
                    "#cmMode"
                );

            const connectButton =
                panel.querySelector(
                    "#cmConnect"
                );

            const disconnectButton =
                panel.querySelector(
                    "#cmDisconnect"
                );

            const pingButton =
                panel.querySelector(
                    "#cmPing"
                );

            const stateButton =
                panel.querySelector(
                    "#cmState"
                );

            const resetButton =
                panel.querySelector(
                    "#cmReset"
                );

            const loopbackButton =
                panel.querySelector(
                    "#cmLoopback"
                );

            const faderButton =
                panel.querySelector(
                    "#cmFader"
                );

            const muteSoloButton =
                panel.querySelector(
                    "#cmMuteSolo"
                );

            const stressButton =
                panel.querySelector(
                    "#cmStress"
                );

            modeSelect.value =
                this.mode;

            modeSelect.addEventListener(
                "change",
                () => {

                    this.setMode(
                        modeSelect.value
                    );
                }
            );

            connectButton.addEventListener(
                "click",
                async () => {

                    try {

                        await this.connect(
                            modeSelect.value
                        );

                        this.log(
                            "CONNECTED " +
                            modeSelect.value
                        );

                    } catch (error) {

                        this.log(
                            "CONNECT ERROR: " +
                            error.message
                        );
                    }
                }
            );

            disconnectButton.addEventListener(
                "click",
                async () => {

                    await this.disconnect();

                    this.log(
                        "DISCONNECTED"
                    );
                }
            );

            pingButton.addEventListener(
                "click",
                async () => {

                    try {

                        await this.ping();

                        this.log(
                            "PING SENT"
                        );

                    } catch (error) {

                        this.log(
                            "PING ERROR: " +
                            error.message
                        );
                    }
                }
            );

            stateButton.addEventListener(
                "click",
                async () => {

                    try {

                        await this.requestState();

                        this.log(
                            "STATE REQUEST SENT"
                        );

                    } catch (error) {

                        this.log(
                            "STATE ERROR: " +
                            error.message
                        );
                    }
                }
            );

            resetButton.addEventListener(
                "click",
                async () => {

                    try {

                        await this.resetRemote();

                        this.log(
                            "RESET SENT"
                        );

                    } catch (error) {

                        this.log(
                            "RESET ERROR: " +
                            error.message
                        );
                    }
                }
            );

            loopbackButton.addEventListener(
                "click",
                async () => {

                    const result =
                        await this
                            .runLoopbackTest();

                    this.log(
                        JSON.stringify(
                            result,
                            null,
                            2
                        )
                    );
                }
            );

            faderButton.addEventListener(
                "click",
                async () => {

                    const result =
                        await this
                            .runFaderTest();

                    this.log(
                        JSON.stringify(
                            result,
                            null,
                            2
                        )
                    );
                }
            );

            muteSoloButton.addEventListener(
                "click",
                async () => {

                    const result =
                        await this
                            .runMuteSoloTest();

                    this.log(
                        JSON.stringify(
                            result,
                            null,
                            2
                        )
                    );
                }
            );

            stressButton.addEventListener(
                "click",
                async () => {

                    const result =
                        await this
                            .runStressTest(
                                1000
                            );

                    this.log(
                        JSON.stringify(
                            result,
                            null,
                            2
                        )
                    );
                }
            );

            this.updatePanel();

            return panel;
        }

        updatePanel() {

            if (!this.panel) {
                return;
            }

            const status =
                this.panel.querySelector(
                    "#cmStatus"
                );

            const mode =
                this.panel.querySelector(
                    "#cmMode"
                );

            const tx =
                this.panel.querySelector(
                    "#cmTX"
                );

            const ack =
                this.panel.querySelector(
                    "#cmACK"
                );

            const rx =
                this.panel.querySelector(
                    "#cmRX"
                );

            const err =
                this.panel.querySelector(
                    "#cmERR"
                );

            if (status) {

                status.textContent =
                    this.connected
                        ? "CONNECTED"
                        : "DISCONNECTED";
            }

            if (mode) {

                mode.value =
                    this.mode;
            }

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

            if (err) {

                err.textContent =
                    this.counters.error;
            }
        }

        log(message) {

            if (!this.panel) {
                return;
            }

            const log =
                this.panel.querySelector(
                    "#cmLog"
                );

            if (!log) {
                return;
            }

            const time =
                new Date()
                    .toLocaleTimeString();

            log.textContent +=
                `[${time}] ${message}\n`;

            log.scrollTop =
                log.scrollHeight;
        }

        /* =====================================================
           PANEL CSS
        ===================================================== */

        injectPanelCSS() {

            if (
                document.getElementById(
                    "connectionManagerStyle"
                )
            ) {
                return;
            }

            const style =
                document.createElement(
                    "style"
                );

            style.id =
                "connectionManagerStyle";

            style.textContent = `
                #connectionManagerPanel {
                    position: fixed;
                    left: 10px;
                    bottom: 10px;
                    z-index: 99999;

                    width: min(
                        760px,
                        calc(100vw - 20px)
                    );

                    max-height: 45vh;
                    overflow: auto;

                    padding: 10px;

                    background:
                        rgba(12, 15, 20, 0.96);

                    border:
                        1px solid
                        rgba(255,255,255,0.15);

                    border-radius: 10px;

                    color: #fff;

                    font-family:
                        Arial,
                        sans-serif;

                    font-size: 12px;

                    box-shadow:
                        0 8px 30px
                        rgba(0,0,0,.35);
                }

                #connectionManagerPanel
                .cm-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                }

                #connectionManagerPanel
                .cm-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-bottom: 6px;
                }

                #connectionManagerPanel
                select,
                #connectionManagerPanel
                button {
                    min-height: 30px;
                    border-radius: 6px;
                    border: 1px solid
                        rgba(255,255,255,.15);
                    background:
                        rgba(255,255,255,.08);
                    color: #fff;
                    padding: 5px 8px;
                }

                #connectionManagerPanel
                button {
                    cursor: pointer;
                }

                #connectionManagerPanel
                button:hover {
                    background:
                        rgba(255,255,255,.16);
                }

                #connectionManagerPanel
                .cm-counters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin: 8px 0;
                }

                #connectionManagerPanel
                #cmLog {
                    margin: 0;
                    padding: 8px;
                    min-height: 50px;
                    max-height: 160px;
                    overflow: auto;

                    background:
                        rgba(0,0,0,.35);

                    border-radius: 6px;

                    white-space: pre-wrap;
                    word-break: break-word;
                }
            `;

            document.head.appendChild(
                style
            );
        }
    }

    /*
     * Global instance
     */

    window.ConnectionManager =
        new ConnectionManager();

    /*
     * Create panel after DOM is ready.
     */

    function initializePanel() {

        if (
            window.ConnectionManager
        ) {

            window.ConnectionManager
                .createPanel();
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializePanel,
            {
                once: true
            }
        );

    } else {

        initializePanel();
    }

})();
