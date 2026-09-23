/* =========================================================
   AUDIO ENGINE — STABLE LONG-RUN VERSION
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
   DESIGN RULES
   ---------------------------------------------------------
   1. Hanya satu AudioContext.
   2. AudioContext tidak dibuat saat halaman hanya dibuka.
   3. AudioContext dibuat oleh user gesture.
   4. MediaElementSource hanya dibuat satu kali.
   5. Source tidak di-disconnect secara membabi buta.
   6. Alesis → DBX hanya satu koneksi.
   7. STOP tidak menghancurkan audio graph.
   8. Playlist memakai MediaElementSource yang sama.
   9. Master gain menggunakan smoothing.
   10. Context state dipantau untuk penggunaan lama.
   11. index.html adalah AUDIO HOST.
   12. alesis.html hanya remote/control UI.
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
let microphoneSourceNode = null;
let audioFileSourceNode = null;
/* =========================================================
   STATE
   ========================================================= */
let isMuted = false;
let audioInputActive = false;
let audioGraphInitialized = false;
let audioContextReady = false;
/* =========================================================
   CONNECTION STATE
   ========================================================= */
let sourceConnectedToEcho = false;
let echoConnectedToEqualizer = false;
/* =========================================================
   PLAYLIST
   ========================================================= */
let audioFiles = [];
let currentAudioIndex = -1;
let audioObjectUrls = [];
/* =========================================================
   AUDIO CONTEXT STATE
   ========================================================= */
let lastAudioContextState = null;
/* =========================================================
   CREATE AUDIO CONTEXT
   ========================================================= */
function createAudioContext() {
  /*
   * =======================================================
   * JIKA AUDIO CONTEXT SUDAH ADA
   * =======================================================
   */
  if (
    audioContext
  ) {
    /*
     * Pastikan global selalu menunjuk
     * ke context yang benar.
     */
    window.audioContext =
      audioContext;
    return audioContext;
  }
  /*
   * =======================================================
   * WEB AUDIO API
   * =======================================================
   */
  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error(
      "Web Audio API tidak didukung oleh browser ini."
    );
  }
  /*
   * =======================================================
   * BUAT SATU AUDIO CONTEXT
   * =======================================================
   */
  audioContext =
    new AudioContextClass();
  /*
   * =======================================================
   * EXPORT SEGERA
   * =======================================================
   */
  window.audioContext =
    audioContext;
  audioContextReady =
    true;
  lastAudioContextState =
    audioContext.state;
  /*
   * =======================================================
   * STATE MONITOR
   * =======================================================
   */
  audioContext.addEventListener(
    "statechange",
    handleAudioContextStateChange
  );
  /* =======================================================
     MASTER
     ======================================================= */
  masterGainNode =
    audioContext.createGain();
  /*
   * =======================================================
   * MASTER DEFAULT
   * =======================================================
   */
  masterGainNode.gain.value =
    0;
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
     MASTER INITIAL LEVEL
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
  const initialGain =
    isMuted
      ? 0
      : dbToGain(
          masterDb
        );
  masterGainNode.gain.value =
    initialGain;
  /* =======================================================
     EXPORT AUDIO NODES
     ======================================================= */
  exportAudioNodes();
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
     INITIALIZE DBX
     ======================================================= */
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
  /*
   * =======================================================
   * GRAPH READY
   * =======================================================
   */
  audioGraphInitialized =
    true;
  /*
   * Status.
   */
  setReadyStatus(
    "AUDIO ENGINE READY"
  );
  return audioContext;
}
/* =========================================================
   EXPORT AUDIO NODES
   ========================================================= */
function exportAudioNodes() {
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
}
/* =========================================================
   AUDIO CONTEXT STATE
   ========================================================= */
function handleAudioContextStateChange() {
  if (
    !audioContext
  ) {
    return;
  }
  const state =
    audioContext.state;
  lastAudioContextState =
    state;
  /*
   * =======================================================
   * RUNNING
   * =======================================================
   */
  if (
    state ===
    "running"
  ) {
    setReadyStatus(
      audioInputActive
        ? "AUDIO ACTIVE"
        : "AUDIO ENGINE READY"
    );
    return;
  }
  /*
   * =======================================================
   * SUSPENDED
   * =======================================================
   */
  if (
    state ===
    "suspended"
  ) {
    setReadyStatus(
      "AUDIO PAUSED BY BROWSER — RESUME..."
    );
    return;
  }
  /*
   * =======================================================
   * CLOSED
   * =======================================================
   */
  if (
    state ===
    "closed"
  ) {
    audioContextReady =
      false;
    audioGraphInitialized =
      false;
    setReadyStatus(
      "AUDIO CONTEXT CLOSED"
    );
  }
}
/* =========================================================
   RESUME AUDIO CONTEXT
   ========================================================= */
async function resumeAudioContext() {
  const context =
    createAudioContext();
  /*
   * =======================================================
   * RESUME JIKA SUSPENDED
   * =======================================================
   */
  if (
    context.state ===
    "suspended"
  ) {
    try {
      await context.resume();
    }
    catch (error) {
      console.warn(
        "AudioContext resume gagal:",
        error
      );
      setReadyStatus(
        "AUDIO RESUME MENUNGGU INTERAKSI"
      );
    }
  }
  return context;
}
/* =========================================================
   TRY RESUME
   ========================================================= */
async function tryResumeAudioContext() {
  if (
    !audioContext
  ) {
    return;
  }
  if (
    audioContext.state !==
    "suspended"
  ) {
    return;
  }
  try {
    await audioContext.resume();
  }
  catch (_) {
    /*
     * Browser dapat menolak resume
     * tanpa user gesture.
     */
  }
}
/* =========================================================
   DB → LINEAR GAIN
   ========================================================= */
function dbToGain(
  db
) {
  const numericDb =
    Number(db);
  if (
    !Number.isFinite(
      numericDb
    )
  ) {
    return 0;
  }
  return Math.pow(
    10,
    numericDb / 20
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
   * =======================================================
   * SOURCE YANG SAMA
   * =======================================================
   */
  if (
    sourceNode ===
    newSource
  ) {
    audioInputActive =
      true;
    sourceConnectedToEcho =
      true;
    exportAudioNodes();
    return;
  }
  /*
   * =======================================================
   * SOURCE BARU
   * =======================================================
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
    sourceConnectedToEcho =
      true;
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
      sourceConnectedToEcho =
        true;
    }
    catch (error) {
      console.warn(
        "SOURCE → DBX gagal:",
        error
      );
    }
  }
  audioInputActive =
    true;
  exportAudioNodes();
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
  /*
   * Audio graph harus sudah dibuat.
   */
  if (
    !audioContext ||
    !stereoInputNode
  ) {
    return;
  }
  /*
   * Alesis belum tersedia.
   */
  if (
    typeof window.connectEchoOutput !==
    "function"
  ) {
    return;
  }
  /*
   * =======================================================
   * HANYA CONNECT SEKALI
   * =======================================================
   */
  if (
    echoConnectedToEqualizer
  ) {
    return;
  }
  try {
    window.connectEchoOutput(
      stereoInputNode
    );
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
   DISCONNECT CURRENT SOURCE
   ========================================================= */
function disconnectCurrentSource() {
  if (
    !sourceNode
  ) {
    audioInputActive =
      false;
    sourceConnectedToEcho =
      false;
    return;
  }
  /*
   * =======================================================
   * PUTUS HANYA SOURCE → ALESIS
   * =======================================================
   */
  if (
    window.echoInputNode
  ) {
    try {
      sourceNode.disconnect(
        window.echoInputNode
      );
    }
    catch (_) {}
  }
  /*
   * =======================================================
   * FALLBACK
   * =======================================================
   */
  else if (
    stereoInputNode
  ) {
    try {
      sourceNode.disconnect(
        stereoInputNode
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
  sourceConnectedToEcho =
    false;
  if (
    typeof window.updateAllStatusLights ===
    "function"
  ) {
    window.updateAllStatusLights();
  }
}
/* =========================================================
   REVOKE OBJECT URLS
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
  const file =
    audioFiles[index];
  /*
   * =======================================================
   * STOP PLAYER
   * =======================================================
   */
  audioPlayer.pause();
  /*
   * =======================================================
   * SIMPAN URL LAMA
   * =======================================================
   */
  const oldUrl =
    audioPlayer.dataset.objectUrl ||
    "";
  /*
   * =======================================================
   * BUAT URL BARU
   * =======================================================
   */
  const objectUrl =
    URL.createObjectURL(
      file
    );
  audioPlayer.src =
    objectUrl;
  audioPlayer.dataset.objectUrl =
    objectUrl;
  /*
   * Simpan URL baru.
   */
  audioObjectUrls.push(
    objectUrl
  );
  currentAudioIndex =
    index;
  /*
   * Revoke URL lama setelah player
   * sudah diarahkan ke URL baru.
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
    audioObjectUrls =
      audioObjectUrls.filter(
        url =>
          url !== oldUrl
      );
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
   * =======================================================
   * STOP AUDIO FILE
   * =======================================================
   */
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
   * =======================================================
   * STOP MIC LAMA
   * =======================================================
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
  microphoneSourceNode =
    null;
  /*
   * =======================================================
   * CHECK DEVICE API
   * =======================================================
   */
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    throw new Error(
      "Microphone tidak didukung."
    );
  }
  /*
   * =======================================================
   * DEVICE
   * =======================================================
   */
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
  /*
   * =======================================================
   * GET MIC
   * =======================================================
   */
  microphoneStream =
    await navigator.mediaDevices
      .getUserMedia(
        constraints
      );
  /*
   * =======================================================
   * CREATE MIC SOURCE
   * =======================================================
   */
  microphoneSourceNode =
    audioContext.createMediaStreamSource(
      microphoneStream
    );
  /*
   * =======================================================
   * CONNECT
   * =======================================================
   */
  connectSourceToChannels(
    microphoneSourceNode
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
   * =======================================================
   * STOP MICROPHONE
   * =======================================================
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
    microphoneSourceNode =
      null;
  }
  /*
   * =======================================================
   * MEDIA ELEMENT SOURCE
   *
   * WAJIB SATU KALI.
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
        "MediaElementSource gagal dibuat:",
        error
      );
      setReadyStatus(
        "MEDIA AUDIO ERROR"
      );
      return;
    }
  }
  /*
   * =======================================================
   * SOURCE → ALESIS
   * =======================================================
   */
  connectSourceToChannels(
    audioFileSourceNode
  );
  /*
   * =======================================================
   * PLAYER
   * =======================================================
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
     * Jangan membuat AudioContext baru.
     * User cukup menekan START lagi.
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
  /*
   * =======================================================
   * STOP PLAYER
   * =======================================================
   */
  if (
    audioPlayer
  ) {
    audioPlayer.pause();
    try {
      audioPlayer.currentTime =
        0;
    }
    catch (_) {}
  }
  /*
   * =======================================================
   * STOP MICROPHONE
   * =======================================================
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
    microphoneSourceNode =
      null;
  }
  /*
   * =======================================================
   * PUTUS SOURCE SAJA
   * =======================================================
   */
  disconnectCurrentSource();
  /*
   * =======================================================
   * AUDIO GRAPH TETAP HIDUP
   * =======================================================
   */
  setReadyStatus(
    "AUDIO STOPPED"
  );
}
/* =========================================================
   MASTER
   ========================================================= */
function updateMasterGain() {
  if (
    !masterGainNode ||
    !audioContext
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
  const targetGain =
    isMuted
      ? 0
      : dbToGain(
          value
        );
  /*
   * =======================================================
   * SMOOTH MASTER
   * =======================================================
   */
  const now =
    audioContext.currentTime;
  masterGainNode.gain.cancelScheduledValues(
    now
  );
  masterGainNode.gain.setTargetAtTime(
    targetGain,
    now,
    0.015
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
   REFRESH DEVICES
   ========================================================= */
async function refreshAudioDevices() {
  await loadAudioDevices();
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
   * REFRESH DEVICES
   * =======================================================
   */
  const refreshButton =
    document.getElementById(
      "refreshDevices"
    );
  if (
    refreshButton
  ) {
    refreshButton.addEventListener(
      "click",
      async () => {
        try {
          await refreshAudioDevices();
          setReadyStatus(
            "AUDIO DEVICES UPDATED"
          );
        }
        catch (error) {
          console.error(
            error
          );
        }
      }
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
         * Hapus URL playlist sebelumnya.
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
         * File berikutnya.
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
              "Playlist next error:",
              error
            );
          }
          return;
        }
        /*
         * Playlist selesai.
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
   AUDIO DEVICE LIST
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
    const defaultOption =
      document.createElement(
        "option"
      );
    defaultOption.value =
      "";
    defaultOption.textContent =
      "DEFAULT MICROPHONE";
    select.appendChild(
      defaultOption
    );
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
   VISIBILITY / LONG-RUN SUPPORT
   ========================================================= */
document.addEventListener(
  "visibilitychange",
  () => {
    /*
     * Jangan membuat AudioContext baru.
     *
     * Jika browser men-suspend context,
     * kita hanya mencoba resume.
     */
    if (
      document.visibilityState ===
      "visible"
    ) {
      tryResumeAudioContext();
    }
  }
);
/* =========================================================
   USER INTERACTION RESUME
   ========================================================= */
document.addEventListener(
  "pointerdown",
  () => {
    tryResumeAudioContext();
  },
  {
    passive: true
  }
);
document.addEventListener(
  "touchstart",
  () => {
    tryResumeAudioContext();
  },
  {
    passive: true
  }
);
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
window.tryResumeAudioContext =
  tryResumeAudioContext;
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
window.loadAudioDevices =
  loadAudioDevices;
window.refreshAudioDevices =
  refreshAudioDevices;
