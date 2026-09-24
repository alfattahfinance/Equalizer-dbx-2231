/* =========================================================
   APPLICATION NAVIGATION
   ========================================================= */

const pageContainer = document.getElementById("pageContainer");

let equalizerPage = null;
let echoPage = null;
let mixerPage = null;

/* =========================================================
   EQUALIZER PAGE
   ========================================================= */

function renderEqualizerPage() {
  const page = document.createElement("section");
  page.className = "app-page";
  page.id = "equalizerPage";

  page.innerHTML = `
    <section class="device-title">
      <div>
        <div class="device-name">DBX 2231</div>
        <div class="device-subtitle">DUAL CHANNEL GRAPHIC EQUALIZER</div>
      </div>
      <div class="preset-area">
        <select id="presetSelect">
          <option value="flat">FLAT</option>
          <option value="vocal">VOKAL CLEAR</option>
          <option value="live">LIVE BAND</option>
          <option value="feedback">ANTI-FEEDBACK</option>
        </select>
        <button class="hardware-button" id="applyPresetButton" type="button">
          APPLY PRESET
        </button>
      </div>
    </section>

    <div class="channels-scroll">
      <section class="channels" id="channels"></section>
    </div>
  `;

  pageContainer.appendChild(page);
  equalizerPage = page;

  if (typeof buildChannels === "function") {
    buildChannels();
  }

  return page;
}

/* =========================================================
   ECHO ALESIS PAGE
   ========================================================= */

function renderEchoPage() {
  const page = document.createElement("section");
  page.className = "app-page";
  page.id = "echoPage";

  page.innerHTML = `
    <section class="device-title">
      <div>
        <div class="device-name">ALESIS QUADRAVERB</div>
        <div class="device-subtitle">DIGITAL DELAY & REVERB PROCESSOR</div>
      </div>
    </section>

    <section class="audio-engine" style="margin-top: 15px;">
      <div class="section-title">EFFECT PARAMETERS</div>
      <div class="engine-grid">
        <div class="engine-box">
          <div class="engine-label">DELAY TIME / SPEED</div>
          <div style="margin: 15px 0;">
            <input type="range" id="delayTime" min="50" max="1000" step="10" value="300" />
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 5px;">
              <span>50 ms</span>
              <strong id="delayTimeValue" style="color: var(--orange);">300 ms</strong>
              <span>1000 ms</span>
            </div>
          </div>
        </div>

        <div class="engine-box">
          <div class="engine-label">FEEDBACK / REPEATS</div>
          <div style="margin: 15px 0;">
            <input type="range" id="delayFeedback" min="0" max="0.9" step="0.05" value="0.4" />
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 5px;">
              <span>0%</span>
              <strong id="feedbackValue" style="color: var(--orange);">40%</strong>
              <span>90%</span>
            </div>
          </div>
        </div>

        <div class="engine-box">
          <div class="engine-label">EFFECT MIX (WET / DRY)</div>
          <div style="margin: 15px 0;">
            <input type="range" id="effectMix" min="0" max="1" step="0.05" value="0.5" />
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 5px;">
              <span>Dry (Asli)</span>
              <strong id="mixValue" style="color: var(--orange);">50%</strong>
              <span>Wet (Efek)</span>
            </div>
          </div>
          <button class="hardware-button" id="bypassAlesis" style="width:100%; margin-top:10px;">BYPASS EFFECT</button>
        </div>
      </div>
    </section>
  `;

  return page;
}

function renderEcho() {
  echoPage = renderEchoPage();
  pageContainer.appendChild(echoPage);
}

/* =========================================================
   DIGITAL MIXER PAGE
   ========================================================= */

function renderMixerPage() {
  const page = document.createElement("section");
  page.className = "app-page";
  page.id = "mixerPage";

  page.innerHTML = `
    <div class="mixer-console">
      <div class="mixer-top-console">
        <div class="mixer-tft-screen">
          <div class="tft-header">
            <span>M32/X32 DIGITAL CONSOLE INTERFACE</span>
            <span style="color: #10b981;">● ONLINE LINKED</span>
          </div>
          <div class="tft-body">
            <div class="rta-display-box" id="mixerRtaBars"></div>
            <div class="mixer-screen-info">
              <div><b>Scene:</b> Main Live FOH</div>
              <div><b>DSP Load:</b> 14%</div>
              <div><b>Sample Rate:</b> 48kHz</div>
            </div>
          </div>
        </div>
        <div class="mixer-control-section">
          <div style="font-size: 10px; font-weight: bold; color: #38bdf8; margin-bottom: 4px;">SECTION SELECT</div>
          <div class="section-grid-btns">
            <button class="console-btn active">CONFIG</button>
            <button class="console-btn">GATE</button>
            <button class="console-btn">DYNAMICS</button>
            <button class="console-btn">EQ</button>
            <button class="console-btn">SENDS</button>
            <button class="console-btn">MAIN</button>
          </div>
        </div>
      </div>

      <div class="mixer-desk-surface">
        <!-- CH 1 -->
        <div class="console-channel-strip">
          <div class="strip-label-box">CH 1: MIC</div>
          <div class="strip-knobs-area">
            <div class="knob-row"><span>GAIN</span><span>+0 dB</span></div>
            <div class="knob-row"><span>HPF</span><select><option>OFF</option><option>80Hz</option></select></div>
          </div>
          <div class="fader-readout">0.0 dB</div>
          <div class="fader-panel-area">
            <div class="fader-slot"><input type="range" min="-40" max="10" step="0.5" value="0"></div>
            <div class="vert-led-meter">
              <span class="red"></span><span class="red"></span><span class="yellow"></span><span class="yellow"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span>
            </div>
          </div>
          <div class="strip-action-buttons" style="margin-top:8px;">
            <button class="console-action-btn mute">MUTE</button>
            <button class="console-action-btn solo">SOLO</button>
          </div>
        </div>

        <!-- CH 2 -->
        <div class="console-channel-strip">
          <div class="strip-label-box">CH 2: MUSIC</div>
          <div class="strip-knobs-area">
            <div class="knob-row"><span>GAIN</span><span>+0 dB</span></div>
            <div class="knob-row"><span>HPF</span><select><option>OFF</option><option>80Hz</option></select></div>
          </div>
          <div class="fader-readout">0.0 dB</div>
          <div class="fader-panel-area">
            <div class="fader-slot"><input type="range" min="-40" max="10" step="0.5" value="0"></div>
            <div class="vert-led-meter">
              <span class="red"></span><span class="red"></span><span class="yellow"></span><span class="yellow"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span>
            </div>
          </div>
          <div class="strip-action-buttons" style="margin-top:8px;">
            <button class="console-action-btn mute">MUTE</button>
            <button class="console-action-btn solo">SOLO</button>
          </div>
        </div>

        <!-- CH 3 -->
        <div class="console-channel-strip">
          <div class="strip-label-box">CH 3: AUX</div>
          <div class="strip-knobs-area">
            <div class="knob-row"><span>GAIN</span><span>+0 dB</span></div>
            <div class="knob-row"><span>HPF</span><select><option>OFF</option><option>80Hz</option></select></div>
          </div>
          <div class="fader-readout">0.0 dB</div>
          <div class="fader-panel-area">
            <div class="fader-slot"><input type="range" min="-40" max="10" step="0.5" value="0"></div>
            <div class="vert-led-meter">
              <span class="red"></span><span class="red"></span><span class="yellow"></span><span class="yellow"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span>
            </div>
          </div>
          <div class="strip-action-buttons" style="margin-top:8px;">
            <button class="console-action-btn mute">MUTE</button>
            <button class="console-action-btn solo">SOLO</button>
          </div>
        </div>

        <!-- CH 4 -->
        <div class="console-channel-strip">
          <div class="strip-label-box">CH 4: FX</div>
          <div class="strip-knobs-area">
            <div class="knob-row"><span>GAIN</span><span>+0 dB</span></div>
            <div class="knob-row"><span>HPF</span><select><option>OFF</option><option>80Hz</option></select></div>
          </div>
          <div class="fader-readout">0.0 dB</div>
          <div class="fader-panel-area">
            <div class="fader-slot"><input type="range" min="-40" max="10" step="0.5" value="0"></div>
            <div class="vert-led-meter">
              <span class="red"></span><span class="red"></span><span class="yellow"></span><span class="yellow"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span>
            </div>
          </div>
          <div class="strip-action-buttons" style="margin-top:8px;">
            <button class="console-action-btn mute">MUTE</button>
            <button class="console-action-btn solo">SOLO</button>
          </div>
        </div>

        <!-- MASTER L/R -->
        <div class="console-channel-strip master-strip">
          <div class="strip-label-box">MASTER L/R</div>
          <div class="strip-knobs-area" style="border-color: #78350f;">
            <div class="knob-row"><span>LIMIT</span><span>ON</span></div>
            <div class="knob-row"><span>PROC</span><select><option>EQ+ECHO</option><option>BYPASS</option></select></div>
          </div>
          <div class="fader-readout">0.0 dB</div>
          <div class="fader-panel-area">
            <div class="fader-slot"><input type="range" min="-50" max="6" step="0.5" value="0"></div>
            <div class="vert-led-meter">
              <span class="red"></span><span class="red"></span><span class="yellow"></span><span class="yellow"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span>
            </div>
          </div>
          <div class="strip-action-buttons" style="margin-top:8px;">
            <button class="console-action-btn mute" style="background:#b45309; color:#fff;">MUTE</button>
            <button class="console-action-btn active" style="background:#fbbf24; color:#000;">LR</button>
          </div>
        </div>
      </div>
    </div>
  `;

  pageContainer.appendChild(page);
  mixerPage = page;
  return page;
}

function renderMixer() {
  renderMixerPage();
}

/* =========================================================
   SHOW PAGE
   ========================================================= */

function showPage(pageName) {
  if (equalizerPage) {
    equalizerPage.style.display = pageName === "equalizer" ? "block" : "none";
  }

  if (echoPage) {
    echoPage.style.display = pageName === "echo" ? "block" : "none";
  }

  if (mixerPage) {
    mixerPage.style.display = pageName === "mixer" ? "block" : "none";
  }

  document.querySelectorAll(".page-button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
}

/* =========================================================
   NAVIGATION
   ========================================================= */

document.querySelectorAll(".page-button").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  renderEqualizerPage();
  renderEcho();
  renderMixer();
  showPage("equalizer");
});

/* =========================================================
   FUNGSI INTERAKTIF DIGITAL MIXER CONSOLE
   ========================================================= */

function initDigitalMixerFunctions() {
  // 1. Animasi RTA Spectrum di Layar TFT Mixer
  const mixerRtaBars = document.getElementById("mixerRtaBars");
  if (mixerRtaBars && mixerRtaBars.children.length === 0) {
    for (let i = 0; i < 20; i++) {
      const bar = document.createElement("div");
      bar.style.flex = "1";
      bar.style.height = Math.floor(Math.random() * 80 + 15) + "%";
      bar.style.background = "linear-gradient(to top, #0284c7, #38bdf8)";
      bar.style.borderRadius = "1px";
      mixerRtaBars.appendChild(bar);
    }
    setInterval(() => {
      if (mixerPage && mixerPage.style.display !== "none") {
        [...mixerRtaBars.children].forEach(bar => {
          bar.style.height = Math.floor(Math.random() * 85 + 10) + "%";
        });
      }
    }, 120);
  }

  // 2. Kontrol Fader & Tampilan Nilai dB pada Channel Strip & Master
  const channelStrips = document.querySelectorAll(".console-channel-strip");
  channelStrips.forEach(strip => {
    const faderInput = strip.querySelector("input[type='range']");
    const readout = strip.querySelector(".fader-readout");
    const ledSpans = strip.querySelectorAll(".vert-led-meter span");
    const muteBtn = strip.querySelector(".console-action-btn.mute");
    const soloBtn = strip.querySelector(".console-action-btn.solo");

    if (faderInput && readout) {
      faderInput.addEventListener("input", () => {
        const val = parseFloat(faderInput.value);
        readout.textContent = (val > 0 ? "+" : "") + val.toFixed(1) + " dB";
      });
    }

    // Tombol Mute & Solo Interaktif
    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        muteBtn.classList.toggle("active");
        const isMuted = muteBtn.classList.contains("active");
        if (faderInput) faderInput.disabled = isMuted;
      });
    }

    if (soloBtn) {
      soloBtn.addEventListener("click", () => {
        soloBtn.classList.toggle("active");
      });
    }

    // Simulasi LED Meter Vertikal Dinamis Berdasarkan Posisi Fader
    if (faderInput && ledSpans.length > 0) {
      setInterval(() => {
        if (mixerPage && mixerPage.style.display !== "none") {
          const faderVal = parseFloat(faderInput.value);
          // Jika fader terlalu rendah atau di-mute, matikan LED
          if (faderVal < -30 || (muteBtn && muteBtn.classList.contains("active"))) {
            ledSpanLoop(ledSpans, 0);
            return;
          }
          // Hitung jumlah lampu LED yang menyala berdasarkan besar fader
          const activeSegments = Math.min(ledSpans.length, Math.max(1, Math.floor((faderVal + 40) / 5) + Math.floor(Math.random() * 3)));
          ledSpanLoop(ledSpans, activeSegments);
        }
      }, 150);
    }
  });

  // 3. Tombol Section Select di Panel Kanan Layar TFT
  const consoleBtns = document.querySelectorAll(".mixer-control-section .console-btn");
  consoleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      consoleBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function ledSpanLoop(spans, count) {
  spans.forEach((span, idx) => {
    // Urutan dari bawah ke atas
    const targetIdx = spans.length - 1 - idx;
    if (targetIdx < count) {
      span.classList.add("on");
    } else {
      span.classList.remove("on");
    }
  });
}

