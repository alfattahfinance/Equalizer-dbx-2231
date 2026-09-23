/* =========================================================
   ALESIS ECHO / QUADRAVERB ENGINE
   =========================================================

   SIGNAL FLOW:

   SOURCE
      ↓
   ALESIS INPUT
      ├────────────── DRY ──────────────┐
      │                                  │
      └── DELAY → FEEDBACK → DELAY ── WET
                                         │
                                         ↓
                                   ECHO OUTPUT
                                         │
                                         ↓
                              DBX 2231 / NEXT STAGE
                                         │
                                         ↓
                                   MASTER OUTPUT

   HALAMAN:

   index.html
      = DBX 2231 + audio engine utama

   alesis.html
      = kontrol Alesis

   KEDUA HALAMAN:
      = menggunakan state Alesis yang sama

   ========================================================= */


/* =========================================================
   NAMESPACE
   ========================================================= */

window.DBX2231 =
  window.DBX2231 || {};

window.DBX2231.ALESIS =
  window.DBX2231.ALESIS || {};


/* =========================================================
   CROSS-PAGE CHANNEL
   ========================================================= */

let alesisBroadcastChannel = null;

try {

  alesisBroadcastChannel =
    new BroadcastChannel(
      "dbx-2231-processor"
    );

} catch (error) {

  alesisBroadcastChannel = null;

}


/* =========================================================
   ECHO NODES
   ========================================================= */

let echoInputNode = null;
let echoDryNode = null;
let echoDelayNode = null;
let echoFeedbackNode = null;
let echoWetNode = null;
let echoOutputNode = null;


/* =========================================================
   ECHO STATE
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
   HELPER
   ========================================================= */

function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      Number(value)
    )
  );

}


/* =========================================================
   GET AUDIO CONTEXT
   ========================================================= */

function getEchoAudioContext() {

  return (
    window.audioContext ||
    window.DBX2231.audioContext ||
    null
  );

}


/* =========================================================
   INITIALIZE ECHO ENGINE
   ========================================================= */

function initializeEchoEngine() {

  const ctx =
    getEchoAudioContext();


  if (!ctx) {

    return false;

  }


  /*
   * Jangan membuat node dua kali.
   */

  if (
    echoDelayNode
  ) {

    /*
     * Jika stereoInputNode baru tersedia,
     * pastikan output Alesis tetap terhubung.
     */

    connectEchoToNextStage();

    return true;

  }


  /* =======================================================
     CREATE NODES
     ======================================================= */

  echoInputNode =
    ctx.createGain();


  echoDryNode =
    ctx.createGain();


  echoDelayNode =
    ctx.createDelay(5);


  echoFeedbackNode =
    ctx.createGain();


  echoWetNode =
    ctx.createGain();


  echoOutputNode =
    ctx.createGain();


  /* =======================================================
     SOURCE → ECHO INPUT
     ======================================================= */

  echoInputNode.connect(
    echoDryNode
  );


  echoInputNode.connect(
    echoDelayNode
  );


  /* =======================================================
     DELAY FEEDBACK LOOP
     ======================================================= */

  echoDelayNode.connect(
    echoFeedbackNode
  );


  echoFeedbackNode.connect(
    echoDelayNode
  );


  /* =======================================================
     DELAY → WET
     ======================================================= */

  echoDelayNode.connect(
    echoWetNode
  );


  /* =======================================================
     DRY + WET → OUTPUT
     ======================================================= */

  echoDryNode.connect(
    echoOutputNode
  );


  echoWetNode.connect(
    echoOutputNode
  );


  /* =======================================================
     DEFAULT VALUES
     ======================================================= */

  echoDelayNode.delayTime.value =
    echoState.time / 1000;


  echoFeedbackNode.gain.value =
    echoState.feedback;


  echoDryNode.gain.value =
    1 - echoState.mix;


  echoWetNode.gain.value =
    echoState.mix;


  echoOutputNode.gain.value =
    1;


  /* =======================================================
     CONNECT TO NEXT STAGE
     ======================================================= */

  connectEchoToNextStage();


  updateEchoAudio();


  return true;

}


/* =========================================================
   CONNECT ECHO OUTPUT → NEXT STAGE
   ========================================================= */

function connectEchoToNextStage() {

  if (
    !echoOutputNode
  ) {

    return false;

  }


  /*
   * stereoInputNode adalah input tahap
   * DBX 2231 / audio engine berikutnya.
   */

  const destination =
    window.stereoInputNode ||
    window.DBX2231.stereoInputNode ||
    null;


  if (!destination) {

    return false;

  }


  /*
   * Jangan disconnect semua koneksi jika
   * belum diperlukan.
   *
   * Karena echoOutputNode memang hanya
   * memiliki satu tujuan utama, kita pastikan
   * koneksi tidak diduplikasi.
   */

  try {

    echoOutputNode.disconnect(
      destination
    );

  } catch (_) {

    /*
     * Tidak masalah jika sebelumnya belum
     * terhubung.
     */

  }


  try {

    echoOutputNode.connect(
      destination
    );

  } catch (error) {

    console.warn(
      "ALESIS: gagal menghubungkan output ke DBX.",
      error
    );

    return false;

  }


  return true;

}


/* =========================================================
   COMPATIBILITY FUNCTION
   ========================================================= */

function connectEchoOutput(
  destination
) {

  if (
    !echoOutputNode
  ) {

    return false;

  }


  if (
    !destination
  ) {

    return false;

  }


  try {

    echoOutputNode.disconnect(
      destination
    );

  } catch (_) {}


  try {

    echoOutputNode.connect(
      destination
    );

  } catch (error) {

    console.warn(
      "ALESIS: output connection gagal.",
      error
    );

    return false;

  }


  return true;

}


/* =========================================================
   CONNECT SOURCE → ECHO
   ========================================================= */

function connectEchoInput(
  source
) {

  if (
    !source
  ) {

    return false;

  }


  /*
   * AudioContext dibuat oleh audio-engine.js
   * berdasarkan user interaction.
   */

  if (
    typeof window.createAudioContext ===
    "function"
  ) {

    window.createAudioContext();

  }


  if (
    !initializeEchoEngine()
  ) {

    return false;

  }


  /*
   * PENTING:
   *
   * Jangan pernah:
   *
   * source.disconnect()
   *
   * karena dapat memutus routing lain.
   */


  try {

    source.connect(
      echoInputNode
    );

  } catch (error) {

    /*
     * Jika source sudah terhubung,
     * tidak perlu dianggap sebagai error fatal.
     */

    console.warn(
      "ALESIS: source sudah terhubung atau gagal connect.",
      error
    );

  }


  updateEchoAudio();


  return true;

}


/* =========================================================
   UPDATE ECHO AUDIO
   ========================================================= */

function updateEchoAudio() {

  if (
    !echoDelayNode ||
    !echoFeedbackNode ||
    !echoDryNode ||
    !echoWetNode ||
    !echoOutputNode
  ) {

    return;

  }


  const ctx =
    getEchoAudioContext();


  if (!ctx) {

    return;

  }


  /* =======================================================
     EFFECT ACTIVE
     ======================================================= */

  const active =
    echoEnabled &&
    !echoBypassed;


  /* =======================================================
     DELAY TIME
     ======================================================= */

  const delayTime =
    clamp(
      echoState.time,
      50,
      1000
    );


  echoDelayNode.delayTime.setTargetAtTime(
    delayTime / 1000,
    ctx.currentTime,
    0.01
  );


  /* =======================================================
     FEEDBACK
     ======================================================= */

  const feedback =
    active
      ? clamp(
          echoState.feedback,
          0,
          0.90
        )
      : 0;


  echoFeedbackNode.gain.setTargetAtTime(
    feedback,
    ctx.currentTime,
    0.01
  );


  /* =======================================================
     MIX
     ======================================================= */

  const mix =
    active
      ? clamp(
          echoState.mix,
          0,
          1
        )
      : 0;


  /*
   * Ketika bypass:
   *
   * DRY = 100%
   * WET = 0%
   */

  const dryGain =
    active
      ? 1 - mix
      : 1;


  const wetGain =
    active
      ? mix
      : 0;


  echoDryNode.gain.setTargetAtTime(
    dryGain,
    ctx.currentTime,
    0.01
  );


  echoWetNode.gain.setTargetAtTime(
    wetGain,
    ctx.currentTime,
    0.01
  );


  /* =======================================================
     OUTPUT LEVEL
     ======================================================= */

  const level =
    Number(
      echoState.level
    );


  const outputGain =
    Number.isFinite(level)
      ? Math.pow(
          10,
          level / 20
        )
      : 1;


  echoOutputNode.gain.setTargetAtTime(
    outputGain,
    ctx.currentTime,
    0.01
  );

}


/* =========================================================
   POWER
   ========================================================= */

function setEchoPower(
  enabled,
  notify = true
) {

  echoEnabled =
    !!enabled;


  updateEchoAudio();

  updateEchoUI();


  if (
    notify
  ) {

    broadcastEchoState();

  }

}


/* =========================================================
   BYPASS
   ========================================================= */

function setEchoBypass(
  bypassed,
  notify = true
) {

  echoBypassed =
    !!bypassed;


  updateEchoAudio();

  updateEchoUI();


  if (
    notify
  ) {

    broadcastEchoState();

  }

}


/* =========================================================
   UI UPDATE
   ========================================================= */

function updateEchoUI() {

  const powerBtn =
    document.getElementById(
      "echoPowerBtn"
    );


  const bypassButton =
    document.getElementById(
      "bypassAlesis"
    );


  const readyStatus =
    document.getElementById(
      "readyStatusAlesis"
    );


  /* =======================================================
     POWER
     ======================================================= */

  if (
    powerBtn
  ) {

    powerBtn.classList.toggle(
      "active",
      echoEnabled
    );


    powerBtn.textContent =
      echoEnabled
        ? "POWER: ON"
        : "POWER: OFF";

  }


  /* =======================================================
     BYPASS
     ======================================================= */

  if (
    bypassButton
  ) {

    bypassButton.classList.toggle(
      "active",
      echoBypassed
    );


    bypassButton.textContent =
      echoBypassed
        ? "EFFECT BYPASSED"
        : "BYPASS";

  }


  /* =======================================================
     STATUS
     ======================================================= */

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
        "ALESIS ACTIVE";

    }

  }

}


/* =========================================================
   TIME UI
   ========================================================= */

function updateEchoTimeUI() {

  const slider =
    document.getElementById(
      "delayTime"
    );


  const value =
    document.getElementById(
      "delayTimeValue"
    );


  if (
    slider
  ) {

    slider.value =
      String(
        echoState.time
      );

  }


  if (
    value
  ) {

    value.textContent =
      `${Math.round(
        echoState.time
      )} ms`;

  }

}


/* =========================================================
   FEEDBACK UI
   ========================================================= */

function updateEchoFeedbackUI() {

  const slider =
    document.getElementById(
      "delayFeedback"
    );


  const value =
    document.getElementById(
      "feedbackValue"
    );


  const percent =
    Math.round(
      echoState.feedback * 100
    );


  if (
    slider
  ) {

    slider.value =
      String(
        percent
      );

  }


  if (
    value
  ) {

    value.textContent =
      `${percent}%`;

  }

}


/* =========================================================
   MIX UI
   ========================================================= */

function updateEchoMixUI() {

  const slider =
    document.getElementById(
      "effectMix"
    );


  const value =
    document.getElementById(
      "mixValue"
    );


  const percent =
    Math.round(
      echoState.mix * 100
    );


  if (
    slider
  ) {

    slider.value =
      String(
        percent
      );

  }


  if (
    value
  ) {

    value.textContent =
      `${percent}%`;

  }

}


/* =========================================================
   UPDATE ALL UI
   ========================================================= */

function updateAllEchoUI() {

  updateEchoTimeUI();

  updateEchoFeedbackUI();

  updateEchoMixUI();

  updateEchoUI();

}


/* =========================================================
   PRESETS
   ========================================================= */

function loadEchoPreset(
  preset,
  notify = true
) {

  switch (
    preset
  ) {

    case "vocal-delay":

      echoState.time =
        250;

      echoState.feedback =
        0.30;

      echoState.mix =
        0.35;

      break;


    case "long-echo":

      echoState.time =
        600;

      echoState.feedback =
        0.60;

      echoState.mix =
        0.50;

      break;


    case "reverb-hall":

      echoState.time =
        400;

      echoState.feedback =
        0.75;

      echoState.mix =
        0.60;

      break;


    default:

      return;

  }


  /*
   * Memilih preset otomatis
   * mengaktifkan Alesis.
   */

  echoEnabled =
    true;

  echoBypassed =
    false;


  updateAllEchoUI();

  updateEchoAudio();


  const readyStatus =
    document.getElementById(
      "readyStatusAlesis"
    );


  if (
    readyStatus
  ) {

    readyStatus.textContent =
      `PRESET: ${String(
        preset
      ).toUpperCase()}`;

  }


  if (
    notify
  ) {

    broadcastEchoState();

  }

}


/* =========================================================
   BROADCAST STATE
   ========================================================= */

function broadcastEchoState() {

  const state = {

    type:
      "ALESIS_STATE",

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
    alesisBroadcastChannel
  ) {

    try {

      alesisBroadcastChannel.postMessage(
        state
      );

    } catch (error) {

      console.warn(
        "ALESIS: BroadcastChannel error.",
        error
      );

    }

  }


  /*
   * localStorage
   *
   * Berguna jika index.html baru dibuka
   * setelah perubahan Alesis.
   */

  try {

    localStorage.setItem(
      "dbx2231_alesis_state",
      JSON.stringify(
        state
      )
    );

  } catch (_) {}

}


/* =========================================================
   APPLY REMOTE STATE
   ========================================================= */

function applyRemoteEchoState(
  data
) {

  if (
    !data ||
    data.type !==
    "ALESIS_STATE"
  ) {

    return;

  }


  /*
   * POWER
   */

  if (
    typeof data.enabled ===
    "boolean"
  ) {

    echoEnabled =
      data.enabled;

  }


  /*
   * BYPASS
   */

  if (
    typeof data.bypass ===
    "boolean"
  ) {

    echoBypassed =
      data.bypass;

  }


  /*
   * TIME
   */

  if (
    Number.isFinite(
      Number(data.time)
    )
  ) {

    echoState.time =
      clamp(
        data.time,
        50,
        1000
      );

  }


  /*
   * FEEDBACK
   */

  if (
    Number.isFinite(
      Number(data.feedback)
    )
  ) {

    echoState.feedback =
      clamp(
        data.feedback,
        0,
        0.90
      );

  }


  /*
   * MIX
   */

  if (
    Number.isFinite(
      Number(data.mix)
    )
  ) {

    echoState.mix =
      clamp(
        data.mix,
        0,
        1
      );

  }


  /*
   * LEVEL
   */

  if (
    Number.isFinite(
      Number(data.level)
    )
  ) {

    echoState.level =
      Number(
        data.level
      );

  }


  /*
   * Terapkan ke audio engine
   * tanpa mengirim pesan balik.
   */

  updateEchoAudio();

  updateAllEchoUI();

}


/* =========================================================
   LOAD STATE FROM STORAGE
   ========================================================= */

function loadSavedEchoState() {

  try {

    const raw =
      localStorage.getItem(
        "dbx2231_alesis_state"
      );


    if (!raw) {

      return false;

    }


    const data =
      JSON.parse(
        raw
      );


    if (
      !data
    ) {

      return false;

    }


    applyRemoteEchoState({

      type:
        "ALESIS_STATE",

      ...data

    });


    return true;

  } catch (error) {

    console.warn(
      "ALESIS: gagal membaca state.",
      error
    );

    return false;

  }

}


/* =========================================================
   DOM READY
   ========================================================= */

function initializeEchoUI() {

  const powerBtn =
    document.getElementById(
      "echoPowerBtn"
    );


  const bypassButton =
    document.getElementById(
      "bypassAlesis"
    );


  const time =
    document.getElementById(
      "delayTime"
    );


  const feedback =
    document.getElementById(
      "delayFeedback"
    );


  const mix =
    document.getElementById(
      "effectMix"
    );


  const presetSelect =
    document.getElementById(
      "alesisPresetSelect"
    );


  const applyPresetBtn =
    document.getElementById(
      "applyAlesisPreset"
    );


  /* =======================================================
     POWER
     ======================================================= */

  if (
    powerBtn
  ) {

    powerBtn.addEventListener(
      "click",
      function () {

        setEchoPower(
          !echoEnabled
        );

      }
    );

  }


  /* =======================================================
     BYPASS
     ======================================================= */

  if (
    bypassButton
  ) {

    bypassButton.addEventListener(
      "click",
      function () {

        setEchoBypass(
          !echoBypassed
        );

      }
    );

  }


  /* =======================================================
     DELAY TIME
     ======================================================= */

  if (
    time
  ) {

    time.addEventListener(
      "input",
      function () {

        echoState.time =
          clamp(
            time.value,
            50,
            1000
          );


        updateEchoTimeUI();

        updateEchoAudio();

        broadcastEchoState();

      }
    );

  }


  /* =======================================================
     FEEDBACK
     ======================================================= */

  if (
    feedback
  ) {

    feedback.addEventListener(
      "input",
      function () {

        /*
         * HTML:
         * 0–90
         *
         * ENGINE:
         * 0.00–0.90
         */

        echoState.feedback =
          clamp(
            Number(
              feedback.value
            ) / 100,
            0,
            0.90
          );


        updateEchoFeedbackUI();

        updateEchoAudio();

        broadcastEchoState();

      }
    );

  }


  /* =======================================================
     WET / DRY
     ======================================================= */

  if (
    mix
  ) {

    mix.addEventListener(
      "input",
      function () {

        /*
         * HTML:
         * 0–100
         *
         * ENGINE:
         * 0.00–1.00
         */

        echoState.mix =
          clamp(
            Number(
              mix.value
            ) / 100,
            0,
            1
          );


        updateEchoMixUI();

        updateEchoAudio();

        broadcastEchoState();

      }
    );

  }


  /* =======================================================
     PRESET
     ======================================================= */

  if (
    applyPresetBtn &&
    presetSelect
  ) {

    applyPresetBtn.addEventListener(
      "click",
      function () {

        loadEchoPreset(
          presetSelect.value
        );

      }
    );

  }


  /* =======================================================
     RECEIVE FROM OTHER PAGE
     ======================================================= */

  if (
    alesisBroadcastChannel
  ) {

    alesisBroadcastChannel.addEventListener(
      "message",
      function (event) {

        applyRemoteEchoState(
          event.data
        );

      }
    );

  }


  /*
   * State tersimpan dipakai saat halaman
   * pertama kali dibuka.
   */

  loadSavedEchoState();


  updateAllEchoUI();

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function bootAlesis() {

  /*
   * Jangan membuat AudioContext baru.
   *
   * AudioContext hanya dibuat oleh audio-engine.js
   * setelah user melakukan aksi audio.
   */


  initializeEchoUI();


  /*
   * Jika halaman index.html:
   * audio engine mungkin sudah membuat context.
   *
   * Jika belum ada, engine akan dibuat ketika
   * user menekan MIC / START AUDIO.
   */

  if (
    getEchoAudioContext()
  ) {

    initializeEchoEngine();

  }

}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    bootAlesis,
    {
      once: true
    }
  );

} else {

  bootAlesis();

}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.DBX2231.echoState =
  echoState;


window.DBX2231.initializeEchoEngine =
  initializeEchoEngine;


window.DBX2231.connectEchoInput =
  connectEchoInput;


window.DBX2231.connectEchoOutput =
  connectEchoOutput;


window.DBX2231.updateEchoAudio =
  updateEchoAudio;


window.DBX2231.setEchoPower =
  setEchoPower;


window.DBX2231.setEchoBypass =
  setEchoBypass;


window.DBX2231.loadEchoPreset =
  loadEchoPreset;


window.DBX2231.applyRemoteEchoState =
  applyRemoteEchoState;


/* =========================================================
   BACKWARD COMPATIBILITY
   ========================================================= */

window.echoState =
  echoState;


window.initializeEchoEngine =
  initializeEchoEngine;


window.connectEchoInput =
  connectEchoInput;


window.connectEchoOutput =
  connectEchoOutput;


window.updateEchoAudio =
  updateEchoAudio;


window.setEchoPower =
  setEchoPower;


window.setEchoBypass =
  setEchoBypass;


window.loadEchoPreset =
  loadEchoPreset;


/* =========================================================
   END
   ========================================================= */
