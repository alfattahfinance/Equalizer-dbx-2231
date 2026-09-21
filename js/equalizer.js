/* =========================================================
   DBX 2231 GRAPHIC EQUALIZER
   CHANNEL 1 + CHANNEL 2
   UI + AUDIO PROCESSING
   ========================================================= */


/* =========================================================
   31 BAND FREQUENCIES
   ========================================================= */

const frequencies = [
  20, 25, 31.5, 40, 50, 63, 80,
  100, 125, 160, 200, 250, 315,
  400, 500, 630, 800, 1000,
  1250, 1600, 2000, 2500, 3150,
  4000, 5000, 6300, 8000,
  10000, 12500, 16000, 20000
];


/* =========================================================
   CHANNEL STATE
   ========================================================= */

const channelState = [

  {
    gain: 0,
    lowCut: false,
    range: 15,
    bypass: false,
    test: false,
    bands: Array(31).fill(0)
  },

  {
    gain: 0,
    lowCut: false,
    range: 15,
    bypass: false,
    test: false,
    bands: Array(31).fill(0)
  }

];


/* =========================================================
   AUDIO GRAPH
   ========================================================= */

let channelGraphs = [];


/* =========================================================
   TEST OSCILLATORS
   ========================================================= */

const testOscillators = [
  null,
  null
];

const testGains = [
  null,
  null
];


/* =========================================================
   CHANNEL CONTAINER
   =========================================================
   #channels sudah disediakan oleh index.html
   ========================================================= */

const channelsContainer =
  document.getElementById('channels');


/* =========================================================
   BUILD CHANNELS
   ========================================================= */

function buildChannels() {

  if (!channelsContainer) {

    console.error(
      'Element #channels tidak ditemukan'
    );

    return;
  }


  channelsContainer.innerHTML = '';


  channelState.forEach(
    (state, index) => {

      channelsContainer.appendChild(
        createChannel(
          index,
          state
        )
      );

    }
  );


  updateAllChannelButtons();

}


/* =========================================================
   CREATE CHANNEL
   ========================================================= */

function createChannel(
  channelIndex,
  state
) {

  const channel =
    document.createElement('section');


  channel.className =
    'channel';


  channel.dataset.channel =
    channelIndex + 1;


  const number =
    channelIndex + 1;


  const side =
    channelIndex === 0
      ? 'LEFT / L'
      : 'RIGHT / R';


  channel.innerHTML = `

    <!-- =================================================
         HEADER
         ================================================= -->

    <div class="channel-header">

      <div class="channel-name">
        CH${number} — ${side}
      </div>


      <div class="channel-status-top">

        <button
          type="button"
          class="status-button active-status"
          data-status="active"
        >
          ACTIVE
        </button>


        <button
          type="button"
          class="status-button bypass-status"
          data-status="bypass"
        >
          BYPASS
        </button>


        <button
          type="button"
          class="status-button test-status"
          data-status="test"
        >
          TEST
        </button>

      </div>

    </div>


    <!-- =================================================
         TOP CONTROL AREA
         ================================================= -->

    <div class="channel-top-controls">


      <!-- GAIN -->

      <div class="channel-control gain-control">

        <div class="control-label">
          GAIN
        </div>


        <input
          type="range"
          class="channel-gain"
          min="-12"
          max="12"
          step="0.5"
          value="${state.gain}"
          data-channel="${channelIndex}"
        />


        <div class="gain-scale">

          <span>-12</span>

          <strong
            class="channel-gain-value"
            data-gain-value="${channelIndex}"
          >
            ${Number(state.gain).toFixed(1)} dB
          </strong>

          <span>+12</span>

        </div>

      </div>


      <!-- LOW CUT -->

      <div class="channel-control lowcut-control">

        <div class="control-label">
          LOW CUT
        </div>


        <button
          type="button"
          class="control-value-button low-cut-button"
          data-action="lowcut"
          data-channel="${channelIndex}"
        >
          ${state.lowCut ? 'ON / 40 Hz' : 'OFF / 40 Hz'}
        </button>

      </div>


      <!-- RANGE -->

      <div class="channel-control range-control">

        <div class="control-label">
          RANGE
        </div>


        <button
          type="button"
          class="control-value-button range-button"
          data-action="range"
          data-channel="${channelIndex}"
        >
          ±${state.range} dB
        </button>

      </div>


      <!-- LEVEL METER -->

      <div class="channel-control level-control">

        <div class="control-label">
          LEVEL METER
        </div>


        <div class="meter-scale">

          <span>-60</span>
          <span>-40</span>
          <span>-20</span>
          <span>-10</span>
          <span>-6</span>
          <span>-3</span>
          <span>0</span>
          <span>+3</span>

        </div>


        <div
          class="led-meter"
          data-meter="${channelIndex}"
        >

          ${Array.from(
            { length: 18 },
            (_, i) => `
              <div
                class="meter-segment"
                data-segment="${i}"
              ></div>
            `
          ).join('')}

        </div>

      </div>


      <!-- CLIP -->

      <div
        class="clip-indicator"
        data-clip="${channelIndex}"
      >

        <div class="clip-light"></div>

        <span>
          CLIP
        </span>

      </div>

    </div>


    <!-- =================================================
         EQUALIZER
         ================================================= -->

    <div class="eq-wrapper">


      <div class="eq-scale">

        <span>+15</span>
        <span>+10</span>
        <span>+5</span>
        <span>0</span>
        <span>-5</span>
        <span>-10</span>
        <span>-15</span>

      </div>


      <div class="eq-scroll">

        <div
          class="eq-bands"
          data-eq="${channelIndex}"
        >

          ${frequencies.map(
            (
              frequency,
              bandIndex
            ) => {

              const value =
                Number(
                  state.bands[bandIndex] || 0
                );


              return `

                <div
                  class="eq-band"
                  data-channel="${channelIndex}"
                  data-band="${bandIndex}"
                >

                  <div class="eq-fader-wrap">

                    <input
                      class="eq-slider"
                      type="range"
                      min="-${state.range}"
                      max="${state.range}"
                      step="0.5"
                      value="${value}"
                      orient="vertical"
                      data-channel="${channelIndex}"
                      data-band="${bandIndex}"
                    />

                  </div>


                  <div class="eq-frequency">
                    ${formatFrequency(frequency)}
                  </div>


                  <div
                    class="eq-value"
                    data-eq-value="${channelIndex}-${bandIndex}"
                  >
                    ${value.toFixed(1)}
                  </div>

                </div>

              `;

            }
          ).join('')}

        </div>

      </div>

    </div>


    <!-- =================================================
         EQ FOOTER
         ================================================= -->

    <div class="eq-footer">

      <span>
        31 BAND ISO 1/3 OCTAVE
      </span>


      <span
        data-range-label="${channelIndex}"
      >
        RANGE : ±${state.range} dB
      </span>

    </div>


    <!-- =================================================
         CHANNEL BUTTONS
         ================================================= -->

    <div class="channel-buttons">

      <button
        type="button"
        class="hardware-button bypass-button"
        data-action="bypass"
        data-channel="${channelIndex}"
      >
        BYPASS
      </button>


      <button
        type="button"
        class="hardware-button test-button"
        data-action="test"
        data-channel="${channelIndex}"
      >
        TEST
      </button>

    </div>

  `;


  attachChannelEvents(
    channel,
    channelIndex
  );


  return channel;

}


/* =========================================================
   FORMAT FREQUENCY
   ========================================================= */

function formatFrequency(
  frequency
) {

  if (frequency >= 1000) {

    const khz =
      frequency / 1000;


    if (Number.isInteger(khz)) {

      return `${khz}K`;

    }


    return `${khz}K`;

  }


  return frequency.toString();

}


/* =========================================================
   CHANNEL EVENTS
   ========================================================= */

function attachChannelEvents(
  channel,
  channelIndex
) {


  /* =======================================================
     GAIN
     ======================================================= */

  const gain =
    channel.querySelector(
      '.channel-gain'
    );


  const gainValue =
    channel.querySelector(
      `[data-gain-value="${channelIndex}"]`
    );


  if (gain) {

    gain.addEventListener(
      'input',
      () => {

        const value =
          Number(gain.value);


        channelState[
          channelIndex
        ].gain = value;


        if (gainValue) {

          gainValue.textContent =
            `${value.toFixed(1)} dB`;

        }


        updateEqualizerChannel(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     LOW CUT
     ======================================================= */

  const lowCutButton =
    channel.querySelector(
      '.low-cut-button'
    );


  if (lowCutButton) {

    lowCutButton.addEventListener(
      'click',
      () => {

        const state =
          channelState[
            channelIndex
          ];


        state.lowCut =
          !state.lowCut;


        lowCutButton.textContent =
          state.lowCut
            ? 'ON / 40 Hz'
            : 'OFF / 40 Hz';


        updateEqualizerChannel(
          channelIndex
        );


        updateChannelStatus(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     RANGE
     ======================================================= */

  const rangeButton =
    channel.querySelector(
      '.range-button'
    );


  if (rangeButton) {

    rangeButton.addEventListener(
      'click',
      () => {

        const state =
          channelState[
            channelIndex
          ];


        state.range =
          state.range === 15
            ? 6
            : 15;


        rangeButton.textContent =
          `±${state.range} dB`;


        const rangeLabel =
          channel.querySelector(
            `[data-range-label="${channelIndex}"]`
          );


        if (rangeLabel) {

          rangeLabel.textContent =
            `RANGE : ±${state.range} dB`;

        }


        const sliders =
          channel.querySelectorAll(
            '.eq-slider'
          );


        sliders.forEach(
          slider => {

            slider.min =
              -state.range;

            slider.max =
              state.range;


            const current =
              Number(slider.value);


            if (
              current > state.range
            ) {

              slider.value =
                state.range;

            }


            if (
              current < -state.range
            ) {

              slider.value =
                -state.range;

            }

          }
        );


        updateAllEQValues(
          channel,
          channelIndex
        );


        updateEqualizerChannel(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     EQ SLIDERS
     ======================================================= */

  const sliders =
    channel.querySelectorAll(
      '.eq-slider'
    );


  sliders.forEach(
    slider => {

      slider.addEventListener(
        'input',
        () => {

          const bandIndex =
            Number(
              slider.dataset.band
            );


          const value =
            Number(
              slider.value
            );


          channelState[
            channelIndex
          ].bands[
            bandIndex
          ] = value;


          const valueElement =
            channel.querySelector(
              `[data-eq-value="${channelIndex}-${bandIndex}"]`
            );


          if (valueElement) {

            valueElement.textContent =
              value.toFixed(1);

          }


          updateEqualizerChannel(
            channelIndex
          );

        }
      );


      /*
       * Pointer support
       * untuk drag/touch pada browser mobile.
       */

      slider.addEventListener(
        'pointerdown',
        () => {

          slider.focus();

        }
      );

    }
  );


  /* =======================================================
     BYPASS - TOP
     ======================================================= */

  const topBypass =
    channel.querySelector(
      '[data-status="bypass"]'
    );


  if (topBypass) {

    topBypass.addEventListener(
      'click',
      () => {

        toggleBypass(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     BYPASS - BOTTOM
     ======================================================= */

  const bypassButton =
    channel.querySelector(
      '[data-action="bypass"]'
    );


  if (bypassButton) {

    bypassButton.addEventListener(
      'click',
      () => {

        toggleBypass(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     TEST - TOP
     ======================================================= */

  const topTest =
    channel.querySelector(
      '[data-status="test"]'
    );


  if (topTest) {

    topTest.addEventListener(
      'click',
      () => {

        toggleTest(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     TEST - BOTTOM
     ======================================================= */

  const testButton =
    channel.querySelector(
      '[data-action="test"]'
    );


  if (testButton) {

    testButton.addEventListener(
      'click',
      () => {

        toggleTest(
          channelIndex
        );

      }
    );

  }

}


/* =========================================================
   UPDATE EQ VALUE LABELS
   ========================================================= */

function updateAllEQValues(
  channel,
  channelIndex
) {

  const sliders =
    channel.querySelectorAll(
      '.eq-slider'
    );


  sliders.forEach(
    slider => {

      const bandIndex =
        Number(
          slider.dataset.band
        );


      const value =
        Number(
          slider.value
        );


      channelState[
        channelIndex
      ].bands[
        bandIndex
      ] = value;


      const output =
        channel.querySelector(
          `[data-eq-value="${channelIndex}-${bandIndex}"]`
        );


      if (output) {

        output.textContent =
          value.toFixed(1);

      }

    }
  );

}


/* =========================================================
   TOGGLE BYPASS
   ========================================================= */

function toggleBypass(
  channelIndex
) {

  const state =
    channelState[
      channelIndex
    ];


  state.bypass =
    !state.bypass;


  updateEqualizerChannel(
    channelIndex
  );


  updateChannelStatus(
    channelIndex
  );

}


/* =========================================================
   TOGGLE TEST
   ========================================================= */

function toggleTest(
  channelIndex
) {

  const state =
    channelState[
      channelIndex
    ];


  state.test =
    !state.test;


  if (state.test) {

    startChannelTest(
      channelIndex
    );

  }

  else {

    stopChannelTest(
      channelIndex
    );

  }


  updateChannelStatus(
    channelIndex
  );

}


/* =========================================================
   UPDATE BUTTON STATES
   ========================================================= */

function updateAllChannelButtons() {

  channelState.forEach(
    (_, index) => {

      updateChannelStatus(
        index
      );

    }
  );

}


/* =========================================================
   UPDATE CHANNEL STATUS
   ========================================================= */

function updateChannelStatus(
  channelIndex
) {

  const channel =
    document.querySelector(
      `.channel[data-channel="${channelIndex + 1}"]`
    );


  if (!channel) {

    return;

  }


  const state =
    channelState[
      channelIndex
    ];


  const bypassButtons =
    channel.querySelectorAll(
      '[data-status="bypass"], [data-action="bypass"]'
    );


  bypassButtons.forEach(
    button => {

      button.classList.toggle(
        'active',
        state.bypass
      );

    }
  );


  const testButtons =
    channel.querySelectorAll(
      '[data-status="test"], [data-action="test"]'
    );


  testButtons.forEach(
    button => {

      button.classList.toggle(
        'active',
        state.test
      );

    }
  );


  const activeButton =
    channel.querySelector(
      '[data-status="active"]'
    );


  if (activeButton) {

    const active =
      state.test ||
      hasActiveExternalSource();


    activeButton.classList.toggle(
      'active',
      active
    );

  }

}


/* =========================================================
   CHECK EXTERNAL SOURCE
   ========================================================= */

function hasActiveExternalSource() {

  if (
    typeof sourceNode !== 'undefined' &&
    sourceNode
  ) {

    return true;

  }


  if (
    typeof microphoneStream !== 'undefined' &&
    microphoneStream
  ) {

    return true;

  }


  return false;

}


/* =========================================================
   AUDIO ENGINE INITIALIZATION
   ========================================================= */

function initializeEqualizerEngine() {

  if (
    typeof audioContext === 'undefined' ||
    !audioContext
  ) {

    console.warn(
      'DBX 2231: AudioContext belum tersedia.'
    );

    return;

  }


  /*
   * Jangan membuat graph dua kali.
   */

  if (
    channelGraphs.length === 2
  ) {

    return;

  }


  const ch1 =
    createEqualizerChannel(0);


  const ch2 =
    createEqualizerChannel(1);


  channelGraphs = [
    ch1,
    ch2
  ];


  /*
   * STEREO SPLITTER
   *
   * Output 0 → CH1 LEFT
   * Output 1 → CH2 RIGHT
   */

  if (
    typeof stereoSplitter !== 'undefined' &&
    stereoSplitter
  ) {

    stereoSplitter.connect(
      ch1.inputGain,
      0,
      0
    );


    stereoSplitter.connect(
      ch2.inputGain,
      1,
      0
    );

  }


  /*
   * CH1 → STEREO MERGER LEFT
   */

  if (
    typeof stereoMerger !== 'undefined' &&
    stereoMerger
  ) {

    ch1.analyser.connect(
      stereoMerger,
      0,
      0
    );


    /*
     * CH2 → STEREO MERGER RIGHT
     */

    ch2.analyser.connect(
      stereoMerger,
      0,
      1
    );

  }


  updateEqualizerChannel(0);

  updateEqualizerChannel(1);

}


/* =========================================================
   CREATE AUDIO GRAPH
   ========================================================= */

function createEqualizerChannel(
  channelIndex
) {

  const state =
    channelState[
      channelIndex
    ];


  const inputGain =
    audioContext.createGain();


  const lowCut =
    audioContext.createBiquadFilter();


  lowCut.type =
    'highpass';


  lowCut.frequency.value =
    state.lowCut
      ? 40
      : 5;


  /*
   * 31 PARAMETRIC FILTERS
   */

  const filters =
    frequencies.map(
      (
        frequency,
        index
      ) => {

        const filter =
          audioContext.createBiquadFilter();


        filter.type =
          'peaking';


        filter.frequency.value =
          frequency;


        filter.Q.value =
          1.4;


        filter.gain.value =
          state.bands[index];


        return filter;

      }
    );


  const analyser =
    audioContext.createAnalyser();


  analyser.fftSize =
    2048;


  analyser.smoothingTimeConstant =
    0.75;


  /*
   * INPUT
   */

  let previous =
    inputGain;


  /*
   * LOW CUT
   */

  previous.connect(
    lowCut
  );


  previous =
    lowCut;


  /*
   * 31 EQ FILTERS
   */

  filters.forEach(
    filter => {

      previous.connect(
        filter
      );


      previous =
        filter;

    }
  );


  /*
   * ANALYSER
   */

  previous.connect(
    analyser
  );


  return {

    inputGain,
    lowCut,
    filters,
    analyser

  };

}


/* =========================================================
   UPDATE AUDIO CHANNEL
   ========================================================= */

function updateEqualizerChannel(
  channelIndex
) {

  const graph =
    channelGraphs[
      channelIndex
    ];


  if (!graph) {

    return;

  }


  const state =
    channelState[
      channelIndex
    ];


  /*
   * GAIN
   *
   * Gain tetap bekerja ketika BYPASS.
   */

  graph.inputGain.gain.value =
    dbToLinear(
      state.gain
    );


  /*
   * LOW CUT
   */

  graph.lowCut.frequency.value =
    state.bypass
      ? 5
      : state.lowCut
        ? 40
        : 5;


  /*
   * 31 BAND EQ
   *
   * BYPASS hanya membypass EQ.
   */

  graph.filters.forEach(
    (
      filter,
      index
    ) => {

      filter.gain.value =
        state.bypass
          ? 0
          : state.bands[index];

    }
  );

}


/* =========================================================
   DB → LINEAR
   ========================================================= */

function dbToLinear(
  db
) {

  return Math.pow(
    10,
    db / 20
  );

}


/* =========================================================
   CHANNEL TEST
   ========================================================= */

async function startChannelTest(
  channelIndex
) {

  if (
    typeof audioContext === 'undefined' ||
    !audioContext
  ) {

    return;

  }


  /*
   * Resume AudioContext terlebih dahulu.
   */

  try {

    await audioContext.resume();

  }

  catch (error) {

    console.warn(
      'AudioContext resume gagal:',
      error
    );

  }


  /*
   * Pastikan graph sudah dibuat.
   */

  if (
    !channelGraphs[channelIndex]
  ) {

    initializeEqualizerEngine();

  }


  /*
   * Jangan membuat oscillator kedua.
   */

  if (
    testOscillators[channelIndex]
  ) {

    return;

  }


  const oscillator =
    audioContext.createOscillator();


  const gainNode =
    audioContext.createGain();


  oscillator.type =
    'sine';


  oscillator.frequency.value =
    1000;


  /*
   * Level test aman.
   */

  gainNode.gain.value =
    0.08;


  oscillator.connect(
    gainNode
  );


  const graph =
    channelGraphs[
      channelIndex
    ];


  if (graph) {

    gainNode.connect(
      graph.inputGain
    );

  }


  oscillator.start();


  testOscillators[
    channelIndex
  ] =
    oscillator;


  testGains[
    channelIndex
  ] =
    gainNode;

}


/* =========================================================
   STOP CHANNEL TEST
   ========================================================= */

function stopChannelTest(
  channelIndex
) {

  const oscillator =
    testOscillators[
      channelIndex
    ];


  if (oscillator) {

    try {

      oscillator.stop();

    }

    catch (error) {

      /* oscillator sudah berhenti */

    }


    try {

      oscillator.disconnect();

    }

    catch (error) {

    }

  }


  const gainNode =
    testGains[
      channelIndex
    ];


  if (gainNode) {

    try {

      gainNode.disconnect();

    }

    catch (error) {

    }

  }


  testOscillators[
    channelIndex
  ] =
    null;


  testGains[
    channelIndex
  ] =
    null;

}


/* =========================================================
   METER
   ========================================================= */

function startEqualizerMeters() {

  function updateMeters() {

    channelGraphs.forEach(
      (
        graph,
        channelIndex
      ) => {

        updateChannelMeter(
          graph,
          channelIndex
        );

      }
    );


    requestAnimationFrame(
      updateMeters
    );

  }


  requestAnimationFrame(
    updateMeters
  );

}


/* =========================================================
   UPDATE CHANNEL METER
   ========================================================= */

function updateChannelMeter(
  graph,
  channelIndex
) {

  const meter =
    document.querySelector(
      `[data-meter="${channelIndex}"]`
    );


  const clip =
    document.querySelector(
      `[data-clip="${channelIndex}"]`
    );


  if (!meter) {

    return;

  }


  const segments =
    meter.querySelectorAll(
      '.meter-segment'
    );


  /*
   * Tidak ada audio/test:
   * meter OFF.
   */

  const state =
    channelState[
      channelIndex
    ];


  const active =
    state.test ||
    hasActiveExternalSource();


  if (!active || !graph) {

    segments.forEach(
      segment => {

        segment.classList.remove(
          'active',
          'clip'
        );

      }
    );


    if (clip) {

      clip.classList.remove(
        'active'
      );

    }


    return;

  }


  const data =
    new Float32Array(
      graph.analyser.fftSize
    );


  graph.analyser.getFloatTimeDomainData(
    data
  );


  let peak =
    0;


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const value =
      Math.abs(
        data[i]
      );


    if (
      value > peak
    ) {

      peak =
        value;

    }

  }


  /*
   * Convert peak → dB.
   */

  const db =
    peak > 0
      ? 20 * Math.log10(peak)
      : -60;


  const clamped =
    Math.max(
      -60,
      Math.min(
        3,
        db
      )
    );


  /*
   * 18 LED segments.
   */

  const level =
    Math.round(
      (
        clamped + 60
      ) / 63 * 18
    );


  segments.forEach(
    (
      segment,
      index
    ) => {

      segment.classList.toggle(
        'active',
        index < level
      );


      segment.classList.remove(
        'clip'
      );

    }
  );


  /*
   * CLIP.
   */

  const clipping =
    peak >= 0.98;


  if (clip) {

    clip.classList.toggle(
      'active',
      clipping
    );

  }


  if (clipping) {

    segments.forEach(
      segment => {

        if (
          segment.classList.contains(
            'active'
          )
        ) {

          segment.classList.add(
            'clip'
          );

        }

      }
    );

  }

}


/* =========================================================
   INITIALIZE UI
   ========================================================= */

function initializeEqualizerUI() {

  /*
   * #channels berasal dari index.html.
   */

  buildChannels();

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    initializeEqualizerUI();

  }
);


/* =========================================================
   PUBLIC API
   ========================================================= */

window.buildChannels =
  buildChannels;


window.createChannel =
  createChannel;


window.channelState =
  channelState;


window.channelGraphs =
  channelGraphs;


window.initializeEqualizerEngine =
  initializeEqualizerEngine;


window.updateEqualizerChannel =
  updateEqualizerChannel;


window.startChannelTest =
  startChannelTest;


window.stopChannelTest =
  stopChannelTest;


window.updateChannelStatus =
  updateChannelStatus;
