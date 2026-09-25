<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#111827">
  <meta name="description" content="GQX-3102 Equalizer, Alesis FX & Digital Mixer Console + ESP32 BLE">
  <link rel="manifest" href="manifest.json">

  <title>GQX-3102 Equalizer & Digital Mixer Online</title>
  <style>
/* =========================================================
   RESET & STYLING DASAR
========================================================= */
* { box-sizing: border-box; }
html, body { width: 100%; min-height: 100%; margin: 0; padding: 0; overflow-x: hidden; }
body { font-family: Arial, Helvetica, sans-serif; background: #0c0f15; color: #ffffff; -webkit-text-size-adjust: 100%; }
button, input, select { font: inherit; -webkit-tap-highlight-color: transparent; cursor: pointer; }

.app { width: 100%; max-width: 100%; margin: 0 auto; padding: 10px; }

header, .topbar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  background: #161a22; padding: 12px 16px; border-radius: 8px; border: 1px solid #3a414b; margin-bottom: 12px;
}
.brand { font-weight: bold; font-size: 16px; color: #00d9ff; }
.subtitle { font-size: 11px; color: #94a3b8; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.actions button {
  background: #252b35; color: #fff; border: 1px solid #485260; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold;
}
.actions button:hover, .actions button.active { background: #00d9ff; color: #000; border-color: #00d9ff; }

/* TIGA TAB NAVIGASI UTAMA */
.mode-switch-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.tab-btn { background: #1a222d; color: #94a3b8; border: 1px solid #3a414b; padding: 10px; border-radius: 6px; font-weight: bold; font-size: 12px; text-align: center; transition: all 0.2s; }
.tab-btn.active { background: #2563eb; color: #fff; border-color: #3b82f6; box-shadow: 0 0 10px rgba(37, 99, 235, 0.4); }
.tab-content { display: none; }
.tab-content.active { display: block; }

/* RACK & CHANNEL */
.rack { background: #14181f; border: 1px solid #3a414b; border-radius: 8px; padding: 12px; }
.rack-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #2a323d; padding-bottom: 8px; }
.model { font-size: 14px; font-weight: bold; color: #f59e0b; }
.grade { font-size: 10px; color: #94a3b8; }
.channels { display: flex; flex-direction: column; gap: 14px; }
.channel { background: #1b2027; border: 1px solid #3a414b; border-radius: 8px; padding: 10px; }
.channel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.channel-title-group { display: flex; align-items: center; gap: 8px; }
.status-led { width: 8px; height: 8px; border-radius: 50%; background: #252b35; border: 1px solid #485260; display: inline-block; }
.status-led.active-led { background: #10b981; border-color: #34d399; box-shadow: 0 0 6px #10b981; }
.channel-title { font-size: 12px; font-weight: bold; color: #38bdf8; }
.control-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; background: #101216; padding: 8px; border-radius: 6px; margin-bottom: 8px; align-items: center; }
.control label { display: block; font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
.control input[type="range"] { width: 100%; accent-color: #f59e0b; }
.gain-value { font-size: 10px; color: #f59e0b; text-align: center; font-family: monospace; }
.control select { width: 100%; background: #1e293b; color: #fff; border: 1px solid #485260; padding: 4px; font-size: 11px; border-radius: 4px; }
.eq-section { width: 100%; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
.eq { display: grid; grid-template-columns: repeat(31, 38px); gap: 4px; min-width: max-content; }
.band { background: #101216; border: 1px solid #2a323d; border-radius: 4px; padding: 4px 2px; display: flex; flex-direction: column; align-items: center; height: 230px; position: relative; }
.band-frequency { font-size: 8px; color: #94a3b8; margin-bottom: 4px; text-align: center; }
.band input[type="range"] { writing-mode: vertical-lr; direction: rtl; width: 16px; height: 165px; accent-color: #38bdf8; cursor: pointer; }
.slider-track-container { position: relative; height: 165px; width: 24px; display: flex; justify-content: center; align-items: center; cursor: pointer; }
.band-value { font-size: 8px; color: #38bdf8; margin-top: 4px; font-family: monospace; text-align: center; }
.scale { display: flex; justify-content: space-between; font-size: 9px; color: #64748b; padding: 2px 4px; }

/* AUDIO & BLUETOOTH PANEL */
.audio-panel { background: #1b2027; border: 1px solid #3a414b; border-radius: 8px; padding: 12px; margin-top: 14px; }
.audio-panel h3 { margin: 0 0 10px 0; font-size: 12px; color: #38bdf8; }
.audio-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.bt-panel { width: 100%; background: #101216; padding: 10px; border-radius: 6px; border: 1px solid #2a323d; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.bt-info { font-size: 10px; color: #94a3b8; }
#connectBtButton { background: #3b82f6; color: white; border: 1px solid #60a5fa; padding: 6px 14px; border-radius: 4px; font-weight: bold; }
#connectBtButton.connected { background: #10b981; border-color: #34d399; }
.audio-actions button, .file-button { background: #252b35; color: #fff; border: 1px solid #485260; padding: 6px 12px; font-size: 11px; border-radius: 4px; font-weight: bold; display: inline-flex; align-items: center; cursor: pointer; }
.audio-actions button:hover, .file-button:hover { background: #334155; }
.audio-actions button.active { background: #10b981; border-color: #34d399; color: #000; }
.playlist-container { width: 100%; background: #101216; border: 1px solid #2a323d; border-radius: 6px; padding: 8px; margin: 8px 0; max-height: 100px; overflow-y: auto; font-size: 10px; color: #94a3b8; }
.playlist-item { display: flex; justify-content: space-between; padding: 3px 6px; border-bottom: 1px solid #1e293b; cursor: pointer; }
.playlist-item:hover { background: #1e293b; color: #fff; }
.playlist-item.playing { color: #38bdf8; font-weight: bold; }
audio { width: 100%; height: 35px; margin: 8px 0; }
.output-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #101216; padding: 8px; border-radius: 6px; margin-top: 8px; }
.output-control label { display: block; font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
.output-control select, .output-control input[type="range"] { width: 100%; background: #1e293b; color: #fff; border: 1px solid #485260; padding: 4px; font-size: 11px; border-radius: 4px; }
.master-value { font-size: 10px; color: #f59e0b; font-family: monospace; text-align: center; }
#muteOutput.active { background: #ef4444 !important; color: #fff !important; }
.device-status, .audio-status, .status { font-size: 10px; color: #94a3b8; margin-top: 4px; }
.footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 15px; }
  </style>
</head>

<body>
  <main class="app">
    <header class="topbar">
      <div>
        <div class="brand">AUDIO PROCESSOR ONLINE</div>
        <div class="subtitle">GQX-3102 Equalizer, Alesis FX & Digital Mixer Console + ESP32 BLE</div>
      </div>
    </header>

    <!-- TIGA TAB NAVIGASI UTAMA -->
    <nav class="mode-switch-bar">
      <button class="tab-btn active" id="tabEqBtn">🎛️ EQUALIZER</button>
      <button class="tab-btn" id="tabEchoBtn">🔊 ALESIS FX</button>
      <button class="tab-btn" id="tabMixerBtn">🎚️ DIGITAL MIXER</button>
    </nav>

    <!-- TAB 1: EQUALIZER -->
    <div class="tab-content active" id="tabEqContent">
      <section class="rack">
        <div class="rack-header">
          <div class="model">GQX-3102 GRAPHIC EQUALIZER</div>
        </div>
        <section class="channels">
          <article class="channel" data-channel="0">
            <div class="channel-title">CHANNEL 1</div>
            <div class="eq-section"><div class="eq"></div></div>
          </article>
        </section>
      </section>
    </div>

    <!-- TAB 2: ALESIS FX -->
    <div class="tab-content" id="tabEchoContent">
      <div class="echo-panel-box">
        <h3>ALESIS DIGITAL EFFECTS PROCESSOR</h3>
      </div>
    </div>

    <!-- TAB 3: DIGITAL MIXER -->
    <div class="tab-content" id="tabMixerContent">
      <div class="mixer-console">
        <h3>DIGITAL MIXER CONSOLE</h3>
      </div>
    </div>

    <!-- PANEL AUDIO & OUTPUT ROUTING -->
    <section class="audio-panel">
      <h3>PENGATURAN OUTPUT & AUDIO PLAYER</h3>

      <div class="bt-panel">
        <div>
          <strong>KONEKSI HARDWARE ESP32</strong>
          <div id="btStatus" class="bt-info">Bluetooth terputus.</div>
        </div>
        <button id="connectBtButton">SAMBUNGKAN ESP32</button>
      </div>

      <div class="audio-actions">
        <div style="width:100%; background:#101216; padding:8px; border-radius:6px; border:1px solid #2a323d; margin-bottom:8px;">
          <label for="outputDeviceSelect">PILIH PERANGKAT OUTPUT SUARA (SPEAKER / HEADSET / BLUETOOTH)</label>
          <select id="outputDeviceSelect" style="display:block; background:#1e293b; color:#fff; border:1px solid #485260; padding:4px; font-size:11px; border-radius:4px; width:100%; margin-top:4px;">
            <option value="">Default Perangkat Sistem (Otomatis)</option>
          </select>
        </div>

        <button id="micButton">MIC INPUT</button>
        <label class="file-button">PILIH BANYAK FILE AUDIO<input id="audioFile" type="file" accept="audio/*" multiple hidden></label>
        <button id="startButton">START PLAYLIST</button>
        <button id="stopButton">STOP AUDIO</button>
      </div>

      <div class="playlist-container" id="playlistContainer">
        <div style="text-align: center; padding: 6px; color: #64748b;">Belum ada file audio dipilih.</div>
      </div>

      <!-- Elemen audio HTML5 terhubung langsung dengan setSinkId & Web Audio API -->
      <audio id="audioPlayer" controls></audio>

      <div class="output-panel">
        <div class="output-control">
          <label for="masterGain">MASTER OUTPUT</label>
          <input id="masterGain" type="range" min="-30" max="0" step="1" value="0">
          <div id="masterValue" class="master-value">0 dB</div>
        </div>
        <div class="output-control">
          <label for="outputMode">KONTROL OUTPUT</label>
          <button id="muteOutput" style="width:100%; background:#252b35; color:#fff; border:1px solid #485260; padding:6px; border-radius:4px; font-weight:bold;">MUTE OUTPUT</button>
        </div>
      </div>

      <div id="readyStatus" class="audio-status">Status Audio: Siap diputar.</div>
    </section>

    <div id="status" class="status">Status: sistem siap digunakan.</div>
  </main>

  <script>
"use strict";

/* =========================================================
   NAVIGASI TIGA TAB UTAMA
========================================================= */
const tabEqBtn = document.getElementById("tabEqBtn");
const tabEchoBtn = document.getElementById("tabEchoBtn");
const tabMixerBtn = document.getElementById("tabMixerBtn");
const tabEqContent = document.getElementById("tabEqContent");
const tabEchoContent = document.getElementById("tabEchoContent");
const tabMixerContent = document.getElementById("tabMixerContent");

tabEqBtn.addEventListener("click", () => {
  tabEqBtn.classList.add("active"); tabEchoBtn.classList.remove("active"); tabMixerBtn.classList.remove("active");
  tabEqContent.classList.add("active"); tabEchoContent.classList.remove("active"); tabMixerContent.classList.remove("active");
});
tabEchoBtn.addEventListener("click", () => {
  tabEchoBtn.classList.add("active"); tabEqBtn.classList.remove("active"); tabMixerBtn.classList.remove("active");
  tabEchoContent.classList.add("active"); tabEqContent.classList.remove("active"); tabMixerContent.classList.remove("active");
});
tabMixerBtn.addEventListener("click", () => {
  tabMixerBtn.classList.add("active"); tabEqBtn.classList.remove("active"); tabEchoBtn.classList.remove("active");
  tabMixerContent.classList.add("active"); tabEqContent.classList.remove("active"); tabEchoContent.classList.remove("active");
});

/* =========================================================
   RENDER SLIDER EQUALIZER
========================================================= */
const frequencies = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];
const channelEl = document.querySelector(".channel");
if (channelEl) {
  const eqContainer = channelEl.querySelector(".eq");
  frequencies.forEach(freq => {
    const band = document.createElement("div");
    band.className = "band";
    band.innerHTML = `<div class="band-frequency">${freq}Hz</div><div class="slider-track-container"><input type="range" min="-15" max="15" step="0.5" value="0"></div><div class="band-value">0.0</div>`;
    eqContainer.appendChild(band);
  });
}

/* =========================================================
   AUDIO ENGINE & OUTPUT ROUTING (BLUETOOTH / HEADSET / SPEAKER)
========================================================= */
let audioContext = null;
let masterGainNode = null;
let audioElementSource = null;
let audioFiles = [];
let currentAudioIndex = -1;
let audioObjectUrls = [];
let isMuted = false;

const audioPlayer = document.getElementById("audioPlayer");
const outputDeviceSelect = document.getElementById("outputDeviceSelect");

// Memindai perangkat audio output (Speaker, Bluetooth, Headset)
async function loadAudioOutputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(d => d.kind === "audiooutput");
    outputDeviceSelect.innerHTML = '<option value="">Default Perangkat Sistem (Otomatis)</option>';
    outputs.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Output Audio ${index + 1}`;
      outputDeviceSelect.appendChild(option);
    });
  } catch (err) {
    console.warn("Gagal memindai perangkat output:", err);
  }
}

// Mengarahkan output elemen audio ke perangkat yang dipilih di dropdown
outputDeviceSelect.addEventListener("change", async () => {
  const deviceId = outputDeviceSelect.value;
  if (typeof audioPlayer.setSinkId === "function") {
    try {
      await audioPlayer.setSinkId(deviceId);
      document.getElementById("readyStatus").textContent = "Output audio dialihkan ke perangkat terpilih.";
    } catch (err) {
      document.getElementById("readyStatus").textContent = "Gagal mengalihkan output audio.";
    }
  } else {
    alert("Browser Anda belum mendukung pemindahan output audio secara langsung melalui setSinkId.");
  }
});

function initAudioContext() {
  if (audioContext) return audioContext;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioCtx();
  
  masterGainNode = audioContext.createGain();
  masterGainNode.gain.value = 1.0;
  masterGainNode.connect(audioContext.destination);

  if (audioPlayer && !audioElementSource) {
    audioElementSource = audioContext.createMediaElementSource(audioPlayer);
    audioElementSource.connect(masterGainNode);
  }
  return audioContext;
}

function selectAudioFile(index) {
  if (index < 0 || index >= audioFiles.length) return;
  const file = audioFiles[index];
  audioPlayer.pause();
  const url = URL.createObjectURL(file);
  audioObjectUrls.push(url);
  audioPlayer.src = url;
  currentAudioIndex = index;
  renderPlaylistUI();
}

function renderPlaylistUI() {
  const container = document.getElementById("playlistContainer");
  if (!container) return;
  container.innerHTML = "";
  if (audioFiles.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 6px; color: #64748b;">Belum ada file audio dipilih.</div>`;
    return;
  }
  audioFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "playlist-item" + (index === currentAudioIndex ? " playing" : "");
    item.innerHTML = `<span>${index + 1}. ${file.name}</span>`;
    item.addEventListener("click", () => {
      selectAudioFile(index);
      audioPlayer.play();
    });
    container.appendChild(item);
  });
}

audioPlayer.addEventListener("ended", () => {
  if (audioFiles.length > 0) {
    currentAudioIndex = (currentAudioIndex + 1) % audioFiles.length;
    selectAudioFile(currentAudioIndex);
    audioPlayer.play();
  }
});

document.getElementById("audioFile").addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  audioFiles = files;
  currentAudioIndex = 0;
  selectAudioFile(0);
});

document.getElementById("startButton").addEventListener("click", async () => {
  const ctx = initAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  if (audioPlayer.src) {
    audioPlayer.play();
    document.getElementById("readyStatus").textContent = "Memutar playlist audio melalui perangkat aktif.";
  } else {
    alert("Pilih file audio terlebih dahulu.");
  }
});

document.getElementById("stopButton").addEventListener("click", () => {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  document.getElementById("readyStatus").textContent = "Audio dihentikan.";
});

document.getElementById("masterGain").addEventListener("input", (e) => {
  const val = Number(e.target.value);
  document.getElementById("masterValue").textContent = val + " dB";
  if (masterGainNode && audioContext) {
    masterGainNode.gain.setValueAtTime(Math.pow(10, val / 20), audioContext.currentTime);
  }
});

document.getElementById("muteOutput").addEventListener("click", () => {
  isMuted = !isMuted;
  const btn = document.getElementById("muteOutput");
  btn.classList.toggle("active", isMuted);
  btn.textContent = isMuted ? "UNMUTE OUTPUT" : "MUTE OUTPUT";
  if (masterGainNode && audioContext) {
    masterGainNode.gain.setValueAtTime(isMuted ? 0 : 1.0, audioContext.currentTime);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  loadAudioOutputDevices();
  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", loadAudioOutputDevices);
  }
});
  </script>
</body>
</html>
