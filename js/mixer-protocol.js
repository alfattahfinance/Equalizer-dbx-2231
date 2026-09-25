/* =========================================================
   MIXER PROTOCOL (UPGRADED VERSION 1.2)
   Universal protocol:
   WEB <-> BLUETOOTH
   WEB <-> ESP32
   WEB <-> ESP32 SIMULATOR
========================================================= */

(function () {
    "use strict";

    const PROTOCOL_VERSION = "1.2";

    const TYPES = Object.freeze({
        CONTROL: "CONTROL",
        ACK: "ACK",
        FEEDBACK: "FEEDBACK",
        ERROR: "ERROR",
        PING: "PING",
        PONG: "PONG",
        CONNECT: "CONNECT",
        DISCONNECT: "DISCONNECT",
        STATE_REQUEST: "STATE_REQUEST",
        STATE_RESPONSE: "STATE_RESPONSE",
        RESET: "RESET"
    });

    const SOURCES = Object.freeze({
        WEB: "WEB",
        BLUETOOTH: "BLUETOOTH",
        ESP32: "ESP32",
        SIMULATOR: "SIMULATOR"
    });

    const PARAMETERS = Object.freeze({
        FADER: "FADER",
        GAIN: "GAIN",
        HPF: "HPF",

        EQ_LOW: "EQ_LOW",
        EQ_MID: "EQ_MID",
        EQ_HIGH: "EQ_HIGH",

        // DBX 2231 individual 31-band control
        EQ_BAND: "EQ_BAND",

        MUTE: "MUTE",
        SOLO: "SOLO",

        MASTER: "MASTER",

        AUX: "AUX",
        BUS: "BUS",
        FX: "FX",
        PAN: "PAN",
        LEVEL: "LEVEL",

        // Echo / Reversal parameters
        ECHO_TOGGLE: "ECHO_TOGGLE",
        ECHO_DELAY: "ECHO_DELAY",
        ECHO_FEEDBACK: "ECHO_FEEDBACK",
        ECHO_MIX: "ECHO_MIX"
    });

    function createId() {
        return (
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 10)
        );
    }

    function createMessage(type, payload = {}) {
        return {
            protocol: "MIXER",
            version: PROTOCOL_VERSION,
            id: createId(),
            timestamp: Date.now(),
            type,
            source: SOURCES.WEB,
            ...payload
        };
    }

    function createControl(channel, parameter, value, extra = {}) {
        return createMessage(
            TYPES.CONTROL,
            {
                channel: Number(channel) || 0,
                parameter: String(parameter || "").toUpperCase(),
                value: normalizeValue(parameter, value),
                ...extra
            }
        );
    }

    function createAck(original, extra = {}) {
        const source = extra.source || original?.source || SOURCES.SIMULATOR;
        return {
            protocol: "MIXER",
            version: PROTOCOL_VERSION,
            id: createId(),
            replyTo: original?.id || null,
            timestamp: Date.now(),
            type: TYPES.ACK,
            source,
            channel: original?.channel ?? null,
            parameter: original?.parameter ?? null,
            value: original?.value ?? null,
            ...extra
        };
    }

    function createFeedback(channel, parameter, value, extra = {}) {
        return createMessage(
            TYPES.FEEDBACK,
            {
                channel: Number(channel) || 0,
                parameter: String(parameter || "").toUpperCase(),
                value: normalizeValue(parameter, value),
                ...extra
            }
        );
    }

    function createError(message, code = "UNKNOWN", extra = {}) {
        return createMessage(
            TYPES.ERROR,
            {
                error: String(message),
                code,
                ...extra
            }
        );
    }

    function createPing() {
        return createMessage(TYPES.PING);
    }

    function createPong(message, source = SOURCES.SIMULATOR) {
        return {
            protocol: "MIXER",
            version: PROTOCOL_VERSION,
            id: createId(),
            replyTo: message?.id || null,
            timestamp: Date.now(),
            type: TYPES.PONG,
            source
        };
    }

    function encode(message) {
        return JSON.stringify(message) + "\n";
    }

    function decode(text) {
        if (!text) return [];

        const lines = String(text)
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        const result = [];

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                if (parsed && parsed.protocol === "MIXER") {
                    result.push(parsed);
                }
            } catch (error) {
                console.warn("[MIXER PROTOCOL] Invalid packet:", line, error);
            }
        }

        return result;
    }

    function clamp(value, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.min(max, Math.max(min, number));
    }

    function normalizeValue(parameter, value) {
        switch (parameter) {
            case PARAMETERS.MUTE:
            case PARAMETERS.SOLO:
            case PARAMETERS.ECHO_TOGGLE:
                return Boolean(value);

            case PARAMETERS.FADER:
            case PARAMETERS.GAIN:
            case PARAMETERS.HPF:
            case PARAMETERS.EQ_LOW:
            case PARAMETERS.EQ_MID:
            case PARAMETERS.EQ_HIGH:
            case PARAMETERS.EQ_BAND:
            case PARAMETERS.MASTER:
            case PARAMETERS.AUX:
            case PARAMETERS.BUS:
            case PARAMETERS.FX:
            case PARAMETERS.PAN:
            case PARAMETERS.LEVEL:
            case PARAMETERS.ECHO_DELAY:
            case PARAMETERS.ECHO_FEEDBACK:
            case PARAMETERS.ECHO_MIX:
                return Number(value);

            default:
                return value;
        }
    }

    // Helper tambahan untuk langsung mengirim via Bluetooth Characteristic ESP32
    async function sendViaBluetooth(characteristic, messageObj) {
        if (!characteristic) {
            throw new Error("Bluetooth characteristic belum terhubung.");
        }
        const encodedData = encode(messageObj);
        const encoder = new TextEncoder();
        await characteristic.writeValue(encoder.encode(encodedData));
    }

    window.MixerProtocol = {
        PROTOCOL_VERSION,
        TYPES,
        SOURCES,
        PARAMETERS,
        createMessage,
        createControl,
        createAck,
        createFeedback,
        createError,
        createPing,
        createPong,
        encode,
        decode,
        clamp,
        normalizeValue,
        createId,
        sendViaBluetooth
    };

})();
