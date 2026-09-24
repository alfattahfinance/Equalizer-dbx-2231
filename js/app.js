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
            <span id="tftSectionTitle">CONFIG / PREAMP INTERFACE</span>
            <span style="color: #10b981;">● ONLINE LINKED</span>
          </div>
          <div class="tft-body" style="grid-template-columns: 1fr;">
            <div id="tftContentArea" style="background: #020408; border: 1px solid #111827; border-radius: 4px; padding: 8px; font-size: 11px; color: #38bdf8; overflow-y: auto;">
              <div><b>Preamp Gain:</b> +12.0 dB | <b>Phantom (+48V):</b> ON | <b>Phase:</b> Normal</div>
              <div style="margin-top: 6px; color: #94a3b8;">Atur parameter input gain dan sumber sinyal kanal aktif.</div>
            </div>
          </div>
        </div>
        <div class="mixer-control-section">
          <div style="font-size: 10px; font-weight: bold; color: #38bdf8; margin-bottom: 4px;">SECTION SELECT</div>
          <div class="section-grid-btns">
            <button class="console-btn active" data-section="config">CONFIG</button>
            <button class="console-btn" data-section="gate">GATE</button>
            <button class="console-btn" data-section="dynamics">DYNAMICS</button>
            <button class="console-btn" data-section="eq">EQ</button>
            <button class="console-btn" data-section="sends">SENDS</button>
            <button class="console-btn" data-section="main">MAIN</button>
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
  initDigitalMixerFunctions();
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
  const channelStrips = mixerPage ? mixerPage.querySelectorAll(".console-channel-strip") : [];
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

    if (faderInput && ledSpans.length > 0) {
      setInterval(() => {
        if (mixerPage && mixerPage.style.display !== "none") {
          const faderVal = parseFloat(faderInput.value);
          if (faderVal < -30 || (muteBtn && muteBtn.classList.contains("active"))) {
            ledSpanLoop(ledSpans, 0);
            return;
          }
          const activeSegments = Math.min(ledSpans.length, Math.max(1, Math.floor((faderVal + 40) / 5) + Math.floor(Math.random() * 3)));
          ledSpanLoop(ledSpans, activeSegments);
        }
      }, 150);
    }
  });

  // Logika Tombol Section Select (CONFIG, GATE, DYNAMICS, EQ, SENDS, MAIN)
  const consoleBtns = mixerPage ? mixerPage.querySelectorAll(".mixer-control-section .console-btn") : [];
  const tftSectionTitle = mixerPage ? mixerPage.querySelector("#tftSectionTitle") : null;
  const tftContentArea = mixerPage ? mixerPage.querySelector("#tftContentArea") : null;

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

      const sectionKey = btn.dataset.section;
      if (sectionData[sectionKey] && tftSectionTitle && tftContentArea) {
        tftSectionTitle.textContent = sectionData[sectionKey].title;
        tftContentArea.innerHTML = sectionData[sectionKey].content;
      }
    });
  });
}

function ledSpanLoop(spans, count) {
  spans.forEach((span, idx) => {
    const targetIdx = spans.length - 1 - idx;
    if (targetIdx < count) {
      span.classList.add("on");
    } else {
      span.classList.remove("on");
    }
  });
}
