/* =========================================================
   AUDIO ENGINE
   =========================================================

   AUDIO PATH

   SOURCE
      ↓
   ALESIS ECHO
      ↓
   DBX 2231 EQUALIZER
      ↓
   MASTER
      ↓
   OUTPUT

   IMPORTANT
   ---------------------------------------------------------
   1. AudioContext hanya dibuat satu kali.
   2. MediaElementSource hanya dibuat satu kali.
   3. AudioNode tidak dibuat ulang saat START ditekan.
   4. Source hanya diputus dari Alesis ketika memang
      mengganti / menghentikan source.
   5. Audio graph utama tidak dihancurkan oleh STOP.
   ========================================================= */


/* =========================================================
   GLOBAL AUDIO
   ========================================================= */

let audioContext = null;

let masterGainNode = null;

let sourceNode = null;


/* =========================================================
   DBX INPUT
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

let audioGraphInitialized = false;


/* =========================================================
   PLAYLIST
   ========================================================= */

let audioFiles = [];

let currentAudioIndex = -1;

let audioObjectUrls = [];


/* =========================================================
   AUDIO CONTEXT
   ========================================================= */

function createAudioContext() {

  /*
   * =======================================================
   * JIKA SUDAH ADA, JANGAN BUAT LAGI
   * =======================================================
   */

  if (audioContext) {

    window.audioContext =
      audioContext;

    return audioContext;

  }


  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;


  if (!AudioContextClass) {

    throw new Error(
      "Web Audio API tidak didukung."
    );

  }


  /*
   * =======================================================
   * BUAT AUDIO CONTEXT
   * =======================================================
   */

  audioContext =
    new AudioContextClass();


  /*
   * Export langsung.
   */

  window.audioContext =
    audioContext;


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
     MASTER INITIAL VALUE
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
     DBX / MASTER
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
     EXPORT NODES
     ======================================================= */

  window.masterGainNode =
    masterGainNode;


  window.stereoInputNode =
    stereoInputNode;


  window.stereoSplitter =
    stereoSplitter;


  window.stereoMerger =
    stereoMerger;


  /*
   * =======================================================
   * INITIALIZE ALESIS
   * =======================================================
   */

  if (
    typeof window.initializeEchoEngine ===
    "function"
  ) {

    window.initializeEchoEngine();

  }


  /*
   * =======================================================
   * INITIALIZE DBX
   * =======================================================
   */

  if (
    typeof window.initializeEqualizerEngine ===
    "function"
  ) {

    window.initializeEqualizerEngine();

  }


  /*
   * =======================================================
   * ALESIS → DBX
   * =======================================================
   */

  connectEchoToEqualizer();


  audioGraphInitialized =
    true;


  return audioContext;

}


/* =========================================================
   RESUME AUDIO CONTEXT
   ========================================================= */

async function resumeAudioContext() {

  const context =
    createAudioContext();


  if (
    context.state ===
    "suspended"
  ) {

    await context.resume();

  }


  return context;

}


/* =========================================================
   DB → LINEAR
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
   SOURCE → ALESIS
   ========================================================= */

function connectSourceToChannels(
  newSource
) {

  if (!newSource) {

    return;

  }


  /*
   * Jika source sama, jangan membuat
   * koneksi kedua.
   */

  if (
    sourceNode ===
    newSource
  ) {

    audioInputActive =
      true;

    return;

  }


  /*
   * Source baru memang menggantikan
   * source sebelumnya.
   */

  disconnectCurrentSource();


  sourceNode =
    newSource;


  window.sourceNode =
    sourceNode;


  /*
   * =======================================================
   * SOURCE → ALESIS
   * =======================================================
   */

  if (
    typeof window.connectEchoInput ===
    "function"
  ) {

    window.connectEchoInput(
      sourceNode
    );

  }

  else if (
    stereoInputNode
  ) {

    /*
     * Fallback jika Alesis belum tersedia.
     */

    try {

      sourceNode.connect(
        stereoInputNode
      );

    }

    catch (_) {}

  }


  audioInputActive =
    true;


  if (
    typeof window.updateAllStatusLights ===
    "function"
  ) {

    window.updateAllStatusLights();

  }

}


/* =========================================================
   ALESIS → DBX
   ========================================================= */

function connectEchoToEqualizer() {

  if (
    !audioContext
  ) {

    return;

  }


  if (
    !stereoInputNode
  ) {

    return;

  }


  if (
    typeof window.connectEchoOutput !==
    "function"
  ) {

    return;

  }


  /*
   * ALESIS OUTPUT
   *      ↓
   * DBX INPUT
   */

  window.connectEchoOutput(
    stereoInputNode
  );

}


/* =========================================================
   DISCONNECT SOURCE
   ========================================================= */

function disconnectCurrentSource() {

  /*
   * =======================================================
   * HANYA PUTUSKAN:
   *
   * SOURCE → ALESIS INPUT
   *
   * Jangan menggunakan:
   *
   * sourceNode.disconnect()
   *
   * karena bisa memutus koneksi lain.
   * =======================================================
   */

  if (
    sourceNode &&
    window.echoInputNode
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


  window.sourceNode =
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
   OBJECT URL
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


  /*
   * Hentikan playback sebelumnya.
   */

  audioPlayer.pause();


  /*
   * Jangan revoke URL yang sedang dipakai
   * sampai source baru sudah disiapkan.
   */

  const oldUrl =
    audioPlayer.dataset.objectUrl ||
    "";


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


  /*
   * Revoke URL lama setelah source baru
   * dipasang.
   */

  if (
    oldUrl &&
    oldUrl !== objectUrl
  ) {

    try {

      URL.revokeObjectURL(
        oldUrl
      );

    }

    catch (_) {}

  }


  setReadyStatus(
    `FILE READY: ${file.name}`
  );

}


/* =========================================================
   MICROPHONE
   ========================================================= */

async function startMicrophone() {

  await resumeAudioContext();


  /*
   * Jika audio file sedang berjalan,
   * hentikan playback-nya.
   */

  const audioPlayer =
    document.getElementById(
      "audioPlayer"
    );


  if (audioPlayer) {

    audioPlayer.pause();

  }


  /*
   * Stop microphone lama.
   */

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


  microphoneStream =
    null;


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "Microphone tidak didukung."
    );

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

  await resumeAudioContext();


  const audioPlayer =
    document.getElementById(
      "audioPlayer"
    );


  if (
    !audioPlayer
  ) {

    alert(
      "Audio player tidak ditemukan."
    );

    return;

  }


  if (
    !audioPlayer.src
  ) {

    alert(
      "Pilih file audio terlebih dahulu."
    );

    return;

  }


  /*
   * Jika microphone aktif,
   * hentikan hanya microphone.
   */

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
   * =======================================================
   * MEDIA ELEMENT SOURCE
   *
   * Dibuat SATU KALI untuk audioPlayer.
   * =======================================================
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

      console.error(
        "Gagal membuat MediaElementSource:",
        error
      );

    }

  }


  /*
   * Hubungkan source ke Alesis.
   */

  if (
    audioFileSourceNode
  ) {

    connectSourceToChannels(
      audioFileSourceNode
    );

  }


  /*
   * Pastikan audio player tidak muted
   * dan volumenya aktif.
   */

  audioPlayer.muted =
    false;


  audioPlayer.volume =
    1;


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


    setReadyStatus(
      "AUDIO PLAY ERROR"
    );


    /*
     * Browser dapat menolak playback
     * apabila belum ada gesture user.
     */

    alert(
      "Audio belum dapat diputar. Tekan START AUDIO sekali lagi."
    );

  }

}


/* =========================================================
   STOP AUDIO
   ========================================================= */

function stopAudio() {

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


  /*
   * Stop microphone jika aktif.
   */

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
   * Putus hanya SOURCE → ALESIS.
   *
   * AudioContext tetap hidup.
   * Alesis tetap hidup.
   * DBX tetap hidup.
   * Master tetap hidup.
   */

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

  const equalizerStatus =
    document.getElementById(
      "readyStatus"
    );


  if (
    equalizerStatus
  ) {

    equalizerStatus.textContent =
      message;

  }


  const alesisStatus =
    document.getElementById(
      "readyStatusAlesis"
    );


  if (
    alesisStatus
  ) {

    alesisStatus.textContent =
      message;

  }

}


/* =========================================================
   AUDIO UI
   ========================================================= */

function initializeAudioEngineUI() {

  /*
   * =======================================================
   * MASTER
   * =======================================================
   */

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


  /*
   * =======================================================
   * MUTE
   * =======================================================
   */

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


  /*
   * =======================================================
   * MICROPHONE
   * =======================================================
   */

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


  /*
   * =======================================================
   * START AUDIO
   * =======================================================
   */

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


  /*
   * =======================================================
   * STOP
   * =======================================================
   */

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


  /*
   * =======================================================
   * FILE INPUT
   * =======================================================
   */

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


        /*
         * Source lama akan tetap sama.
         * Hanya URL file yang berubah.
         */

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


  /*
   * =======================================================
   * AUDIO END / PLAYLIST
   * =======================================================
   */

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

        /*
         * Tidak ada playlist.
         */

        if (
          audioFiles.length === 0
        ) {

          setReadyStatus(
            "PLAYLIST SELESAI"
          );


          disconnectCurrentSource();


          return;

        }


        /*
         * Masih ada file berikutnya.
         */

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

          catch (error) {

            console.error(
              error
            );

          }


          return;

        }


        /*
         * Playlist benar-benar selesai.
         */

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
      "Gagal membaca audio device:",
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
   GLOBAL EXPORT
   ========================================================= */

window.audioContext =
  audioContext;


window.masterGainNode =
  masterGainNode;


window.stereoInputNode =
  stereoInputNode;


window.stereoSplitter =
  stereoSplitter;


window.stereoMerger =
  stereoMerger;


window.sourceNode =
  sourceNode;


window.createAudioContext =
  createAudioContext;


window.resumeAudioContext =
  resumeAudioContext;


window.connectSourceToChannels =
  connectSourceToChannels;


window.connectEchoToEqualizer =
  connectEchoToEqualizer;


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
