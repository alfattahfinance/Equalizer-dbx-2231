/* =========================================================
   AUDIO ENGINE
   SOURCE
      ↓
   ECHO ALESIS
      ↓
   EQUALIZER
      ↓
   MASTER
      ↓
   OUTPUT
   ========================================================= */

let audioContext = null;

let masterGainNode = null;

let sourceNode = null;

let stereoInputNode = null;

let stereoSplitter = null;

let stereoMerger = null;

let microphoneStream = null;

let audioFileSourceNode = null;

let isMuted = false;

let audioInputActive = false;


/* =========================================================
   INITIALIZE AUDIO CONTEXT
   ========================================================= */

function createAudioContext() {

  if (audioContext) {
    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "Web Audio API tidak didukung."
    );
  }

  audioContext =
    new AudioContextClass();


  masterGainNode =
    audioContext.createGain();


  stereoInputNode =
    audioContext.createGain();


  stereoInputNode.channelCount = 2;

  stereoInputNode.channelCountMode =
    "explicit";

  stereoInputNode.channelInterpretation =
    "speakers";


  stereoSplitter =
    audioContext.createChannelSplitter(2);


  stereoMerger =
    audioContext.createChannelMerger(2);


  stereoInputNode.connect(
    stereoSplitter
  );


  /*
   * MASTER
   */

  const masterSlider =
    document.getElementById(
      "masterGain"
    );

  const masterDb =
    masterSlider
      ? Number(masterSlider.value)
      : -12;


  masterGainNode.gain.value =
    isMuted
      ? 0
      : dbToGain(masterDb);


  /*
   * OUTPUT
   */

  stereoMerger.connect(
    masterGainNode
  );

  masterGainNode.connect(
    audioContext.destination
  );


  /*
   * Beritahu modul lain.
   */

  if (
    typeof initializeEchoEngine ===
    "function"
  ) {
    initializeEchoEngine();
  }

  if (
    typeof initializeEqualizerEngine ===
    "function"
  ) {
    initializeEqualizerEngine();
  }

}


/* =========================================================
   DB → GAIN
   ========================================================= */

function dbToGain(db) {

  return Math.pow(
    10,
    Number(db) / 20
  );

}


/* =========================================================
   SOURCE → AUDIO CHAIN
   ========================================================= */

function connectSourceToChannels(
  newSource
) {

  disconnectCurrentSource();

  if (!newSource) {
    return;
  }

  sourceNode =
    newSource;


  /*
   * ALUR AUDIO:
   * SOURCE → ECHO ALESIS → EQUALIZER
   */

  if (
    typeof connectEchoInput ===
    "function"
  ) {

    connectEchoInput(
      sourceNode
    );

  } else {

    sourceNode.connect(
      stereoInputNode
    );

  }


  audioInputActive =
    true;


  if (
    typeof updateAllStatusLights ===
    "function"
  ) {

    updateAllStatusLights();

  }

}


/* =========================================================
   DISCONNECT SOURCE
   ========================================================= */

function disconnectCurrentSource() {

  if (sourceNode) {

    try {
      sourceNode.disconnect();
    } catch (_) {}

  }

  sourceNode = null;

  audioInputActive = false;

}


/* =========================================================
   MICROPHONE
   ========================================================= */

async function startMicrophone() {

  createAudioContext();

  await audioContext.resume();


  if (microphoneStream) {

    microphoneStream
      .getTracks()
      .forEach(
        track => track.stop()
      );

  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "Microphone tidak didukung."
    );

  }


  if (audioPlayer) {
    audioPlayer.pause();
  }


  const inputDevice =
    document.getElementById(
      "inputDevice"
    );


  const deviceId =
    inputDevice
      ? inputDevice.value
      : "";


  const constraints = {

    audio:
      deviceId
        ? {
            deviceId: {
              exact: deviceId
            }
          }
        : true

  };


  microphoneStream =
    await navigator.mediaDevices
      .getUserMedia(
        constraints
      );


  const micSource =
    audioContext.createMediaStreamSource(
      microphoneStream
    );


  connectSourceToChannels(
    micSource
  );


  setReadyStatus(
    "MICROPHONE ACTIVE"
  );

}


/* =========================================================
   AUDIO FILE
   ========================================================= */

async function startAudioFile() {

  createAudioContext();

  await audioContext.resume();


  if (
    !audioPlayer ||
    !audioPlayer.src
  ) {

    alert(
      "Pilih file audio terlebih dahulu."
    );

    return;

  }


  if (microphoneStream) {

    microphoneStream
      .getTracks()
      .forEach(
        track => track.stop()
      );

    microphoneStream = null;

  }


  /*
   * MediaElementSource hanya sekali.
   */

  if (!audioFileSourceNode) {

    audioFileSourceNode =
      audioContext.createMediaElementSource(
        audioPlayer
      );

  }


  connectSourceToChannels(
    audioFileSourceNode
  );


  await audioPlayer.play();


  setReadyStatus(
    "AUDIO PLAYING"
  );

}


/* =========================================================
   STOP
   ========================================================= */

function stopAudio() {

  if (microphoneStream) {

    microphoneStream
      .getTracks()
      .forEach(
        track => track.stop()
      );

    microphoneStream = null;

  }


  if (audioPlayer) {

    audioPlayer.pause();

    try {
      audioPlayer.currentTime = 0;
    } catch (_) {}

  }


  disconnectCurrentSource();

  setReadyStatus(
    "AUDIO STOPPED"
  );

}


/* =========================================================
   MASTER
   ========================================================= */

function updateMasterGain() {

  if (!masterGainNode) {
    return;
  }

  const slider =
    document.getElementById(
      "masterGain"
    );

  const value =
    slider
      ? Number(slider.value)
      : -12;


  masterGainNode.gain.value =
    isMuted
      ? 0
      : dbToGain(value);

}


/* =========================================================
   STATUS
   ========================================================= */

function setReadyStatus(
  message
) {

  const element =
    document.getElementById(
      "readyStatus"
    );

  if (element) {
    element.textContent =
      message;
  }

}


/* =========================================================
   MASTER EVENTS
   ========================================================= */

function initializeAudioEngineUI() {

  const masterSlider =
    document.getElementById(
      "masterGain"
    );


  const masterValue =
    document.getElementById(
      "masterValue"
    );


  if (masterSlider) {

    masterSlider.addEventListener(
      "input",
      event => {

        const value =
          Number(event.target.value);


        if (masterValue) {

          masterValue.textContent =
            `${value} dB`;

        }


        updateMasterGain();

      }
    );

  }


  const muteButton =
    document.getElementById(
      "muteOutput"
    );


  if (muteButton) {

    muteButton.addEventListener(
      "click",
      () => {

        isMuted =
          !isMuted;


        muteButton.classList.toggle(
          "active",
          isMuted
        );


        muteButton.textContent =
          isMuted
            ? "UNMUTE OUTPUT"
            : "MUTE OUTPUT";


        updateMasterGain();


        setReadyStatus(
          isMuted
            ? "OUTPUT MUTED"
            : "OUTPUT ACTIVE"
        );

      }
    );

  }


  const micButton =
    document.getElementById(
      "micButton"
    );


  if (micButton) {

    micButton.addEventListener(
      "click",
      async () => {

        try {

          await startMicrophone();

        } catch (error) {

          console.error(error);

          alert(
            "Mikrofon tidak dapat digunakan."
          );

        }

      }
    );

  }


  const startButton =
    document.getElementById(
      "startButton"
    );


  if (startButton) {

    startButton.addEventListener(
      "click",
      async () => {

        try {

          await startAudioFile();

        } catch (error) {

          console.error(error);

          alert(
            "Audio tidak dapat diputar."
          );

        }

      }
    );

  }


  const stopButton =
    document.getElementById(
      "stopButton"
    );


  if (stopButton) {

    stopButton.addEventListener(
      "click",
      stopAudio
    );

  }

}


/* =========================================================
   DEVICE LIST
   ========================================================= */

async function loadAudioDevices() {

  const select =
    document.getElementById(
      "inputDevice"
    );

  if (
    !select ||
    !navigator.mediaDevices
  ) {
    return;
  }


  try {

    const devices =
      await navigator.mediaDevices
        .enumerateDevices();


    select.innerHTML = "";


    devices
      .filter(
        device =>
          device.kind ===
          "audioinput"
      )
      .forEach(
        device => {

          const option =
            document.createElement(
              "option"
            );


          option.value =
            device.deviceId;


          option.textContent =
            device.label ||
            "Audio Input";


          select.appendChild(
            option
          );

        }
      );


  } catch (error) {

    console.warn(
      error
    );

  }

}


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeAudioEngineUI();

    loadAudioDevices();

  }
);
