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
let echoEnabled = true; // Status aktif efek (default ON)

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
   * FEEDBACK (Jika echoEnabled true, gunakan nilai feedback; jika false, set 0)
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
  const powerBtn = document.getElementById("echoPowerBtn");
  const bypassButton = document.getElementById("bypassAlesis");
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

  // Tombol Power On / Off Utama
  if (powerBtn) {
    powerBtn.addEventListener("click", () => {
      echoEnabled = !echoEnabled;
      powerBtn.classList.toggle("active", echoEnabled);
      powerBtn.textContent = echoEnabled ? "POWER: ON" : "POWER: OFF";
      if (readyStatus) {
        readyStatus.textContent = echoEnabled ? "ALESIS ACTIVE" : "ALESIS POWER OFF";
      }
      updateEchoAudio();
    });
  }

  // Tombol Bypass Effect
  if (bypassButton) {
    let isBypassed = false;
    bypassButton.addEventListener("click", () => {
      isBypassed = !isBypassed;
      bypassButton.classList.toggle("active", isBypassed);
      bypassButton.textContent = isBypassed ? "EFFECT BYPASSED" : "BYPASS EFFECT";
      
      // Jika dibypass, set wet jadi 0 (suara murni dry)
      if (isBypassed) {
        echoDryNode.gain.value = 1;
        echoWetNode.gain.value = 0;
        echoFeedbackNode.gain.value = 0;
      } else {
        updateEchoAudio();
      }
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
      echoState.feedback = Number(feedback.value);
      if (feedbackVal) feedbackVal.textContent = `${Math.round(Number(feedback.value) * 100)}%`;
      updateEchoAudio();
    });
  }

  if (mix) {
    mix.addEventListener("input", () => {
      echoState.mix = Number(mix.value);
      if (mixVal) mixVal.textContent = `${Math.round(Number(mix.value) * 100)}%`;
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
        echoState.feedback = 0.6;
        echoState.mix = 0.5;
      } else if (preset === "reverb-hall") {
        echoState.time = 400;
        echoState.feedback = 0.75;
        echoState.mix = 0.6;
      }

      // Sinkronisasi ke elemen UI HTML
      if (time) time.value = echoState.time;
      if (timeVal) timeVal.textContent = `${echoState.time} ms`;

      if (feedback) feedback.value = echoState.feedback;
      if (feedbackVal) feedbackVal.textContent = `${Math.round(echoState.feedback * 100)}%`;

      if (mix) mix.value = echoState.mix;
      if (mixVal) mixVal.textContent = `${Math.round(echoState.mix * 100)}%`;

      if (readyStatus) {
        readyStatus.textContent = `PRESET: ${preset.toUpperCase()}`;
      }
      updateEchoAudio();
    });
  }
});
