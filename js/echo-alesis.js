/* =========================================================
   ECHO ALESIS / QUADRAVERB ENGINE & UI
   SOURCE → ECHO ALESIS → EQUALIZER
   ========================================================= */

let echoInputNode = null;
let echoDryNode = null;
let echoDelayNode = null;
let echoFeedbackNode = null;
let echoWetNode = null;
let echoOutputNode = null;
let echoEnabled = false; // Status aktif efek

/* =========================================================
   ECHO PARAMETERS
   ========================================================= */

let echoState = {
  time: 300,      // ms
  feedback: 0.4,  // 0 - 0.9
  mix: 0.5,       // 0 - 1 (Dry/Wet)
  level: 0        // dB
};

/* =========================================================
   INITIALIZE ENGINE
   ========================================================= */

function initializeEchoEngine() {
  if (!audioContext) {
    return;
  }

  if (echoDelayNode) {
    return;
  }

  echoInputNode = audioContext.createGain();
  echoDryNode = audioContext.createGain();
  echoDelayNode = audioContext.createDelay(5);
  echoFeedbackNode = audioContext.createGain();
  echoWetNode = audioContext.createGain();
  echoOutputNode = audioContext.createGain();

  /*
   * INPUT ROUTING
   */
  echoInputNode.connect(echoDryNode);
  echoInputNode.connect(echoDelayNode);

  /*
   * DELAY & FEEDBACK LOOP
   */
  echoDelayNode.connect(echoFeedbackNode);
  echoFeedbackNode.connect(echoDelayNode);
  echoDelayNode.connect(echoWetNode);

  /*
   * OUTPUT MIXING
   */
  echoDryNode.connect(echoOutputNode);
  echoWetNode.connect(echoOutputNode);

  /*
   * ECHO → EQUALIZER (Terhubung ke stereoInputNode milik DBX 2231)
   */
  if (typeof stereoInputNode !== "undefined" && stereoInputNode) {
    echoOutputNode.connect(stereoInputNode);
  } else {
    echoOutputNode.connect(audioContext.destination);
  }

  updateEchoAudio();
}

/* =========================================================
   SOURCE → ECHO
   ========================================================= */

function connectEchoInput(source) {
  createAudioContext();
  initializeEchoEngine();

  try {
    source.disconnect();
  } catch (_) {}

  source.connect(echoInputNode);
  updateEchoAudio();
}

/* =========================================================
   UPDATE ECHO AUDIO PARAMETERS
   ========================================================= */

function updateEchoAudio() {
  if (!echoDelayNode) {
    return;
  }

  /*
   * TIME (ms ke detik)
   */
  echoDelayNode.delayTime.value = Math.max(
    0.05,
    Math.min(
      5,
      Number(echoState.time) / 1000
    )
  );

  /*
   * FEEDBACK (Jika echoEnabled true, gunakan nilai feedback; jika false/bypass, set 0)
   */
  echoFeedbackNode.gain.value = echoEnabled
    ? Math.max(
        0,
        Math.min(
          0.95,
          Number(echoState.feedback)
        )
      )
    : 0;

  /*
   * MIX (Dry / Wet Balance)
   */
  const mix = echoEnabled
    ? Math.max(0, Math.min(1, Number(echoState.mix)))
    : 0; // Jika nonaktif, 100% dry (suara asli)

  echoDryNode.gain.value = 1 - mix;
  echoWetNode.gain.value = mix;

  /*
   * LEVEL
   */
  if (typeof dbToGain === "function") {
    echoOutputNode.gain.value = dbToGain(Number(echoState.level));
  }
}

/* =========================================================
   UI CONTROLS BINDING (DISESUAIKAN DENGAN INDEX.HTML)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof createAudioContext === "function") {
    try {
      createAudioContext();
    } catch (e) {
      console.warn("Audio context waiting for user interaction");
    }
  }
  if (typeof initializeEchoEngine === "function") {
    initializeEchoEngine();
  }

  // Elemen HTML dari Bar Alesis di index.html
  const timeInput = document.getElementById("delayTime");
  const timeValue = document.getElementById("delayTimeValue");

  const feedbackInput = document.getElementById("delayFeedback");
  const feedbackValue = document.getElementById("feedbackValue");

  const mixInput = document.getElementById("effectMix");
  const mixValue = document.getElementById("mixValue");

  const bypassButton = document.getElementById("bypassAlesis");
  const presetSelect = document.getElementById("alesisPresetSelect");
  const applyPresetBtn = document.getElementById("applyAlesisPreset");
  const readyStatus = document.getElementById("readyStatus");

  // Status awal diatur aktif (echoEnabled = true) agar efek langsung terasa
  echoEnabled = true;

  if (timeInput) {
    timeInput.addEventListener("input", (e) => {
      echoState.time = Number(e.target.value);
      if (timeValue) timeValue.textContent = `${echoState.time} ms`;
      updateEchoAudio();
    });
  }

  if (feedbackInput) {
    feedbackInput.addEventListener("input", (e) => {
      echoState.feedback = Number(e.target.value);
      if (feedbackValue) feedbackValue.textContent = `${Math.round(echoState.feedback * 100)}%`;
      updateEchoAudio();
    });
  }

  if (mixInput) {
    mixInput.addEventListener("input", (e) => {
      echoState.mix = Number(e.target.value);
      if (mixValue) mixValue.textContent = `${Math.round(echoState.mix * 100)}%`;
      updateEchoAudio();
    });
  }

  if (bypassButton) {
    bypassButton.addEventListener("click", () => {
      echoEnabled = !echoEnabled; // Toggle status
      bypassButton.classList.toggle("active", !echoEnabled);
      bypassButton.textContent = echoEnabled ? "BYPASS EFFECT" : "EFFECT BYPASSED";
      if (readyStatus) {
        readyStatus.textContent = echoEnabled ? "ALESIS ECHO ACTIVE" : "ALESIS BYPASSED";
      }
      updateEchoAudio();
    });
  }

  if (applyPresetBtn && presetSelect) {
    applyPresetBtn.addEventListener("click", () => {
      const preset = presetSelect.value;
      if (preset === "vocal-delay") {
        echoState.time = 250;
        echoState.feedback = 0.3;
        echoState.mix = 0.35;
      } else if (preset === "long-echo") {
        echoState.time = 600;
        echoState.feedback = echoEnabled = 0.6;
        echoState.mix = 0.5;
      } else if (preset === "reverb-hall") {
        echoState.time = 400;
        echoState.feedback = 0.75;
        echoState.mix = 0.6;
      }

      // Update tampilan slider UI
      if (timeInput) timeInput.value = echoState.time;
      if (timeValue) timeValue.textContent = `${echoState.time} ms`;

      if (feedbackInput) feedbackInput.value = echoState.feedback;
      if (feedbackValue) feedbackValue.textContent = `${Math.round(echoState.feedback * 100)}%`;

      if (mixInput) mixInput.value = echoState.mix;
      if (mixValue) mixValue.textContent = `${Math.round(echoState.mix * 100)}%`;

      if (readyStatus) {
        readyStatus.textContent = `ALESIS PRESET: ${preset.toUpperCase()}`;
      }
      updateEchoAudio();
    });
  }
});
