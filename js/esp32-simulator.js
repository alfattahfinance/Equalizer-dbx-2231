/* =========================================================
   ESP32 SIMULATOR
   Virtual ESP32 running inside the browser.

   WEB
     ↓ TX
   ESP32 SIMULATOR
     ↓ ACK
   FEEDBACK
     ↓
   WEB
========================================================= */

(function () {
    "use strict";

    const P = window.MixerProtocol;

    if (!P) {
        console.error(
            "[ESP32 SIMULATOR] MixerProtocol belum dimuat."
        );
        return;
    }

    class ESP32Simulator {

        constructor(options = {}) {

            this.channelCount =
                Number(options.channelCount) || 16;

            this.running = false;

            this.latency =
                Number(options.latency) >= 0
                    ? Number(options.latency)
                    : 20;

            this.errorRate =
                Number(options.errorRate) >= 0
                    ? Number(options.errorRate)
                    : 0;

            this.messageCount = {
                tx: 0,
                ack: 0,
                rx: 0,
                error: 0
            };

            this.channels = [];

            for (let i = 1; i <= this.channelCount; i++) {
                this.channels.push({
                    channel: i,

                    fader: 0,
                    gain: 0,

                    eqLow: 0,
                    eqMid: 0,
                    eqHigh: 0,

                    mute: false,
                    solo: false,

                    pan: 0,

                    aux: {},
                    bus: {},
                    fx: {}
                });
            }

            this.master = 0;

            this.listeners = new Set();

            this.history = [];

            this.startedAt = null;

            this.log(
                "SYSTEM",
                `ESP32 Simulator dibuat (${this.channelCount} channel)`
            );
        }

        start() {

            if (this.running) {
                return;
            }

            this.running = true;
            this.startedAt = Date.now();

            this.log(
                "SYSTEM",
                "ESP32 Simulator RUNNING"
            );

            this.emit({
                type: "SIMULATOR_STATUS",
                status: "RUNNING"
            });
        }

        stop() {

            if (!this.running) {
                return;
            }

            this.running = false;

            this.log(
                "SYSTEM",
                "ESP32 Simulator STOPPED"
            );

            this.emit({
                type: "SIMULATOR_STATUS",
                status: "STOPPED"
            });
        }

        reset() {

            for (const channel of this.channels) {

                channel.fader = 0;
                channel.gain = 0;

                channel.eqLow = 0;
                channel.eqMid = 0;
                channel.eqHigh = 0;

                channel.mute = false;
                channel.solo = false;

                channel.pan = 0;

                channel.aux = {};
                channel.bus = {};
                channel.fx = {};
            }

            this.master = 0;

            this.messageCount = {
                tx: 0,
                ack: 0,
                rx: 0,
                error: 0
            };

            this.log(
                "SYSTEM",
                "ESP32 Simulator RESET"
            );

            this.emit({
                type: "SIMULATOR_RESET"
            });
        }

        subscribe(callback) {

            if (typeof callback !== "function") {
                return () => {};
            }

            this.listeners.add(callback);

            return () => {
                this.listeners.delete(callback);
            };
        }

        emit(event) {

            for (const callback of this.listeners) {

                try {
                    callback(event);
                } catch (error) {
                    console.error(
                        "[ESP32 SIMULATOR]",
                        error
                    );
                }
            }
        }

        log(type, message, packet = null) {

            const item = {
                time: new Date().toISOString(),
                type,
                message,
                packet
            };

            this.history.push(item);

            if (this.history.length > 500) {
                this.history.shift();
            }

            this.emit({
                type: "LOG",
                data: item
            });
        }

        receive(message) {

            if (!this.running) {

                this.messageCount.error++;

                const errorPacket =
                    P.createError(
                        "ESP32 Simulator tidak sedang RUNNING",
                        "SIMULATOR_STOPPED"
                    );

                this.log(
                    "ERROR",
                    "Command ditolak: simulator STOPPED",
                    errorPacket
                );

                this.emit({
                    type: "RX_ERROR",
                    packet: errorPacket
                });

                return Promise.resolve(errorPacket);
            }

            this.messageCount.tx++;

            this.log(
                "TX",
                `${message.type} ${message.parameter || ""}`,
                message
            );

            return new Promise(resolve => {

                setTimeout(() => {

                    const response =
                        this.process(message);

                    resolve(response);

                }, this.latency);
            });
        }

        process(message) {

            if (!message || !message.type) {

                this.messageCount.error++;

                return P.createError(
                    "Packet tidak valid",
                    "INVALID_PACKET"
                );
            }

            switch (message.type) {

                case P.TYPES.PING:
                    return this.handlePing(message);

                case P.TYPES.CONTROL:
                    return this.handleControl(message);

                case P.TYPES.STATE_REQUEST:
                    return this.handleStateRequest(message);

                case P.TYPES.RESET:
                    this.reset();

                    return P.createAck(
                        message,
                        {
                            action: "RESET"
                        }
                    );

                default:

                    this.messageCount.error++;

                    return P.createError(
                        `Unknown message type: ${message.type}`,
                        "UNKNOWN_TYPE"
                    );
            }
        }

        handlePing(message) {

            const response =
                P.createPong(message);

            this.messageCount.ack++;

            this.log(
                "ACK",
                "PONG",
                response
            );

            return response;
        }

        handleControl(message) {

            const channel =
                Number(message.channel);

            const parameter =
                String(
                    message.parameter || ""
                ).toUpperCase();

            let value = message.value;

            if (
                parameter !== P.PARAMETERS.MASTER &&
                (
                    !Number.isInteger(channel) ||
                    channel < 1 ||
                    channel > this.channelCount
                )
            ) {

                this.messageCount.error++;

                const errorPacket =
                    P.createError(
                        `Channel ${channel} tidak valid`,
                        "INVALID_CHANNEL",
                        {
                            channel,
                            parameter
                        }
                    );

                this.log(
                    "ERROR",
                    "Invalid channel",
                    errorPacket
                );

                return errorPacket;
            }

            if (Math.random() < this.errorRate) {

                this.messageCount.error++;

                return P.createError(
                    "Simulated communication error",
                    "SIMULATED_ERROR"
                );
            }

            value =
                P.normalizeValue(
                    parameter,
                    value
                );

            this.applyParameter(
                channel,
                parameter,
                value
            );

            const ack =
                P.createAck(
                    message,
                    {
                        simulator: true
                    }
                );

            const feedback =
                P.createFeedback(
                    channel,
                    parameter,
                    value,
                    {
                        simulator: true
                    }
                );

            this.messageCount.ack++;
            this.messageCount.rx++;

            this.log(
                "ACK",
                `${parameter} accepted`,
                ack
            );

            this.log(
                "RX",
                `${parameter}=${value}`,
                feedback
            );

            this.emit({
                type: "ACK",
                packet: ack
            });

            this.emit({
                type: "FEEDBACK",
                packet: feedback
            });

            return {
                ack,
                feedback
            };
        }

        applyParameter(
            channel,
            parameter,
            value
        ) {

            if (
                parameter === P.PARAMETERS.MASTER
            ) {

                this.master = value;

                return;
            }

            const ch =
                this.channels[channel - 1];

            if (!ch) {
                return;
            }

            switch (parameter) {

                case P.PARAMETERS.FADER:
                    ch.fader = value;
                    break;

                case P.PARAMETERS.GAIN:
                    ch.gain = value;
                    break;

                case P.PARAMETERS.EQ_LOW:
                    ch.eqLow = value;
                    break;

                case P.PARAMETERS.EQ_MID:
                    ch.eqMid = value;
                    break;

                case P.PARAMETERS.EQ_HIGH:
                    ch.eqHigh = value;
                    break;

                case P.PARAMETERS.MUTE:
                    ch.mute = Boolean(value);
                    break;

                case P.PARAMETERS.SOLO:
                    ch.solo = Boolean(value);
                    break;

                case P.PARAMETERS.PAN:
                    ch.pan = value;
                    break;

                case P.PARAMETERS.AUX:
                    ch.aux =
                        {
                            ...ch.aux,
                            ...(
                                typeof value === "object"
                                    ? value
                                    : {}
                            )
                        };
                    break;

                case P.PARAMETERS.BUS:
                    ch.bus =
                        {
                            ...ch.bus,
                            ...(
                                typeof value === "object"
                                    ? value
                                    : {}
                            )
                        };
                    break;

                case P.PARAMETERS.FX:
                    ch.fx =
                        {
                            ...ch.fx,
                            ...(
                                typeof value === "object"
                                    ? value
                                    : {}
                            )
                        };
                    break;

                default:

                    ch[
                        parameter.toLowerCase()
                    ] = value;

                    break;
            }
        }

        getState() {

            return {
                channelCount:
                    this.channelCount,

                channels:
                    JSON.parse(
                        JSON.stringify(
                            this.channels
                        )
                    ),

                master:
                    this.master,

                running:
                    this.running,

                counters:
                    {
                        ...this.messageCount
                    }
            };
        }

        handleStateRequest(message) {

            const state =
                this.getState();

            const response = {
                protocol: "MIXER",
                version: P.PROTOCOL_VERSION,
                id: P.createId(),
                replyTo: message.id,
                timestamp: Date.now(),
                type: P.TYPES.STATE_RESPONSE,
                source: P.SOURCES.SIMULATOR,
                state
            };

            this.messageCount.rx++;

            this.log(
                "RX",
                "STATE_RESPONSE",
                response
            );

            return response;
        }

        getStatistics() {

            return {
                ...this.messageCount,

                uptime:
                    this.startedAt
                        ? Date.now() -
                          this.startedAt
                        : 0,

                history:
                    this.history.length,

                running:
                    this.running
            };
        }

        clearHistory() {
            this.history = [];
        }
    }

    const simulator =
        new ESP32Simulator({
            channelCount: 16,
            latency: 20,
            errorRate: 0
        });

    window.ESP32Simulator =
        simulator;

})();
