/* =========================================================
   DBX 2231 EQUALIZER
   UI + AUDIO ENGINE
   ========================================================= */


/* =========================================================
   FREQUENCIES
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
   CHANNEL AUDIO GRAPHS
   ========================================================= */

let channelGraphs = [];


/* =========================================================
   CHANNEL CONTAINER
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


  const channelNumber =
    channelIndex + 1;


  const side =
    channelIndex === 0
      ? 'LEFT / L'
      : 'RIGHT / R';


  channel.innerHTML = `

    <!-- =================================================
         CHANNEL HEADER
         ================================================= -->

    <div class="channel-header">

      <div class="channel-name">
        CH ${channelNumber}
      </div>

      <div class="channel-side">
        ${side}
      </div>

    </div>


    <div class="channel-body">


      <!-- =================================================
           INPUT / GAIN
           ================================================= -->

      <div class="channel-control">

        <div class="control-label">
          INPUT GAIN
        </div>

        <input
          class="channel-gain"
          type="range"
          min="-15"
          max="15"
          step="0.5"
          value="${state.gain}"
          data-channel="${channelIndex}"
        >

        <div
          class="channel-gain-value"
          data-gain-value="${channelIndex}"
        >
          ${Number(state.gain).toFixed(1)} dB
        </div>

      </div>


      <!-- =================================================
           CHANNEL BUTTONS
           ================================================= -->

      <div class="channel-buttons">

        <button
          type="button"
          class="hardware-button low-cut-button"
          data-action="lowcut"
          data-channel="${channelIndex}"
        >
          LOW CUT
        </button>


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


      <!-- =================================================
           EQ RANGE
           ================================================= -->

      <div class="channel-control">

        <div class="control-label">
          EQ RANGE
        </div>

        <select
          class="hardware-select range-select"
          data-channel="${channelIndex}"
        >

          <option
            value="6"
            ${state.range === 6 ? 'selected' : ''}
          >
            ±6 dB
          </option>

          <option
            value="15"
            ${state.range === 15 ? 'selected' : ''}
          >
            ±15 dB
          </option>

        </select>

      </div>


      <!-- =================================================
           LED METER
           ================================================= -->

      <div class="channel-meter">

        <div class="meter-title">
          LEVEL
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


        <div
          class="clip-indicator"
          data-clip="${channelIndex}"
        >
          CLIP
        </div>

      </div>


      <!-- =================================================
           STATUS
           ================================================= -->

      <div class="channel-status">

        <div
          class="status-light"
          data-status-active="${channelIndex}"
        >
          ACTIVE
        </div>


        <div
          class="status-light"
          data-status-bypass="${channelIndex}"
        >
          BYPASS
        </div>


        <div
          class="status-light"
          data-status-test="${channelIndex}"
        >
          TEST
        </div>

      </div>


      <!-- =================================================
           GRAPHIC EQ
           ================================================= -->

      <div class="eq-wrapper">

        <div class="eq-title">
          31 BAND GRAPHIC EQ
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
              ) => `

                <div
                  class="eq-band"
                  data-band="${bandIndex}"
                  data-channel="${channelIndex}"
                >

                  <div class="eq-frequency">
                    ${formatFrequency(frequency)}
                  </div>


                  <input
                    class="eq-slider"
                    type="range"
                    min="${-state.range}"
                    max="${state.range}"
                    step="0.5"
                    value="${state.bands[bandIndex]}"
                    data-channel="${channelIndex}"
                    data-band="${bandIndex}"
                  >


                  <div
                    class="eq-value"
                    data-eq-value="${channelIndex}-${bandIndex}"
                  >
                    ${Number(
                      state.bands[bandIndex]
                    ).toFixed(1)}
                  </div>

                </div>

              `
            ).join('')}

          </div>

        </div>

      </div>


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


    return khz
      .toString()
      .replace('.0', '') + 'k';

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
     RANGE
     ======================================================= */

  const range =
    channel.querySelector(
      '.range-select'
    );


  if (range) {

    range.addEventListener(
      'change',
      () => {

        const value =
          Number(range.value);


        channelState[
          channelIndex
        ].range = value;


        const sliders =
          channel.querySelectorAll(
            '.eq-slider'
          );


        sliders.forEach(
          slider => {

            slider.min =
              -value;

            slider.max =
              value;

          }
        );

      }
    );

  }


  /* =======================================================
     EQ BANDS
     ======================================================= */

  const eqSliders =
    channel.querySelectorAll(
      '.eq-slider'
    );


  eqSliders.forEach(
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

    }
  );


  /* =======================================================
     LOW CUT
     ======================================================= */

  const lowCutButton =
    channel.querySelector(
      '[data-action="lowcut"]'
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


        lowCutButton.classList.toggle(
          'active',
          state.lowCut
        );


        updateEqualizerChannel(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     BYPASS
     ======================================================= */

  const bypassButton =
    channel.querySelector(
      '[data-action="bypass"]'
    );


  if (bypassButton) {

    bypassButton.addEventListener(
      'click',
      () => {

        const state =
          channelState[
            channelIndex
          ];


        state.bypass =
          !state.bypass;


        bypassButton.classList.toggle(
          'active',
          state.bypass
        );


        updateEqualizerChannel(
          channelIndex
        );

      }
    );

  }


  /* =======================================================
     TEST
     ======================================================= */

  const testButton =
    channel.querySelector(
      '[data-action="test"]'
    );


  if (testButton) {

    testButton.addEventListener(
      'click',
      () => {

        const state =
          channelState[
            channelIndex
          ];


        state.test =
          !state.test;


        testButton.classList.toggle(
          'active',
          state.test
        );


        handleChannelTest(
          channelIndex
        );

      }
    );

  }

}


/* =========================================================
   AUDIO ENGINE
   ========================================================= */

function initializeEqualizerEngine() {

  if (!audioContext) {

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
   * INPUT → CH1 LEFT
   */

  if (stereoSplitter) {

    stereoSplitter.connect(
      ch1.inputGain,
      0,
      0
    );


    /*
     * INPUT → CH2 RIGHT
     */

    stereoSplitter.connect(
      ch2.inputGain,
      1,
      0
    );

  }


  /*
   * CH1 → LEFT
   */

  ch1.analyser.connect(
    stereoMerger,
    0,
    0
  );


  /*
   * CH2 → RIGHT
   */

  ch2.analyser.connect(
    stereoMerger,
    0,
    1
  );


  updateEqualizerChannel(0);

  updateEqualizerChannel(1);

}


/* =========================================================
   CREATE AUDIO CHANNEL
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


  let previous =
    inputGain;


  previous.connect(
    lowCut
  );


  previous =
    lowCut;


  filters.forEach(
    filter => {

      previous.connect(
        filter
      );


      previous =
        filter;

    }
  );


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
   */

  graph.inputGain.gain.value =
    dbToGain(
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
   * EQ
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
   DB → LINEAR GAIN
   ========================================================= */

function dbToGain(
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

let equalizerTestOscillators = [
  null,
  null
];


let equalizerTestGains = [
  null,
  null
];


async function handleChannelTest(
  channelIndex
) {

  if (!audioContext) {

    return;

  }


  const state =
    channelState[
      channelIndex
    ];


  if (state.test) {

    try {

      await audioContext.resume();

    } catch (error) {

      console.warn(
        'AudioContext resume gagal:',
        error
      );

    }


    if (
      equalizerTestOscillators[
        channelIndex
      ]
    ) {

      return;

    }


    /*
     * Pastikan audio graph sudah tersedia.
     */

    if (
      !channelGraphs[
        channelIndex
      ]
    ) {

      initializeEqualizerEngine();

    }


    const oscillator =
      audioContext.createOscillator();


    const gainNode =
      audioContext.createGain();


    oscillator.type =
      'sine';


    oscillator.frequency.value =
      1000;


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


    equalizerTestOscillators[
      channelIndex
    ] =
      oscillator;


    equalizerTestGains[
      channelIndex
    ] =
      gainNode;

  }

  else {

    stopEqualizerChannelTest(
      channelIndex
    );

  }

}


/* =========================================================
   STOP CHANNEL TEST
   ========================================================= */

function stopEqualizerChannelTest(
  channelIndex
) {

  const oscillator =
    equalizerTestOscillators[
      channelIndex
    ];


  if (oscillator) {

    try {

      oscillator.stop();

    } catch (error) {

      /* sudah berhenti */

    }


    try {

      oscillator.disconnect();

    } catch (error) {

    }

  }


  const gainNode =
    equalizerTestGains[
      channelIndex
    ];


  if (gainNode) {

    try {

      gainNode.disconnect();

    } catch (error) {

    }

  }


  equalizerTestOscillators[
    channelIndex
  ] =
    null;


  equalizerTestGains[
    channelIndex
  ] =
    null;

}


/* =========================================================
   INITIALIZE EQUALIZER UI
   ========================================================= */

function initializeEqualizerUI() {

  /*
   * #channels sudah dibuat di index.html.
   * Jangan membuat ulang #pageContainer.
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


window.renderEqualizerPage =
  initializeEqualizerUI;


window.initializeEqualizerEngine =
  initializeEqualizerEngine;


window.updateEqualizerChannel =
  updateEqualizerChannel;


window.channelState =
  channelState;


window.channelGraphs =
  channelGraphs;
