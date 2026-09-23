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

   ========================================================= */


/* =========================================================
   NAMESPACE
   ========================================================= */

window.DBX2231 =
  window.DBX2231 || {};


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
   INITIALIZE ECHO ENGINE
   ========================================================= */

function initializeEchoEngine() {

  if (
    !window.audioContext
  ) {

    return false;

  }


  /*
   * Jangan membuat node dua kali
   */

  if (
    echoDelayNode
  ) {

    return true;

  }


  const ctx =
    window.audioContext;


  /* -------------------------------------------------------
     CREATE NODES
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     INPUT
     ------------------------------------------------------- */

  echoInputNode.connect(
    echoDryNode
  );


  echoInputNode.connect(
    echoDelayNode
  );


  /* -------------------------------------------------------
     DELAY
     ------------------------------------------------------- */

  echoDelayNode.connect(
    echoFeedbackNode
  );


  echoFeedbackNode.connect(
    echoDelayNode
  );


  echoDelayNode.connect(
    echoWetNode
  );


  /* -------------------------------------------------------
     OUTPUT MIX
     ------------------------------------------------------- */

  echoDryNode.connect(
    echoOutputNode
  );


  echoWetNode.connect(
    echoOutputNode
  );


  /*
   * Default values
   */

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


  /*
   * Jangan langsung connect ke destination.
   *
   * Jalur ke tahap berikutnya dilakukan melalui
   * connectEchoOutput().
   */


  updateEchoAudio();


  return true;

}


/* =========================================================
   CONNECT ECHO OUTPUT
   ========================================================= */

function connectEchoOutput(destination) {

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

    echoOutputNode.disconnect();

  }

  catch (_) {}


  echoOutputNode.connect(
    destination
  );


  return true;

}


/* =========================================================
   CONNECT SOURCE → ECHO
   ========================================================= */

function connectEchoInput(source) {

  if (
    !source
  ) {

    return false;

  }


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
   * Hanya putuskan koneksi source ke ECHO
   * jika memang sebelumnya pernah terhubung.
   *
   * Jangan menggunakan:
   *
   * source.disconnect()
   *
   * karena dapat memutus routing lain.
   */


  try {

    source.connect(
      echoInputNode
    );

  }

  catch (error) {

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
    !echoDelayNode
  ) {

    return;

  }


  /* -------------------------------------------------------
     EFFECT ACTIVE
     ------------------------------------------------------- */

  const active =
    echoEnabled &&
    !echoBypassed;


  /* -------------------------------------------------------
     DELAY TIME
     ------------------------------------------------------- */

  const delayTime =
    Math.max(
      50,
      Math.min(
        1000,
        Number(
          echoState.time
        )
      )
    );


  echoDelayNode.delayTime.value =
    delayTime / 1000;


  /* -------------------------------------------------------
     FEEDBACK
     ------------------------------------------------------- */

  const feedback =
    active
      ? Math.max(
          0,
          Math.min(
            0.90,
            Number(
              echoState.feedback
            )
          )
        )
      : 0;


  echoFeedbackNode.gain.value =
    feedback;


  /* -------------------------------------------------------
     MIX
     ------------------------------------------------------- */

  const mix =
    active
      ? Math.max(
          0,
          Math.min(
            1,
            Number(
              echoState.mix
            )
          )
        )
      : 0;


  echoDryNode.gain.value =
    1 - mix;


  echoWetNode.gain.value =
    mix;


  /* -------------------------------------------------------
     OUTPUT LEVEL
     ------------------------------------------------------- */

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


  echoOutputNode.gain.value =
    outputGain;

}


/* =========================================================
   POWER
   ========================================================= */

function setEchoPower(enabled) {

  echoEnabled =
    !!enabled;


  updateEchoAudio();


  updateEchoUI();

}


/* =========================================================
   BYPASS
   ========================================================= */

function setEchoBypass(bypassed) {

  echoBypassed =
    !!bypassed;


  updateEchoAudio();


  updateEchoUI();

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


  /* -------------------------------------------------------
     POWER
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     BYPASS
     ------------------------------------------------------- */

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
        : "BYPASS EFFECT";

  }


  /* -------------------------------------------------------
     STATUS
     ------------------------------------------------------- */

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
   UPDATE TIME UI
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
      `${echoState.time} ms`;

  }

}


/* =========================================================
   UPDATE FEEDBACK UI
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

    /*
     * HTML menggunakan 0–90
     */

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
   UPDATE MIX UI
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

    /*
     * HTML menggunakan 0–100
     */

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
  preset
) {

  switch (
    preset
  ) {

    /* -----------------------------------------------------
       VOCAL SLAPBACK
       ----------------------------------------------------- */

    case "vocal-delay":

      echoState.time =
        250;

      echoState.feedback =
        0.30;

      echoState.mix =
        0.35;

      break;


    /* -----------------------------------------------------
       LONG ECHO
       ----------------------------------------------------- */

    case "long-echo":

      echoState.time =
        600;

      echoState.feedback =
        0.60;

      echoState.mix =
        0.50;

      break;


    /* -----------------------------------------------------
       HALL
       ----------------------------------------------------- */

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
      () => {

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
      () => {

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
      () => {

        echoState.time =
          Math.max(
            50,
            Math.min(
              1000,
              Number(
                time.value
              )
            )
          );


        updateEchoTimeUI();

        updateEchoAudio();

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
      () => {

        /*
         * HTML:
         *
         * 0–90
         *
         * ENGINE:
         *
         * 0–0.90
         */

        echoState.feedback =
          Math.max(
            0,
            Math.min(
              90,
              Number(
                feedback.value
              )
            )
          ) / 100;


        updateEchoFeedbackUI();

        updateEchoAudio();

      }
    );

  }


  /* =======================================================
     MIX
     ======================================================= */

  if (
    mix
  ) {

    mix.addEventListener(
      "input",
      () => {

        /*
         * HTML:
         *
         * 0–100
         *
         * ENGINE:
         *
         * 0–1
         */

        echoState.mix =
          Math.max(
            0,
            Math.min(
              100,
              Number(
                mix.value
              )
            )
          ) / 100;


        updateEchoMixUI();

        updateEchoAudio();

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
      () => {

        loadEchoPreset(
          presetSelect.value
        );

      }
    );

  }


  /* =======================================================
     INITIAL UI
     ======================================================= */

  updateAllEchoUI();

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      initializeEchoUI();

      /*
       * AudioContext sebaiknya tidak dipaksa
       * running sebelum user interaction.
       */

    },
    {
      once: true
    }
  );

}

else {

  initializeEchoUI();

}


/* =========================================================
   EXPORT
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


/* BACKWARD COMPATIBILITY */

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


/* =========================================================
   END
   ========================================================= */
