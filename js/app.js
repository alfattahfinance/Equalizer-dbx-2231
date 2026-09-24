/* =========================================================
   APPLICATION NAVIGATION & STATE
   ========================================================= */

const pageContainer = document.getElementById("pageContainer") || (() => {
  const c = document.createElement("main");
  c.className = "app";
  c.id = "pageContainer";
  document.body.appendChild(c);
  return c;
})();

let equalizerPage = null;
let echoPage = null;
let mixerPage = null;

let bleDevice = null;
let bleServer = null;
let eqCharacteristic = null;

const ESP32_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const ESP32_CHAR_UUID    = "abcdef01-2345-6789-0123-456789abcdef";

function setStatus(msg) { 
  console.log("Status: " + msg); 
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
   EQUALIZER PAGE
   ========================================================= */

const frequencies = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250,
  1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000,
  10000, 12500, 16000, 20000
];

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
      <div style="display:flex; gap:6px;">
        <select id="presetSelect">
          <option value="flat">FLAT</option>
          <option value="vocal">VOKAL CLEAR</option>
          <option value="live">LIVE BAND</option>
          <option value="feedback">ANTI-FEEDBACK</option>
        </select>
        <button class="hardware-button" id="applyPresetButton" type="button">APPLY</button>
      </div>
    </section>

    <div class="channels-scroll">
      <section class="channels" id="channels">
        <!-- CH 1 -->
        <article class="channel" data-channel="0">
          <div class="channel-header">
            <div class="channel-label">
              <span class="power-led" id="ch0_active_led"></span>
              <span>CHANNEL 1</span>
            </div>
            <div class="channel-status">
              <button class="status-light bypass">BYPASS</button>
              <button class="status-light test">TEST</button>
            </div>
          </div>
          
          <div class="control-row">
            <div class="control-box">
              <div class="control-title">GAIN</div>
              <input class="gain gain-slider" type="range" min="-12" max="12" step="0.5" value="0">
              <div class="gain-value"><span>-12dB</span><strong class="g-val" style="color:var(--orange)">0.0dB</strong><span>+12dB</span></div>
            </div>
            
            <div class="control-box">
              <div class="control-title">HPF</div>
              <select class="hpf" style="width:100%;">
                <option value="off">OFF</option>
                <option value="40">40 Hz</option>
                <option value="80">80 Hz</option>
                <option value="120">120 Hz</option>
              </select>
            </div>

            <div class="control-box">
              <div class="control-title">RANGE</div>
              <select class="range" style="width:100%;">
                <option value="6">±6 dB</option>
                <option value="15" selected>±15 dB</option>
              </select>
            </div>

            <div class="control-box" style="display:flex; flex-direction:column; justify-content:center;">
              <div class="control-title" style="margin-bottom:4px;">OUTPUT METER</div>
              <div class="led-meter">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>

            <div class="clip-box">
              <div class="clip-led"></div>
              <div class="clip-text">CLIP</div>
            </div>
          </div>

          <div class="eq-wrapper">
            <div class="eq-scale">
              <span>25Hz</span><span>100Hz</span><span>400Hz</span><span>1kHz</span><span>4kHz</span><span>16kHz</span><span>20kHz</span>
            </div>
            <div class="eq-area">
              <div class="db-scale"><span>+15</span><span>+6</span><span>0</span><span>-6</span><span>-15</span></div>
              <div class="bands"></div>
            </div>
          </div>
        </article>

        <!-- CH 2 -->
        <article class="channel" data-channel="1">
          <div class="channel-header">
            <div class="channel-label">
              <span class="power-led" id="ch1_active_led"></span>
              <span>CHANNEL 2</span>
            </div>
            <div class="channel-status">
              <button class="status-light bypass">BYPASS</button>
              <button class="status-light test">TEST</button>
            </div>
          </div>
          
          <div class="control-row">
            <div class="control-box">
              <div class="control-title">GAIN</div>
              <input class="gain gain-slider" type="range" min="-12" max="12" step="0.5" value="0">
              <div class="gain-value"><span>-12dB</span><strong class="g-val" style="color:var(--orange)">0.0dB</strong><span>+12dB</span></div>
            </div>
            
            <div class="control-box">
              <div class="control-title">HPF</div>
              <select class="hpf" style="width:100%;">
                <option value="off">OFF</option>
                <option value="40">40 Hz</option>
                <option value="80">80 Hz</option>
                <option value="120">120 Hz</option>
              </select>
            </div>

            <div class="control-box">
              <div class="control-title">RANGE</div>
              <select class="range" style="width:100%;">
                <option value="6">±6 dB</option>
                <option value="15" selected>±15 dB</option>
              </select>
            </div>

            <div class="control-box" style="display:flex; flex-direction:column; justify-content:center;">
              <div class="control-title" style="margin-bottom:4px;">OUTPUT METER</div>
              <div class="led-meter">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>

            <div class="clip-box">
              <div class="clip-led"></div>
              <div class="clip-text">CLIP</div>
            </div>
          </div>

          <div class="eq-wrapper">
            <div class="eq-scale">
              <span>25Hz</span><span>100Hz</span><span>400Hz</span><span>1kHz</span><span>4kHz</span><span>16kHz</span><span>20kHz</span>
            </div>
            <div class="eq-area">
              <div class="db-scale"><span>+15</span><span>+6</span><span>0</span><span>-6</span><span>-15</span></div>
              <div class="bands"></div>
            </div>
          </div>
        </article>
      </section>
    </div>
  `;

  pageContainer.appendChild(page);
  equalizerPage = page;
  initEqualizerBands(page);
  return page;
}

function initEqualizerBands(page) {
  const channelEls = page.querySelectorAll(".channel");
  channelEls.forEach((channelEl, chIdx) => {
    const bandsContainer = channelEl.querySelector(".bands");
    if (!bandsContainer || bandsContainer.children.length > 0) return;

    frequencies.forEach((freq, idx) => {
      const bandDiv = document.createElement("div");
      bandDiv.className = "band";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "-15";
      slider.max = "15";
      slider.step = "0.5";
      slider.value = "0";

      const freqLabel = document.createElement("div");
      freqLabel.className = "band-frequency";
      freqLabel.textContent = freq >= 1000 ? (freq/1000) + "k" : freq;

      const valLabel = document.createElement("div");
      valLabel.className = "band-value";
      valLabel.textContent = "0.0";

      slider.addEventListener("input", () => {
        valLabel.textContent = Number(slider.value).toFixed(1);
        sendDataToESP32(JSON.stringify({ type: "eq", ch: chIdx, band: idx, val: slider.value }));
      });

      bandDiv.appendChild(slider);
      bandDiv.appendChild(freqLabel);
      bandDiv.appendChild(valLabel);
      bandsContainer.appendChild(bandDiv);
    });

    // Event Gain & Buttons
    const gainInp = channelEl.querySelector(".gain");
    const gainValStr = channelEl.querySelector(".g-val");
    if (gainInp && gainValStr) {
      gainInp.addEventListener("input", () => {
        gainValStr.textContent = Number(gainInp.value).toFixed(1) + "dB";
      });
    }

    const bypassBtn = channelEl.querySelector(".status-light.bypass");
    if (bypassBtn) {
      bypassBtn.addEventListener("click", () => bypassBtn.classList.toggle("active"));
    }
    const testBtn = channelEl.querySelector(".status-light.test");
    if (testBtn) {
      testBtn.addEventListener("click", () => testBtn.classList.toggle("active"));
    }
  });
}

/* =========================================================
   ECHO PROCESSOR PAGE
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

    <div style="margin-top: 15px; background: var(--panel); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
      <div style="font-weight: bold; margin-bottom: 12px; color: var(--blue-bright);">EFFECT PARAMETERS</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="background: var(--panel-2); padding: 12px; border-radius: 6px;">
          <label style="font-size:11px; color:var(--muted);">DELAY TIME</label>
          <input type="range" id="echoDelay" min="50" max="1000" step="10" value="300" style="width:100%; margin:8px 0;">
          <div style="text-align:right; font-size:11px; color:var(--orange);" id="echoDelayVal">300 ms</div>
        </div>
        <div style="background: var(--panel-2); padding: 12px; border-radius: 6px;">
          <label style="font-size:11px; color:var(--muted);">FEEDBACK</label>
          <input type="range" id="echoFeedback" min="0" max="0.9" step="0.05" value="0.4" style="width:100%; margin:8px 0;">
          <div style="text-align:right; font-size:11px; color:var(--orange);" id="echoFeedbackVal">40%</div>
        </div>
      </div>
    </div>
  `;

  pageContainer.appendChild(page);
  echoPage = page;
  return page;
}

function renderEcho() {
  renderEchoPage();
}
/* =========================================================
   DIGITAL MIXER PAGE (FIXED & FULLY INTERACTIVE)
   ========================================================= */

function renderMixerPage() {
  const page = document.createElement("section");
  page.className = "app-page";
  page.id = "mixerPage";

  page.innerHTML = `
    <div class="mixer-console">
      <div class="mixer-top-console" style="display: grid; grid-template-columns: 1fr; gap: 12px; background: #040609; border: 1px solid #21262d; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        
        <!-- LAYAR TFT UTAMA -->
        <div class="mixer-tft-screen">
          <div class="tft-header">
            <span id="tftSectionTitle">CONFIG / PREAMP INTERFACE</span>
            <span style="color: #10b981;">● DSP: 48kHz / 32-bit</span>
          </div>

          <!-- Tab Menu Layar Atas (Dibuat sebagai tombol interaktif) -->
          <div style="display: flex; gap: 4px; background: #0f172a; padding: 4px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #1e293b; overflow-x: auto;">
            <button class="tft-tab active" data-tab="home" style="background: #0284c7; color: #fff; border: 1px solid #38bdf8; font-size: 9px; font-weight: bold; padding: 4px 8px; border-radius: 3px; cursor: pointer;">HOME</button>
            <button class="tft-tab" data-tab="meters" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; font-size: 9px; font-weight: bold; padding: 4px 8px; border-radius: 3px; cursor: pointer;">METERS</button>
            <button class="tft-tab" data-tab="routing" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; font-size: 9px; font-weight: bold; padding: 4px 8px; border-radius: 3px; cursor: pointer;">ROUTING</button>
            <button class="tft-tab" data-tab="setup" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; font-size: 9px; font-weight: bold; padding: 4px 8px; border-radius: 3px; cursor: pointer;">SETUP</button>
            <button class="tft-tab" data-tab="library" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; font-size: 9px; font-weight: bold; padding: 4px 8px; border-radius: 3px; cursor: pointer;">LIBRARY</button>
            <button class="tft-tab" data-tab="effects" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; font-size: 9px; font-weight: bold; padding: 4px 8px; border-radius: 3px; cursor: pointer;">EFFECTS</button>
          </div>

          <!-- Tampilan Utama Konten Layar -->
          <div style="background: #020408; border: 1px solid #1e293b; border-radius: 4px; height: 105px; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
            <div id="tftContentArea" style="font-size: 11px; color: #38bdf8; line-height: 1.4;">
              <div><b>Preamp Gain:</b> +12.0 dB | <b>Phantom (+48V):</b> ON | <b>Phase:</b> Normal</div>
              <div style="margin-top: 6px; color: #94a3b8;">Atur parameter input gain dan sumber sinyal kanal aktif melalui kontrol fisik di samping.</div>
            </div>
            <div style="font-size: 9px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 4px; display: flex; justify-content: space-between;">
              <span id="tftActiveChannel">CH 01: Lead Vocal</span>
              <span>Gate/Comp/EQ/Insert Active</span>
            </div>
          </div>

          <!-- 6 Encoders Fisik di Bawah Layar (Interaktif) -->
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 6px; background: #090d16; padding: 4px; border-radius: 4px; border: 1px solid #1e293b;">
            <div class="tft-encoder-knob" data-enc="gain" style="background: linear-gradient(180deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 4px; text-align: center; padding: 4px 2px; font-size: 8px; color: #cbd5e1; font-family: monospace; cursor: pointer;">GAIN<span id="enc1Val" style="display: block; color: #38bdf8; font-weight: bold; font-size: 9px; margin-top: 2px;">+12dB</span></div>
            <div class="tft-encoder-knob" data-enc="hpf" style="background: linear-gradient(180deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 4px; text-align: center; padding: 4px 2px; font-size: 8px; color: #cbd5e1; font-family: monospace; cursor: pointer;">HPF<span id="enc2Val" style="display: block; color: #38bdf8; font-weight: bold; font-size: 9px; margin-top: 2px;">80Hz</span></div>
            <div class="tft-encoder-knob" data-enc="thresh" style="background: linear-gradient(180deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 4px; text-align: center; padding: 4px 2px; font-size: 8px; color: #cbd5e1; font-family: monospace; cursor: pointer;">THRESH<span id="enc3Val" style="display: block; color: #38bdf8; font-weight: bold; font-size: 9px; margin-top: 2px;">-18dB</span></div>
            <div class="tft-encoder-knob" data-enc="ratio" style="background: linear-gradient(180deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 4px; text-align: center; padding: 4px 2px; font-size: 8px; color: #cbd5e1; font-family: monospace; cursor: pointer;">RATIO<span id="enc4Val" style="display: block; color: #38bdf8; font-weight: bold; font-size: 9px; margin-top: 2px;">3:1</span></div>
            <div class="tft-encoder-knob" data-enc="freq" style="background: linear-gradient(180deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 4px; text-align: center; padding: 4px 2px; font-size: 8px; color: #cbd5e1; font-family: monospace; cursor: pointer;">FREQ<span id="enc5Val" style="display: block; color: #38bdf8; font-weight: bold; font-size: 9px; margin-top: 2px;">2.5kHz</span></div>
            <div class="tft-encoder-knob" data-enc="mix" style="background: linear-gradient(180deg, #1e293b, #0f172a); border: 1px solid #475569; border-radius: 4px; text-align: center; padding: 4px 2px; font-size: 8px; color: #cbd5e1; font-family: monospace; cursor: pointer;">MIX<span id="enc6Val" style="display: block; color: #38bdf8; font-weight: bold; font-size: 9px; margin-top: 2px;">0.0dB</span></div>
          </div>
        </div>

        <!-- Bagian Tombol Kanan Layar (Section Control) -->
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
            <div class="vert-led-meter" id="mixerMeter1">
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
            <div class="vert-led-meter" id="mixerMeter2">
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
            <div class="vert-led-meter" id="mixerMeter3">
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
            <div class="vert-led-meter" id="mixerMeter4">
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
            <div class="vert-led-meter" id="mixerMeterMaster">
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
   SHOW PAGE & NAVIGATION
   ========================================================= */

function showPage(pageName) {
  if (equalizerPage) equalizerPage.style.display = pageName === "equalizer" ? "block" : "none";
  if (echoPage) echoPage.style.display = pageName === "echo" ? "block" : "none";
  if (mixerPage) mixerPage.style.display = pageName === "mixer" ? "block" : "none";

  document.querySelectorAll(".page-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageName);
  });
}

document.querySelectorAll(".page-button").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  renderEqualizerPage();
  renderEcho();
  renderMixer();
  showPage("equalizer");
});

/* =========================================================
   DIGITAL MIXER LOGIC & INTERACTIVITY (FIXED)
   ========================================================= */

function initDigitalMixerFunctions() {
  if (!mixerPage) return;

  const tftSectionTitle = mixerPage.querySelector("#tftSectionTitle");
  const tftContentArea = mixerPage.querySelector("#tftContentArea");

  // 1. Logika Tombol Section Select (CONFIG, GATE, DYNAMICS, EQ, SENDS, MAIN)
  const consoleBtns = mixerPage.querySelectorAll(".mixer-control-section .console-btn");

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

  // 2. Logika Tab Menu Layar Atas (HOME, METERS, ROUTING, SETUP, LIBRARY, EFFECTS)
  const tftTabs = mixerPage.querySelectorAll(".tft-tab");
  tftTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tftTabs.forEach(t => {
        t.classList.remove("active");
        t.style.background = "#1e293b";
        t.style.color = "#94a3b8";
        t.style.borderColor = "#334155";
      });
      tab.classList.add("active");
      tab.style.background = "#0284c7";
      tab.style.color = "#fff";
      tab.style.borderColor = "#38bdf8";

      const tabName = tab.dataset.tab;
      if (tftContentArea) {
        if (tabName === "meters") {
          tftContentArea.innerHTML = "<div style='color:#10b981;'><b>RTA & Multi-Channel Meters Active:</b> Menampilkan grafik tingkat sinyal real-time seluruh bus input/output.</div>";
        } else if (tabName === "routing") {
          tftContentArea.innerHTML = "<div style='color:#f59e0b;'><b>Signal Routing Matrix:</b> USB Audio, Analog Inputs, dan Aux Assign.</div>";
        } else if (tabName === "effects") {
          tftContentArea.innerHTML = "<div style='color:#38bdf8;'><b>FX Rack 1-4:</b> Dual Digital Delay, Vintage Room Reverb, Graphic EQ Insert.</div>";
        } else if (tabName === "setup") {
          tftContentArea.innerHTML = "<div style='color:#a855f7;'><b>Console Setup & Preferences:</b> Sample Rate 48kHz, Word Clock Internal, OSC Net.</div>";
        } else if (tabName === "library") {
          tftContentArea.innerHTML = "<div style='color:#ec4899;'><b>Preset Library:</b> Recall saved channel strips and effects patches.</div>";
        } else {
          tftContentArea.innerHTML = "<div><b>System Home View:</b> Status DSP Normal, Firmware v4.02.</div>";
        }
      }
    });
  });

  // 3. Logika Interaksi 6 Encoders Fisik di Bawah Layar
  const encoders = mixerPage.querySelectorAll(".tft-encoder-knob");
  encoders.forEach(enc => {
    enc.addEventListener("click", () => {
      const spanValue = enc.querySelector("span");
      if (spanValue) {
        spanValue.style.color = "#f59e0b";
        setTimeout(() => spanValue.style.color = "#38bdf8", 300);
      }
      if (tftContentArea) {
        tftContentArea.innerHTML += `<div style='font-size:9px; color:#fbbf24; margin-top:2px;'>Encoder [${enc.textContent.trim().split('\n')[0]}] disesuaikan.</div>`;
        tftContentArea.scrollTop = tftContentArea.scrollHeight;
      }
    });
  });

  // 4. Interaksi fader kanal & tombol bawah
  const channelStrips = mixerPage.querySelectorAll(".console-channel-strip");
  channelStrips.forEach(strip => {
    const faderInput = strip.querySelector("input[type='range']");
    const readout = strip.querySelector(".fader-readout");
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
  });
}
  // Logika Tombol Section Select (CONFIG, GATE, DYNAMICS, EQ, SENDS, MAIN)
  const consoleBtns = mixerPage.querySelectorAll(".mixer-control-section .console-btn");
  const tftSectionTitle = mixerPage.querySelector("#tftSectionTitle");
  const tftContentArea = mixerPage.querySelector("#tftContentArea");

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
