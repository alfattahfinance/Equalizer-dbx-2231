/* =========================================================
   ESP32 CONNECTION
   Browser Web Serial -> ESP32

   Protocol:
   JSON packet + newline
========================================================= */

(function () {
    "use strict";

    const P = window.MixerProtocol;

    if (!P) {
        console.error(
            "[ESP32 CONNECTION] MixerProtocol belum dimuat."
        );
        return;
    }

    class ESP32Connection {

        constructor() {

            this.port = null;
            this.reader = null;
            this.writer = null;

            this.connected = false;

            this.decoder = new TextDecoder();
            this.encoder = new TextEncoder();

            this.receiveBuffer = "";

            this.listeners = new Set();

            this.baudRate = 115200;
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
                        "[ESP32 CONNECTION]",
                        error
                    );
                }
            }
        }

        isSupported() {

            return (
                "serial" in navigator
            );
        }

        async connect() {

            if (!this.isSupported()) {

                throw new Error(
                    "Web Serial tidak didukung browser ini."
                );
            }

            if (this.connected) {
                return true;
            }

            this.port =
                await navigator.serial.requestPort();

            await this.port.open({
                baudRate: this.baudRate
            });

            this.connected = true;

            this.emit({
                type: "CONNECTED"
            });

            this.readLoop();

            await this.send(
                P.createMessage(
                    P.TYPES.CONNECT,
                    {
                        source: P.SOURCES.WEB
                    }
                )
            );

            return true;
        }

        async disconnect() {

            this.connected = false;

            try {

                if (this.reader) {
                    await this.reader.cancel();
                }

            } catch (_) {}

            try {

                if (this.writer) {
                    this.writer.releaseLock();
                    this.writer = null;
                }

            } catch (_) {}

            try {

                if (this.port) {
                    await this.port.close();
                }

            } catch (_) {}

            this.reader = null;
            this.port = null;

            this.emit({
                type: "DISCONNECTED"
            });
        }

        async readLoop() {

            if (!this.port) {
                return;
            }

            while (
                this.connected &&
                this.port.readable
            ) {

                this.reader =
                    this.port.readable.getReader();

                try {

                    while (true) {

                        const {
                            value,
                            done
                        } =
                            await this.reader.read();

                        if (done) {
                            break;
                        }

                        if (!value) {
                            continue;
                        }

                        this.receiveBuffer +=
                            this.decoder.decode(
                                value,
                                {
                                    stream: true
                                }
                            );

                        const packets =
                            P.decode(
                                this.receiveBuffer
                            );

                        if (
                            this.receiveBuffer.includes("\n")
                        ) {

                            const lines =
                                this.receiveBuffer
                                    .split(/\r?\n/);

                            this.receiveBuffer =
                                lines.pop() || "";

                            for (const line of lines) {

                                const decoded =
                                    P.decode(
                                        line
                                    );

                                for (
                                    const packet
                                    of decoded
                                ) {

                                    this.emit({
                                        type: "MESSAGE",
                                        packet
                                    });
                                }
                            }
                        }
                    }

                } catch (error) {

                    if (this.connected) {

                        this.emit({
                            type: "ERROR",
                            error
                        });
                    }

                } finally {

                    try {
                        this.reader.releaseLock();
                    } catch (_) {}

                    this.reader = null;
                }
            }
        }

        async send(message) {

            if (!this.connected || !this.port) {

                throw new Error(
                    "ESP32 belum terhubung."
                );
            }

            if (!this.port.writable) {

                throw new Error(
                    "Serial port tidak writable."
                );
            }

            if (!this.writer) {

                this.writer =
                    this.port.writable.getWriter();
            }

            const data =
                P.encode(message);

            await this.writer.write(
                this.encoder.encode(data)
            );

            this.emit({
                type: "TX",
                packet: message
            });

            return true;
        }
    }

    window.ESP32Connection =
        new ESP32Connection();

})();
