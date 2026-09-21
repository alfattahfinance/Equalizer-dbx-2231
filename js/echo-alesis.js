/* =========================================================
   ECHO ALESIS
   SOURCE
      ↓
   ECHO
      ↓
   EQUALIZER
   ========================================================= */

let echoInputNode = null;

let echoDryNode = null;

let echoDelayNode = null;

let echoFeedbackNode = null;

let echoWetNode = null;

let echoOutputNode = null;

let echoEnabled = false;


/* =========================================================
   ECHO PARAMETERS
   ========================================================= */

let echoState = {

  time: 350,

  feedback: 35,

  mix: 30,

  level: 0

};


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeEchoEngine() {

  if (!audioContext) {
    return;
  }


  if (echoDelayNode) {
    return;
  }


  echoInputNode =
    audioContext.createGain();


  echoDryNode =
    audioContext.createGain();


  echoDelayNode =
    audioContext.createDelay(
      5
    );


  echoFeedbackNode =
    audioContext.createGain();


  echoWetNode =
    audioContext.createGain();


  echoOutputNode =
    audioContext.createGain();


  /*
   * INPUT
   */

  echoInputNode.connect(
    echoDryNode
  );


  echoInputNode.connect(
    echoDelayNode
  );


  /*
   * DELAY
   */

  echoDelayNode.connect(
    echoFeedbackNode
  );


  echoFeedbackNode.connect(
    echoDelayNode
  );


  echoDelayNode.connect(
    echoWetNode
  );


  /*
   * OUTPUT
   */

  echoDryNode.connect(
    echoOutputNode
  );


  echoWetNode.connect(
    echoOutputNode
  );


  /*
   * ECHO → EQUALIZER
   */

  echoOutputNode.connect(
    stereoInputNode
  );


  updateEchoAudio();

}


/* =========================================================
   SOURCE → ECHO
   ========================================================= */

function connectEchoInput(
  source
) {

  createAudioContext();

  initializeEchoEngine();


  try {
    source.disconnect();
  } catch (_) {}


  source.connect(
    echoInputNode
  );


  updateEchoAudio();

}


/* =========================================================
   UPDATE ECHO
   ========================================================= */

function updateEchoAudio() {

  if (!echoDelayNode) {
    return;
  }


  /*
   * TIME
   */

  echoDelayNode.delayTime.value =
    Math.max(
      0,
      Math.min(
        5,
        Number(echoState.time) / 1000
      )
    );


  /*
   * FEEDBACK
   */

  echoFeedbackNode.gain.value =
    echoEnabled
      ? Math.max(
          0,
          Math.min(
            .95,
            Number(
              echoState.feedback
            ) / 100
          )
        )
      : 0;


  /*
   * MIX
   */

  const mix =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          echoState.mix
        )
      )
    ) / 100;


  echoDryNode.gain.value =
    echoEnabled
      ? 1 - mix
      : 1;


  echoWetNode.gain.value =
    echoEnabled
      ? mix
      : 0;


  /*
   * LEVEL
   */

  echoOutputNode.gain.value =
    dbToGain(
      Number(
        echoState.level
      )
    );

}


/* =========================================================
   ECHO UI
   ========================================================= */

function renderEchoPage() {

  const page =
    document.createElement(
      "section"
    );


  page.className =
    "app-page echo-page";


  page.id =
    "echoPage";


  page.innerHTML = `

    <div class="echo-header">

      <div>

        <div class="echo-title">
          ECHO ALESIS
        </div>

        <div class="echo-subtitle">
          DIGITAL ECHO / DELAY PROCESSOR
        </div>

      </div>

      <button
        class="hardware-button"
        id="echoPower"
        type="button"
      >
        ECHO OFF
      </button>

    </div>


    <div class="echo-controls">


      <div class="echo-control">

        <div class="echo-control-title">
          TIME
        </div>

        <input
          id="echoTime"
          type="range"
          min="1"
          max="2000"
          step="1"
          value="${echoState.time}"
        >

        <div
          class="echo-control-value"
          id="echoTimeValue"
        >
          ${echoState.time} ms
        </div>

      </div>


      <div class="echo-control">

        <div class="echo-control-title">
          FEEDBACK
        </div>

        <input
          id="echoFeedback"
          type="range"
          min="0"
          max="90"
          step="1"
          value="${echoState.feedback}"
        >

        <div
          class="echo-control-value"
          id="echoFeedbackValue"
        >
          ${echoState.feedback} %
        </div>

      </div>


      <div class="echo-control">

        <div class="echo-control-title">
          MIX / WET
        </div>

        <input
          id="echoMix"
          type="range"
          min="0"
          max="100"
          step="1"
          value="${echoState.mix}"
        >

        <div
          class="echo-control-value"
          id="echoMixValue"
        >
          ${echoState.mix} %
        </div>

      </div>


      <div class="echo-control">

        <div class="echo-control-title">
          LEVEL
        </div>

        <input
          id="echoLevel"
          type="range"
          min="-30"
          max="6"
          step="0.5"
          value="${echoState.level}"
        >

        <div
          class="echo-control-value"
          id="echoLevelValue"
        >
          ${echoState.level} dB
        </div>

      </div>

    </div>

  `;


  initializeEchoControls(
    page
  );


  return page;

}


/* =========================================================
   CONTROLS
   ========================================================= */

function initializeEchoControls(
  page
) {

  const power =
    page.querySelector(
      "#echoPower"
    );


  const time =
    page.querySelector(
      "#echoTime"
    );


  const feedback =
    page.querySelector(
      "#echoFeedback"
    );


  const mix =
    page.querySelector(
      "#echoMix"
    );


  const level =
    page.querySelector(
      "#echoLevel"
    );


  power.addEventListener(
    "click",
    () => {

      echoEnabled =
        !echoEnabled;


      power.classList.toggle(
        "active",
        echoEnabled
      );


      power.textContent =
        echoEnabled
          ? "ECHO ON"
          : "ECHO OFF";


      updateEchoAudio();

    }
  );


  time.addEventListener(
    "input",
    () => {

      echoState.time =
        Number(time.value);


      page.querySelector(
        "#echoTimeValue"
      ).textContent =
        `${echoState.time} ms`;


      updateEchoAudio();

    }
  );


  feedback.addEventListener(
    "input",
    () => {

      echoState.feedback =
        Number(
          feedback.value
        );


      page.querySelector(
        "#echoFeedbackValue"
      ).textContent =
        `${echoState.feedback} %`;


      updateEchoAudio();

    }
  );


  mix.addEventListener(
    "input",
    () => {

      echoState.mix =
        Number(
          mix.value
        );


      page.querySelector(
        "#echoMixValue"
      ).textContent =
        `${echoState.mix} %`;


      updateEchoAudio();

    }
  );


  level.addEventListener(
    "input",
    () => {

      echoState.level =
        Number(
          level.value
        );


      page.querySelector(
        "#echoLevelValue"
      ).textContent =
        `${echoState.level} dB`;


      updateEchoAudio();

    }
  );

}
