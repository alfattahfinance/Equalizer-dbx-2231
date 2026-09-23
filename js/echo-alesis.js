/* =========================================================
   ALESIS ECHO DSP ENGINE
   =========================================================
   AUDIO HOST:
      index.html
   REMOTE UI:
      alesis.html
   AUDIO PATH:
      SOURCE
         ↓
      ALESIS ECHO
         ↓
      DBX 2231
         ↓
      MASTER
         ↓
      OUTPUT
   IMPORTANT
   ---------------------------------------------------------
   index.html:
      - membuat AudioNode Alesis
      - menjalankan processing
      - menjadi audio host
   alesis.html:
      - hanya mengontrol parameter
      - tidak membuat AudioNode
      - tidak mengambil alih audio engine
   COMMUNICATION:
      BroadcastChannel
      +
      localStorage
   ========================================================= */
/* =========================================================
   GLOBAL NAMESPACE
   ========================================================= */
window.DBX2231 =
  window.DBX2231 || {};
/* =========================================================
   CHANNEL KOMUNIKASI
   ========================================================= */
const ALESIS_CHANNEL_NAME =
  "dbx-2231-alesis-control";
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
   LOCAL STORAGE
   ========================================================= */
const ALESIS_STORAGE_KEY =
  "dbx2231_alesis_state";
/* =========================================================
   AUDIO NODE
   ========================================================= */
let echoInputNode = null;
let echoDryNode = null;
let echoDelayNode = null;
let echoFeedbackNode = null;
let echoWetNode = null;
let echoOutputNode = null;
/* =========================================================
   STATE
   ========================================================= */
let echoEnabled = true;
let echoBypassed = false;
const echoState = {
  time: 300,
  feedback: 0.40,
  mix: 0.50,
  level: 0
};
/* =========================================================
   HOST DETECTION
   =========================================================
   index.html:
      Audio host
   alesis.html:
      Remote controller
   ========================================================= */
function isAudioHost() {
  /*
   * index.html adalah satu-satunya halaman
   * yang boleh membuat AudioNode Alesis.
   */
  return (
    document.body &&
    !(
      document.getElementById(
        "readyStatusAlesis"
      ) &&
      !document.getElementById(
        "channels"
      )
    )
  );
}
/* =========================================================
   GET AUDIO CONTEXT
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
   BROADCAST STATE
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
  /*
   * BroadcastChannel
   */
  if (
    alesisChannel
  ) {
    try {
      alesisChannel.postMessage(
        state
      );
    }
    catch (error) {
      console.warn(
        "Broadcast Alesis gagal:",
        error
      );
    }
  }
  /*
   * localStorage
   *
   * Digunakan sebagai fallback dan
   * penyimpanan state terakhir.
   */
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
   LOAD SAVED STATE
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
      "State Alesis tidak dapat dibaca:",
      error
    );
  }
}
/* =========================================================
   APPLY REMOTE STATE
   ========================================================= */
function applyRemoteEchoState(
  state,
  broadcastBack = false
) {
  if (!state) {
    return;
  }
  /*
   * POWER
   */
  if (
    typeof state.enabled ===
    "boolean"
  ) {
    echoEnabled =
      state.enabled;
  }
  /*
   * BYPASS
   */
  if (
    typeof state.bypass ===
    "boolean"
  ) {
    echoBypassed =
      state.bypass;
  }
  /*
   * DELAY
   */
  if (
    Number.isFinite(
      Number(state.time)
    )
  ) {
    echoState.time =
      Number(
        state.time
      );
  }
  /*
   * FEEDBACK
   */
  if (
    Number.isFinite(
      Number(state.feedback)
    )
  ) {
    echoState.feedback =
      Number(
        state.feedback
      );
  }
  /*
   * MIX
   */
  if (
    Number.isFinite(
      Number(state.mix)
    )
  ) {
    echoState.mix =
      Number(
        state.mix
      );
  }
  /*
   * LEVEL
   */
  if (
    Number.isFinite(
      Number(state.level)
    )
  ) {
    echoState.level =
      Number(
        state.level
      );
  }
  /*
   * Update audio hanya jika
   * halaman ini adalah HOST.
   */
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  /*
   * Update UI halaman.
   */
  updateEchoUI();
  /*
   * Kirim ulang jika diperlukan.
   */
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
  alesisChannel.onmessage =
    event => {
      const state =
        event.data;
      if (
        !state ||
        state.type !==
          "ALESIS_STATE"
      ) {
        return;
      }
      /*
       * Jangan proses pesan HOST
       * menjadi loop tak berujung.
       */
      applyRemoteEchoState(
        state,
        false
      );
    };
}
/* =========================================================
   INITIALIZE ALESIS ENGINE
   ========================================================= */
function initializeEchoEngine() {
  /*
   * Jika bukan audio host,
   * jangan membuat node audio.
   */
  if (
    !isAudioHost()
  ) {
    loadSavedEchoState();
    updateEchoUI();
    return;
  }
  /*
   * Jika node sudah ada,
   * jangan buat ulang.
   */
  if (
    echoInputNode &&
    echoOutputNode
  ) {
    updateEchoAudio();
    return;
  }
  const context =
    getAudioContext();
  if (!context) {
    /*
     * AudioContext memang belum dibuat.
     *
     * Jangan membuat AudioContext sendiri
     * ketika halaman baru dibuka.
     *
     * createAudioContext() akan memanggil
     * initializeEchoEngine() setelah user
     * melakukan gesture audio.
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
  /* =======================================================
     ROUTING
     =======================================================
     INPUT
       ├── DRY ────────────────┐
       │                       │
       └── DELAY → FEEDBACK ──┤
                    ↑          │
                    └──────────┘
                  WET
                    │
                    ▼
                  OUTPUT
   ======================================================= */
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
   * Export nodes.
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
   * Terapkan parameter.
   */
  updateEchoAudio();
  /*
   * Hubungkan ke DBX.
   */
  connectEchoToNextStage();
  /*
   * Broadcast state awal.
   */
  broadcastEchoState();
}
/* =========================================================
   CONNECT ECHO INPUT
   ========================================================= */
function connectEchoInput(
  source
) {
  if (!source) {
    return;
  }
  /*
   * AudioContext harus ada.
   */
  if (
    typeof window.createAudioContext ===
    "function"
  ) {
    try {
      window.createAudioContext();
    }
    catch (_) {}
  }
  /*
   * Hanya HOST yang membuat
   * koneksi audio.
   */
  if (
    !isAudioHost()
  ) {
    return;
  }
  /*
   * Pastikan engine tersedia.
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
   * Hindari koneksi ganda.
   */
  try {
    source.connect(
      echoInputNode
    );
  }
  catch (error) {
    console.warn(
      "SOURCE → ALESIS gagal:",
      error
    );
  }
}
/* =========================================================
   CONNECT ECHO OUTPUT
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
  const nextStage =
    window.stereoInputNode;
  if (
    !nextStage
  ) {
    return;
  }
  /*
   * Coba koneksi.
   *
   * Browser Web Audio tidak menyediakan
   * API standar untuk memeriksa koneksi
   * tertentu, sehingga kita menjaga agar
   * fungsi ini hanya dipanggil saat graph
   * dibuat / diperlukan.
   */
  try {
    echoOutputNode.connect(
      nextStage
    );
  }
  catch (_) {}
}
/* =========================================================
   ALIAS
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
  try {
    echoOutputNode.connect(
      destination
    );
  }
  catch (_) {}
}
/* =========================================================
   UPDATE AUDIO
   ========================================================= */
function updateEchoAudio() {
  /*
   * Hanya HOST yang mengontrol AudioNode.
   */
  if (
    !isAudioHost()
  ) {
    return;
  }
  if (
    !echoInputNode ||
    !echoOutputNode
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
  /*
   * =======================================================
   * DELAY TIME
   * =======================================================
   */
  const delaySeconds =
    Math.max(
      0.001,
      Math.min(
        5,
        Number(
          echoState.time
        ) / 1000
      )
    );
  echoDelayNode.delayTime.setTargetAtTime(
    delaySeconds,
    now,
    0.01
  );
  /*
   * =======================================================
   * FEEDBACK
   * =======================================================
   */
  const feedback =
    Math.max(
      0,
      Math.min(
        0.90,
        Number(
          echoState.feedback
        )
      )
    );
  echoFeedbackNode.gain.setTargetAtTime(
    feedback,
    now,
    0.01
  );
  /*
   * =======================================================
   * MIX
   * =======================================================
   */
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
  const dryGain =
    1 - mix;
  const wetGain =
    mix;
  /*
   * =======================================================
   * BYPASS / POWER
   * =======================================================
   */
  const effectActive =
    echoEnabled &&
    !echoBypassed;
  if (
    effectActive
  ) {
    echoDryNode.gain.setTargetAtTime(
      dryGain,
      now,
      0.01
    );
    echoWetNode.gain.setTargetAtTime(
      wetGain,
      now,
      0.01
    );
  }
  else {
    /*
     * Bypass:
     *
     * INPUT → OUTPUT
     */
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
  /*
   * LEVEL
   */
  const levelGain =
    dbToGain(
      Number(
        echoState.level
      )
    );
  echoOutputNode.gain.setTargetAtTime(
    levelGain,
    now,
    0.01
  );
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
   DELAY
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
        0.90,
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
   UI UPDATE
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
   * READY STATUS ALESIS
   */
  const ready =
    document.getElementById(
      "readyStatusAlesis"
    );
  if (
    ready
  ) {
    if (
      !echoEnabled
    ) {
      ready.textContent =
        "ALESIS POWER OFF";
    }
    else if (
      echoBypassed
    ) {
      ready.textContent =
        "ALESIS BYPASS";
    }
    else {
      ready.textContent =
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
        0.40;
      echoState.mix =
        0.50;
      break;
    case "long-echo":
      echoState.time =
        750;
      echoState.feedback =
        0.65;
      echoState.mix =
        0.55;
      break;
    case "reverb-hall":
      echoState.time =
        600;
      echoState.feedback =
        0.72;
      echoState.mix =
        0.45;
      break;
    default:
      return;
  }
  echoBypassed =
    false;
  echoEnabled =
    true;
  if (
    isAudioHost()
  ) {
    updateEchoAudio();
  }
  updateEchoUI();
  broadcastEchoState();
}
/* =========================================================
   DOM EVENTS
   ========================================================= */
document.addEventListener(
  "DOMContentLoaded",
  () => {
    /*
     * =====================================================
     * HOST INITIALIZATION
     * =====================================================
     */
    if (
      isAudioHost()
    ) {
      /*
       * Jangan membuat AudioContext otomatis.
       *
       * AudioContext akan dibuat ketika user
       * menekan START AUDIO / MIC.
       */
      updateEchoUI();
    }
    else {
      /*
       * Remote Alesis page.
       */
      loadSavedEchoState();
      updateEchoUI();
    }
    /* =====================================================
       POWER
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
     * Kirim request state saat halaman
     * Alesis remote dibuka.
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
   REQUEST STATE
   ========================================================= */
if (
  alesisChannel
) {
  alesisChannel.addEventListener(
    "message",
    event => {
      const data =
        event.data;
      if (
        !data
      ) {
        return;
      }
      /*
       * Halaman remote meminta state terbaru.
       */
      if (
        data.type ===
        "ALESIS_REQUEST_STATE"
      ) {
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
   EXPORT GLOBAL
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
