"use strict";

/* =========================================================
   NAVIGASI TIGA TAB (EQUALIZER, ECHO, DIGITAL MIXER)
========================================================= */
const tabEqBtn = document.getElementById("tabEqBtn");
const tabEchoBtn = document.getElementById("tabEchoBtn");
const tabMixerBtn = document.getElementById("tabMixerBtn");
const tabEqContent = document.getElementById("tabEqContent");
const tabEchoContent = document.getElementById("tabEchoContent");
const tabMixerContent = document.getElementById("tabMixerContent");

tabEqBtn.addEventListener("click", () => {
  tabEqBtn.classList.add("active");
  tabEchoBtn.classList.remove("active");
  tabMixerBtn.classList.remove("active");
  tabEqContent.classList.add("active");
  tabEchoContent.classList.remove("active");
  tabMixerContent.classList.remove("active");
});

tabEchoBtn.addEventListener("click", () => {
  tabEchoBtn.classList.add("active");
  tabEqBtn.classList.remove("active");
  tabMixerBtn.classList.remove("active");
  tabEchoContent.classList.add("active");
  tabEqContent.classList.remove("active");
  tabMixerContent.classList.remove("active");
});

tabMixerBtn.addEventListener("click", () => {
  tabMixerBtn.classList.add("active");
  tabEqBtn.classList.remove("active");
  tabEchoBtn.classList.remove("active");
  tabMixerContent.classList.add("active");
  tabEqContent.classList.remove("active");
  tabEchoContent.classList.remove("active");
});

/* =========================================================
   WEB BLUETOOTH API KE ESP32
========================================================= */
let bleDevice = null;
let bleServer = null;
let eqCharacteristic = null;

const ESP32_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const ESP32_CHAR_UUID    = "abcdef01-2345-6789-0123-456789abcdef";

const connectBtButton = document.getElementById("connectBtButton");
const btStatus = document.getElementById("btStatus");

connectBtButton.addEventListener("click", async () => {
  if (!navigator.bluetooth) {
    alert("Web Bluetooth API tidak didukung browser ini.");
    return;
  }
  try {
    if (!bleDevice || !bleDevice.gatt.connected) {
      btStatus.textContent = "Memindai perangkat ESP32...";
      bleDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [ESP32_SERVICE_UUID]
      });
      bleDevice.addEventListener('gattserverdisconnected', onBleDisconnected);
      bleServer = await bleDevice.gatt.connect();
      const service = await bleServer.getPrimaryService(ESP32_SERVICE_UUID);
      eqCharacteristic = await service.getCharacteristic(ESP32_CHAR_UUID);

      connectBtButton.textContent = "PUTUSKAN ESP32";
      connectBtButton.classList.add("connected");
      btStatus.textContent = "Terhubung ke: " + (bleDevice.name || "ESP32 Device");
      setStatus("Bluetooth ESP32 terhubung.");
    } else {
      if (bleDevice.gatt.connected) bleDevice.gatt.disconnect();
      onBleDisconnected();
    }
  } catch (error) {
    btStatus.textContent = "Koneksi gagal / dibatalkan.";
    setStatus("Gagal menghubungkan Bluetooth.");
  }
});

function onBleDisconnected() {
  connectBtButton.textContent = "SAMBUNGKAN ESP32";
  connectBtButton.classList.remove("connected");
  btStatus.textContent = "Bluetooth terputus.";
  eqCharacteristic = null;
  bleServer = null;
  setStatus("Koneksi Bluetooth ESP32 terputus.");
}

async function sendDataToESP32(dataString) {
  if (eqCharacteristic && bleDevice && bleDevice.gatt.connected) {
    try {
      const encoder = new TextEncoder();
      await eqCharacteristic.writeValue(encoder.encode(dataString));
    } catch (err) {
      console.error("Gagal kirim data BLE:", err);
    }
  }
}

/* =========================================================
   DATA FREKUENSI & EQUALIZER
========================================================= */
const frequencies = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250,
  1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000,
  10000, 12500, 16000, 20000
];

const channels = [...document.querySelectorAll(".channel")];

function setStatus(msg) { const el = document.getElementById("status"); if (el) el.textContent = "Status: " + msg; }
function setAudioStatus(msg) { const el = document.getElementById("audioStatus"); if (el) el.textContent = msg; }
function formatFrequency(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }

function createBands(channel) {
  const eq = channel.querySelector(".eq");
  if (!eq || eq.children.length > 0) return;

  frequencies.forEach((frequency, index) => {
    const band = document.createElement("div");
    band.className = "band";

    const frequencyLabel = document.createElement("div");
    frequencyLabel.className = "band-frequency";
    frequencyLabel.textContent = formatFrequency(frequency) + " Hz";

    const trackContainer = document.createElement("div");
    trackContainer.className = "slider-track-container";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-15";
    slider.max = "15";
    slider.step = "0.5";
    slider.value = "0";

    const value = document.createElement("div");
    value.className = "band-value";
    value.textContent = "0.0";

    slider.addEventListener("input", () => {
      value.textContent = Number(slider.value).toFixed(1);
      syncAudioControlsFromUI();
      sendDataToESP32(JSON.stringify({ type: "eq", band: index, val: slider.value }));
    });

    band.addEventListener("click", (e) => {
      if (e.target === slider) return;
      const rect = band.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      
      const trackTop = 15;
      const trackBottom = band.clientHeight - 35;
      
      if (clickY < trackTop || clickY > trackBottom) return;

      const trackHeight = trackBottom - trackTop;
      const ratio = Math.max(0, Math.min(1, (clickY - trackTop) / trackHeight));
      
      const currentVal = parseFloat(slider.value);
      const step = 0.5;
      const clickedVal = 15 - (ratio * 30);

      let newVal = currentVal;
      if (clickedVal > currentVal) {
        newVal = Math.min(15, currentVal + step);
      } else {
        newVal = Math.max(-15, currentVal - step);
      }

      slider.value = String(newVal);
      value.textContent = Number(newVal).toFixed(1);
      syncAudioControlsFromUI();
      sendDataToESP32(JSON.stringify({ type: "eq", band: index, val: slider.value }));
    });

    trackContainer.appendChild(slider);
    band.append(frequencyLabel, trackContainer, value);
    eq.appendChild(band);
  });
}

/* =========================================================
   AUDIO ENGINE & ECHO WEB AUDIO API ROUTING
========================================================= */
let audioContext = null, microphoneStream = null, activeSource = null, microphoneSource = null, audioElementSource = null;
let splitterNode = null, mergerNode = null, masterGainNode = null, outputMuteGainNode = null;
let delayNode = null, feedbackGainNode = null, filterNode = null, echoWetNode = null, echoDryNode = null;

let isEchoEnabled = false;
let selectedInputDeviceId = "", audioGraphReady = false, selectedAudioUrl = null, meterAnimationId = null, outputMuted = false;

const audioChannels = [
  { inputGain: null, highPass: null, filters: [], analyser: null, bypass: false },
  { inputGain: null, highPass: null, filters: [], analyser: null, bypass: false }
];

const audioFile = document.getElementById("audioFile");
const audioPlayer = document.getElementById("audioPlayer");
const inputDeviceSelect = document.getElementById("inputDeviceSelect");
const refreshInputDevicesButton = document.getElementById("refreshInputDevicesButton");
const inputDeviceStatus = document.getElementById("inputDeviceStatus");
const startMicButton = document.getElementById("startMicButton");
const startAudioButton = document.getElementById("startAudioButton");
const stopAudioButton = document.getElementById("stopAudioButton");
const masterGainControl = document.getElementById("masterGainControl");
const masterGainValue = document.getElementById("masterGainValue");
const outputMode = document.getElementById("outputMode");
const muteOutputButton = document.getElementById("muteOutputButton");

const echoDelay = document.getElementById("echoDelay");
const echoFeedback = document.getElementById("echoFeedback");
const echoDamping = document.getElementById("echoDamping");
const echoMix = document.getElementById("echoMix");
const echoToggleBtn = document.getElementById("echoToggleBtn");

function createAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function dbToGain(db) { return Math.pow(10, db / 20); }
function getMasterGainDb() { return Number(masterGainControl.value); }
function getSafeMasterGainDb() {
  const req = getMasterGainDb();
  return outputMode.value === "safe" ? Math.min(req, -6) : req;
}

function updateMasterGain() {
  const appliedDb = getSafeMasterGainDb();
  masterGainValue.textContent = appliedDb.toFixed(0) + " dB";
  if (masterGainNode && audioContext) {
    masterGainNode.gain.setTargetAtTime(dbToGain(appliedDb), audioContext.currentTime, 0.01);
  }
}

function updateOutputMute() {
  if (outputMuteGainNode && audioContext) {
    outputMuteGainNode.gain.setTargetAtTime(outputMuted ? 0 : 1, audioContext.currentTime, 0.01);
  }
  muteOutputButton.textContent = outputMuted ? "UNMUTE OUTPUT" : "MUTE OUTPUT";
  muteOutputButton.classList.toggle("active", outputMuted);
}

async function refreshInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputDevices = devices.filter(d => d.kind === "audioinput");
    inputDeviceSelect.innerHTML = '<option value="">Default microphone</option>';
    inputDevices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || "Audio input " + (index + 1);
      inputDeviceSelect.appendChild(option);
    });
    inputDeviceStatus.textContent = inputDevices.length + " perangkat input ditemukan.";
  } catch (error) {
    inputDeviceStatus.textContent = "Gagal membaca perangkat.";
  }
}

inputDeviceSelect.addEventListener("change", e => { selectedInputDeviceId = e.target.value; });
refreshInputDevicesButton.addEventListener("click", refreshInputDevices);

function buildEqualizerChannel(channelIndex) {
  const channel = channels[channelIndex];
  const gainControl = channel.querySelector(".gain");
  const hpfControl = channel.querySelector(".hpf");
  const bandControls = [...channel.querySelectorAll(".band input[type='range']")];

  const inputGain = audioContext.createGain();
  const highPass = audioContext.createBiquadFilter();
  const analyser = audioContext.createAnalyser();

  inputGain.gain.value = dbToGain(Number(gainControl.value));
  highPass.type = "highpass";
  highPass.frequency.value = hpfControl.value === "off" ? 20 : Number(hpfControl.value);
  highPass.Q.value = 0.707;
  analyser.fftSize = 1024;

  inputGain.connect(highPass);
  let previousNode = highPass;
  const filters = [];

  bandControls.forEach((control, index) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = "peaking";
    filter.frequency.value = frequencies[index];
    filter.Q.value = 1.4;
    filter.gain.value = Number(control.value);
    previousNode.connect(filter);
    previousNode = filter;
    filters.push(filter);
  });

  previousNode.connect(analyser);
  audioChannels[channelIndex] = { inputGain, highPass, filters, analyser, bypass: false };

  gainControl.addEventListener("input", () => {
    inputGain.gain.setTargetAtTime(dbToGain(Number(gainControl.value)), audioContext.currentTime, 0.01);
  });
  hpfControl.addEventListener("change", () => {
    highPass.frequency.setTargetAtTime(hpfControl.value === "off" ? 20 : Number(hpfControl.value), audioContext.currentTime, 0.01);
  });
  bandControls.forEach((control, index) => {
    control.addEventListener("input", () => {
      if (audioChannels[channelIndex].bypass) return;
      filters[index].gain.setTargetAtTime(Number(control.value), audioContext.currentTime, 0.01);
    });
  });

  return audioChannels[channelIndex];
}

function initializeAudioGraph() {
  createAudioContext();
  if (audioGraphReady) { updateMasterGain(); updateOutputMute(); return; }

  buildEqualizerChannel(0);
  buildEqualizerChannel(1);

  splitterNode = audioContext.createChannelSplitter(2);
  mergerNode = audioContext.createChannelMerger(2);
  masterGainNode = audioContext.createGain();
  outputMuteGainNode = audioContext.createGain();

  delayNode = audioContext.createDelay(2.0);
  delayNode.delayTime.value = Number(echoDelay.value);

  feedbackGainNode = audioContext.createGain();
  feedbackGainNode.gain.value = Number(echoFeedback.value);

  filterNode = audioContext.createBiquadFilter();
  filterNode.type = "lowpass";
  filterNode.frequency.value = Number(echoDamping.value);

  echoWetNode = audioContext.createGain();
  echoWetNode.gain.value = Number(echoMix.value);

  echoDryNode = audioContext.createGain();
  echoDryNode.gain.value = 1.0 - Number(echoMix.value);

  delayNode.connect(filterNode);
  filterNode.connect(feedbackGainNode);
  feedbackGainNode.connect(delayNode);

  masterGainNode.gain.value = dbToGain(getSafeMasterGainDb());
  outputMuteGainNode.gain.value = outputMuted ? 0 : 1;

  rebuildAudioRouting();
  outputMuteGainNode.connect(audioContext.destination);

  audioGraphReady = true;
  updateMasterGain();
  updateOutputMute();
  startRealMeters();
}

function rebuildAudioRouting() {
  if (!audioGraphReady) return;

  try { mergerNode.disconnect(); } catch (e) {}
  try { delayNode.disconnect(echoWetNode); } catch (e) {}
  try { mergerNode.disconnect(echoDryNode); } catch (e) {}
  try { echoWetNode.disconnect(masterGainNode); } catch (e) {}
  try { echoDryNode.disconnect(masterGainNode); } catch (e) {}

  if (isEchoEnabled) {
    mergerNode.connect(echoDryNode);
    echoDryNode.connect(masterGainNode);

    mergerNode.connect(delayNode);
    delayNode.connect(echoWetNode);
    echoWetNode.connect(masterGainNode);
  } else {
    mergerNode.connect(masterGainNode);
  }
}

echoToggleBtn.addEventListener("click", () => {
  isEchoEnabled = !isEchoEnabled;
  if (isEchoEnabled) {
    echoToggleBtn.textContent = "ECHO: ON";
    echoToggleBtn.classList.add("active");
    setStatus("Efek Echo diaktifkan.");
  } else {
    echoToggleBtn.textContent = "ECHO: OFF";
    echoToggleBtn.classList.remove("active");
    setStatus("Efek Echo dimatikan.");
  }
  rebuildAudioRouting();
  sendDataToESP32(JSON.stringify({ type: "echo_status", state: isEchoEnabled ? "ON" : "OFF" }));
});

echoDelay.addEventListener("input", () => {
  document.getElementById("echoDelayVal").textContent = Number(echoDelay.value).toFixed(2) + " detik";
  if (delayNode && audioContext) delayNode.delayTime.setTargetAtTime(Number(echoDelay.value), audioContext.currentTime, 0.01);
  sendDataToESP32(JSON.stringify({ type: "echo", param: "delay", val: echoDelay.value }));
});

echoFeedback.addEventListener("input", () => {
  document.getElementById("echoFeedbackVal").textContent = Math.round(echoFeedback.value * 100) + "%";
  if (feedbackGainNode && audioContext) feedbackGainNode.gain.setTargetAtTime(Number(echoFeedback.value), audioContext.currentTime, 0.01);
  sendDataToESP32(JSON.stringify({ type: "echo", param: "feedback", val: echoFeedback.value }));
});

echoDamping.addEventListener("input", () => {
  document.getElementById("echoDampingVal").textContent = echoDamping.value + " Hz";
  if (filterNode && audioContext) filterNode.frequency.setTargetAtTime(Number(echoDamping.value), audioContext.currentTime, 0.01);
});

echoMix.addEventListener("input", () => {
  document.getElementById("echoMixVal").textContent = Math.round(echoMix.value * 100) + "%";
  if (echoWetNode && echoDryNode && audioContext) {
    echoWetNode.gain.setTargetAtTime(Number(echoMix.value), audioContext.currentTime, 0.01);
    echoDryNode.gain.setTargetAtTime(1.0 - Number(echoMix.value), audioContext.currentTime, 0.01);
  }
});

function disconnectCurrentSource() {
  if (activeSource) { try { activeSource.disconnect(); } catch (e) {} activeSource = null; }
  if (splitterNode) { try { splitterNode.disconnect(); } catch (e) {} }
  if (microphoneStream) { microphoneStream.getTracks().forEach(t => t.stop()); microphoneStream = null; }
  microphoneSource = null;
}

function connectAudioSource(source, sourceType) {
  initializeAudioGraph();
  if (activeSource && activeSource !== source) { try { activeSource.disconnect(); } catch (e) {} }
  activeSource = source;
  try { source.disconnect(); } catch (e) {}

  try {
    source.connect(audioChannels[0].inputGain);
    source.connect(audioChannels[1].inputGain);
  } catch (err) {
    source.connect(splitterNode);
    splitterNode.connect(audioChannels[0].inputGain, 0);
    splitterNode.connect(audioChannels[1].inputGain, 0);
  }
  setAudioStatus(sourceType + " aktif melewati EQ & Echo.");
}

audioFile.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  createAudioContext();
  initializeAudioGraph();
  if (!audioElementSource) audioElementSource = audioContext.createMediaElementSource(audioPlayer);
  if (selectedAudioUrl) URL.revokeObjectURL(selectedAudioUrl);
  selectedAudioUrl = URL.createObjectURL(file);
  audioPlayer.src = selectedAudioUrl;
  audioPlayer.load();
  connectAudioSource(audioElementSource, "File audio");
  setAudioStatus("File audio siap.");
});

startAudioButton.addEventListener("click", async () => {
  if (!audioPlayer.src) { setAudioStatus("Pilih file audio dulu."); return; }
  try {
    createAudioContext();
    initializeAudioGraph();
    if (!audioElementSource) audioElementSource = audioContext.createMediaElementSource(audioPlayer);
    disconnectCurrentSource();
    connectAudioSource(audioElementSource, "File audio");
    await audioPlayer.play();
    startAudioButton.classList.add("active");
    setAudioStatus("File audio diputar.");
  } catch (err) { setAudioStatus("Gagal memutar."); }
});

startMicButton.addEventListener("click", async () => {
  try {
    createAudioContext();
    initializeAudioGraph();
    disconnectCurrentSource();
    const constraints = { audio: { channelCount: 1, echoCancellation: false } };
    if (selectedInputDeviceId) constraints.audio.deviceId = { exact: selectedInputDeviceId };
    microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
    microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
    connectAudioSource(microphoneSource, "Mikrofon");
    setAudioStatus("Mikrofon aktif.");
  } catch (err) { setAudioStatus("Gagal mengakses mikrofon."); }
});

stopAudioButton.addEventListener("click", () => {
  if (audioPlayer) { audioPlayer.pause(); audioPlayer.currentTime = 0; }
  disconnectCurrentSource();
  startAudioButton.classList.remove("active");
  setAudioStatus("Audio dihentikan.");
});

function startRealMeters() {
  if (meterAnimationId) return;
  const meterBuffers = [new Uint8Array(1024), new Uint8Array(1024)];
  
  function updateRealMeters() {
    meterAnimationId = requestAnimationFrame(updateRealMeters);
    
    audioChannels.forEach((audioChannel, index) => {
      const channel = channels[index];
      if (!audioChannel.analyser) return;

      const meter = channel.querySelector(".meter");
      const clip = channel.querySelector(".clip");
      const buffer = meterBuffers[index];

      audioChannel.analyser.getByteTimeDomainData(buffer);

      let sum = 0;
      let peak = 0;

      for (let i = 0; i < buffer.length; i++) {
        const sample = (buffer[i] - 128) / 128;
        sum += sample * sample;
        if (Math.abs(sample) > peak) {
          peak = Math.abs(sample);
        }
      }

      const rms = Math.sqrt(sum / buffer.length);

      if (rms < 0.002) {
        meter.innerHTML = "";
        for (let s = 0; s < 12; s++) {
          const seg = document.createElement("span");
          if (s >= 9) seg.classList.add("red");
          else if (s >= 7) seg.classList.add("yellow");
          else seg.classList.add("green");
          meter.appendChild(seg);
        }
        clip.classList.remove("on");
        return;
      }

      const db = 20 * Math.log10(rms);
      const level = Math.max(0, Math.min(12, Math.round(((db + 60) / 60) * 12)));

      meter.innerHTML = "";
      for (let segmentIndex = 0; segmentIndex < 12; segmentIndex++) {
        const segment = document.createElement("span");
        if (segmentIndex >= 9) segment.classList.add("red");
        else if (segmentIndex >= 7) segment.classList.add("yellow");
        else segment.classList.add("green");

        if (segmentIndex < level) segment.classList.add("on");
        meter.appendChild(segment);
      }

      clip.classList.toggle("on", peak >= 0.98);
    });
  }
  updateRealMeters();
}

function syncAudioControlsFromUI() {
  if (!audioGraphReady || !audioContext) return;
  channels.forEach((channel, index) => {
    const ac = audioChannels[index];
    if (!ac.inputGain) return;
    const gainCtrl = channel.querySelector(".gain");
    const hpfCtrl = channel.querySelector(".hpf");
    const bypassBtn = channel.querySelector(".bypass-button");
    const bands = [...channel.querySelectorAll(".band input[type='range']")];

    ac.inputGain.gain.setTargetAtTime(dbToGain(Number(gainCtrl.value)), audioContext.currentTime, 0.01);
    ac.highPass.frequency.setTargetAtTime(hpfCtrl.value === "off" ? 20 : Number(hpfCtrl.value), audioContext.currentTime, 0.01);
    ac.bypass = bypassBtn.classList.contains("active");

    ac.filters.forEach((filter, bIdx) => {
      if (bands[bIdx]) {
        filter.gain.setTargetAtTime(ac.bypass ? 0 : Number(bands[bIdx].value), audioContext.currentTime, 0.01);
      }
    });
  });
}

function updateValues(channel) {
  const gain = channel.querySelector(".gain");
  const gainVal = channel.querySelector(".gain-value");
  if (gain && gainVal) gainVal.textContent = Number(gain.value).toFixed(1) + " dB";
  channel.querySelectorAll(".band").forEach(b => {
    const s = b.querySelector("input");
    const v = b.querySelector(".band-value");
    if (s && v) v.textContent = Number(s.value).toFixed(1);
  });
  syncAudioControlsFromUI();
}

function setRange(channel, range) {
  const max = Number(range);
  channel.querySelectorAll(".band input").forEach(s => {
    s.min = String(-max); s.max = String(max);
    if (Number(s.value) > max) s.value = String(max);
    if (Number(s.value) < -max) s.value = String(-max);
  });
  channel.querySelector(".scale").innerHTML = `<span>+${max} dB</span><span>0 dB</span><span>-${max} dB</span>`;
  updateValues(channel);
}

function setPreset(type) {
  channels.forEach(channel => {
    channel.querySelector(".gain").value = "0";
    channel.querySelectorAll(".band input").forEach((slider, index) => {
      let val = 0;
      if (type === "vocal") {
        if (index >= 13 && index <= 21) val = 3;
        if (index <= 5) val = -2;
        if (index >= 25) val = 2;
      } else if (type === "music") {
        if (index <= 5) val = 4;
        if (index >= 23) val = 3;
        if (index >= 12 && index <= 18) val = -1;
      }
      slider.value = String(val);
      const valDisplay = slider.closest(".band").querySelector(".band-value");
      if (valDisplay) valDisplay.textContent = Number(slider.value).toFixed(1);
    });
    updateValues(channel);
  });
  setStatus(`Preset ${type.toUpperCase()} diterapkan.`);
}

channels.forEach((channel, idx) => {
  createBands(channel);
  channel.querySelector(".gain").addEventListener("input", () => updateValues(channel));
  channel.querySelector(".range").addEventListener("change", e => setRange(channel, e.target.value));

  const bypassBtn = channel.querySelector(".bypass-button");
  const testBtn = channel.querySelector(".test-button");
  const activeLed = document.getElementById(`ch${idx}_active_led`);

  bypassBtn.addEventListener("click", () => {
    bypassBtn.classList.toggle("active");
    const bypassed = bypassBtn.classList.contains("active");
    channel.querySelectorAll(".gain, .hpf, .range, .band input").forEach(c => c.disabled = bypassed);
    syncAudioControlsFromUI();
    if (bypassed) activeLed.classList.remove("active-led");
    else activeLed.classList.add("active-led");
    setStatus(bypassed ? "Bypass aktif." : "Bypass nonaktif.");
  });

  testBtn.addEventListener("click", () => {
    testBtn.classList.toggle("active");
    const testing = testBtn.classList.contains("active");
    channel.querySelector(".gain").value = testing ? "6" : "0";
    channel.querySelectorAll(".band input").forEach(s => {
      s.value = testing ? "2" : "0";
      const valDisplay = s.closest(".band").querySelector(".band-value");
      if (valDisplay) valDisplay.textContent = Number(s.value).toFixed(1);
    });
    updateValues(channel);
  });
  updateValues(channel);
});

document.getElementById("flatButton").addEventListener("click", () => setPreset("flat"));
document.getElementById("vocalButton").addEventListener("click", () => setPreset("vocal"));
document.getElementById("musicButton").addEventListener("click", () => setPreset("music"));

document.getElementById("saveButton").addEventListener("click", () => {
  const data = channels.map(c => ({
    gain: c.querySelector(".gain").value,
    hpf: c.querySelector(".hpf").value,
    range: c.querySelector(".range").value,
    bypass: c.querySelector(".bypass-button").classList.contains("active"),
    bands: [...c.querySelectorAll(".band input")].map(s => s.value)
  }));
  localStorage.setItem("equalizer-settings", JSON.stringify(data));
  setStatus("Setting tersimpan.");
});

document.getElementById("loadButton").addEventListener("click", () => {
  const saved = localStorage.getItem("equalizer-settings");
  if (!saved) { setStatus("Tidak ada setting tersimpan."); return; }
  try {
    const data = JSON.parse(saved);
    channels.forEach((channel, index) => {
      const item = data[index];
      if (!item) return;
      channel.querySelector(".gain").value = item.gain ?? "0";
      channel.querySelector(".hpf").value = item.hpf ?? "off";
      channel.querySelector(".range").value = item.range ?? "15";
      setRange(channel, item.range ?? "15");
      channel.querySelectorAll(".band input").forEach((s, bIdx) => {
        s.value = item.bands?.[bIdx] ?? "0";
        const valDisplay = s.closest(".band").querySelector(".band-value");
        if (valDisplay) valDisplay.textContent = Number(s.value).toFixed(1);
      });
      updateValues(channel);
    });
    setStatus("Setting dipanggil kembali.");
  } catch (err) { setStatus("Gagal memuat setting."); }
});

document.getElementById("resetButton").addEventListener("click", () => {
  channels.forEach((channel, idx) => {
    channel.querySelector(".gain").value = "0";
    channel.querySelector(".hpf").value = "off";
    channel.querySelector(".range").value = "15";
    setRange(channel, "15");
    channel.querySelectorAll(".band input").forEach(s => {
      s.value = "0";
      const valDisplay = s.closest(".band").querySelector(".band-value");
      if (valDisplay) valDisplay.textContent = "0.0";
    });
    channel.querySelector(".bypass-button").classList.remove("active");
    document.getElementById(`ch${idx}_active_led`).classList.add("active-led");
    updateValues(channel);
  });
  setStatus("Reset ke pengaturan awal.");
});

masterGainControl.addEventListener("input", updateMasterGain);
outputMode.addEventListener("change", updateMasterGain);
muteOutputButton.addEventListener("click", () => { outputMuted = !outputMuted; updateOutputMute(); });

/* Interaksi Tombol Mute & Solo pada Digital Mixer */
document.querySelectorAll(".console-action-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
  });
});

/* Logika Tombol Section Select (CONFIG, GATE, DYNAMICS, EQ, SENDS, MAIN) */
const consoleBtns = document.querySelectorAll(".mixer-control-section .console-btn");
const tftSectionTitle = document.getElementById("tftSectionTitle");
const tftContentArea = document.getElementById("tftContentArea");

const sectionData = {
  config: {
    title: "CONFIG / PREAMP INTERFACE",
    content: "<div><b>Preamp Gain:</b> +12.0 dB | <b>Phantom (+48V):</b> ON | <b>Phase:</b> Normal</div><div style='margin-top: 6px; color: #94a3b8;'>Atur parameter input gain dan sumber sinyal kanal aktif.</div>"
  },
  gate: {
    title: "NOISE GATE / EXPANDER PROCESSOR",
    content: "<div><b>Threshold:</b> -45 dB | <b>Ratio:</b> 1:2.5 | <b>Attack:</b> 5ms | <b>Hold:</b> 20ms</div><div style='margin-top: 6px; color: #94a3b8;'>Meredam kebisingan latar belakang saat sinyal input kecil.</div>"
  },
  dynamics: {
    title: "DYNAMICS / COMPRESSOR PROCESSOR",
    content: "<div><b>Threshold:</b> -18 dB | <b>Ratio:</b> 3:1 | <b>Attack:</b> 15ms | <b>Release:</b> 300ms</div><div style='margin-top: 6px; color: #94a3b8;'>Mengontrol rentang dinamis agar suara vokal/musik lebih stabil.</div>"
  },
  eq: {
    title: "CHANNEL PARAMETRIC EQUALIZER",
    content: "<div><b>Low Cut (HPF):</b> 80Hz | <b>Band 1 (Low):</b> 100Hz (+2dB) | <b>Band 2 (Mid):</b> 2.5kHz (-3dB) | <b>Band 3 (High):</b> 10kHz (+4dB)</div><div style='margin-top: 6px; color: #94a3b8;'>Pemrosesan filter frekuensi parametrik 4-band pada kanal terpilih.</div>"
  },
  sends: {
    title: "BUS SENDS & FX ROUTING",
    content: "<div><b>Bus 1 (Echo Send):</b> -6.0 dB | <b>Bus 2 (Reverb Send):</b> -12.0 dB | <b>Tap:</b> Post-Fader</div><div style='margin-top: 6px; color: #94a3b8;'>Pengaturan pengiriman sinyal (aux/effects send) ke prosesor eksternal.</div>"
  },
  main: {
    title: "MAIN FOH OUTPUT & MATRIX",
    content: "<div><b>Main L/R:</b> Active | <b>Matrix 1/2:</b> Feed Live | <b>Master Limiter:</b> -0.5 dB</div><div style='margin-top: 6px; color: #94a3b8;'>Pengaturan keluaran utama (Main Bus) menuju sound system lapangan.</div>"
  }
};

consoleBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    consoleBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const sectionKey = btn.textContent.toLowerCase().trim();
    if (sectionData[sectionKey] && tftSectionTitle && tftContentArea) {
      tftSectionTitle.textContent = sectionData[sectionKey].title;
      tftContentArea.innerHTML = sectionData[sectionKey].content;
    }
  });
});

refreshInputDevices();

// Simulasi LED Meter Vertikal Mixer Bergerak
setInterval(() => {
  const meters = [
    document.querySelectorAll("#mixerMeter1 span"),
    document.querySelectorAll("#mixerMeter2 span"),
    document.querySelectorAll("#mixerMeter3 span"),
    document.querySelectorAll("#mixerMeter4 span"),
    document.querySelectorAll("#mixerMeterMaster span")
  ];
  meters.forEach(meterSpans => {
    if (!meterSpans) return;
    const activeCount = Math.floor(Math.random() * 8) + 2;
    meterSpans.forEach((span, idx) => {
      if (idx >= (10 - activeCount)) span.classList.add("on");
      else span.classList.remove("on");
    });
  });
}, 180);
