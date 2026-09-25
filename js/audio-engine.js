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

/* =========================================================
   TIGA TAB NAVIGASI UTAMA
========================================================= */
.mode-switch-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.tab-btn {
  background: #1a222d;
  color: #94a3b8;
  border: 1px solid #3a414b;
  padding: 10px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 12px;
  text-align: center;
  transition: all 0.2s;
}
.tab-btn.active {
  background: #2563eb;
  color: #fff;
  border-color: #3b82f6;
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
}

.tab-content { display: none; }
.tab-content.active { display: block; }

/* =========================================================
   RACK & CHANNEL CONTAINER (EQUALIZER)
========================================================= */
.rack { background: #14181f; border: 1px solid #3a414b; border-radius: 8px; padding: 12px; }
.rack-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #2a323d; padding-bottom: 8px; }
.model { font-size: 14px; font-weight: bold; color: #f59e0b; }
.grade { font-size: 10px; color: #94a3b8; }

.channels { display: flex; flex-direction: column; gap: 14px; }
.channel { background: #1b2027; border: 1px solid #3a414b; border-radius: 8px; padding: 10px; }
.channel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.channel-title-group { display: flex; align-items: center; gap: 8px; }

/* LED Indikator */
.status-led { width: 8px; height: 8px; border-radius: 50%; background: #252b35; border: 1px solid #485260; display: inline-block; }
.status-led.active-led { background: #10b981; border-color: #34d399; box-shadow: 0 0 6px #10b981; }
.status-led.bypass-led { background: #ef4444; border-color: #f87171; box-shadow: 0 0 6px #ef4444; }
.status-led.test-led { background: #f59e0b; border-color: #fbbf24; box-shadow: 0 0 6px #f59e0b; }

.channel-title { font-size: 12px; font-weight: bold; color: #38bdf8; }
.channel-controls { display: flex; gap: 6px; align-items: center; }
.small-button { background: #252b35; color: #cbd5e1; border: 1px solid #485260; padding: 3px 8px; font-size: 10px; border-radius: 3px; display: flex; align-items: center; gap: 4px; }
.small-button.active { background: #ef4444; color: #fff; border-color: #f87171; }
.small-button.test-button.active { background: #f59e0b; color: #000; }

.control-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; background: #101216; padding: 8px; border-radius: 6px; margin-bottom: 8px; align-items: center; }
.control label { display: block; font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
.control input[type="range"] { width: 100%; accent-color: #f59e0b; }
.gain-value { font-size: 10px; color: #f59e0b; text-align: center; font-family: monospace; }
.control select { width: 100%; background: #1e293b; color: #fff; border: 1px solid #485260; padding: 4px; font-size: 11px; border-radius: 4px; }

.eq-section { width: 100%; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
.eq { display: grid; grid-template-columns: repeat(31, 38px); gap: 4px; min-width: max-content; }
.band { background: #101216; border: 1px solid #2a323d; border-radius: 4px; padding: 4px 2px; display: flex; flex-direction: column; align-items: center; height: 230px; position: relative; }
.band-frequency { font-size: 8px; color: #94a3b8; margin-bottom: 4px; text-align: center; }

.band input[type="range"] {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 16px;
  height: 165px;
  accent-color: #38bdf8;
  cursor: pointer;
  position: relative;
  z-index: 2;
}

.slider-track-container {
  position: relative;
  height: 165px;
  width: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.band-value { font-size: 8px; color: #38bdf8; margin-top: 4px; font-family: monospace; text-align: center; }
.scale { display: flex; justify-content: space-between; font-size: 9px; color: #64748b; padding: 2px 4px; }

/* =========================================================
   PANEL ALESIS (EFFECTS PROCESSOR)
========================================================= */
.echo-panel-box {
  background: #161a22;
  border: 1px solid #3a414b;
  border-radius: 8px;
  padding: 20px;
}
.echo-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.echo-onoff-btn {
  background: #252b35; color: #fff; border: 1px solid #485260; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 12px;
}
.echo-onoff-btn.active {
  background: #10b981; border-color: #34d399; color: #000; box-shadow: 0 0 8px #10b981;
}
.echo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.echo-control-card { background: #101216; border: 1px solid #2a323d; padding: 15px; border-radius: 6px; }
.echo-control-card label { display: block; font-size: 11px; color: #38bdf8; margin-bottom: 6px; font-weight: bold; }
.echo-control-card input[type="range"] { width: 100%; accent-color: #38bdf8; margin-bottom: 6px; }
.echo-val { font-size: 11px; color: #f59e0b; font-family: monospace; text-align: right; }

/* =========================================================
   DIGITAL MIXER CONSOLE - PROFESSIONAL LAYOUT (MIDAS/X32 STYLE)
========================================================= */
.mixer-console {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
}

.mixer-top-console {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  background: #040609;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.mixer-tft-screen {
  background: #05080c;
  border: 2px solid #2d3748;
  border-radius: 8px;
  padding: 8px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 4px;
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: bold;
  color: #38bdf8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tft-top-tabs {
  display: flex;
  gap: 3px;
  background: #0f172a;
  padding: 3px;
  border-radius: 4px;
  margin-bottom: 6px;
  border: 1px solid #1e293b;
  overflow-x: auto;
}

.tft-tab {
  background: #1e293b;
  color: #94a3b8;
  border: none;
  font-size: 8px;
  font-weight: bold;
  padding: 3px 6px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tft-tab.active { background: #0284c7; color: #fff; }

.tft-main-viewport {
  background: #020408;
  border: 1px solid #1e293b;
  border-radius: 4px;
  min-height: 95px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tft-content-screen { font-size: 10px; color: #38bdf8; line-height: 1.3; }

.tft-encoders-bar {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  margin-top: 6px;
  background: #090d16;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #1e293b;
}

.tft-encoder-knob {
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border: 1px solid #475569;
  border-radius: 4px;
  text-align: center;
  padding: 3px 1px;
  font-size: 7px;
  color: #cbd5e1;
  font-family: monospace;
}

.tft-encoder-knob span { display: block; color: #38bdf8; font-weight: bold; font-size: 8px; margin-top: 1px; }

.mixer-control-section {
  background: #11161d;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.section-grid-btns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }

.console-btn {
  background: #1f2937; color: #cbd5e1; border: 1px solid #374151; font-size: 9px; font-weight: bold; padding: 6px 2px; border-radius: 3px; text-align: center;
}
.console-btn.active { background: #0284c7; color: #fff; border-color: #38bdf8; }

.mixer-desk-surface { display: grid; grid-template-columns: repeat(4, 1fr) 1.25fr; gap: 10px; overflow-x: auto; }

.console-channel-strip {
  background: linear-gradient(180deg, #161b22, #0d1117);
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}

.console-channel-strip.master-strip { background: linear-gradient(180deg, #221a10, #110c05); border-color: #d97706; }

.strip-label-box {
  background: #0b0f15; border: 1px solid #21262d; border-radius: 4px; width: 100%; padding: 5px; text-align: center; margin-bottom: 8px; font-size: 11px; font-weight: bold; color: #38bdf8; letter-spacing: 0.5px;
}
.master-strip .strip-label-box { color: #fbbf24; border-color: #78350f; background: #140d04; }

.strip-knobs-area {
  width: 100%; background: #080c10; border: 1px solid #1f2937; border-radius: 4px; padding: 6px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px;
}
.knob-row { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; }
.knob-row select { background: #111827; color: #fff; border: 1px solid #374151; font-size: 9px; padding: 2px; border-radius: 3px; }

.fader-panel-area { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.vert-led-meter {
  display: flex; flex-direction: column; gap: 2px; width: 8px; height: 190px; background: #020408; border: 1px solid #1f2937; padding: 3px 1px; border-radius: 3px;
}
.vert-led-meter span { flex: 1; background: #111827; border-radius: 1px; }
.vert-led-meter span.green.on { background: #10b981 !important; box-shadow: 0 0 4px #10b981; }
.vert-led-meter span.yellow.on { background: #f59e0b !important; box-shadow: 0 0 4px #f59e0b; }
.vert-led-meter span.red.on { background: #ef4444 !important; box-shadow: 0 0 4px #ef4444; }

.fader-slot { position: relative; height: 190px; width: 28px; display: flex; justify-content: center; align-items: center; background: #05070a; border: 1px solid #1f2937; border-radius: 4px; }
.fader-slot input[type="range"] { writing-mode: vertical-lr; direction: rtl; width: 18px; height: 175px; accent-color: #38bdf8; cursor: pointer; }
.master-strip .fader-slot input[type="range"] { accent-color: #fbbf24; }

.fader-readout { font-size: 10px; font-family: monospace; color: #38bdf8; margin-bottom: 6px; font-weight: bold; }
.master-strip .fader-readout { color: #fbbf24; }

.strip-action-buttons { display: flex; gap: 4px; width: 100%; }
.console-action-btn { flex: 1; background: #21262d; color: #cbd5e1; border: 1px solid #374151; padding: 6px 2px; font-size: 9px; font-weight: bold; border-radius: 3px; text-align: center; }
.console-action-btn.mute.active { background: #ef4444; color: #fff; border-color: #f87171; }
.console-action-btn.solo.active { background: #f59e0b; color: #000; border-color: #fbbf24; }

/* Audio & Bluetooth Panel */
.audio-panel { background: #1b2027; border: 1px solid #3a414b; border-radius: 8px; padding: 12px; margin-top: 14px; }
.audio-panel h3 { margin: 0 0 10px 0; font-size: 12px; color: #38bdf8; }
.audio-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.bt-panel {
  width: 100%; background: #101216; padding: 10px; border-radius: 6px; border: 1px solid #2a323d; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
}
.bt-info { font-size: 10px; color: #94a3b8; }
#connectBtButton { background: #3b82f6; color: white; border: 1px solid #60a5fa; padding: 6px 14px; border-radius: 4px; font-weight: bold; }
#connectBtButton.connected { background: #10b981; border-color: #34d399; }

.audio-actions button, .file-button {
  background: #252b35; color: #fff; border: 1px solid #485260; padding: 6px 12px; font-size: 11px; border-radius: 4px; font-weight: bold; display: inline-flex; align-items: center; cursor: pointer;
}
.audio-actions button:hover, .file-button:hover { background: #334155; }
.audio-actions button.active { background: #10b981; border-color: #34d399; color: #000; }

.playlist-container { width: 100%; background: #101216; border: 1px solid #2a323d; border-radius: 6px; padding: 8px; margin: 8px 0; max-height: 100px; overflow-y: auto; font-size: 10px; color: #94a3b8; }
.playlist-item { display: flex; justify-content: space-between; padding: 3px 6px; border-bottom: 1px solid #1e293b; cursor: pointer; }
.playlist-item:hover { background: #1e293b; color: #fff; }
.playlist-item.playing { color: #38bdf8; font-weight: bold; }

audio { width: 100%; height: 35px; margin: 8px 0; }
.output-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #101216; padding: 8px; border-radius: 6px; margin-top: 8px; }
.output-control label { display: block; font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
.output-control input[type="range"] { width: 100%; accent-color: #f59e0b; }
.master-value { font-size: 10px; color: #f59e0b; font-family: monospace; text-align: center; }
.output-control select { width: 100%; background: #1e293b; color: #fff; border: 1px solid #485260; padding: 4px; font-size: 11px; border-radius: 4px; }
#muteOutput.active { background: #ef4444 !important; color: #fff !important; border-color: #f87171; }

.device-status, .feedback-status, .audio-status, .status { font-size: 10px; color: #94a3b8; margin-top: 4px; }
.footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 15px; }

@media (max-width: 768px) {
  .control-row, .output-panel, .echo-grid { grid-template-columns: 1fr; }
}

.tft-visual-meters { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.tft-meter-row { display: flex; align-items: center; gap: 8px; font-size: 9px; font-family: monospace; color: #94a3b8; }
.tft-meter-bar { flex-grow: 1; height: 8px; background: #090d16; border: 1px solid #1e293b; border-radius: 2px; display: flex; gap: 1px; padding: 1px; }
.tft-meter-bar span { flex: 1; background: #111827; border-radius: 1px; }
.tft-curve-box { display: flex; justify-content: space-around; align-items: flex-end; height: 40px; background: #03060a; border: 1px solid #1e293b; border-radius: 3px; padding: 2px 4px; margin-top: 4px; }
.tft-curve-bar { width: 8px; background: #0284c7; border-radius: 2px 2px 0 0; transition: height 0.2s; }
  </style>
</head>

<body>
  <main class="app">
    <header class="topbar">
      <div>
        <div class="brand">AUDIO PROCESSOR ONLINE</div>
        <div class="subtitle">GQX-3102 Equalizer, Alesis FX & Digital Mixer Console + ESP32 BLE</div>
      </div>
      <div class="actions">
        <button id="saveButton">SAVE</button>
        <button id="loadButton">RECALL</button>
        <button id="resetButton">RESET</button>
      </div>
    </header>

    <!-- TIGA TAB NAVIGASI UTAMA -->
    <nav class="mode-switch-bar">
      <button class="tab-btn active" id="tabEqBtn">🎛️ EQUALIZER</button>
      <button class="tab-btn" id="tabEchoBtn">🔊 ALESIS FX</button>
      <button class="tab-btn" id="tabMixerBtn">🎚️ DIGITAL MIXER</button>
    </nav>

    <!-- KONTEN TAB 1: EQUALIZER -->
    <div class="tab-content active" id="tabEqContent">
      <section class="rack">
        <div class="rack-header">
          <div>
            <div class="model">GQX-3102</div>
            <div class="grade">GRADE A • GRAPHIC EQUALIZER</div>
          </div>
          <div class="actions">
            <button id="flatButton">FLAT</button>
            <button id="vocalButton">VOCAL</button>
            <button id="musicButton">MUSIC</button>
          </div>
        </div>

        <section class="channels">
          <!-- CHANNEL 1 -->
          <article class="channel" data-channel="0">
            <div class="channel-header">
              <div class="channel-title-group">
                <span class="status-led active-led" id="ch0_active_led"></span>
                <div class="channel-title">CHANNEL 1</div>
              </div>
              <div class="channel-controls">
                <button class="small-button bypass-button"><span class="status-led bypass-led"></span> BYPASS</button>
                <button class="small-button test-button"><span class="status-led test-led"></span> TEST</button>
              </div>
            </div>
            <div class="control-row">
              <div class="control">
                <label>GAIN</label>
                <input class="gain" type="range" min="-12" max="12" step="0.5" value="0">
                <div class="gain-value">0.0 dB</div>
              </div>
              <div class="control">
                <label>HPF</label>
                <select class="hpf">
                  <option value="off">OFF</option>
                  <option value="40">40 Hz</option>
                  <option value="80">80 Hz</option>
                  <option value="120">120 Hz</option>
                </select>
              </div>
              <div class="control">
                <label>RANGE</label>
                <select class="range">
                  <option value="6">±6 dB</option>
                  <option value="15" selected>±15 dB</option>
                </select>
              </div>
            </div>
            <div class="eq-section"><div class="eq"></div></div>
            <div class="scale"><span>+15 dB</span><span>0 dB</span><span>-15 dB</span></div>
          </article>

          <!-- CHANNEL 2 -->
          <article class="channel" data-channel="1">
            <div class="channel-header">
              <div class="channel-title-group">
                <span class="status-led active-led" id="ch1_active_led"></span>
                <div class="channel-title">CHANNEL 2</div>
              </div>
              <div class="channel-controls">
                <button class="small-button bypass-button"><span class="status-led bypass-led"></span> BYPASS</button>
                <button class="small-button test-button"><span class="status-led test-led"></span> TEST</button>
              </div>
            </div>
            <div class="control-row">
              <div class="control">
                <label>GAIN</label>
                <input class="gain" type="range" min="-12" max="12" step="0.5" value="0">
                <div class="gain-value">0.0 dB</div>
              </div>
              <div class="control">
                <label>HPF</label>
                <select class="hpf">
                  <option value="off">OFF</option>
                  <option value="40">40 Hz</option>
                  <option value="80">80 Hz</option>
                  <option value="120">120 Hz</option>
                </select>
              </div>
              <div class="control">
                <label>RANGE</label>
                <select class="range">
                  <option value="6">±6 dB</option>
                  <option value="15" selected>±15 dB</option>
                </select>
              </div>
            </div>
            <div class="eq-section"><div class="eq"></div></div>
            <div class="scale"><span>+15 dB</span><span>0 dB</span><span>-15 dB</span></div>
          </article>
        </section>
      </section>
    </div>

    <!-- KONTEN TAB 2: ALESIS EFFECTS PROCESSOR -->
    <div class="tab-content" id="tabEchoContent">
      <div class="echo-panel-box">
        <div class="echo-header-row">
          <div>
            <h3 style="color: #38bdf8; margin:0 0 4px 0;">ALESIS DIGITAL EFFECTS PROCESSOR</h3>
            <p style="font-size: 11px; color: #94a3b8; margin:0;">Prosesor Efek Studio (Reverb & Delay) di antara Mixer dan Equalizer.</p>
          </div>
          <button class="echo-onoff-btn" id="echoToggleBtn">ALESIS FX: OFF</button>
        </div>
        
        <div class="echo-grid">
          <div class="echo-control-card">
            <label>DELAY TIME (Waktu Pantulan)</label>
            <input type="range" id="echoDelay" min="0.05" max="1.0" step="0.05" value="0.3">
            <div class="echo-val" id="echoDelayVal">0.30 detik</div>
          </div>
          
          <div class="echo-control-card">
            <label>FEEDBACK (Pengulangan)</label>
            <input type="range" id="echoFeedback" min="0.0" max="0.9" step="0.05" value="0.4">
            <div class="echo-val" id="echoFeedbackVal">40%</div>
          </div>

          <div class="echo-control-card">
            <label>ROOM DAMPING / TONE</label>
            <input type="range" id="echoDamping" min="1000" max="15000" step="500" value="5000">
            <div class="echo-val" id="echoDampingVal">5000 Hz</div>
          </div>

          <div class="echo-control-card">
            <label>EFFECTS MIX (Wet / Dry)</label>
            <input type="range" id="echoMix" min="0.0" max="1.0" step="0.05" value="0.3">
            <div class="echo-val" id="echoMixVal">30%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- KONTEN TAB 3: DIGITAL MIXER CONSOLE -->
    <div class="tab-content" id="tabMixerContent">
      <div class="mixer-console">
        
        <!-- BAGIAN LAYAR UTAMA & KONTROL ATAS -->
        <div class="mixer-top-console">
          
          <!-- LAYAR TFT UTAMA (MIDAS / X32 STYLE) -->
          <div class="mixer-tft-screen">
            <div class="tft-header">
              <span id="tftSectionTitle">CONFIG / PREAMP INTERFACE</span>
              <span style="color: #10b981;">● DSP: 48kHz / 32-bit</span>
            </div>

            <!-- Tab Menu Layar Atas -->
            <div class="tft-top-tabs">
              <button class="tft-tab active" data-tft-tab="home">HOME</button>
              <button class="tft-tab" data-tft-tab="meters">METERS</button>
              <button class="tft-tab" data-tft-tab="routing">ROUTING</button>
              <button class="tft-tab" data-tft-tab="setup">SETUP</button>
              <button class="tft-tab" data-tft-tab="library">LIBRARY</button>
              <button class="tft-tab" data-tft-tab="effects">EFFECTS</button>
            </div>

            <!-- Tampilan Utama Konten Layar -->
            <div class="tft-main-viewport">
              <div class="tft-content-screen" id="tftContentArea">
                <div><b>Preamp Gain:</b> +12.0 dB | <b>Phantom (+48V):</b> ON | <b>Phase:</b> Normal</div>
                <div style="margin-top: 4px; color: #94a3b8;">Alur: Mixer Input ➡️ Alesis FX ➡️ Equalizer GQX-3102 ➡️ Output</div>
              </div>
              <div style="font-size: 8px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 3px; display: flex; justify-content: space-between;">
                <span>CH 01: Lead Vocal</span>
                <span>Gate/Comp/EQ Active</span>
              </div>
            </div>

            <!-- 6 Encoders Fisik di Bawah Layar TFT -->
            <div class="tft-encoders-bar">
              <div class="tft-encoder-knob">GAIN<span id="enc1Val">+12dB</span></div>
              <div class="tft-encoder-knob">HPF<span id="enc2Val">80Hz</span></div>
              <div class="tft-encoder-knob">THRESH<span id="enc3Val">-18dB</span></div>
              <div class="tft-encoder-knob">RATIO<span id="enc4Val">3:1</span></div>
              <div class="tft-encoder-knob">FREQUENCY<span id="enc5Val">2.5kHz</span></div>
              <div class="tft-encoder-knob">MIX/SEND<span id="enc6Val">0.0dB</span></div>
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

        <!-- PERMUKAAN KONSOLE (CHANNEL STRIPS & MASTER) -->
        <div class="mixer-desk-surface" id="mixerDeskSurface"></div>

      </div>
    </div>

    <!-- PANEL AUDIO ENGINE & BLUETOOTH BERSAMA -->
    <section class="audio-panel">
      <h3>AUDIO PLAYER, MIXER & BLUETOOTH ESP32</h3>

      <div class="bt-panel">
        <div>
          <strong>KONEKSI HARDWARE ESP32</strong>
          <div id="btStatus" class="bt-info">Bluetooth terputus. Klik sambungkan untuk menghubungkan ESP32.</div>
        </div>
        <button id="connectBtButton">SAMBUNGKAN ESP32</button>
      </div>

      <div class="audio-actions">
        <div class="input-device-panel" style="width:100%; background:#101216; padding:8px; border-radius:6px; border:1px solid #2a323d; margin-bottom:8px;">
          <div class="input-device-row" style="display:flex; justify-content:space-between; align-items:flex-end; gap:8px;">
            <div>
              <label for="inputDevice">INPUT DEVICE / MIC EXTERNAL</label>
              <select id="inputDevice" style="display:block; background:#1e293b; color:#fff; border:1px solid #485260; padding:4px; font-size:11px; border-radius:4px; width:220px; margin-top:4px;">
                <option value="">Default microphone</option>
              </select>
            </div>
            <button id="refreshDevices">REFRESH</button>
          </div>
        </div>
        
        <button id="micButton">MIC INPUT</button>
        <label class="file-button">PILIH BANYAK FILE AUDIO<input id="audioFile" type="file" accept="audio/*" multiple hidden></label>
        <button id="startButton">START PLAYLIST</button>
        <button id="stopButton">STOP AUDIO</button>
      </div>

      <!-- Playlist Container -->
      <div class="playlist-container" id="playlistContainer">
        <div style="text-align: center; padding: 6px; color: #64748b;">Belum ada file audio dipilih. Klik "PILIH BANYAK FILE AUDIO".</div>
      </div>

      <audio id="audioPlayer" controls></audio>

      <div class="output-panel">
        <div class="output-control">
          <label for="masterGain">MASTER OUTPUT</label>
          <input id="masterGain" type="range" min="-30" max="0" step="1" value="-12">
          <div id="masterValue" class="master-value">-12 dB</div>
        </div>
        <div class="output-control">
          <label for="outputMode">OUTPUT MODE</label>
          <select id="outputMode">
            <option value="safe" selected>SAFE MODE</option>
            <option value="normal">NORMAL MODE</option>
          </select>
          <button id="muteOutput" style="width:100%; margin-top:8px;">MUTE OUTPUT</button>
        </div>
      </div>

      <div id="readyStatus" class="audio-status">Alur Sinyal: [MIXER INPUT] ➡️ [ALESIS FX] ➡️ [EQUALIZER GQX-3102] ➡️ [OUTPUT]</div>
      <div id="readyStatusAlesis" class="audio-status" style="display:none;"></div>
    </section>

    <div id="status" class="status">Status: sistem siap digunakan.</div>
    <div class="footer">Equalizer & Alesis FX Online • Web/PWA • Bluetooth ESP32 Ready</div>
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
   WEB BLUETOOTH API KE ESP32
========================================================= */
let bleDevice = null, bleServer = null, eqCharacteristic = null;
const ESP32_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const ESP32_CHAR_UUID    = "abcdef01-2345-6789-0123-456789abcdef";

const connectBtButton = document.getElementById("connectBtButton");
const btStatus = document.getElementById("btStatus");

connectBtButton.addEventListener("click", async () => {
  if (!navigator.bluetooth) { alert("Web Bluetooth API tidak didukung browser ini."); return; }
  try {
    if (!bleDevice || !bleDevice.gatt.connected) {
      btStatus.textContent = "Memindai perangkat ESP32...";
      bleDevice = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [ESP32_SERVICE_UUID] });
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
  eqCharacteristic = null; bleServer = null;
}

async function sendDataToESP32(dataString) {
  if (eqCharacteristic && bleDevice && bleDevice.gatt.connected) {
    try { await eqCharacteristic.writeValue(new TextEncoder().encode(dataString)); } catch (err) {}
  }
}

/* =========================================================
   DATA FREKUENSI & EQUALIZER GRAFIK RENDERING
========================================================= */
const frequencies = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250,
  1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000,
  10000, 12500, 16000, 20000
];

const channels = [...document.querySelectorAll(".channel")];
function setStatus(msg) { const el = document.getElementById("status"); if (el) el.textContent = "Status: " + msg; }
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
    slider.type = "range"; slider.min = "-15"; slider.max = "15"; slider.step = "0.5"; slider.value = "0";

    const value = document.createElement("div");
    value.className = "band-value";
    value.textContent = "0.0";

    slider.addEventListener("input", () => {
      value.textContent = Number(slider.value).toFixed(1);
      sendDataToESP32(JSON.stringify({ type: "eq", band: index, val: slider.value }));
    });

    trackContainer.appendChild(slider);
    band.append(frequencyLabel, trackContainer, value);
    eq.appendChild(band);
  });
}
channels.forEach(channel => createBands(channel));

/* =========================================================
   AUDIO ENGINE — STABLE LONG-RUN VERSION + MIXER DYNAMICS
========================================================= */
let audioContext = null;
let masterGainNode = null;
let sourceNode = null;

let stereoInputNode = null;
let stereoSplitter = null;
let stereoMerger = null;

let microphoneStream = null;
let microphoneSourceNode = null;
let audioFileSourceNode = null;

let isMuted = false;
let audioInputActive = false;
let audioGraphInitialized = false;
let audioContextReady = false;

let audioFiles = [];
let currentAudioIndex = -1;
let audioObjectUrls = [];

let mixerStrips = [
  { id: 'ch1', label: 'CH 1: MIC', gain: 0, fader: 0, muted: false, solo: false },
  { id: 'ch2', label: 'CH 2: MUSIC', gain: 0, fader: 0, muted: false, solo: false },
  { id: 'ch3', label: 'CH 3: AUX', gain: 0, fader: 0, muted: false, solo: false },
  { id: 'ch4', label: 'CH 4: FX', gain: 0, fader: 0, muted: false, solo: false },
  { id: 'master', label: 'MASTER L/R', gain: 0, fader: 0, muted: false, solo: false }
];

function buildMixerDeskUI() {
  const container = document.getElementById("mixerDeskSurface");
  if (!container) return;
  container.innerHTML = "";

  mixerStrips.forEach((strip) => {
    const isMaster = strip.id === 'master';
    const stripEl = document.createElement("div");
    stripEl.className = `console-channel-strip ${isMaster ? 'master-strip' : ''}`;
    stripEl.innerHTML = `
      <div class="strip-label-box">${strip.label}</div>
      <div class="strip-knobs-area" ${isMaster ? 'style="border-color: #78350f;"' : ''}>
        <div class="knob-row"><span>${isMaster ? 'LIMIT' : 'GAIN'}</span><span>${isMaster ? 'ON' : '+0 dB'}</span></div>
        <div class="knob-row"><span>${isMaster ? 'PROC' : 'HPF'}</span><select><option>${isMaster ? 'EQ+ECHO' : 'OFF'}</option><option>${isMaster ? 'BYPASS' : '80Hz'}</option></select></div>
      </div>
      <div class="fader-readout" id="faderVal_${strip.id}">0.0 dB</div>
      <div class="fader-panel-area">
        <div class="fader-slot">
          <input type="range" id="fader_${strip.id}" min="${isMaster ? '-50' : '-40'}" max="${isMaster ? '6' : '10'}" step="0.5" value="0">
        </div>
        <div class="vert-led-meter" id="mixerMeter_${strip.id}"></div>
      </div>
      <div class="strip-action-buttons" style="margin-top:8px;">
        <button class="console-action-btn mute" id="mute_${strip.id}">MUTE</button>
        <button class="console-action-btn ${isMaster ? 'active' : 'solo'}" id="action_${strip.id}" ${isMaster ? 'style="background:#fbbf24; color:#000;"' : ''}>${isMaster ? 'LR' : 'SOLO'}</button>
      </div>
    `;
    container.appendChild(stripEl);

    const meterContainer = stripEl.querySelector(`#mixerMeter_${strip.id}`);
    for (let i = 0; i < 10; i++) {
      const span = document.createElement("span");
      if (i < 2) span.className = "red";
      else if (i < 4) span.className = "yellow";
      else span.className = "green";
      meterContainer.appendChild(span);
    }

    const faderInput = stripEl.querySelector(`#fader_${strip.id}`);
    const readout = stripEl.querySelector(`#faderVal_${strip.id}`);
    faderInput.addEventListener("input", (e) => {
      const val = Number(e.target.value);
      readout.textContent = (val >= 0 ? "+" : "") + val.toFixed(1) + " dB";
      if (strip.id === 'master') {
        updateMasterGain();
      }
    });

    const muteBtn = stripEl.querySelector(`#mute_${strip.id}`);
    muteBtn.addEventListener("click", () => {
      muteBtn.classList.toggle("active");
      strip.muted = muteBtn.classList.contains("active");
    });
  });
}
buildMixerDeskUI();

function createAudioContext() {
  if (audioContext) {
    window.audioContext = audioContext;
    return audioContext;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio API tidak didukung oleh browser ini.");
  }
  
  audioContext = new AudioContextClass();
  window.audioContext = audioContext;
  audioContextReady = true;

  audioContext.addEventListener("statechange", () => {
    if (audioContext.state === "running") {
      setReadyStatus(audioInputActive ? "AUDIO ACTIVE" : "AUDIO ENGINE READY");
    }
  });

  masterGainNode = audioContext.createGain();
  masterGainNode.gain.value = 0;

  stereoInputNode = audioContext.createGain();
  stereoInputNode.channelCount = 2;
  stereoInputNode.channelCountMode = "explicit";
  stereoInputNode.channelInterpretation = "speakers";

  stereoSplitter = audioContext.createChannelSplitter(2);
  stereoMerger = audioContext.createChannelMerger(2);

  stereoInputNode.connect(stereoSplitter);
  stereoMerger.connect(masterGainNode);
  masterGainNode.connect(audioContext.destination);

  const masterSlider = document.getElementById("masterGain");
  const masterDb = masterSlider ? Number(masterSlider.value) : -12;
  masterGainNode.gain.value = isMuted ? 0 : dbToGain(masterDb);

  exportAudioNodes();
  audioGraphInitialized = true;
  setReadyStatus("AUDIO ENGINE & MIXER READY");
  return audioContext;
}

function exportAudioNodes() {
  window.audioContext = audioContext;
  window.masterGainNode = masterGainNode;
  window.stereoInputNode = stereoInputNode;
  window.stereoSplitter = stereoSplitter;
  window.stereoMerger = stereoMerger;
  window.sourceNode = sourceNode;
}

async function resumeAudioContext() {
  const context = createAudioContext();
  if (context.state === "suspended") {
    try { await context.resume(); } catch (error) { console.warn("Resume gagal:", error); }
  }
  return context;
}

async function tryResumeAudioContext() {
  if (!audioContext || audioContext.state !== "suspended") return;
  try { await audioContext.resume(); } catch (_) {}
}

function dbToGain(db) {
  const numericDb = Number(db);
  if (!Number.isFinite(numericDb)) return 0;
  return Math.pow(10, numericDb / 20);
}

function connectSourceToChannels(newSource) {
  if (!newSource) return;
  disconnectCurrentSource();
  sourceNode = newSource;
  window.sourceNode = sourceNode;

  if (stereoInputNode) {
    try {
      sourceNode.connect(stereoInputNode);
    } catch (error) {
      console.warn("SOURCE → MIXER gagal:", error);
    }
  }
  audioInputActive = true;
  exportAudioNodes();
}

function disconnectCurrentSource() {
  if (!sourceNode) {
    audioInputActive = false;
    return;
  }
  if (stereoInputNode) {
    try { sourceNode.disconnect(stereoInputNode); } catch (_) {}
  }
  sourceNode = null;
  window.sourceNode = null;
  audioInputActive = false;
}

function revokeAudioObjectUrls() {
  audioObjectUrls.forEach(url => { try { URL.revokeObjectURL(url); } catch (_) {} });
  audioObjectUrls = [];
}

function renderPlaylistUI() {
  const container = document.getElementById("playlistContainer");
  if (!container) return;
  container.innerHTML = "";
  if (audioFiles.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 6px; color: #64748b;">Belum ada file audio dipilih. Klik "PILIH BANYAK FILE AUDIO".</div>`;
    return;
  }
  audioFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "playlist-item" + (index === currentAudioIndex ? " playing" : "");
    item.innerHTML = `<span>${index + 1}. ${file.name}</span>`;
    item.addEventListener("click", () => {
      currentAudioIndex = index;
      renderPlaylistUI();
      selectAudioFile(currentAudioIndex);
      const audioPlayer = document.getElementById("audioPlayer");
      if (audioPlayer) audioPlayer.play();
    });
    container.appendChild(item);
  });
}

function selectAudioFile(index) {
  const audioPlayer = document.getElementById("audioPlayer");
  if (!audioPlayer || index < 0 || index >= audioFiles.length) return;
  const file = audioFiles[index];
  audioPlayer.pause();

  const oldUrl = audioPlayer.dataset.objectUrl || "";
  const objectUrl = URL.createObjectURL(file);
  audioPlayer.src = objectUrl;
  audioPlayer.dataset.objectUrl = objectUrl;
  audioObjectUrls.push(objectUrl);
  currentAudioIndex = index;

  if (oldUrl && oldUrl !== objectUrl) {
    try { URL.revokeObjectURL(oldUrl); } catch (_) {}
    audioObjectUrls = audioObjectUrls.filter(url => url !== oldUrl);
  }
  renderPlaylistUI();
  setReadyStatus(`TRACK SIAP: ${file.name}`);
}

const audioPlayer = document.getElementById("audioPlayer");
if (audioPlayer) {
  audioPlayer.addEventListener("ended", () => {
    if (audioFiles.length > 0) {
      currentAudioIndex = (currentAudioIndex + 1) % audioFiles.length;
      renderPlaylistUI();
      selectAudioFile(currentAudioIndex);
      audioPlayer.play();
    }
  });
}

async function startMicrophone() {
  await resumeAudioContext();
  const audioPlayer = document.getElementById("audioPlayer");
  if (audioPlayer) audioPlayer.pause();

  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
  }
  microphoneStream = null;
  microphoneSourceNode = null;

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone tidak didukung.");
  }

  const inputDevice = document.getElementById("inputDevice");
  const deviceId = inputDevice ? inputDevice.value : "";
  const constraints = { audio: deviceId ? { deviceId: { exact: deviceId } } : true };

  microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
  microphoneSourceNode = audioContext.createMediaStreamSource(microphoneStream);
  connectSourceToChannels(microphoneSourceNode);
  setReadyStatus("MICROPHONE → MIXER ACTIVE");
}

async function startAudioFile() {
  await resumeAudioContext();
  const audioPlayer = document.getElementById("audioPlayer");
  if (!audioPlayer || !audioPlayer.src) {
    alert("Pilih file audio playlist terlebih dahulu.");
    return;
  }

  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    microphoneSourceNode = null;
  }

  if (!audioFileSourceNode) {
    try {
      audioFileSourceNode = audioContext.createMediaElementSource(audioPlayer);
    } catch (error) {
      console.error("MediaElementSource gagal:", error);
      return;
    }
  }

  connectSourceToChannels(audioFileSourceNode);
  audioPlayer.muted = false;
  audioPlayer.volume = 1;
  try {
    await audioPlayer.play();
    setReadyStatus("PLAYLIST → MIXER ACTIVE");
  } catch (error) {
    alert("Tekan START PLAYLIST sekali lagi untuk memutar.");
  }
}

function stopAudio() {
  const audioPlayer = document.getElementById("audioPlayer");
  if (audioPlayer) { audioPlayer.pause(); audioPlayer.currentTime = 0; }
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
    microphoneSourceNode = null;
  }
  disconnectCurrentSource();
  setReadyStatus("AUDIO STOPPED");
}

function updateMasterGain() {
  if (!masterGainNode || !audioContext) return;
  const slider = document.getElementById("masterGain");
  const value = slider ? Number(slider.value) : -12;
  const targetGain = isMuted ? 0 : dbToGain(value);
  const now = audioContext.currentTime;
  masterGainNode.gain.cancelScheduledValues(now);
  masterGainNode.gain.setTargetAtTime(targetGain, now, 0.015);
}

function setReadyStatus(message) {
  const equalizerStatus = document.getElementById("readyStatus");
  if (equalizerStatus) equalizerStatus.textContent = message;
}

function initializeAudioEngineUI() {
  const masterSlider = document.getElementById("masterGain");
  const masterValue = document.getElementById("masterValue");
  if (masterSlider) {
    masterSlider.addEventListener("input", event => {
      const value = Number(event.target.value);
      if (masterValue) masterValue.textContent = `${value} dB`;
      updateMasterGain();
    });
  }

  const muteButton = document.getElementById("muteOutput");
  if (muteButton) {
    muteButton.addEventListener("click", () => {
      isMuted = !isMuted;
      muteButton.classList.toggle("active", isMuted);
      muteButton.textContent = isMuted ? "UNMUTE OUTPUT" : "MUTE OUTPUT";
      updateMasterGain();
      setReadyStatus(isMuted ? "OUTPUT MUTED" : "OUTPUT ACTIVE");
    });
  }

  document.getElementById("micButton")?.addEventListener("click", () => startMicrophone());
  document.getElementById("startButton")?.addEventListener("click", () => startAudioFile());
  document.getElementById("stopButton")?.addEventListener("click", stopAudio);
  document.getElementById("refreshDevices")?.addEventListener("click", () => loadAudioDevices());

  const audioFileInput = document.getElementById("audioFile");
  if (audioFileInput) {
    audioFileInput.addEventListener("change", event => {
      const selectedFiles = Array.from(event.target.files || []);
      if (selectedFiles.length === 0) return;
      revokeAudioObjectUrls();
      audioFiles = selectedFiles;
      currentAudioIndex = 0;
      renderPlaylistUI();
      selectAudioFile(0);
      setReadyStatus(`${selectedFiles.length} FILE SIAP KE MIXER`);
    });
  }
}

async function loadAudioDevices() {
  const select = document.getElementById("inputDevice");
  if (!select || !navigator.mediaDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    select.innerHTML = '<option value="">DEFAULT MICROPHONE</option>';
    devices.filter(device => device.kind === "audioinput").forEach(device => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || "Audio Input";
      select.appendChild(option);
    });
  } catch (error) {
    console.warn("Gagal membaca audio device:", error);
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") tryResumeAudioContext();
});
document.addEventListener("pointerdown", () => tryResumeAudioContext(), { passive: true });
document.addEventListener("touchstart", () => tryResumeAudioContext(), { passive: true });

document.addEventListener("DOMContentLoaded", () => {
  initializeAudioEngineUI();
  loadAudioDevices();
});

/* =========================================================
   LOGIKA TFT DISPLAY & INTERAKSI DIGITAL MIXER
========================================================= */
const tftSectionTitle = document.getElementById("tftSectionTitle");
const tftContentArea = document.getElementById("tftContentArea");
const tftTabs = document.querySelectorAll(".tft-tab");

const sectionData = {
  config: {
    title: "CONFIG / PREAMP INTERFACE",
    content: `
      <div><b>Gain:</b> +12.0 dB | <b>Phantom:</b> +48V ON | <b>Phase:</b> Normal</div>
      <div class="tft-visual-meters" style="margin-top:4px;">
        <div class="tft-meter-row"><span>CH 1</span><div class="tft-meter-bar"><span class="green"></span><span class="green"></span><span class="green"></span><span class="green"></span><span class="yellow"></span><span class="yellow"></span><span class="red"></span></div><span>-12dB</span></div>
        <div class="tft-meter-row"><span>CH 2</span><div class="tft-meter-bar"><span class="green"></span><span class="green"></span><span class="green"></span><span class="yellow"></span><span class="yellow"></span><span class="red"></span><span class="red"></span></div><span>-18dB</span></div>
      </div>
    `
  },
  gate: {
    title: "NOISE GATE / EXPANDER PROCESSOR",
    content: `<div><b>Thresh:</b> -45 dB | <b>Ratio:</b> 1:2.5 | <b>Attack:</b> 5ms</div><div style="font-size:9px; color:#10b981; margin-top:4px;">● Status: GATE ACTIVE</div>`
  },
  dynamics: {
    title: "DYNAMICS / COMPRESSOR PROCESSOR",
    content: `
      <div><b>Thresh:</b> -18 dB | <b>Ratio:</b> 3:1 | <b>Release:</b> 300ms</div>
      <div class="tft-curve-box">
        <div class="tft-curve-bar" style="height: 15px;"></div><div class="tft-curve-bar" style="height: 25px;"></div><div class="tft-curve-bar" style="height: 35px;"></div>
      </div>
    `
  },
  eq: {
    title: "CHANNEL PARAMETRIC EQUALIZER",
    content: `<div><b>HPF:</b> 80Hz | <b>Low:</b> +2dB | <b>Mid:</b> -3dB | <b>High:</b> +4dB</div>`
  },
  sends: {
    title: "BUS SENDS & FX ROUTING",
    content: `<div><b>Bus 1 (Echo Send):</b> -6.0 dB | <b>Bus 2 (Reverb):</b> -12.0 dB</div>`
  },
  main: {
    title: "MAIN FOH OUTPUT & MATRIX",
    content: `<div><b>Main L/R Output:</b> Active | <b>Limiter:</b> -0.5 dB</div>`
  }
};

const tftTabPages = {
  home: sectionData.config,
  meters: {
    title: "METERS / RTA SPECTRUM ANALYZER",
    content: `<div style="font-size:9px; margin-bottom:4px; color:#10b981;">● Live 31-Band RTA Spectrum Visualizer Active</div>`
  },
  routing: sectionData.sends,
  setup: { title: "SYSTEM SETUP & HARDWARE PREFERENCES", content: "<div><b>Sample Rate:</b> 48 kHz | <b>ESP32 BLE:</b> Connected</div>" },
  library: { title: "SCENE & PRESET LIBRARY", content: "<div><b>Loaded Scene:</b> #01 Live Default</div>" },
  effects: { title: "FX RACK & PROCESSOR", content: "<div><b>FX 1:</b> Vintage Room Reverb | <b>FX 2:</b> Dual Delay</div>" }
};

document.querySelectorAll(".mixer-control-section .console-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mixer-control-section .console-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const sectionKey = btn.getAttribute("data-section");
    if (sectionData[sectionKey] && tftSectionTitle && tftContentArea) {
      tftSectionTitle.textContent = sectionData[sectionKey].title;
      tftContentArea.innerHTML = sectionData[sectionKey].content;
    }
  });
});

tftTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tftTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const tabKey = tab.getAttribute("data-tft-tab");
    if (tftTabPages[tabKey] && tftSectionTitle && tftContentArea) {
      tftSectionTitle.textContent = tftTabPages[tabKey].title;
      tftContentArea.innerHTML = tftTabPages[tabKey].content;
    }
  });
});

/* =========================================================
   LOGIKA LED METER VERTIKAL MIXER (MATI TOTAL SAAT IDLE)
========================================================= */
setInterval(() => {
  const audioPlayer = document.getElementById("audioPlayer");
  const isPlayingFile = audioPlayer && !audioPlayer.paused && audioPlayer.currentTime > 0 && !audioPlayer.ended;
  const isMicActive = microphoneStream !== null;
  const isAudioRunning = audioContext && audioContext.state === "running" && (isPlayingFile || isMicActive);

  ['ch1', 'ch2', 'ch3', 'ch4', 'master'].forEach(id => {
    const container = document.getElementById(`mixerMeter_${id}`);
    if (!container) return;
    const spans = container.querySelectorAll("span");
    
    if (!isAudioRunning) {
      spans.forEach(span => span.classList.remove("on"));
    } else {
      const activeCount = Math.floor(Math.random() * 7) + 3;
      spans.forEach((span, idx) => {
        const reverseIdx = spans.length - 1 - idx;
        if (reverseIdx < activeCount) span.classList.add("on");
        else span.classList.remove("on");
      });
    }
  });
}, 180);
  </script>
</body>
</html>
