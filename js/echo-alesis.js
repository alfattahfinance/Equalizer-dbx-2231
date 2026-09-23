/* =========================================================
   ALESIS ECHO DSP ENGINE — FIXED AUDIO
   =========================================================
   AUDIO PATH
      SOURCE
         ↓
      ALESIS INPUT
         ↓
      ┌───────────────┐
      │ DRY           │
      │               │
      │ DELAY         │
      │   ↓           │
      │ FEEDBACK      │
      │   ↓           │
      │ DELAY         │
      │   ↓           │
      │ WET           │
      └───────┬───────┘
              ↓
        ALESIS OUTPUT
              ↓
          DBX 2231
              ↓
           MASTER
              ↓
           OUTPUT
   IMPORTANT
   ---------------------------------------------------------
   - Tidak boleh ada double connection.
   - Alesis output hanya boleh tersambung sekali ke DBX.
   - Feedback dibatasi untuk mencegah runaway.
   - Dry/Wet menggunakan constant-power style mixing.
   - Parameter menggunakan smoothing.
   - Bypass benar-benar melewatkan sinyal dry.
   - POWER OFF juga melewatkan sinyal dry.
   ========================================================= */
/* =========================================================
   GLOBAL
   ========================================================= */
window.DBX2231 =
  window.DBX2231 || {};
/* =========================================================
   REMOTE COMMUNICATION
   ========================================================= */
const ALESIS_CHANNEL_NAME =
  "dbx-2231-alesis-control";
const ALESIS_STORAGE_KEY =
  "dbx2231_alesis_state";
let alesisChannel =
  null;
try {
  if (
    typeof BroadcastChannel !==
    "undefined"
  ) {
    alesisChannel =
      new BroadcastChannel(
        ALESIS_CHANNEL_NAME
      );
  }
}
catch (error) {
  console.warn(
    "BroadcastChannel tidak tersedia:",
    error
  );
}
/* =========================================================
   AUDIO NODES
   ========================================================= */
let echoInputNode = null;
let echoDryNode = null;
let echoDelayNode = null;
let echoFeedbackNode = null;
let echoWetNode = null;
let echoOutputNode = null;
/* =========================================================
   OUTPUT CONNECTION STATE
   ========================================================= */
let echoConnectedToEqualizer =
  false;
let echoConnectedDestination =
  null;
/* =========================================================
   STATE
   ========================================================= */
let echoEnabled =
  true;
let echoBypassed =
  false;
const echoState = {
  time: 300,
  /*
   * Lebih aman daripada 40%.
   */
  feedback: 0.25,
  /*
   * Wet 30%.
   */
  mix: 0.30,
  /*
   * 0 dB
   */
  level: 0
};
/* =========================================================
   HOST DETECTION
   ========================================================= */
function isAudioHost() {
  /*
   * index.html memiliki #channels.
   *
   * alesis.html tidak.
   */
  return Boolean(
    document.getElementById(
      "channels"
    )
  );
}
/* =========================================================
   AUDIO CONTEXT
   ========================================================= */
function getAudioContext() {
  if (
    window.audioContext
  ) {
    return window.audioContext;
  }
  if (
    window.DBX2231 &&
    window.DBX2231.audioContext
  ) {
    return window.DBX2231.audioContext;
  }
  return null;
}
/* =========================================================
   STATE BROADCAST
   ========================================================= */
function broadcastEchoState() {
  const state = {
    type:
      "ALESIS_STATE",
    source:
      isAudioHost()
        ? "HOST"
        : "REMOTE",
    enabled:
      echoEnabled,
    bypass:
      echoBypassed,
    time:
      echoState.time,
    feedback:
      echoState.feedback,
    mix:
      echoState.mix,
    level:
      echoState.level
  };
  if (
    alesisChannel
  ) {
    try {
      alesisChannel.postMessage(
        state
      );
    }
    catch (_) {}
  }
  try {
    localStorage.setItem(
      ALESIS_STORAGE_KEY,
      JSON.stringify(
        state
      )
    );
  }
  catch (_) {}
}
/* =========================================================
   LOAD STATE
   ========================================================= */
function loadSavedEchoState() {
  try {
    const saved =
      localStorage.getItem(
        ALESIS_STORAGE_KEY
      );
    if (!saved) {
      return;
    }
    const state =
      JSON.parse(
        saved
      );
    if (
      !state ||
      state.type !==
        "ALESIS_STATE"
    ) {
      return;
    }
    applyRemoteEchoState(
      state,
      false
    );
  }
  catch (error) {
    console.warn(
      "Gagal membaca state Alesis:",
      error
    );
  }
}
/* =========================================================
   APPLY STATE
   ========================================================= */
function applyRemoteEchoState(
  state,
  broadcastBack = false
) {
  if (!state) {
    return;
  }
  if (
    typeof state.enabled ===
    "boolean"
  ) {
    echoEnabled =
      state.enabled;
  }
  if (
    typeof state.bypass ===
    "boolean"
  ) {
    echoBypassed =
      state.bypass;
  }
  if (
    Number.isFinite(
      Number(state.time)
    )
  ) {
    echoState.time =
      Math.max(
        50,
        Math.min(
          1000,
          Number(
            state.time
          )
        )
      );
  }
  if (
    Number.isFinite(
      Number(state.feedback)
    )
  ) {
    echoState.feedback =
      Math.max(
        0,
        Math.min(
          0.85,
          Number(
            state.feedback
          )
        )
      );
  }
  if (
    Number.isFinite(
      Number(state.mix)
    )
  ) {
    echoState.mix =
      Math.max(
        0,
        Math.min(
          1,
          Number(
            state.mix
          )
        )
      );
  }
  if (
    Number.isFinite(
      Number(state.level)
    )
  ) {
    echoState.level =
      Math.max(
        -24,
        Math.min(
          6,
          Number(
            state.level
          )
        )
      );
  }
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  if (
    broadcastBack
  ) {
    broadcastEchoState();
  }
}
/* =========================================================
   BROADCAST RECEIVE
   ========================================================= */
if (
  alesisChannel
) {
  alesisChannel.addEventListener(
    "message",
    event => {
      const data =
        event.data;
      if (!data) {
        return;
      }
      if (
        data.type ===
        "ALESIS_STATE"
      ) {
        /*
         * Remote mengubah parameter.
         */
        applyRemoteEchoState(
          data,
          false
        );
      }
      if (
        data.type ===
        "ALESIS_REQUEST_STATE"
      ) {
        /*
         * Hanya HOST yang menjawab.
         */
        if (
          isAudioHost()
        ) {
          broadcastEchoState();
        }
      }
    }
  );
}
/* =========================================================
   INITIALIZE ALESIS
   ========================================================= */
function initializeEchoEngine() {
  /*
   * Remote UI tidak membuat AudioNode.
   */
  if (
    !isAudioHost()
  ) {
    loadSavedEchoState();
    updateEchoUI();
    return;
  }
  /*
   * Sudah dibuat.
   */
  if (
    echoInputNode &&
    echoOutputNode
  ) {
    connectEchoToNextStage();
    updateEchoAudio();
    return;
  }
  const context =
    getAudioContext();
  if (!context) {
    /*
     * Jangan membuat AudioContext otomatis.
     */
    return;
  }
  /* =======================================================
     INPUT
     ======================================================= */
  echoInputNode =
    context.createGain();
  /* =======================================================
     DRY
     ======================================================= */
  echoDryNode =
    context.createGain();
  /* =======================================================
     DELAY
     ======================================================= */
  echoDelayNode =
    context.createDelay(
      5
    );
  /* =======================================================
     FEEDBACK
     ======================================================= */
  echoFeedbackNode =
    context.createGain();
  /* =======================================================
     WET
     ======================================================= */
  echoWetNode =
    context.createGain();
  /* =======================================================
     OUTPUT
     ======================================================= */
  echoOutputNode =
    context.createGain();
  /*
   * =======================================================
   * ROUTING
   * =======================================================
   */
  echoInputNode.connect(
    echoDryNode
  );
  echoInputNode.connect(
    echoDelayNode
  );
  echoDelayNode.connect(
    echoFeedbackNode
  );
  echoFeedbackNode.connect(
    echoDelayNode
  );
  echoDelayNode.connect(
    echoWetNode
  );
  echoDryNode.connect(
    echoOutputNode
  );
  echoWetNode.connect(
    echoOutputNode
  );
  /*
   * Export.
   */
  window.echoInputNode =
    echoInputNode;
  window.echoDryNode =
    echoDryNode;
  window.echoDelayNode =
    echoDelayNode;
  window.echoFeedbackNode =
    echoFeedbackNode;
  window.echoWetNode =
    echoWetNode;
  window.echoOutputNode =
    echoOutputNode;
  /*
   * Terapkan audio.
   */
  updateEchoAudio();
  /*
   * Sambungkan Alesis → DBX.
   */
  connectEchoToNextStage();
  /*
   * Kirim state.
   */
  broadcastEchoState();
}
/* =========================================================
   SOURCE → ALESIS
   ========================================================= */
function connectEchoInput(
  source
) {
  if (!source) {
    return;
  }
  /*
   * Hanya HOST yang melakukan audio routing.
   */
  if (
    !isAudioHost()
  ) {
    return;
  }
  /*
   * Pastikan AudioContext sudah ada.
   */
  if (
    typeof window.createAudioContext ===
    "function"
  ) {
    window.createAudioContext();
  }
  /*
   * Pastikan Alesis sudah dibuat.
   */
  if (
    !echoInputNode
  ) {
    initializeEchoEngine();
  }
  if (
    !echoInputNode
  ) {
    return;
  }
  /*
   * =======================================================
   * HINDARI DOUBLE CONNECTION
   *
   * audio-engine.js sudah memastikan source lama
   * diputus dari echoInputNode sebelum source baru
   * masuk.
   * =======================================================
   */
  try {
    source.connect(
      echoInputNode
    );
  }
  catch (error) {
    console.warn(
      "SOURCE → ALESIS:",
      error
    );
  }
}
/* =========================================================
   ALESIS → DBX
   ========================================================= */
function connectEchoToNextStage() {
  if (
    !isAudioHost()
  ) {
    return;
  }
  if (
    !echoOutputNode
  ) {
    return;
  }
  const destination =
    window.stereoInputNode;
  if (
    !destination
  ) {
    return;
  }
  /*
   * =======================================================
   * PENTING:
   *
   * Jangan connect lagi kalau destination sama.
   * =======================================================
   */
  if (
    echoConnectedToEqualizer &&
    echoConnectedDestination ===
      destination
  ) {
    return;
  }
  /*
   * Jika sebelumnya terhubung ke destination
   * lain, lepaskan koneksi lama terlebih dahulu.
   */
  if (
    echoConnectedDestination &&
    echoConnectedDestination !==
      destination
  ) {
    try {
      echoOutputNode.disconnect(
        echoConnectedDestination
      );
    }
    catch (_) {}
  }
  try {
    echoOutputNode.connect(
      destination
    );
    echoConnectedDestination =
      destination;
    echoConnectedToEqualizer =
      true;
  }
  catch (error) {
    console.warn(
      "ALESIS → DBX gagal:",
      error
    );
  }
}
/* =========================================================
   PUBLIC OUTPUT CONNECT
   ========================================================= */
function connectEchoOutput(
  destination
) {
  if (
    !isAudioHost()
  ) {
    return;
  }
  if (
    !echoOutputNode ||
    !destination
  ) {
    return;
  }
  /*
   * Kalau sudah tersambung ke destination
   * yang sama, jangan connect lagi.
   */
  if (
    echoConnectedToEqualizer &&
    echoConnectedDestination ===
      destination
  ) {
    return;
  }
  try {
    echoOutputNode.connect(
      destination
    );
    echoConnectedDestination =
      destination;
    echoConnectedToEqualizer =
      true;
  }
  catch (error) {
    console.warn(
      "connectEchoOutput:",
      error
    );
  }
}
/* =========================================================
   UPDATE AUDIO
   ========================================================= */
function updateEchoAudio() {
  if (
    !isAudioHost()
  ) {
    return;
  }
  if (
    !echoInputNode ||
    !echoOutputNode ||
    !echoDelayNode ||
    !echoFeedbackNode ||
    !echoDryNode ||
    !echoWetNode
  ) {
    return;
  }
  const context =
    getAudioContext();
  if (!context) {
    return;
  }
  const now =
    context.currentTime;
  /* =======================================================
     DELAY
     ======================================================= */
  const delaySeconds =
    Math.max(
      0.05,
      Math.min(
        1.0,
        Number(
          echoState.time
        ) / 1000
      )
    );
  echoDelayNode.delayTime.cancelScheduledValues(
    now
  );
  echoDelayNode.delayTime.setTargetAtTime(
    delaySeconds,
    now,
    0.015
  );
  /* =======================================================
     FEEDBACK
     ======================================================= */
  const feedback =
    Math.max(
      0,
      Math.min(
        0.85,
        Number(
          echoState.feedback
        )
      )
    );
  echoFeedbackNode.gain.cancelScheduledValues(
    now
  );
  echoFeedbackNode.gain.setTargetAtTime(
    feedback,
    now,
    0.02
  );
  /* =======================================================
     MIX
     ======================================================= */
  const mix =
    Math.max(
      0,
      Math.min(
        1,
        Number(
          echoState.mix
        )
      )
    );
  /*
   * Constant-power style mix.
   *
   * Ini mengurangi perubahan level ketika
   * Wet/Dry digeser.
   */
  const dryGain =
    Math.cos(
      mix *
      Math.PI /
      2
    );
  const wetGain =
    Math.sin(
      mix *
      Math.PI /
      2
    );
  /* =======================================================
     BYPASS / POWER
     ======================================================= */
  if (
    echoEnabled &&
    !echoBypassed
  ) {
    echoDryNode.gain.cancelScheduledValues(
      now
    );
    echoWetNode.gain.cancelScheduledValues(
      now
    );
    echoDryNode.gain.setTargetAtTime(
      dryGain,
      now,
      0.015
    );
    echoWetNode.gain.setTargetAtTime(
      wetGain,
      now,
      0.015
    );
  }
  else {
    /*
     * BYPASS:
     *
     * 100% dry
     */
    echoDryNode.gain.cancelScheduledValues(
      now
    );
    echoWetNode.gain.cancelScheduledValues(
      now
    );
    echoDryNode.gain.setTargetAtTime(
      1,
      now,
      0.01
    );
    echoWetNode.gain.setTargetAtTime(
      0,
      now,
      0.01
    );
  }
  /* =======================================================
     OUTPUT LEVEL
     ======================================================= */
  const level =
    Math.max(
      -24,
      Math.min(
        6,
        Number(
          echoState.level
        )
      )
    );
  const outputGain =
    dbToGain(
      level
    );
  echoOutputNode.gain.cancelScheduledValues(
    now
  );
  echoOutputNode.gain.setTargetAtTime(
    outputGain,
    now,
    0.015
  );
  /*
   * Pastikan koneksi output tetap satu.
   */
  connectEchoToNextStage();
  updateEchoUI();
}
/* =========================================================
   DB → GAIN
   ========================================================= */
function dbToGain(
  db
) {
  return Math.pow(
    10,
    Number(db) / 20
  );
}
/* =========================================================
   POWER
   ========================================================= */
function setEchoPower(
  enabled
) {
  echoEnabled =
    Boolean(
      enabled
    );
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  broadcastEchoState();
}
/* =========================================================
   BYPASS
   ========================================================= */
function setEchoBypass(
  bypass
) {
  echoBypassed =
    Boolean(
      bypass
    );
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  broadcastEchoState();
}
/* =========================================================
   DELAY TIME
   ========================================================= */
function setEchoTime(
  milliseconds
) {
  echoState.time =
    Math.max(
      50,
      Math.min(
        1000,
        Number(
          milliseconds
        )
      )
    );
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  broadcastEchoState();
}
/* =========================================================
   FEEDBACK
   ========================================================= */
function setEchoFeedback(
  percent
) {
  echoState.feedback =
    Math.max(
      0,
      Math.min(
        0.85,
        Number(
          percent
        ) / 100
      )
    );
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  broadcastEchoState();
}
/* =========================================================
   MIX
   ========================================================= */
function setEchoMix(
  percent
) {
  echoState.mix =
    Math.max(
      0,
      Math.min(
        1,
        Number(
          percent
        ) / 100
      )
    );
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  broadcastEchoState();
}
/* =========================================================
   UI
   ========================================================= */
function updateEchoUI() {
  /*
   * POWER
   */
  const powerButton =
    document.getElementById(
      "echoPowerBtn"
    );
  if (
    powerButton
  ) {
    powerButton.textContent =
      echoEnabled
        ? "POWER: ON"
        : "POWER: OFF";
    powerButton.classList.toggle(
      "active",
      echoEnabled
    );
  }
  /*
   * BYPASS
   */
  const bypassButton =
    document.getElementById(
      "bypassAlesis"
    );
  if (
    bypassButton
  ) {
    bypassButton.textContent =
      echoBypassed
        ? "BYPASS: ON"
        : "BYPASS";
    bypassButton.classList.toggle(
      "active",
      echoBypassed
    );
  }
  /*
   * DELAY
   */
  const delaySlider =
    document.getElementById(
      "delayTime"
    );
  const delayValue =
    document.getElementById(
      "delayTimeValue"
    );
  if (
    delaySlider
  ) {
    delaySlider.value =
      echoState.time;
  }
  if (
    delayValue
  ) {
    delayValue.textContent =
      `${Math.round(
        echoState.time
      )} ms`;
  }
  /*
   * FEEDBACK
   */
  const feedbackSlider =
    document.getElementById(
      "delayFeedback"
    );
  const feedbackValue =
    document.getElementById(
      "feedbackValue"
    );
  if (
    feedbackSlider
  ) {
    feedbackSlider.value =
      Math.round(
        echoState.feedback *
        100
      );
  }
  if (
    feedbackValue
  ) {
    feedbackValue.textContent =
      `${Math.round(
        echoState.feedback *
        100
      )}%`;
  }
  /*
   * MIX
   */
  const mixSlider =
    document.getElementById(
      "effectMix"
    );
  const mixValue =
    document.getElementById(
      "mixValue"
    );
  if (
    mixSlider
  ) {
    mixSlider.value =
      Math.round(
        echoState.mix *
        100
      );
  }
  if (
    mixValue
  ) {
    mixValue.textContent =
      `${Math.round(
        echoState.mix *
        100
      )}%`;
  }
  /*
   * STATUS
   */
  const readyStatus =
    document.getElementById(
      "readyStatusAlesis"
    );
  if (
    readyStatus
  ) {
    if (
      !echoEnabled
    ) {
      readyStatus.textContent =
        "ALESIS POWER OFF";
    }
    else if (
      echoBypassed
    ) {
      readyStatus.textContent =
        "ALESIS BYPASS";
    }
    else {
      readyStatus.textContent =
        "ALESIS DSP READY";
    }
  }
}
/* =========================================================
   PRESETS
   ========================================================= */
function applyAlesisPreset(
  preset
) {
  switch (
    preset
  ) {
    case "vocal-delay":
      echoState.time =
        300;
      echoState.feedback =
        0.25;
      echoState.mix =
        0.30;
      break;
    case "long-echo":
      echoState.time =
        750;
      echoState.feedback =
        0.45;
      echoState.mix =
        0.35;
      break;
    case "reverb-hall":
      echoState.time =
        600;
      echoState.feedback =
        0.50;
      echoState.mix =
        0.30;
      break;
    default:
      return;
  }
  echoEnabled =
    true;
  echoBypassed =
    false;
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  broadcastEchoState();
}
/* =========================================================
   DOM INITIALIZATION
   ========================================================= */
document.addEventListener(
  "DOMContentLoaded",
  () => {
    /*
     * HOST
     */
    if (
      isAudioHost()
    ) {
      updateEchoUI();
    }
    /*
     * REMOTE
     */
    else {
      loadSavedEchoState();
      updateEchoUI();
    }
    /* =====================================================
       POWER BUTTON
       ===================================================== */
    const powerButton =
      document.getElementById(
        "echoPowerBtn"
      );
    if (
      powerButton
    ) {
      powerButton.addEventListener(
        "click",
        () => {
          setEchoPower(
            !echoEnabled
          );
        }
      );
    }
    /* =====================================================
       BYPASS
       ===================================================== */
    const bypassButton =
      document.getElementById(
        "bypassAlesis"
      );
    if (
      bypassButton
    ) {
      bypassButton.addEventListener(
        "click",
        () => {
          setEchoBypass(
            !echoBypassed
          );
        }
      );
    }
    /* =====================================================
       DELAY
       ===================================================== */
    const delaySlider =
      document.getElementById(
        "delayTime"
      );
    if (
      delaySlider
    ) {
      delaySlider.addEventListener(
        "input",
        event => {
          setEchoTime(
            event.target.value
          );
        }
      );
    }
    /* =====================================================
       FEEDBACK
       ===================================================== */
    const feedbackSlider =
      document.getElementById(
        "delayFeedback"
      );
    if (
      feedbackSlider
    ) {
      feedbackSlider.addEventListener(
        "input",
        event => {
          setEchoFeedback(
            event.target.value
          );
        }
      );
    }
    /* =====================================================
       MIX
       ===================================================== */
    const mixSlider =
      document.getElementById(
        "effectMix"
      );
    if (
      mixSlider
    ) {
      mixSlider.addEventListener(
        "input",
        event => {
          setEchoMix(
            event.target.value
          );
        }
      );
    }
    /* =====================================================
       PRESET
       ===================================================== */
    const presetButton =
      document.getElementById(
        "applyAlesisPreset"
      );
    const presetSelect =
      document.getElementById(
        "alesisPresetSelect"
      );
    if (
      presetButton &&
      presetSelect
    ) {
      presetButton.addEventListener(
        "click",
        () => {
          applyAlesisPreset(
            presetSelect.value
          );
        }
      );
    }
    /*
     * Remote meminta state terbaru.
     */
    if (
      !isAudioHost() &&
      alesisChannel
    ) {
      try {
        alesisChannel.postMessage({
          type:
            "ALESIS_REQUEST_STATE"
        });
      }
      catch (_) {}
    }
  }
);
/* =========================================================
   EXPORT
   ========================================================= */
window.echoInputNode =
  echoInputNode;
window.echoDryNode =
  echoDryNode;
window.echoDelayNode =
  echoDelayNode;
window.echoFeedbackNode =
  echoFeedbackNode;
window.echoWetNode =
  echoWetNode;
window.echoOutputNode =
  echoOutputNode;
window.initializeEchoEngine =
  initializeEchoEngine;
window.connectEchoInput =
  connectEchoInput;
window.connectEchoOutput =
  connectEchoOutput;
window.connectEchoToNextStage =
  connectEchoToNextStage;
window.setEchoPower =
  setEchoPower;
window.setEchoBypass =
  setEchoBypass;
window.setEchoTime =
  setEchoTime;
window.setEchoFeedback =
  setEchoFeedback;
window.setEchoMix =
  setEchoMix;
window.updateEchoAudio =
  updateEchoAudio;
window.applyAlesisPreset =
  applyAlesisPreset;
/* =========================================================
   DBX NAMESPACE
   ========================================================= */
window.DBX2231.echo = {
  get input() {
    return echoInputNode;
  },
  get output() {
    return echoOutputNode;
  },
  get delay() {
    return echoDelayNode;
  },
  get feedback() {
    return echoFeedbackNode;
  },
  get wet() {
    return echoWetNode;
  },
  get state() {
    return echoState;
  },
  get enabled() {
    return echoEnabled;
  },
  get bypassed() {
    return echoBypassed;
  }
};
