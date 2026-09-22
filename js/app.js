/* =========================================================
   APPLICATION NAVIGATION
   ========================================================= */

const pageContainer = document.getElementById("pageContainer");

let equalizerPage = null;
let echoPage = null;

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
   ECHO ALESIS PAGE (DITAMBAHKAN AGAR TIDAK ERROR)
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
   SHOW PAGE
   ========================================================= */

function showPage(pageName) {
  if (equalizerPage) {
    equalizerPage.classList.toggle("hidden", pageName !== "equalizer");
    equalizerPage.style.display = pageName === "equalizer" ? "block" : "none";
  }

  if (echoPage) {
    echoPage.classList.toggle("hidden", pageName !== "echo");
    echoPage.style.display = pageName === "echo" ? "block" : "none";
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
  showPage("equalizer");
});
