/* =========================================================
   AUDIO ENGINE
   SOURCE
      ↓
   ALESIS ECHO
      ↓
   DBX 2231 EQUALIZER
      ↓
   MASTER
      ↓
   OUTPUT
   ========================================================= */


/* =========================================================
   GLOBAL AUDIO
   ========================================================= */

let audioContext = null;

let masterGainNode = null;

let sourceNode = null;


/* =========================================================
   DBX EQUALIZER INPUT
   ========================================================= */

let stereoInputNode = null;

let stereoSplitter = null;

let stereoMerger = null;


/* =========================================================
   AUDIO SOURCES
   ========================================================= */

let microphoneStream = null;

let audioFileSourceNode = null;


/* =========================================================
   STATE
   ========================================================= */

let isMuted = false;

let audioInputActive = false;


/* =========================================================
   PLAYLIST
   ========================================================= */

let audioFiles = [];

let currentAudioIndex = -1;

let audioObjectUrls = [];


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


  /* =======================================================
     MASTER
     ======================================================= */

  masterGainNode =
    audioContext.createGain();


  /* =======================================================
     DBX INPUT
     ======================================================= */

  stereoInputNode =
    audioContext.createGain();


  stereoInputNode.channelCount =
    2;


  stereoInputNode.channelCountMode =
    "explicit";


  stereoInputNode.channelInterpretation =
    "speakers";


  /* =======================================================
     SPLITTER
     ======================================================= */

  stereoSplitter =
    audioContext.createChannelSplitter(
      2
    );


  /* =======================================================
     MERGER
     ======================================================= */

  stereoMerger =
    audioContext.createChannelMerger(
      2
    );


  /* =======================================================
     DBX INPUT → SPLITTER
     ======================================================= */

  stereoInputNode.connect(
    stereoSplitter
  );


  /* =======================================================
     MASTER LEVEL
     ======================================================= */

  const masterSlider =
    document.getElementById(
      "masterGain"
    );


  const masterDb =
    masterSlider
      ? Number(
          masterSlider.value
        )
      : -12;


  masterGainNode.gain.value =
    isMuted
      ? 0
      : dbToGain(
          masterDb
        );


  /* =======================================================
     MERGER → MASTER
     ======================================================= */

  stereoMerger.connect(
    masterGainNode
  );


  /* =======================================================
     MASTER → OUTPUT
     ======================================================= */

  masterGainNode.connect(
    audioContext.destination
  );


  /* =======================================================
     INITIALIZE ALESIS
     ======================================================= */

  if (
    typeof window.initializeEchoEngine ===
    "function"
  ) {

    window.initializeEchoEngine();

  }


  /* =======================================================
     INITIALIZE EQUALIZER
     ======================================================= */

  if (
    typeof window.initializeEqualizerEngine ===
    "function"
  ) {

    window.initializeEqualizerEngine();

  }

}


/* =========================================================
   DB → LINEAR GAIN
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
   SOURCE → ECHO
   ========================================================= */

function connectSourceToChannels(
  newSource
) {

  if (!newSource) {

    return;

  }


  /*
   * Hentikan source sebelumnya
   */

  disconnectCurrentSource();


  sourceNode =
    newSource;


  /* =======================================================
     SOURCE → ALESIS
     ======================================================= */

  if (
    typeof window.connectEchoInput ===
    "function"
  ) {

    window.connectEchoInput(
      sourceNode
    );

  }

  else {

    /*
     * Fallback apabila Echo belum tersedia
     */

    sourceNode.connect(
      stereoInputNode
    );

  }


  audioInputActive =
    true;


  /* =======================================================
     STATUS CHANNEL
     ======================================================= */

  if (
    typeof window.updateAllStatusLights ===
    "function"
  ) {

    window.updateAllStatusLights();

  }

}


/* =========================================================
   ECHO → DBX
   ========================================================= */

function connectEchoToEqualizer() {

  if (
    !window.stereoInputNode
  ) {

    return;

  }


  if (
    typeof window.connectEchoOutput ===
    "function"
  ) {

    window.connectEchoOutput(
      stereoInputNode
    );

  }

}


/* =========================================================
   DISCONNECT SOURCE
   ========================================================= */

function disconnectCurrentSource() {

  /*
   * Jangan memutus semua koneksi node dengan
   * source.disconnect() secara membabi buta.
   *
   * Hanya putuskan koneksi menuju Echo.
   */

  if (
    sourceNode &&
    typeof window.echoInputNode !==
    "undefined"
  ) {

    try {

      sourceNode.disconnect(
        window.echoInputNode
      );

    }

    catch (_) {}

  }


  sourceNode =
    null;


  audioInputActive =
    false;


  if (
    typeof window.updateAllStatusLights ===
    "function"
  ) {

    window.updateAllStatusLights();

  }

}


/* =========================================================
   PLAYLIST
   ========================================================= */

function revokeAudioObjectUrls() {

  audioObjectUrls.forEach(
    url => {

      try {

        URL.revokeObjectURL(
          url
        );

      }

      catch (_) {}

    }
  );


  audioObjectUrls = [];

}


/* =========================================================
   SELECT AUDIO FILE
   ========================================================= */

function selectAudioFile(
  index
) {

  const audioPlayer =
    document.getElementById(
      "audioPlayer"
    );


  if (!audioPlayer) {

    return;

  }


  if (
    index < 0 ||
    index >= audioFiles.length
  ) {

    return;

  }


  currentAudioIndex =
    index;


  const file =
    audioFiles[index];


  audioPlayer.pause();


  if (
    audioPlayer.dataset.objectUrl
  ) {

    try {

      URL.revokeObjectURL(
        audioPlayer.dataset.objectUrl
      );

    }

    catch (_) {}

  }


  const objectUrl =
    URL.createObjectURL(
      file
    );


  audioObjectUrls.push(
    objectUrl
  );


  audioPlayer.src =
    objectUrl;


  audioPlayer.dataset.objectUrl =
    objectUrl;


  setReadyStatus(
    `FILE READY: ${file.name}`
  );

}


/* =========================================================
   MICROPHONE
   ========================================================= */

async function startMicrophone() {

  createAudioContext();


  if (
    audioContext.state ===
    "suspended"
  ) {

    await audioContext.resume();

  }


  if (
    microphoneStream
  ) {

    microphoneStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
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


  const audioPlayer =
    document.getElementById(
      "audioPlayer"
    );


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
    "MICROPHONE → ALESIS → DBX ACTIVE"
  );

}


/* =========================================================
   AUDIO FILE
   ========================================================= */

async function startAudioFile() {

  createAudioContext();


  if (
    audioContext.state ===
    "suspended"
  ) {

    await audioContext.resume();

  }


  const audioPlayer =
    document.getElementById(
      "audioPlayer"
    );


  if (
    !audioPlayer ||
    !audioPlayer.src
  ) {

    alert(
      "Pilih file audio terlebih dahulu."
    );

    return;

  }


  if (
    microphoneStream
  ) {

    microphoneStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );


    microphoneStream =
      null;

  }


  /*
   * MediaElementSource hanya dibuat sekali.
   */

  if (
    !audioFileSourceNode
  ) {

    try {

      audioFileSourceNode =
        audioContext.createMediaElementSource(
          audioPlayer
        );

    }

    catch (error) {

      console.warn(
        "MediaElementSource sudah dibuat:",
        error
      );

    }

  }


  if (
    audioFileSourceNode
  ) {

    connectSourceToChannels(
      audioFileSourceNode
    );

  }


  try {

    await audioPlayer.play();


    const fileName =
      audioFiles[
        currentAudioIndex
      ]
        ? audioFiles[
            currentAudioIndex
          ].name
        : "AUDIO";


    setReadyStatus(
      `PLAYING → ALESIS → DBX: ${fileName}`
    );

  }

  catch (error) {

    console.error(
      "Gagal memutar audio:",
      error
    );


    alert(
      "Silakan klik START AUDIO sekali lagi."
    );


    setReadyStatus(
      "AUDIO PLAY ERROR"
    );

  }

}


/* =========================================================
   STOP AUDIO
   ========================================================= */

function stopAudio() {

  if (
    microphoneStream
  ) {

    microphoneStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );


    microphoneStream =
      null;

  }


  const audioPlayer =
    document.getElementById(
      "audioPlayer"
    );


  if (audioPlayer) {

    audioPlayer.pause();


    try {

      audioPlayer.currentTime =
        0;

    }

    catch (_) {}

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

  if (
    !masterGainNode
  ) {

    return;

  }


  const slider =
    document.getElementById(
      "masterGain"
    );


  const value =
    slider
      ? Number(
          slider.value
        )
      : -12;


  masterGainNode.gain.value =
    isMuted
      ? 0
      : dbToGain(
          value
        );

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
   MASTER / AUDIO UI
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


  if (
    masterSlider
  ) {

    masterSlider.addEventListener(
      "input",
      event => {

        const value =
          Number(
            event.target.value
          );


        if (
          masterValue
        ) {

          masterValue.textContent =
            `${value} dB`;

        }


        updateMasterGain();

      }
    );

  }


  /* =======================================================
     MUTE
     ======================================================= */

  const muteButton =
    document.getElementById(
      "muteOutput"
    );


  if (
    muteButton
  ) {

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


  /* =======================================================
     MICROPHONE
     ======================================================= */

  const micButton =
    document.getElementById(
      "micButton"
    );


  if (
    micButton
  ) {

    micButton.addEventListener(
      "click",
      async () => {

        try {

          await startMicrophone();

        }

        catch (error) {

          console.error(
            error
          );


          alert(
            "Mikrofon tidak dapat digunakan."
          );

        }

      }
    );

  }


  /* =======================================================
     START AUDIO
     ======================================================= */

  const startButton =
    document.getElementById(
      "startButton"
    );


  if (
    startButton
  ) {

    startButton.addEventListener(
      "click",
      async () => {

        try {

          await startAudioFile();

        }

        catch (error) {

          console.error(
            error
          );


          alert(
            "Audio tidak dapat diputar."
          );

        }

      }
    );

  }


  /* =======================================================
     STOP
     ======================================================= */

  const stopButton =
    document.getElementById(
      "stopButton"
    );


  if (
    stopButton
  ) {

    stopButton.addEventListener(
      "click",
      stopAudio
    );

  }


  /* =======================================================
     FILE INPUT
     ======================================================= */

  const audioFileInput =
    document.getElementById(
      "audioFile"
    );


  if (
    audioFileInput
  ) {

    audioFileInput.addEventListener(
      "change",
      event => {

        const selectedFiles =
          Array.from(
            event.target.files || []
          );


        if (
          selectedFiles.length === 0
        ) {

          return;

        }


        const audioPlayer =
          document.getElementById(
            "audioPlayer"
          );


        if (
          audioPlayer
        ) {

          audioPlayer.pause();

        }


        revokeAudioObjectUrls();


        audioFiles =
          selectedFiles;


        currentAudioIndex =
          0;


        selectAudioFile(
          0
        );


        setReadyStatus(
          `${selectedFiles.length} FILE → SIAP KE ALESIS`
        );

      }
    );

  }


  /* =======================================================
     AUDIO END
     ======================================================= */

  const audioPlayer =
    document.getElementById(
      "audioPlayer"
    );


  if (
    audioPlayer
  ) {

    audioPlayer.addEventListener(
      "ended",
      async () => {

        if (
          audioFiles.length === 0
        ) {

          setReadyStatus(
            "PLAYLIST SELESAI"
          );


          disconnectCurrentSource();


          return;

        }


        if (
          currentAudioIndex <
          audioFiles.length - 1
        ) {

          currentAudioIndex++;


          selectAudioFile(
            currentAudioIndex
          );


          try {

            await startAudioFile();

          }

          catch (_) {}


          return;

        }


        setReadyStatus(
          "PLAYLIST SELESAI"
        );


        disconnectCurrentSource();

      }
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


    select.innerHTML =
      "";


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

  }

  catch (error) {

    console.warn(
      error
    );

  }

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeAudioEngineUI();

    loadAudioDevices();

  }
);


/* =========================================================
   EXPORT
   ========================================================= */

window.audioContext =
  audioContext;

window.createAudioContext =
  createAudioContext;

window.connectSourceToChannels =
  connectSourceToChannels;

window.disconnectCurrentSource =
  disconnectCurrentSource;

window.startMicrophone =
  startMicrophone;

window.startAudioFile =
  startAudioFile;

window.stopAudio =
  stopAudio;

window.updateMasterGain =
  updateMasterGain;

window.setReadyStatus =
  setReadyStatus;
