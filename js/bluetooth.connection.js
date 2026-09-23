/* =========================================================
   BLUETOOTH CONNECTION
   Web Bluetooth GATT

   Catatan:
   Bluetooth audio A2DP tidak otomatis menjadi kontrol mixer.
   Mixer harus menyediakan GATT service/characteristic yang
   dapat digunakan sebagai kontrol.
========================================================= */

(function () {
    "use strict";

    const P = window.MixerProtocol;

    class BluetoothConnection {

        constructor() {

            this.device = null;
            this.server = null;

            this.service = null;
            this.txCharacteristic = null;
            this.rxCharacteristic = null;

            this.connected = false;

            this.listeners = new Set();

            this.serviceUUID = null;
            this.txUUID = null;
            this.rxUUID = null;

            this.decoder = new TextDecoder();
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

            for (const callback of this.listeners) {

                try {
                    callback(event);
                } catch (error) {
                    console.error(
                        "[BLUETOOTH]",
                        error
                    );
                }
            }
        }

        isSupported() {

            return (
                "bluetooth" in navigator
            );
        }

        configure(options = {}) {

            this.serviceUUID =
                options.serviceUUID ||
                this.serviceUUID;

            this.txUUID =
                options.txUUID ||
                this.txUUID;

            this.rxUUID =
                options.rxUUID ||
                this.rxUUID;
        }

        async scan() {

            if (!this.isSupported()) {

                throw new Error(
                    "Web Bluetooth tidak didukung browser ini."
                );
            }

            /*
             * serviceUUID sebaiknya diberikan jika
             * mixer mempunyai GATT service tertentu.
             */

            const options = {};

            if (this.serviceUUID) {

                options.filters = [
                    {
                        services: [
                            this.serviceUUID
                        ]
                    }
                ];

            } else {

                /*
                 * acceptAllDevices diperlukan bila UUID
                 * belum diketahui.
                 */

                options.acceptAllDevices = true;

                options.optionalServices = [];
            }

            this.device =
                await navigator.bluetooth.requestDevice(
                    options
                );

            if (!this.device) {
                throw new Error(
                    "Tidak ada perangkat dipilih."
                );
            }

            this.device.addEventListener(
                "gattserverdisconnected",
                () => {
                    this.connected = false;

                    this.emit({
                        type: "DISCONNECTED"
                    });
                }
            );

            this.emit({
                type: "DEVICE_SELECTED",
                device: this.device
            });

            return this.device;
        }

        async connect() {

            if (!this.device) {

                await this.scan();
            }

            if (!this.device.gatt) {

                throw new Error(
                    "Perangkat tidak memiliki GATT."
                );
            }

            this.server =
                await this.device.gatt.connect();

            this.connected = true;

            /*
             * Kalau UUID sudah dikonfigurasi,
             * kita cari service/characteristic.
             */

            if (
                this.serviceUUID
            ) {

                this.service =
                    await this.server.getPrimaryService(
                        this.serviceUUID
                    );

                if (this.txUUID) {

                    this.txCharacteristic =
                        await this.service.getCharacteristic(
                            this.txUUID
                        );
                }

                if (this.rxUUID) {

                    this.rxCharacteristic =
                        await this.service.getCharacteristic(
                            this.rxUUID
                        );

                    await this.rxCharacteristic.startNotifications();

                    this.rxCharacteristic.addEventListener(
                        "characteristicvaluechanged",
                        event => {
                            this.handleNotification(
                                event
                            );
                        }
                    );
                }
            }

            this.emit({
                type: "CONNECTED",
                device: this.device
            });

            return true;
        }

        async disconnect() {

            try {

                if (
                    this.device &&
                    this.device.gatt &&
                    this.device.gatt.connected
                ) {
                    this.device.gatt.disconnect();
                }

            } catch (_) {}

            this.connected = false;

            this.server = null;
            this.service = null;

            this.txCharacteristic = null;
            this.rxCharacteristic = null;

            this.emit({
                type: "DISCONNECTED"
            });
        }

        async send(message) {

            if (!this.connected) {

                throw new Error(
                    "Bluetooth belum terhubung."
                );
            }

            if (!this.txCharacteristic) {

                throw new Error(
                    "TX characteristic belum dikonfigurasi."
                );
            }

            const data =
                new TextEncoder().encode(
                    P.encode(message)
                );

            if (
                this.txCharacteristic
                    .writeValueWithoutResponse
            ) {

                await this.txCharacteristic
                    .writeValueWithoutResponse(
                        data
                    );

            } else {

                await this.txCharacteristic
                    .writeValue(
                        data
                    );
            }

            this.emit({
                type: "TX",
                packet: message
            });
        }

        handleNotification(event) {

            const value =
                event.target.value;

            const text =
                this.decoder.decode(
                    value
                );

            const packets =
                P.decode(text);

            for (const packet of packets) {

                this.emit({
                    type: "MESSAGE",
                    packet
                });
            }
        }
    }

    window.BluetoothConnection =
        new BluetoothConnection();

})();
