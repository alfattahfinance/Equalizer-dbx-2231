/* =========================================================
   DBX 2231
   EQUALIZER CHANNEL ENGINE & AUDIO NODES
   ========================================================= */

const frequencies = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

const channelsContainer = document.getElementById("channels");
const readyStatus = document.getElementById("readyStatus");

let channelGraphs = [];
let analyserNodes = [];
let testOscillators = [null, null];
let testGains = [null, null];
let meterAnimationRunning = false;
let meterAnimationId = null;

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
  if (freq >= 1000) return `${freq / 1000}K`;
  return String(freq);
}

function formatDb(value) {
  const number = Number(value);
  if (number > 0) return `+${number.toFixed(1)}`;
  return number.toFixed(1);
}

function clampBandValue(channelIndex, value) {
  const range = channelState[channelIndex].range;
  let result = Number(value);
  if (!Number.isFinite(result)) result = 0;
  result = Math.max(-range, Math.min(range, result));
  return Math.round(result / FADER_STEP) * FADER_STEP;
}

function calculateFaderPercent(channelIndex, value) {
  const range = channelState[channelIndex].range;
  if (range <= 0) return 50;
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

/* =========================================================
   AUDIO GRAPH & WEB AUDIO API NODES
   ========================================================= */

function initializeEqualizerEngine() {
  if (!audioContext || !stereoSplitter || !stereoMerger) return;
  if (channelGraphs.length > 0) return;

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

function startChannelTest(channelIndex) {
  createAudioContext();
  if (!channelGraphs[channelIndex]) return;
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

  if (activeLight) activeLight.classList.toggle("active", audioActive);
  if (bypassLight) bypassLight.classList.toggle("active", !!state.bypass);
  if (testLight) testLight.classList.toggle("active", !!state.test);
}

function updateAllStatusLights() {
  channelState.forEach((_, index) => {
    updateChannelStatusLights(index);
  });
}

/* =========================================================
   UI CREATION (CHANNELS)
   ========================================================= */

function createChannel(channelIndex) {
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
    if (readyStatus) readyStatus.textContent = state.lowCut ? `CH${channelNumber} LOW CUT ON` : `CH${channelNumber} LOW CUT OFF`;
  });

  rangeButton.addEventListener("click", event => {
    state.range = state.range === 15 ? 6 : 15;
    const range = state.range;
    event.currentTarget.textContent = `±${range} dB`;
    event.currentTarget.classList.toggle("active", range === 6);

    const footerRange = channel.querySelector('[data-role="footer-range"]');
    if (footerRange) footerRange.textContent = `RANGE: ±${range} dB`;

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
    if (readyStatus) readyStatus.textContent = `CH${channelNumber} RANGE ±${range} dB`;
  });

  bypassButton.addEventListener("click", event => {
    state.bypass = !state.bypass;
    event.currentTarget.classList.toggle("active", state.bypass);
    updateChannelAudio(channelIndex);
    updateChannelStatusLights(channelIndex);
    if (readyStatus) readyStatus.textContent = state.bypass ? `CH${channelNumber} BYPASS ON` : `CH${channelNumber} BYPASS OFF`;
  });

  testButton.addEventListener("click", async event => {
    state.test = !state.test;
    const testing = state.test;

    if (testing) {
      try {
        if (typeof createAudioContext === "function") createAudioContext();
        startChannelTest(channelIndex);
        if (audioContext) await audioContext.resume();
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
    if (readyStatus) readyStatus.textContent = testing ? `CH${channelNumber} TEST 1kHz ON` : `CH${channelNumber} TEST OFF`;
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

/* =========================================================
   EXPORTS & INIT
   ========================================================= */

window.frequencies = frequencies;
window.channelState = channelState;
window.buildChannels = buildChannels;
window.initializeEqualizerEngine = initializeEqualizerEngine;
window.updateChannelAudio = updateChannelAudio;
window.updateAllStatusLights = updateAllStatusLights;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildChannels);
} else {
  buildChannels();
}
