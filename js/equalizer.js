/* =========================================================
   DBX 2231 GRAPHIC EQUALIZER
   COMPLETE AUDIO ENGINE & UI RENDERER
   ========================================================= */

const frequencies = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

const channelsContainer = document.getElementById("channels");
const audioFile = document.getElementById("audioFile");
const audioPlayer = document.getElementById("audioPlayer");
const inputDevice = document.getElementById("inputDevice");
const readyStatus = document.getElementById("readyStatus");
const currentAudioName = document.getElementById("currentAudioName");
const playlistCount = document.getElementById("playlistCount");
const audioPlaylist = document.getElementById("audioPlaylist");

let audioContext = null;
let masterGainNode = null;
let sourceNode = null;
let stereoInputNode = null;
let stereoSplitter = null;
let stereoMerger = null;
let audioInputActive = false;

let testOscillators = [null, null];
let testGains = [null, null];
let audioFileSourceNode = null;
let analyserNodes = [];
let channelGraphs = [];
let microphoneStream = null;
let isMuted = false;
let meterAnimationId = null;
let meterAnimationRunning = false;

let audioFiles = [];
let currentAudioIndex = -1;
let audioObjectUrls = [];

const FADER_STEP = 0.5;

const channelState = [
  {
    gain: 0,
    lowCut: false,
    range: 15,
    bypass: false,
    test: false,
    bands: Array(31).fill(0)
  },
  {
    gain: 0,
    lowCut: false,
    range: 15,
    bypass: false,
    test: false,
    bands: Array(31).fill(0)
  }
];

function formatFrequency(freq) {
  if (freq >= 1000) {
    return `${freq / 1000}K`;
  }
  return String(freq);
}

function formatDb(value) {
  const number = Number(value);
  if (number > 0) {
    return `+${number.toFixed(1)}`;
  }
  return number.toFixed(1);
}

function dbToGain(db) {
  return Math.pow(10, db / 20);
}

function clampBandValue(channelIndex, value) {
  const range = channelState[channelIndex].range;
  let result = Number(value);
  if (!Number.isFinite(result)) {
    result = 0;
  }
  result = Math.max(-range, Math.min(range, result));
  result = Math.round(result / FADER_STEP) * FADER_STEP;
  return result;
}

function calculateFaderPercent(channelIndex, value) {
  const range = channelState[channelIndex].range;
  if (range <= 0) {
    return 50;
  }
  const percent = ((Number(value) + range) / (range * 2)) * 100;
  return Math.max(0, Math.min(100, percent));
}

function updateBandVisual(channelIndex, band, value) {
  const percent = calculateFaderPercent(channelIndex, value);
  band.style.setProperty("--fader-level", `${percent}%`);
}

function setBandValue(channelIndex, bandIndex, value, band, slider, valueLabel) {
  const safeValue = clampBandValue(channelIndex, value);
  channelState[channelIndex].bands[bandIndex] = safeValue;
  slider.value = String(safeValue);
  valueLabel.textContent = formatDb(safeValue);
  updateBandVisual(channelIndex, band, safeValue);
  updateChannelAudio(channelIndex);
}

function updateChannelStatusLights(channelIndex) {
  const channel = document.querySelector(`.channel[data-channel="${channelIndex}"]`);
  if (!channel) return;

  const activeLight = channel.querySelector('[data-role="status-active"]');
  const bypassLight = channel.querySelector('[data-role="status-bypass"]');
  const testLight = channel.querySelector('[data-role="status-test"]');
  const state = channelState[channelIndex];

  const realAudioActive = !!(audioContext && audioContext.state === "running" && sourceNode);
  const testActive = !!testOscillators[channelIndex];
  const audioActive = realAudioActive || testActive;

  if (activeLight) {
    activeLight.classList.toggle("active", audioActive);
  }
  if (bypassLight) {
    bypassLight.classList.toggle("active", !!state.bypass);
  }
  if (testLight) {
    testLight.classList.toggle("active", !!state.test);
  }
}

function updateAllStatusLights() {
  channelState.forEach((_, index) => {
    updateChannelStatusLights(index);
  });
}

function createChannel(channelIndex) {
  if (!channelsContainer) return;
  const channelNumber = channelIndex + 1;
  const channel = document.createElement("article");
  channel.className = "channel";
  channel.dataset.channel = channelIndex;

  channel.innerHTML = `
    <div class="channel-header">
      <div class="channel-label">
        <span class="power-led"></span>
        ${channelNumber === 1 ? "CH1 — LEFT / L" : "CH2 — RIGHT / R"}
      </div>
      <div class="channel-status">
        <span class="status-light" data-role="status-active">ACTIVE</span>
        <span class="status-light bypass" data-role="status-bypass">BYPASS</span>
        <span class="status-light test" data-role="status-test">TEST</span>
      </div>
    </div>
    <div class="control-row">
      <div class="control-box">
        <div class="control-title">GAIN</div>
        <input class="gain-slider" type="range" min="-12" max="12" step="0.5" value="${channelState[channelIndex].gain}" data-role="gain" />
        <div class="gain-value">
          <span>-12</span>
          <strong data-role="gain-value">${formatDb(channelState[channelIndex].gain)} dB</strong>
          <span>+12</span>
        </div>
      </div>
      <div class="control-box">
        <div class="control-title">LOW CUT</div>
        <button class="small-button" data-role="lowcut" style="width:100%;">
          ${channelState[channelIndex].lowCut ? "ON / 40 Hz" : "OFF / 40 Hz"}
        </button>
      </div>
      <div class="control-box">
        <div class="control-title">RANGE</div>
        <button class="small-button" data-role="range" style="width:100%;">
          ±${channelState[channelIndex].range} dB
        </button>
      </div>
      <div class="control-box meter-box">
        <div class="control-title">LEVEL METER</div>
        <div class="meter-scale">
          <span>-60</span><span>-40</span><span>-20</span><span>-10</span><span>-6</span><span>-3</span><span>0</span><span>+3</span>
        </div>
        <div class="led-meter" id="meter-ch${channelNumber}" data-role="meter">
          ${Array.from({ length: 18 }, () => "<span></span>").join("")}
        </div>
      </div>
      <div class="clip-box" id="clip-ch${channelNumber}" data-role="clip">
        <div class="clip-led"></div>
        <div class="clip-text">CLIP</div>
      </div>
    </div>
    <div class="eq-wrapper">
      <div class="eq-scale">
        <span>+15</span><span>+10</span><span>+5</span><span>0</span><span>-5</span><span>-10</span><span>-15</span>
      </div>
      <div class="eq-area">
        <div class="db-scale">
          <span>+15</span><span>+10</span><span>+5</span><span>0</span><span>-5</span><span>-10</span><span>-15</span>
        </div>
        <div class="bands" data-role="bands"></div>
      </div>
    </div>
    <div class="channel-footer">
      <span>31 BAND ISO 1/3 OCTAVE</span>
      <span data-role="footer-range">RANGE: ±${channelState[channelIndex].range} dB</span>
    </div>
    <div class="channel-buttons">
      <button class="small-button" data-role="bypass">BYPASS</button>
      <button class="small-button" data-role="test">TEST</button>
    </div>
  `;

  const state = channelState[channelIndex];
  const lowCutButton = channel.querySelector('[data-role="lowcut"]');
  const rangeButton = channel.querySelector('[data-role="range"]');
  const bypassButton = channel.querySelector('[data-role="bypass"]');
  const testButton = channel.querySelector('[data-role="test"]');

  lowCutButton.classList.toggle("active", state.lowCut);
  rangeButton.classList.toggle("active", state.range === 6);
  bypassButton.classList.toggle("active", state.bypass);
  testButton.classList.toggle("active", state.test);

  const bandsContainer = channel.querySelector('[data-role="bands"]');

  frequencies.forEach((frequency, bandIndex) => {
    const band = document.createElement("div");
    band.className = "band";
    band.innerHTML = `
      <div class="band-track"></div>
      <input type="range" min="${-state.range}" max="${state.range}" step="0.5" value="${state.bands[bandIndex]}" data-band-index="${bandIndex}" aria-label="Channel ${channelNumber}, ${frequency} Hz" />
      <div class="band-frequency">${formatFrequency(frequency)}</div>
      <div class="band-value" data-value-index="${bandIndex}">${formatDb(state.bands[bandIndex])}</div>
    `;

    const slider = band.querySelector("input");
    const valueLabel = band.querySelector(`[data-value-index="${bandIndex}"]`);
    updateBandVisual(channelIndex, band, Number(slider.value));

    let pointerMode = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerStartValue = 0;
    let pointerMoved = false;
    let pointerActive = false;
    const track = band.querySelector(".band-track");

    band.addEventListener("pointerdown", event => {
      if (event.target.closest(".band-frequency, .band-value")) return;
      const trackRect = track.getBoundingClientRect();
      if (event.clientY < trackRect.top - 4 || event.clientY > trackRect.bottom + 4) return;

      pointerActive = true;
      pointerMode = null;
      pointerMoved = false;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      pointerStartValue = Number(slider.value);
    }, { passive: true });

    band.addEventListener("pointermove", event => {
      if (!pointerActive) return;
      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (!pointerMode && (absX > 6 || absY > 6)) {
        pointerMoved = true;
        if (absX > absY) {
          pointerMode = "scroll";
          pointerActive = false;
          return;
        }
        pointerMode = "fader";
        band.classList.add("is-dragging");
        try { band.setPointerCapture(event.pointerId); } catch (_) {}
      }

      if (pointerMode !== "fader") return;
      event.preventDefault();

      const trackRect = track.getBoundingClientRect();
      const trackHeight = trackRect.height;
      if (trackHeight <= 0) return;

      const range = channelState[channelIndex].range;
      const valuePerPixel = (range * 2) / trackHeight;
      const newValue = pointerStartValue - (deltaY * valuePerPixel);

      setBandValue(channelIndex, bandIndex, newValue, band, slider, valueLabel);
    }, { passive: false });

    band.addEventListener("pointerup", event => {
      if (!pointerActive) return;
      if (pointerMode === "fader") {
        band.classList.remove("is-dragging");
        try { band.releasePointerCapture(event.pointerId); } catch (_) {}
        pointerActive = false;
        pointerMode = null;
        pointerMoved = false;
        return;
      }
      if (pointerMode === "scroll") {
        pointerActive = false;
        pointerMode = null;
        return;
      }

      if (!pointerMoved) {
        const trackRect = track.getBoundingClientRect();
        const currentValue = Number(slider.value);
        const range = channelState[channelIndex].range;
        const trackHeight = trackRect.height;
        const currentPercent = ((currentValue + range) / (range * 2));
        const knobY = trackRect.bottom - (currentPercent * trackHeight);
        const tapY = event.clientY;
        const tapThreshold = 5;

        if (tapY < knobY - tapThreshold) {
          setBandValue(channelIndex, bandIndex, currentValue + FADER_STEP, band, slider, valueLabel);
        } else if (tapY > knobY + tapThreshold) {
          setBandValue(channelIndex, bandIndex, currentValue - FADER_STEP, band, slider, valueLabel);
        }
      }

      pointerActive = false;
      pointerMode = null;
      pointerMoved = false;
    }, { passive: true });

    band.addEventListener("pointercancel", event => {
      band.classList.remove("is-dragging");
      try { if (band.hasPointerCapture(event.pointerId)) band.releasePointerCapture(event.pointerId); } catch (_) {}
      pointerActive = false;
      pointerMode = null;
      pointerMoved = false;
    });

    slider.addEventListener("input", () => {
      setBandValue(channelIndex, bandIndex, Number(slider.value), band, slider, valueLabel);
    });

    bandsContainer.appendChild(band);
  });

  const gainSlider = channel.querySelector('[data-role="gain"]');
  const gainValue = channel.querySelector('[data-role="gain-value"]');

  gainSlider.addEventListener("input", () => {
    const value = Number(gainSlider.value);
    state.gain = value;
    gainValue.textContent = `${formatDb(value)} dB`;
    updateChannelAudio(channelIndex);
  });

  lowCutButton.addEventListener("click", event => {
    state.lowCut = !state.lowCut;
    event.currentTarget.classList.toggle("active", state.lowCut);
    event.currentTarget.textContent = state.lowCut ? "ON / 40 Hz" : "OFF / 40 Hz";
    updateChannelAudio(channelIndex);
    readyStatus.textContent = state.lowCut ? `CH${channelNumber} LOW CUT ON` : `CH${channelNumber} LOW CUT OFF`;
  });

  rangeButton.addEventListener("click", event => {
    state.range = state.range === 15 ? 6 : 15;
    const range = state.range;
    event.currentTarget.textContent = `±${range} dB`;
    event.currentTarget.classList.toggle("active", range === 6);

    const footerRange = channel.querySelector('[data-role="footer-range"]');
    if (footerRange) {
      footerRange.textContent = `RANGE: ±${range} dB`;
    }

    channel.querySelectorAll(".band input").forEach((slider, index) => {
      let value = Number(slider.value);
      value = Math.max(-range, Math.min(range, value));
      value = Math.round(value / FADER_STEP) * FADER_STEP;

      slider.min = String(-range);
      slider.max = String(range);
      slider.step = String(FADER_STEP);
      slider.value = String(value);
      state.bands[index] = value;

      const valueLabel = channel.querySelector(`[data-value-index="${index}"]`);
      if (valueLabel) valueLabel.textContent = formatDb(value);

      const band = slider.closest(".band");
      if (band) updateBandVisual(channelIndex, band, value);
    });

    updateChannelAudio(channelIndex);
    readyStatus.textContent = `CH${channelNumber} RANGE ±${range} dB`;
  });

  bypassButton.addEventListener("click", event => {
    state.bypass = !state.bypass;
    event.currentTarget.classList.toggle("active", state.bypass);
    updateChannelAudio(channelIndex);
    updateChannelStatusLights(channelIndex);
    readyStatus.textContent = state.bypass ? `CH${channelNumber} BYPASS ON` : `CH${channelNumber} BYPASS OFF`;
  });

  testButton.addEventListener("click", async event => {
    state.test = !state.test;
    const testing = state.test;

    if (testing) {
      try {
        startChannelTest(channelIndex);
        await audioContext.resume();
      } catch (error) {
        state.test = false;
        stopChannelTest(channelIndex);
        return;
      }
    } else {
      stopChannelTest(channelIndex);
    }

    event.currentTarget.classList.toggle("active", testing);
    updateChannelStatusLights(channelIndex);
    readyStatus.textContent = testing ? `CH${channelNumber} TEST 1kHz ON` : `CH${channelNumber} TEST OFF`;
  });

  channelsContainer.appendChild(channel);
  updateChannelStatusLights(channelIndex);
}

function buildChannels() {
  if (!channelsContainer) return;
  channelsContainer.innerHTML = "";
  createChannel(0);
  createChannel(1);
  updateAllStatusLights();
}

function createAudioContext() {
  if (audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio API tidak didukung.");

  audioContext = new AudioContextClass();
  masterGainNode = audioContext.createGain();

  const masterSlider = document.getElementById("masterGain");
  const initialMasterDb = masterSlider ? Number(masterSlider.value) : -12;
  masterGainNode.gain.value = isMuted ? 0 : dbToGain(initialMasterDb);

  stereoInputNode = audioContext.createGain();
  stereoInputNode.gain.value = 1;
  stereoInputNode.channelCount = 2;
  stereoInputNode.channelCountMode = "explicit";
  stereoInputNode.channelInterpretation = "speakers";

  stereoSplitter = audioContext.createChannelSplitter(2);
  stereoMerger = audioContext.createChannelMerger(2);
  stereoInputNode.connect(stereoSplitter);

  channelGraphs = channelState.map((state, channelIndex) => {
    const inputGain = audioContext.createGain();
    const lowCut = audioContext.createBiquadFilter();
    lowCut.type = "highpass";
    lowCut.frequency.value = state.bypass ? 5 : state.lowCut ? 40 : 5;

    const filters = frequencies.map((frequency, bandIndex) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = frequency;
      filter.Q.value = 1.4;
      filter.gain.value = state.bypass ? 0 : state.bands[bandIndex] || 0;
      return filter;
    });

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;

    let previousNode = inputGain;
    previousNode.connect(lowCut);
    previousNode = lowCut;

    filters.forEach(filter => {
      previousNode.connect(filter);
      previousNode = filter;
    });

    previousNode.connect(analyser);
    analyser.connect(stereoMerger, 0, channelIndex);

    return { inputGain, lowCut, filters, analyser };
  });

  analyserNodes = channelGraphs.map(graph => graph.analyser);

  if (channelGraphs[0]) stereoSplitter.connect(channelGraphs[0].inputGain, 0);
  if (channelGraphs[1]) stereoSplitter.connect(channelGraphs[1].inputGain, 1);

  stereoMerger.connect(masterGainNode);
  masterGainNode.connect(audioContext.destination);

  startMeterAnimation();
  updateAllStatusLights();
}

function updateChannelAudio(channelIndex) {
  if (!channelGraphs[channelIndex]) return;
  const state = channelState[channelIndex];
  const graph = channelGraphs[channelIndex];

  graph.inputGain.gain.value = dbToGain(state.gain);
  graph.lowCut.frequency.value = state.bypass ? 5 : state.lowCut ? 40 : 5;

  graph.filters.forEach((filter, index) => {
    filter.gain.value = state.bypass ? 0 : state.bands[index];
  });

  updateChannelStatusLights(channelIndex);
}

function updateAllAudioGraphs() {
  channelState.forEach((_, index) => {
    updateChannelAudio(index);
  });
}

function disconnectCurrentSource() {
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (_) {}
  }
  sourceNode = null;
  audioInputActive = false;
  updateAllStatusLights();
}

function connectSourceToChannels(newSource) {
  disconnectCurrentSource();
  if (!newSource) {
    audioInputActive = false;
    updateAllStatusLights();
    return;
  }
  sourceNode = newSource;
  sourceNode.connect(stereoInputNode);
  audioInputActive = true;
  updateAllStatusLights();
}

async function startMicrophone() {
  createAudioContext();
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia tidak didukung.");
  }

  audioPlayer.pause();
  const deviceId = inputDevice ? inputDevice.value : "";
  const constraints = { audio: deviceId ? { deviceId: { exact: deviceId } } : true };

  microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
  const micSource = audioContext.createMediaStreamSource(microphoneStream);
  connectSourceToChannels(micSource);
  await audioContext.resume();

  if (readyStatus) readyStatus.textContent = "MICROPHONE ACTIVE";
  updateAllStatusLights();
}

async function startAudioFile() {
  createAudioContext();
  if (!audioPlayer || !audioPlayer.src) {
    alert("Pilih file audio terlebih dahulu.");
    return;
  }

  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }

  if (!audioFileSourceNode) {
    audioFileSourceNode = audioContext.createMediaElementSource(audioPlayer);
  }

  connectSourceToChannels(audioFileSourceNode);
  await audioContext.resume();
  await audioPlayer.play();

  if (readyStatus) {
    readyStatus.textContent = `PLAYING: ${audioFiles[currentAudioIndex] ? audioFiles[currentAudioIndex].name : "AUDIO"}`;
  }
  updateAllStatusLights();
}

function stopAudio() {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }
  if (audioPlayer) {
    audioPlayer.pause();
    try { audioPlayer.currentTime = 0; } catch (_) {}
  }
  disconnectCurrentSource();
  if (readyStatus) readyStatus.textContent = "AUDIO STOPPED";
  updateAllStatusLights();
}

function startChannelTest(channelIndex) {
  createAudioContext();
  if (!channelGraphs[channelIndex]) throw new Error("Graph belum tersedia.");
  stopChannelTest(channelIndex);

  const oscillator = audioContext.createOscillator();
  const testGain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 1000;
  testGain.gain.value = 0.08;

  testGain.connect(channelGraphs[channelIndex].inputGain);
  oscillator.connect(testGain);

  testOscillators[channelIndex] = oscillator;
  testGains[channelIndex] = testGain;
  oscillator.start();
  updateAllStatusLights();
}

function stopChannelTest(channelIndex) {
  const oscillator = testOscillators[channelIndex];
  if (oscillator) {
    try { oscillator.stop(); } catch (_) {}
    try { oscillator.disconnect(); } catch (_) {}
  }
  const gain = testGains[channelIndex];
  if (gain) {
    try { gain.disconnect(); } catch (_) {}
  }
  testOscillators[channelIndex] = null;
  testGains[channelIndex] = null;
  updateAllStatusLights();
}

function startMeterAnimation() {
  if (meterAnimationRunning || !analyserNodes.length) return;
  meterAnimationRunning = true;

  const dataArrays = analyserNodes.map(analyser => new Uint8Array(analyser.fftSize));

  function drawMeters() {
    meterAnimationId = requestAnimationFrame(drawMeters);

    analyserNodes.forEach((analyser, channelIndex) => {
      const channel = document.querySelector(`.channel[data-channel="${channelIndex}"]`);
      if (!channel) return;

      const meter = channel.querySelector('[data-role="meter"]');
      const clip = channel.querySelector('[data-role="clip"]');
      if (!meter || !clip) return;

      const segments = meter.querySelectorAll("span");
      const hasRealAudio = !!(audioContext && audioContext.state === "running" && sourceNode);
      const hasTestSignal = !!testOscillators[channelIndex];

      if (!hasRealAudio && !hasTestSignal) {
        segments.forEach(segment => segment.classList.remove("on"));
        const clipLed = clip.querySelector(".clip-led");
        if (clipLed) clipLed.classList.remove("on");
        return;
      }

      analyser.getByteTimeDomainData(dataArrays[channelIndex]);
      let peak = 0;
      for (let i = 0; i < dataArrays[channelIndex].length; i++) {
        const normalized = Math.abs(dataArrays[channelIndex][i] - 128) / 128;
        if (normalized > peak) peak = normalized;
      }

      const db = peak > 0 ? 20 * Math.log10(peak) : -60;
      const clampedDb = Math.max(-60, Math.min(0, db));
      let level = 0;

      if (clampedDb > -55) {
        level = Math.max(0, Math.min(18, Math.round(((clampedDb + 60) / 60) * 18)));
      }

      segments.forEach((segment, index) => {
        segment.classList.toggle("on", index < level);
      });

      const clipLed = clip.querySelector(".clip-led");
      if (clipLed) clipLed.classList.toggle("on", peak >= 0.98);
    });

    updateAllStatusLights();
  }

  drawMeters();
}

function resetAll() {
  stopChannelTest(0);
  stopChannelTest(1);

  channelState.forEach(state => {
    state.gain = 0;
    state.lowCut = false;
    state.range = 15;
    state.bypass = false;
    state.test = false;
    state.bands = Array(31).fill(0);
  });

  buildChannels();
  updateAllAudioGraphs();
  if (readyStatus) readyStatus.textContent = "RESET COMPLETE";
  updateAllStatusLights();
}

function applyPreset(name) {
  const presets = {
    flat: Array(31).fill(0),
    vocal: [-3,-2,-1,0,1,2,3,3,2,2,1,0,1,2,3,4,4,3,2,2,3,4,4,3,2,1,0,-1,-2,-3,-3],
    live: [3,2,1,0,-1,-2,-2,-1,0,1,2,3,3,2,1,0,1,2,3,4,4,3,2,1,0,-1,-2,-2,-1,0,1],
    feedback: [-5,-4,-3,-2,-1,0,-2,-4,-6,-4,-2,0,1,0,-3,-5,-4,-2,0,-2,-4,-5,-3,-1,0,-2,-4,-5,-3,-2,-1]
  };

  const values = presets[name] || presets.flat;

  channelState.forEach((state, channelIndex) => {
    const range = state.range;
    state.bands = values.map(value => Math.max(-range, Math.min(range, value)));

    const channel = document.querySelector(`.channel[data-channel="${channelIndex}"]`);
    if (!channel) return;

    channel.querySelectorAll(".band input").forEach((slider, index) => {
      const value = state.bands[index];
      slider.min = String(-range);
      slider.max = String(range);
      slider.step = String(FADER_STEP);
      slider.value = String(value);

      const valueLabel = channel.querySelector(`[data-value-index="${index}"]`);
      if (valueLabel) valueLabel.textContent = formatDb(value);

      const band = slider.closest(".band");
      if (band) updateBandVisual(channelIndex, band, value);
    });
  });

  updateAllAudioGraphs();
  if (readyStatus) readyStatus.textContent = `PRESET ${name.toUpperCase()} APPLIED`;
}

async function loadDevices() {
  if (!navigator.mediaDevices?.enumerateDevices || !inputDevice) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    inputDevice.innerHTML = "";
    const audioInputs = devices.filter(device => device.kind === "audioinput");

    if (audioInputs.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "DEFAULT MICROPHONE";
      inputDevice.appendChild(option);
    }

    audioInputs.forEach(device => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || "Audio Input";
      inputDevice.appendChild(option);
    });
  } catch (error) {
    console.warn("Gagal membaca perangkat audio:", error);
  }
}

function revokeAudioObjectUrls() {
  audioObjectUrls.forEach(url => {
    try { URL.revokeObjectURL(url); } catch (_) {}
  });
  audioObjectUrls = [];
}

function updatePlaylistInfo() {
  if (playlistCount) playlistCount.textContent = `PLAYLIST: ${audioFiles.length} FILE`;
  if (currentAudioName) {
    if (currentAudioIndex >= 0 && currentAudioIndex < audioFiles.length) {
      currentAudioName.textContent = audioFiles[currentAudioIndex].name;
    } else {
      currentAudioName.textContent = "NO AUDIO SELECTED";
    }
  }
}

function renderAudioPlaylist() {
  if (!audioPlaylist) return;
  audioPlaylist.innerHTML = "";
  updatePlaylistInfo();

  if (audioFiles.length === 0) {
    audioPlaylist.innerHTML = `<div style="padding:10px; color:#8d9aa3; font-size:11px; text-align:center;">BELUM ADA FILE AUDIO</div>`;
    return;
  }

  audioFiles.forEach((file, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.style.cssText = `
      display:block; width:100%; padding:9px 10px; border:0; border-bottom:1px solid #263943;
      background:${index === currentAudioIndex ? "#145a78" : "#0b151c"};
      color:#e5edf2; text-align:left; font-size:11px; cursor:pointer;
    `;
    item.textContent = `${index + 1}. ${file.name}`;
    item.addEventListener("click", () => selectAudioFile(index));
    audioPlaylist.appendChild(item);
  });
}

function selectAudioFile(index) {
  if (index < 0 || index >= audioFiles.length || !audioPlayer) return;
  currentAudioIndex = index;
  const file = audioFiles[index];
  audioPlayer.pause();

  if (audioPlayer.dataset.objectUrl) {
    try { URL.revokeObjectURL(audioPlayer.dataset.objectUrl); } catch (_) {}
  }

  const objectUrl = URL.createObjectURL(file);
  audioObjectUrls.push(objectUrl);
  audioPlayer.src = objectUrl;
  audioPlayer.dataset.objectUrl = objectUrl;

  updatePlaylistInfo();
  renderAudioPlaylist();
  if (readyStatus) readyStatus.textContent = `FILE READY: ${file.name}`;
}

if (audioFile) {
  audioFile.addEventListener("change", event => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    if (audioPlayer) audioPlayer.pause();
    revokeAudioObjectUrls();
    audioFiles = selectedFiles;
    currentAudioIndex = 0;
    selectAudioFile(0);
    renderAudioPlaylist();
    if (readyStatus) readyStatus.textContent = `${selectedFiles.length} FILE AUDIO DIPILIH`;
  });
}

async function playSelectedAudio() {
  if (audioFiles.length === 0) {
    alert("Belum ada file audio.");
    return;
  }
  if (currentAudioIndex < 0) currentAudioIndex = 0;
  selectAudioFile(currentAudioIndex);
  try { await startAudioFile(); } catch (error) { if (readyStatus) readyStatus.textContent = "AUDIO PLAY ERROR"; }
}

async function previousAudio() {
  if (audioFiles.length === 0) return;
  if (currentAudioIndex <= 0) {
    currentAudioIndex = audioFiles.length - 1;
  } else {
    currentAudioIndex--;
  }
  selectAudioFile(currentAudioIndex);
  try { await startAudioFile(); } catch (_) {}
}

async function nextAudio() {
  if (audioFiles.length === 0) return;
  if (currentAudioIndex >= audioFiles.length - 1) {
    currentAudioIndex = 0;
  } else {
    currentAudioIndex++;
  }
  selectAudioFile(currentAudioIndex);
  try { await startAudioFile(); } catch (_) {}
}

if (audioPlayer) {
  audioPlayer.addEventListener("ended", async () => {
    if (audioFiles.length === 0) {
      if (readyStatus) readyStatus.textContent = "PLAYLIST SELESAI";
      disconnectCurrentSource();
      return;
    }
    if (currentAudioIndex < audioFiles.length - 1) {
      currentAudioIndex++;
      selectAudioFile(currentAudioIndex);
      try { await startAudioFile(); } catch (_) {}
      return;
    }
    if (readyStatus) readyStatus.textContent = "PLAYLIST SELESAI";
    disconnectCurrentSource();
    updateAllStatusLights();
  });
}

function clearPlaylist() {
  if (audioPlayer) {
    audioPlayer.pause();
    try { audioPlayer.currentTime = 0; } catch (_) {}
  }
  disconnectCurrentSource();
  revokeAudioObjectUrls();
  audioFiles = [];
  currentAudioIndex = -1;
  if (audioPlayer) {
    audioPlayer.removeAttribute("src");
    audioPlayer.load();
    delete audioPlayer.dataset.objectUrl;
  }
  renderAudioPlaylist();
  if (readyStatus) readyStatus.textContent = "PLAYLIST CLEARED";
  updateAllStatusLights();
}

const masterGainEl = document.getElementById("masterGain");
if (masterGainEl) {
  masterGainEl.addEventListener("input", event => {
    const value = Number(event.target.value);
    const masterValEl = document.getElementById("masterValue");
    if (masterValEl) masterValEl.textContent = `${value} dB`;
    if (masterGainNode) {
      masterGainNode.gain.value = isMuted ? 0 : dbToGain(value);
    }
  });
}

const muteOutputEl = document.getElementById("muteOutput");
if (muteOutputEl) {
  muteOutputEl.addEventListener("click", event => {
    isMuted = !isMuted;
    event.currentTarget.classList.toggle("active", isMuted);
    if (masterGainNode) {
      const masterGainInput = document.getElementById("masterGain");
      const value = masterGainInput ? Number(masterGainInput.value) : -12;
      masterGainNode.gain.value = isMuted ? 0 : dbToGain(value);
    }
    event.currentTarget.textContent = isMuted ? "UNMUTE OUTPUT" : "MUTE OUTPUT";
    if (readyStatus) readyStatus.textContent = isMuted ? "OUTPUT MUTED" : "OUTPUT ACTIVE";
  });
}

const micButtonEl = document.getElementById("micButton");
if (micButtonEl) {
  micButtonEl.addEventListener("click", async () => {
    try { await startMicrophone(); } catch (error) { alert("Mikrofon tidak dapat digunakan."); }
  });
}

const startButtonEl = document.getElementById("startButton");
if (startButtonEl) {
  startButtonEl.addEventListener("click", async () => {
    try { await startAudioFile(); } catch (error) { alert("Audio tidak dapat diputar."); }
  });
}

const stopButtonEl = document.getElementById("stopButton");
if (stopButtonEl) {
  stopButtonEl.addEventListener("click", stopAudio);
}

const refreshDevicesEl = document.getElementById("refreshDevices");
if (refreshDevicesEl) {
  refreshDevicesEl.addEventListener("click", async () => {
    await loadDevices();
    if (readyStatus) readyStatus.textContent = "DEVICES REFRESHED";
  });
}

const resetButtonEl = document.getElementById("resetButton");
if (resetButtonEl) {
  resetButtonEl.addEventListener("click", resetAll);
}

const applyPresetButtonEl = document.getElementById("applyPresetButton");
if (applyPresetButtonEl) {
  applyPresetButtonEl.addEventListener("click", () => {
    const presetSelect = document.getElementById("presetSelect");
    if (presetSelect) applyPreset(presetSelect.value);
  });
}

const saveButtonEl = document.getElementById("saveButton");
if (saveButtonEl) {
  saveButtonEl.addEventListener("click", () => {
    const saved = JSON.stringify(channelState);
    localStorage.setItem("dbx2231Preset", saved);
    if (readyStatus) readyStatus.textContent = "PRESET SAVED";
  });
}

const recallButtonEl = document.getElementById("recallButton");
if (recallButtonEl) {
  recallButtonEl.addEventListener("click", () => {
    const saved = localStorage.getItem("dbx2231Preset");
    if (!saved) {
      alert("Belum ada preset yang disimpan.");
      return;
    }
    try {
      const data = JSON.parse(saved);
      if (!Array.isArray(data) || data.length !== 2) throw new Error("Format tidak valid.");

      data.forEach((savedState, index) => {
        const range = Number(savedState.range) === 6 ? 6 : 15;
        channelState[index] = {
          gain: Number.isFinite(Number(savedState.gain)) ? Number(savedState.gain) : 0,
          lowCut: Boolean(savedState.lowCut),
          range,
          bypass: Boolean(savedState.bypass),
          test: false,
          bands: Array.from({ length: 31 }, (_, bandIndex) => {
            const rawValue = Number(savedState.bands?.[bandIndex]);
            const value = Number.isFinite(rawValue) ? rawValue : 0;
            return Math.max(-range, Math.min(range, Math.round(value / FADER_STEP) * FADER_STEP));
          })
        };
      });

      stopChannelTest(0);
      stopChannelTest(1);
      buildChannels();
      updateAllAudioGraphs();
      if (readyStatus) readyStatus.textContent = "PRESET RECALLED";
    } catch (error) {
      alert("Preset tersimpan rusak atau tidak valid.");
    }
  });
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  updateAllStatusLights();
});

window.addEventListener("beforeunload", () => {
  revokeAudioObjectUrls();
  if (meterAnimationId) cancelAnimationFrame(meterAnimationId);
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
  }
});

buildChannels();
loadDevices();
renderAudioPlaylist();
updateAllStatusLights();

if (!navigator.mediaDevices?.getUserMedia) {
  if (readyStatus) readyStatus.textContent = "MICROPHONE NOT SUPPORTED";
}
