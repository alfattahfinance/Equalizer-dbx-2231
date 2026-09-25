/* =========================================================
   DSP CONTROL BRIDGE (OPTIMIZED VERSION 1.1)

   Hardware / Simulator / Bluetooth
                ↕
        Connection Manager
                ↕
        Web Audio DSP Engine

   ALESIS -> DBX 2231 -> MASTER
========================================================= */

(function () {

    "use strict";

    const P = window.MixerProtocol;

    if (!P) {
        console.error("[DSP BRIDGE] MixerProtocol belum dimuat.");
        return;
    }

    const Bridge = {

        initialized: false,
        applyingFeedback: false,
        lastFeedback: null,
        suppressTX: false,

        init() {
            if (this.initialized) {
                return;
            }

            this.initialized = true;

            window.addEventListener(
                "mixer:feedback",
                event => {
                    if (!event || !event.detail) return;
                    this.applyFeedback(event.detail);
                }
            );

            window.addEventListener(
                "mixer:dsp-control",
                event => {
                    if (!event || !event.detail) return;
                    this.applyControl(event.detail);
                }
            );

            console.log("[DSP BRIDGE] initialized successfully");
        },

        applyFeedback(packet) {
            if (!packet) return;

            const parameter = String(packet.parameter || "").toUpperCase();
            const channel = Number(packet.channel);
            const value = P.normalizeValue(parameter, packet.value);

            this.lastFeedback = packet;
            this.applyingFeedback = true;

            try {
                switch (parameter) {
                    case P.PARAMETERS.FADER:
                        this.applyFader(channel, value);
                        break;
                    case P.PARAMETERS.GAIN:
                        this.applyGain(channel, value);
                        break;
                    case P.PARAMETERS.EQ_LOW:
                        this.applyEQ(channel, "LOW", value);
                        break;
                    case P.PARAMETERS.EQ_MID:
                        this.applyEQ(channel, "MID", value);
                        break;
                    case P.PARAMETERS.EQ_HIGH:
                        this.applyEQ(channel, "HIGH", value);
                        break;
                    case P.PARAMETERS.EQ_BAND:
                        this.applyEQBand(channel, packet, value);
                        break;
                    case P.PARAMETERS.MUTE:
                        this.applyMute(channel, value);
                        break;
                    case P.PARAMETERS.SOLO:
                        this.applySolo(channel, value);
                        break;
                    case P.PARAMETERS.MASTER:
                        this.applyMaster(value);
                        break;
                    default:
                        this.applyGeneric(packet);
                }
            } finally {
                this.applyingFeedback = false;
            }
        },

        applyControl(packet) {
            if (!packet) return;
            this.applyFeedback(packet);
        },

        applyFader(channel, value) {
            const index = channel - 1;
            if (window.channelState && window.channelState[index]) {
                window.channelState[index].fader = Number(value);
            }
            this.updateChannelUI(channel, "FADER", value);
        },

        applyGain(channel, value) {
            const index = channel - 1;
            if (window.channelState && window.channelState[index]) {
                window.channelState[index].gain = Number(value);
                if (typeof window.updateChannelAudio === "function") {
                    window.updateChannelAudio(index);
                }
            }
            this.updateChannelUI(channel, "GAIN", value);
        },

        applyEQ(channel, band, value) {
            const index = channel - 1;
            if (window.channelState && window.channelState[index]) {
                const state = window.channelState[index];
                const key = "eq" + band.charAt(0) + band.slice(1).toLowerCase();
                state[key] = Number(value);
            }
            this.updateChannelUI(channel, "EQ_" + band, value);
        },

        applyEQBand(channel, packet, value) {
            const index = channel - 1;
            if (!window.channelState || !window.channelState[index]) return;

            const state = window.channelState[index];
            let band = Number(packet.band);

            if (band >= 1 && band <= 31) {
                band -= 1;
            }

            if (band < 0 || band >= 31) return;

            if (Array.isArray(state.bands)) {
                state.bands[band] = P.clamp(value, -15, 15);
            }

            if (typeof window.updateChannelAudio === "function") {
                window.updateChannelAudio(index);
            }

            this.updateChannelUI(channel, "EQ_BAND", value, band);
        },

        applyMute(channel, value) {
            const index = channel - 1;
            if (window.channelState && window.channelState[index]) {
                window.channelState[index].mute = Boolean(value);
            }
            this.updateChannelUI(channel, "MUTE", Boolean(value));

            if (typeof window.updateAllStatusLights === "function") {
                window.updateAllStatusLights();
            }
        },

        applySolo(channel, value) {
            const index = channel - 1;
            if (window.channelState && window.channelState[index]) {
                window.channelState[index].solo = Boolean(value);
            }
            this.updateChannelUI(channel, "SOLO", Boolean(value));

            if (typeof window.updateAllStatusLights === "function") {
                window.updateAllStatusLights();
            }
        },

        applyMaster(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) return;

            if (typeof window.setMasterGain === "function") {
                window.setMasterGain(number);
            }

            // Perbaikan ID disesuaikan dengan elemen HTML utama ("masterGainControl")
            const slider = document.getElementById("masterGainControl");
            if (slider && document.activeElement !== slider) {
                slider.value = String(number);
                slider.dispatchEvent(new Event("input", { bubbles: true }));
            }
        },

        applyGeneric(packet) {
            window.dispatchEvent(
                new CustomEvent("mixer:dsp-generic", { detail: packet })
            );
        },

        updateChannelUI(channel, parameter, value, band = null) {
            window.dispatchEvent(
                new CustomEvent("mixer:ui-update", {
                    detail: { channel, parameter, value, band }
                })
            );
        },

        send(channel, parameter, value, extra = {}) {
            if (this.applyingFeedback || this.suppressTX) {
                return null;
            }

            const manager = window.ConnectionManager;
            if (!manager || typeof manager.sendControl !== "function") {
                console.warn("[DSP BRIDGE] ConnectionManager belum tersedia.");
                return null;
            }

            return manager.sendControl(channel, parameter, value, extra);
        }
    };

    window.DSPControlBridge = Bridge;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => Bridge.init(), { once: true });
    } else {
        Bridge.init();
    }

})();
