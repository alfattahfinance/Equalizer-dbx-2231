/* =========================================================
   DSP CONTROL BRIDGE

   Hardware / Simulator / Bluetooth
                ↕
        Connection Manager
                ↕
        Web Audio DSP Engine

   ALESIS -> DBX 2231 -> MASTER
========================================================= */

(function () {

    "use strict";

    const P =
        window.MixerProtocol;

    if (!P) {

        console.error(
            "[DSP BRIDGE] MixerProtocol belum dimuat."
        );

        return;
    }

    const Bridge = {

        initialized: false,

        applyingFeedback: false,

        lastFeedback: null,

        /*
         * Prevent feedback loop:
         *
         * Hardware -> Web
         * Web update -> hardware
         *
         * Jangan kirim balik packet yang sedang
         * diproses dari hardware.
         */
        suppressTX: false,

        init() {

            if (this.initialized) {
                return;
            }

            this.initialized = true;

            window.addEventListener(
                "mixer:feedback",
                event => {

                    if (
                        !event ||
                        !event.detail
                    ) {
                        return;
                    }

                    this.applyFeedback(
                        event.detail
                    );
                }
            );

            /*
             * Ketika UI berubah, event ini bisa
             * digunakan oleh UI/Connection Manager.
             */
            window.addEventListener(
                "mixer:dsp-control",
                event => {

                    if (
                        !event ||
                        !event.detail
                    ) {
                        return;
                    }

                    this.applyControl(
                        event.detail
                    );
                }
            );

            console.log(
                "[DSP BRIDGE] initialized"
            );
        },

        applyFeedback(packet) {

            if (!packet) {
                return;
            }

            const parameter =
                String(
                    packet.parameter || ""
                ).toUpperCase();

            const channel =
                Number(packet.channel);

            const value =
                P.normalizeValue(
                    parameter,
                    packet.value
                );

            this.lastFeedback = packet;

            this.applyingFeedback = true;

            try {

                switch (parameter) {

                    case P.PARAMETERS.FADER:

                        this.applyFader(
                            channel,
                            value
                        );

                        break;

                    case P.PARAMETERS.GAIN:

                        this.applyGain(
                            channel,
                            value
                        );

                        break;

                    case P.PARAMETERS.EQ_LOW:

                        this.applyEQ(
                            channel,
                            "LOW",
                            value
                        );

                        break;

                    case P.PARAMETERS.EQ_MID:

                        this.applyEQ(
                            channel,
                            "MID",
                            value
                        );

                        break;

                    case P.PARAMETERS.EQ_HIGH:

                        this.applyEQ(
                            channel,
                            "HIGH",
                            value
                        );

                        break;

                    case P.PARAMETERS.EQ_BAND:

                        this.applyEQBand(
                            channel,
                            packet,
                            value
                        );

                        break;

                    case P.PARAMETERS.MUTE:

                        this.applyMute(
                            channel,
                            value
                        );

                        break;

                    case P.PARAMETERS.SOLO:

                        this.applySolo(
                            channel,
                            value
                        );

                        break;

                    case P.PARAMETERS.MASTER:

                        this.applyMaster(
                            value
                        );

                        break;

                    default:

                        this.applyGeneric(
                            packet
                        );
                }

            } finally {

                this.applyingFeedback =
                    false;
            }
        },

        applyControl(packet) {

            if (!packet) {
                return;
            }

            /*
             * CONTROL dari hardware/UI
             * diperlakukan sama seperti FEEDBACK.
             */
            this.applyFeedback(packet);
        },

        applyFader(channel, value) {

            /*
             * Mixer fisik memiliki FADER.
             *
             * DBX 2231 sendiri tidak mempunyai
             * channel fader, sehingga FADER
             * dipetakan ke channel gain bila
             * tersedia.
             */

            if (
                window.channelState &&
                window.channelState[channel - 1]
            ) {

                const state =
                    window.channelState[
                        channel - 1
                    ];

                state.fader =
                    Number(value);
            }

            this.updateChannelUI(
                channel,
                "FADER",
                value
            );
        },

        applyGain(channel, value) {

            const index =
                channel - 1;

            if (
                window.channelState &&
                window.channelState[index]
            ) {

                window.channelState[index]
                    .gain =
                    Number(value);

                if (
                    typeof window
                        .updateChannelAudio ===
                    "function"
                ) {

                    window.updateChannelAudio(
                        index
                    );
                }
            }

            this.updateChannelUI(
                channel,
                "GAIN",
                value
            );
        },

        applyEQ(
            channel,
            band,
            value
        ) {

            const index =
                channel - 1;

            if (
                window.channelState &&
                window.channelState[index]
            ) {

                const state =
                    window.channelState[
                        index
                    ];

                /*
                 * EQ_LOW/MID/HIGH berasal
                 * dari mixer fisik.
                 *
                 * DBX 2231 adalah 31 band,
                 * jadi kita simpan juga sebagai
                 * metadata tanpa merusak band
                 * yang sudah ada.
                 */

                state[
                    "eq" +
                    band.charAt(0) +
                    band.slice(1).toLowerCase()
                ] =
                    Number(value);
            }

            this.updateChannelUI(
                channel,
                "EQ_" + band,
                value
            );
        },

        applyEQBand(
            channel,
            packet,
            value
        ) {

            const index =
                channel - 1;

            if (
                !window.channelState ||
                !window.channelState[index]
            ) {
                return;
            }

            const state =
                window.channelState[
                    index
                ];

            let band =
                Number(
                    packet.band
                );

            /*
             * Protocol band dapat dikirim:
             *
             * 0..30
             * atau
             * 1..31
             *
             * Kita terima keduanya.
             */

            if (
                band >= 1 &&
                band <= 31
            ) {
                band -= 1;
            }

            if (
                band < 0 ||
                band >= 31
            ) {
                return;
            }

            if (
                Array.isArray(
                    state.bands
                )
            ) {

                state.bands[band] =
                    P.clamp(
                        value,
                        -15,
                        15
                    );
            }

            if (
                typeof window
                    .updateChannelAudio ===
                "function"
            ) {

                window.updateChannelAudio(
                    index
                );
            }

            this.updateChannelUI(
                channel,
                "EQ_BAND",
                value,
                band
            );
        },

        applyMute(
            channel,
            value
        ) {

            const index =
                channel - 1;

            if (
                window.channelState &&
                window.channelState[index]
            ) {

                window.channelState[index]
                    .mute =
                    Boolean(value);
            }

            this.updateChannelUI(
                channel,
                "MUTE",
                Boolean(value)
            );

            if (
                typeof window
                    .updateAllStatusLights ===
                "function"
            ) {

                window.updateAllStatusLights();
            }
        },

        applySolo(
            channel,
            value
        ) {

            const index =
                channel - 1;

            if (
                window.channelState &&
                window.channelState[index]
            ) {

                window.channelState[index]
                    .solo =
                    Boolean(value);
            }

            this.updateChannelUI(
                channel,
                "SOLO",
                Boolean(value)
            );

            if (
                typeof window
                    .updateAllStatusLights ===
                "function"
            ) {

                window.updateAllStatusLights();
            }
        },

        applyMaster(value) {

            const number =
                Number(value);

            if (
                !Number.isFinite(number)
            ) {
                return;
            }

            /*
             * MASTER pada protocol dianggap dB.
             */

            if (
                typeof window
                    .setMasterGain ===
                "function"
            ) {

                window.setMasterGain(
                    number
                );
            }

            const slider =
                document.getElementById(
                    "masterGain"
                );

            if (slider) {

                slider.value =
                    String(number);

                const event =
                    new Event(
                        "input",
                        {
                            bubbles: true
                        }
                    );

                slider.dispatchEvent(
                    event
                );
            }
        },

        applyGeneric(packet) {

            window.dispatchEvent(
                new CustomEvent(
                    "mixer:dsp-generic",
                    {
                        detail: packet
                    }
                )
            );
        },

        updateChannelUI(
            channel,
            parameter,
            value,
            band = null
        ) {

            /*
             * Jangan bergantung pada ID
             * tertentu dari UI.
             *
             * Broadcast event sehingga
             * renderer existing dapat
             * menangani bila diperlukan.
             */

            window.dispatchEvent(
                new CustomEvent(
                    "mixer:ui-update",
                    {
                        detail: {
                            channel,
                            parameter,
                            value,
                            band
                        }
                    }
                )
            );
        },

        /*
         * Dipakai UI untuk mengirim CONTROL.
         */
        send(
            channel,
            parameter,
            value,
            extra = {}
        ) {

            if (
                this.applyingFeedback
            ) {
                return null;
            }

            const manager =
                window.ConnectionManager;

            if (
                !manager ||
                typeof manager
                    .sendControl !==
                "function"
            ) {

                console.warn(
                    "[DSP BRIDGE] ConnectionManager belum tersedia."
                );

                return null;
            }

            return manager.sendControl(
                channel,
                parameter,
                value,
                extra
            );
        }
    };

    window.DSPControlBridge =
        Bridge;

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => Bridge.init(),
            {
                once: true
            }
        );

    } else {

        Bridge.init();
    }

})();
