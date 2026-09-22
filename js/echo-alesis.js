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
   CONTROLS (DISESUAIKAN DENGAN alesis.html)
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

  // Menyesuaikan dengan ID di alesis.html Anda
  const power = document.getElementById("bypassAlesis");
  const time = document.getElementById("delayTime");
  const timeVal = document.getElementById("delayTimeValue");

  const feedback = document.getElementById("delayFeedback");
  const feedbackVal = document.getElementById("feedbackValue");

  const mix = document.getElementById("effectMix");
  const mixVal = document.getElementById("mixValue");

  const readyStatus = document.getElementById("readyStatusAlesis");
  const presetSelect = document.getElementById("alesisPresetSelect");
  const applyPresetBtn = document.getElementById("applyAlesisPreset");

  // Status awal diaktifkan agar efek langsung terdengar
  echoEnabled = true;

  if (power) {
    power.addEventListener("click", () => {
      echoEnabled = !echoEnabled;
      power.classList.toggle("active", !echoEnabled);
      power.textContent = echoEnabled ? "BYPASS EFFECT" : "EFFECT BYPASSED";
      if (readyStatus) {
        readyStatus.textContent = echoEnabled ? "ALESIS ACTIVE" : "ALESIS BYPASSED";
      }
      updateEchoAudio();
    });
  }

  if (time) {
    time.addEventListener("input", () => {
      echoState.time = Number(time.value);
      if (timeVal) timeVal.textContent = `${echoState.time} ms`;
      updateEchoAudio();
    });
  }

  if (feedback) {
    feedback.addEventListener("input", () => {
      // Nilai slider alesis.html max 0.9 (artinya 90%)
      echoState.feedback = Number(feedback.value) * 100;
      if (feedbackVal) feedbackVal.textContent = `${Math.round(Number(feedback.value) * 100)}%`;
      updateEchoAudio();
    });
  }

  if (mix) {
    mix.addEventListener("input", () => {
      // Nilai slider alesis.html max 1.0 (artinya 100%)
      echoState.mix = Number(mix.value) * 100;
      if (mixVal) mixVal.textContent = `${Math.round(Number(mix.value) * 100)}%`;
      updateEchoAudio();
    });
  }

  if (applyPresetBtn && presetSelect) {
    applyPresetBtn.addEventListener("click", () => {
      const preset = presetSelect.value;
      if (preset === "vocal-delay") {
        echoState.time = 250;
        echoState.feedback = 30;
        echoState.mix = 35;
      } else if (preset === "long-echo") {
        echoState.time = 600;
        echoState.feedback = 60;
        echoState.mix = 50;
      } else if (preset === "reverb-hall") {
        echoState.time = 400;
        echoState.feedback = 75;
        echoState.mix = 60;
      }

      // Sinkronisasi ke elemen UI HTML
      if (time) time.value = echoState.time;
      if (timeVal) timeVal.textContent = `${echoState.time} ms`;

      if (feedback) feedback.value = echoState.feedback / 100;
      if (feedbackVal) feedbackVal.textContent = `${echoState.feedback}%`;

      if (mix) mix.value = echoState.mix / 100;
      if (mixVal) mixVal.textContent = `${echoState.mix}%`;

      if (readyStatus) {
        readyStatus.textContent = `PRESET: ${preset.toUpperCase()}`;
      }
      updateEchoAudio();
    });
  }
});
