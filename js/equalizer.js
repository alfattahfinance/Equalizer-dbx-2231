/* =========================================================
   DBX 2231
   EQUALIZER CHANNEL ENGINE
   =========================================================

   CURRENT VERSION

   CHANNEL:
   CH1 = LEFT / L
   CH2 = RIGHT / R

   31 BAND
   GAIN
   LOW CUT
   RANGE
   METER
   CLIP
   BYPASS
   TEST

   ---------------------------------------------------------
   CATATAN
   ---------------------------------------------------------

   File ini menangani:

   - Struktur channel
   - Channel state
   - 31 band EQ
   - Gain
   - Low Cut
   - Range
   - Bypass
   - Test
   - Visual meter container
   - Fader interaction

   AUDIO ENGINE tetap ditangani oleh:
       audio-engine.js

   Komunikasi ke audio engine melalui:
       updateChannelAudio()
       createAudioContext()
       startChannelTest()
       stopChannelTest()

   ========================================================= */


/* =========================================================
   NAMESPACE
   ========================================================= */

window.DBX2231 =
  window.DBX2231 || {};


/* =========================================================
   31 BAND FREQUENCIES
   ========================================================= */

const DBX_FREQUENCIES = [

  20,
  25,
  31.5,
  40,
  50,
  63,
  80,
  100,
  125,
  160,
  200,
  250,
  315,
  400,
  500,
  630,
  800,
  1000,
  1250,
  1600,
  2000,
  2500,
  3150,
  4000,
  5000,
  6300,
  8000,
  10000,
  12500,
  16000,
  20000

];


/* =========================================================
   DOM
   ========================================================= */

const dbxChannelsContainer =
  document.getElementById("channels");


const dbxReadyStatus =
  document.getElementById("readyStatus");


/* =========================================================
   CHANNEL STATE
   =========================================================

   Gunakan state yang sudah ada jika sebelumnya
   sudah dibuat oleh aplikasi.

   Ini mencegah:
   Identifier "channelState" has already been declared

   ========================================================= */

if (
  !window.DBX2231.channelState
) {

  window.DBX2231.channelState = [

    {
      gain: 0,

      lowCut: false,

      range: 15,

      bypass: false,

      test: false,

      bands:
        Array(31).fill(0)
    },

    {
      gain: 0,

      lowCut: false,

      range: 15,

      bypass: false,

      test: false,

      bands:
        Array(31).fill(0)
    }

  ];

}


const dbxChannelState =
  window.DBX2231.channelState;


/* =========================================================
   FADER
   ========================================================= */

const DBX_FADER_STEP = 0.5;


/* =========================================================
   FORMAT FREQUENCY
   ========================================================= */

function dbxFormatFrequency(
  frequency
) {

  if (
    frequency >= 1000
  ) {

    return `${frequency / 1000}K`;

  }

  return String(frequency);

}


/* =========================================================
   FORMAT dB
   ========================================================= */

function dbxFormatDb(
  value
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {

    return "0.0";

  }


  if (
    number > 0
  ) {

    return `+${number.toFixed(1)}`;

  }


  return number.toFixed(1);

}


/* =========================================================
   dB → LINEAR
   ========================================================= */

function dbxDbToGain(
  db
) {

  return Math.pow(
    10,
    db / 20
  );

}


/* =========================================================
   CLAMP BAND VALUE
   ========================================================= */

function dbxClampBandValue(
  channelIndex,
  value
) {

  const state =
    dbxChannelState[
      channelIndex
    ];


  if (!state) {

    return 0;

  }


  const range =
    state.range;


  let result =
    Number(value);


  if (
    !Number.isFinite(result)
  ) {

    result = 0;

  }


  result =
    Math.max(
      -range,
      Math.min(
        range,
        result
      )
    );


  result =
    Math.round(
      result /
      DBX_FADER_STEP
    ) *
    DBX_FADER_STEP;


  return result;

}


/* =========================================================
   FADER PERCENT
   ========================================================= */

function dbxCalculateFaderPercent(
  channelIndex,
  value
) {

  const state =
    dbxChannelState[
      channelIndex
    ];


  if (!state) {

    return 50;

  }


  const range =
    state.range;


  if (
    range <= 0
  ) {

    return 50;

  }


  const percent =
    (
      (
        Number(value) +
        range
      ) /
      (
        range * 2
      )
    ) * 100;


  return Math.max(
    0,
    Math.min(
      100,
      percent
    )
  );

}


/* =========================================================
   UPDATE BAND VISUAL
   ========================================================= */

function dbxUpdateBandVisual(
  channelIndex,
  band,
  value
) {

  if (!band) {

    return;

  }


  const percent =
    dbxCalculateFaderPercent(
      channelIndex,
      value
    );


  band.style.setProperty(
    "--fader-level",
    `${percent}%`
  );

}


/* =========================================================
   SET BAND VALUE
   ========================================================= */

function dbxSetBandValue(
  channelIndex,
  bandIndex,
  value,
  band,
  slider,
  valueLabel
) {

  const state =
    dbxChannelState[
      channelIndex
    ];


  if (!state) {

    return;

  }


  const safeValue =
    dbxClampBandValue(
      channelIndex,
      value
    );


  state.bands[
    bandIndex
  ] =
    safeValue;


  if (slider) {

    slider.value =
      String(
        safeValue
      );

  }


  if (valueLabel) {

    valueLabel.textContent =
      dbxFormatDb(
        safeValue
      );

  }


  dbxUpdateBandVisual(
    channelIndex,
    band,
    safeValue
  );


  /* -------------------------------------------------------
     KIRIM PERUBAHAN KE AUDIO ENGINE
     ------------------------------------------------------- */

  if (
    typeof window.updateChannelAudio ===
    "function"
  ) {

    window.updateChannelAudio(
      channelIndex
    );

  }

}


/* =========================================================
   STATUS LIGHTS
   ========================================================= */

function dbxUpdateChannelStatusLights(
  channelIndex
) {

  const channel =
    document.querySelector(
      `.channel[data-channel="${channelIndex}"]`
    );


  if (!channel) {

    return;

  }


  const activeLight =
    channel.querySelector(
      '[data-role="status-active"]'
    );


  const bypassLight =
    channel.querySelector(
      '[data-role="status-bypass"]'
    );


  const testLight =
    channel.querySelector(
      '[data-role="status-test"]'
    );


  const state =
    dbxChannelState[
      channelIndex
    ];


  if (!state) {

    return;

  }


  /* -------------------------------------------------------
     REAL AUDIO ACTIVE
     ------------------------------------------------------- */

  const realAudioActive =
    !!(
      window.audioContext &&
      window.audioContext.state ===
      "running" &&
      window.sourceNode
    );


  /* -------------------------------------------------------
     TEST ACTIVE
     ------------------------------------------------------- */

  const testActive =
    !!(
      window.testOscillators &&
      window.testOscillators[
        channelIndex
      ]
    );


  const audioActive =
    realAudioActive ||
    testActive;


  /* -------------------------------------------------------
     ACTIVE
     ------------------------------------------------------- */

  if (activeLight) {

    activeLight.classList.toggle(
      "active",
      audioActive
    );

  }


  /* -------------------------------------------------------
     BYPASS
     ------------------------------------------------------- */

  if (bypassLight) {

    bypassLight.classList.toggle(
      "active",
      !!state.bypass
    );

  }


  /* -------------------------------------------------------
     TEST
     ------------------------------------------------------- */

  if (testLight) {

    testLight.classList.toggle(
      "active",
      !!state.test
    );

  }

}


/* =========================================================
   UPDATE ALL STATUS LIGHTS
   ========================================================= */

function dbxUpdateAllStatusLights() {

  dbxChannelState.forEach(
    (
      _,
      index
    ) => {

      dbxUpdateChannelStatusLights(
        index
      );

    }
  );

}


/* =========================================================
   CREATE CHANNEL
   ========================================================= */

function dbxCreateChannel(
  channelIndex
) {

  if (
    !dbxChannelsContainer
  ) {

    console.error(
      "DBX 2231: #channels tidak ditemukan."
    );

    return;

  }


  const channelNumber =
    channelIndex + 1;


  const state =
    dbxChannelState[
      channelIndex
    ];


  if (!state) {

    return;

  }


  /* -------------------------------------------------------
     CHANNEL ELEMENT
     ------------------------------------------------------- */

  const channel =
    document.createElement(
      "article"
    );


  channel.className =
    "channel";


  channel.dataset.channel =
    channelIndex;


  /* =======================================================
     CHANNEL HTML
     ======================================================= */

  channel.innerHTML = `

    <div class="channel-header">

      <div class="channel-label">

        <span class="power-led"></span>

        ${
          channelNumber === 1
            ? "CH1 — LEFT / L"
            : "CH2 — RIGHT / R"
        }

      </div>


      <div class="channel-status">

        <span
          class="status-light"
          data-role="status-active"
        >
          ACTIVE
        </span>


        <span
          class="status-light bypass"
          data-role="status-bypass"
        >
          BYPASS
        </span>


        <span
          class="status-light test"
          data-role="status-test"
        >
          TEST
        </span>

      </div>

    </div>


    <!-- =================================================
         CONTROL ROW
         ================================================= -->

    <div class="control-row">


      <!-- GAIN -->

      <div class="control-box">

        <div class="control-title">
          GAIN
        </div>


        <input
          class="gain-slider"
          type="range"
          min="-12"
          max="12"
          step="0.5"
          value="${state.gain}"
          data-role="gain"
        />


        <div class="gain-value">

          <span>-12</span>

          <strong data-role="gain-value">
            ${dbxFormatDb(state.gain)} dB
          </strong>

          <span>+12</span>

        </div>

      </div>


      <!-- LOW CUT -->

      <div class="control-box">

        <div class="control-title">
          LOW CUT
        </div>


        <button
          class="small-button"
          data-role="lowcut"
          style="width:100%;"
        >
          ${
            state.lowCut
              ? "ON / 40 Hz"
              : "OFF / 40 Hz"
          }
        </button>

      </div>


      <!-- RANGE -->

      <div class="control-box">

        <div class="control-title">
          RANGE
        </div>


        <button
          class="small-button"
          data-role="range"
          style="width:100%;"
        >
          ±${state.range} dB
        </button>

      </div>


      <!-- LEVEL METER -->

      <div class="control-box meter-box">

        <div class="control-title">
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
          id="meter-ch${channelNumber}"
          data-role="meter"
        >

          ${Array.from(
            { length: 18 },
            () => "<span></span>"
          ).join("")}

        </div>

      </div>


      <!-- CLIP -->

      <div
        class="clip-box"
        id="clip-ch${channelNumber}"
        data-role="clip"
      >

        <div class="clip-led"></div>

        <div class="clip-text">
          CLIP
        </div>

      </div>

    </div>


    <!-- =================================================
         31 BAND EQ
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


      <div class="eq-area">

        <div class="db-scale">

          <span>+15</span>
          <span>+10</span>
          <span>+5</span>
          <span>0</span>
          <span>-5</span>
          <span>-10</span>
          <span>-15</span>

        </div>


        <div
          class="bands"
          data-role="bands"
        ></div>

      </div>

    </div>


    <!-- =================================================
         CHANNEL FOOTER
         ================================================= -->

    <div class="channel-footer">

      <span>
        31 BAND ISO 1/3 OCTAVE
      </span>


      <span data-role="footer-range">
        RANGE: ±${state.range} dB
      </span>

    </div>


    <!-- =================================================
         CHANNEL BUTTONS
         ================================================= -->

    <div class="channel-buttons">

      <button
        class="small-button"
        data-role="bypass"
      >
        BYPASS
      </button>


      <button
        class="small-button"
        data-role="test"
      >
        TEST
      </button>

    </div>

  `;


  /* =======================================================
     CONTROL REFERENCES
     ======================================================= */

  const lowCutButton =
    channel.querySelector(
      '[data-role="lowcut"]'
    );


  const rangeButton =
    channel.querySelector(
      '[data-role="range"]'
    );


  const bypassButton =
    channel.querySelector(
      '[data-role="bypass"]'
    );


  const testButton =
    channel.querySelector(
      '[data-role="test"]'
    );


  /* =======================================================
     INITIAL BUTTON STATE
     ======================================================= */

  lowCutButton.classList.toggle(
    "active",
    state.lowCut
  );


  rangeButton.classList.toggle(
    "active",
    state.range === 6
  );


  bypassButton.classList.toggle(
    "active",
    state.bypass
  );


  testButton.classList.toggle(
    "active",
    state.test
  );


  /* =======================================================
     BANDS CONTAINER
     ======================================================= */

  const bandsContainer =
    channel.querySelector(
      '[data-role="bands"]'
    );


  /* =======================================================
     CREATE 31 BANDS
     ======================================================= */

  DBX_FREQUENCIES.forEach(
    (
      frequency,
      bandIndex
    ) => {

      const band =
        document.createElement(
          "div"
        );


      band.className =
        "band";


      band.innerHTML = `

        <div class="band-track"></div>


        <input
          type="range"
          min="${-state.range}"
          max="${state.range}"
          step="${DBX_FADER_STEP}"
          value="${state.bands[bandIndex]}"
          data-band-index="${bandIndex}"
          aria-label="Channel ${channelNumber}, ${frequency} Hz"
        />


        <div class="band-frequency">
          ${dbxFormatFrequency(frequency)}
        </div>


        <div
          class="band-value"
          data-value-index="${bandIndex}"
        >
          ${dbxFormatDb(
            state.bands[bandIndex]
          )}
        </div>

      `;


      const slider =
        band.querySelector(
          "input"
        );


      const valueLabel =
        band.querySelector(
          `[data-value-index="${bandIndex}"]`
        );


      const track =
        band.querySelector(
          ".band-track"
        );


      dbxUpdateBandVisual(
        channelIndex,
        band,
        Number(slider.value)
      );


      /* =====================================================
         POINTER STATE
         ===================================================== */

      let pointerMode = null;

      let pointerStartX = 0;

      let pointerStartY = 0;

      let pointerStartValue = 0;

      let pointerMoved = false;

      let pointerActive = false;


      /* =====================================================
         POINTER DOWN
         ===================================================== */

      band.addEventListener(
        "pointerdown",
        event => {

          if (
            event.target.closest(
              ".band-frequency, .band-value"
            )
          ) {

            return;

          }


          const trackRect =
            track.getBoundingClientRect();


          if (
            event.clientY <
              trackRect.top - 4 ||
            event.clientY >
              trackRect.bottom + 4
          ) {

            return;

          }


          pointerActive =
            true;


          pointerMode =
            null;


          pointerMoved =
            false;


          pointerStartX =
            event.clientX;


          pointerStartY =
            event.clientY;


          pointerStartValue =
            Number(
              slider.value
            );

        },
        {
          passive: true
        }
      );


      /* =====================================================
         POINTER MOVE
         ===================================================== */

      band.addEventListener(
        "pointermove",
        event => {

          if (
            !pointerActive
          ) {

            return;

          }


          const deltaX =
            event.clientX -
            pointerStartX;


          const deltaY =
            event.clientY -
            pointerStartY;


          const absX =
            Math.abs(deltaX);


          const absY =
            Math.abs(deltaY);


          if (
            !pointerMode &&
            (
              absX > 6 ||
              absY > 6
            )
          ) {

            pointerMoved =
              true;


            /* ---------------------------------------------
               HORIZONTAL = SCROLL
               --------------------------------------------- */

            if (
              absX > absY
            ) {

              pointerMode =
                "scroll";


              pointerActive =
                false;


              return;

            }


            /* ---------------------------------------------
               VERTICAL = FADER
               --------------------------------------------- */

            pointerMode =
              "fader";


            band.classList.add(
              "is-dragging"
            );


            try {

              band.setPointerCapture(
                event.pointerId
              );

            }

            catch (_) {}

          }


          if (
            pointerMode !==
            "fader"
          ) {

            return;

          }


          event.preventDefault();


          const trackRect =
            track.getBoundingClientRect();


          const trackHeight =
            trackRect.height;


          if (
            trackHeight <= 0
          ) {

            return;

          }


          const range =
            dbxChannelState[
              channelIndex
            ].range;


          const valuePerPixel =
            (
              range * 2
            ) /
            trackHeight;


          const newValue =
            pointerStartValue -
            (
              deltaY *
              valuePerPixel
            );


          dbxSetBandValue(
            channelIndex,
            bandIndex,
            newValue,
            band,
            slider,
            valueLabel
          );

        },
        {
          passive: false
        }
      );


      /* =====================================================
         POINTER UP
         ===================================================== */

      band.addEventListener(
        "pointerup",
        event => {

          if (
            !pointerActive
          ) {

            return;

          }


          /* -----------------------------------------------
             FADER
             ----------------------------------------------- */

          if (
            pointerMode ===
            "fader"
          ) {

            band.classList.remove(
              "is-dragging"
            );


            try {

              band.releasePointerCapture(
                event.pointerId
              );

            }

            catch (_) {}


            pointerActive =
              false;


            pointerMode =
              null;


            pointerMoved =
              false;


            return;

          }


          /* -----------------------------------------------
             SCROLL
             ----------------------------------------------- */

          if (
            pointerMode ===
            "scroll"
          ) {

            pointerActive =
              false;


            pointerMode =
              null;


            return;

          }


          /* -----------------------------------------------
             TAP
             ----------------------------------------------- */

          if (
            !pointerMoved
          ) {

            const trackRect =
              track.getBoundingClientRect();


            const currentValue =
              Number(
                slider.value
              );


            const range =
              dbxChannelState[
                channelIndex
              ].range;


            const trackHeight =
              trackRect.height;


            if (
              trackHeight > 0
            ) {

              const currentPercent =
                (
                  (
                    currentValue +
                    range
                  ) /
                  (
                    range * 2
                  )
                );


              const knobY =
                trackRect.bottom -
                (
                  currentPercent *
                  trackHeight
                );


              const tapY =
                event.clientY;


              const tapThreshold =
                5;


              /* TAP ABOVE = +0.5 dB */

              if (
                tapY <
                knobY -
                tapThreshold
              ) {

                dbxSetBandValue(
                  channelIndex,
                  bandIndex,
                  currentValue +
                    DBX_FADER_STEP,
                  band,
                  slider,
                  valueLabel
                );

              }


              /* TAP BELOW = -0.5 dB */

              else if (
                tapY >
                knobY +
                tapThreshold
              ) {

                dbxSetBandValue(
                  channelIndex,
                  bandIndex,
                  currentValue -
                    DBX_FADER_STEP,
                  band,
                  slider,
                  valueLabel
                );

              }

            }

          }


          pointerActive =
            false;


          pointerMode =
            null;


          pointerMoved =
            false;

        },
        {
          passive: true
        }
      );


      /* =====================================================
         POINTER CANCEL
         ===================================================== */

      band.addEventListener(
        "pointercancel",
        event => {

          band.classList.remove(
            "is-dragging"
          );


          try {

            if (
              band.hasPointerCapture(
                event.pointerId
              )
            ) {

              band.releasePointerCapture(
                event.pointerId
              );

            }

          }

          catch (_) {}


          pointerActive =
            false;


          pointerMode =
            null;


          pointerMoved =
            false;

        }
      );


      /* =====================================================
         KEYBOARD / NATIVE RANGE INPUT
         ===================================================== */

      slider.addEventListener(
        "input",
        () => {

          dbxSetBandValue(
            channelIndex,
            bandIndex,
            Number(
              slider.value
            ),
            band,
            slider,
            valueLabel
          );

        }
      );


      bandsContainer.appendChild(
        band
      );

    }
  );


  /* =======================================================
     GAIN
     ======================================================= */

  const gainSlider =
    channel.querySelector(
      '[data-role="gain"]'
    );


  const gainValue =
    channel.querySelector(
      '[data-role="gain-value"]'
    );


  gainSlider.addEventListener(
    "input",
    () => {

      const value =
        Number(
          gainSlider.value
        );


      state.gain =
        value;


      gainValue.textContent =
        `${dbxFormatDb(value)} dB`;


      if (
        typeof window.updateChannelAudio ===
        "function"
      ) {

        window.updateChannelAudio(
          channelIndex
        );

      }

    }
  );


  /* =======================================================
     LOW CUT
     ======================================================= */

  lowCutButton.addEventListener(
    "click",
    event => {

      state.lowCut =
        !state.lowCut;


      event.currentTarget.classList.toggle(
        "active",
        state.lowCut
      );


      event.currentTarget.textContent =
        state.lowCut
          ? "ON / 40 Hz"
          : "OFF / 40 Hz";


      if (
        typeof window.updateChannelAudio ===
        "function"
      ) {

        window.updateChannelAudio(
          channelIndex
        );

      }


      if (
        dbxReadyStatus
      ) {

        dbxReadyStatus.textContent =
          state.lowCut
            ? `CH${channelNumber} LOW CUT ON`
            : `CH${channelNumber} LOW CUT OFF`;

      }

    }
  );


  /* =======================================================
     RANGE
     ======================================================= */

  rangeButton.addEventListener(
    "click",
    event => {

      state.range =
        state.range === 15
          ? 6
          : 15;


      const range =
        state.range;


      event.currentTarget.textContent =
        `±${range} dB`;


      event.currentTarget.classList.toggle(
        "active",
        range === 6
      );


      const footerRange =
        channel.querySelector(
          '[data-role="footer-range"]'
        );


      if (
        footerRange
      ) {

        footerRange.textContent =
          `RANGE: ±${range} dB`;

      }


      channel
        .querySelectorAll(
          ".band input"
        )
        .forEach(
          (
            slider,
            index
          ) => {

            let value =
              Number(
                slider.value
              );


            value =
              Math.max(
                -range,
                Math.min(
                  range,
                  value
                )
              );


            value =
              Math.round(
                value /
                DBX_FADER_STEP
              ) *
              DBX_FADER_STEP;


            slider.min =
              String(
                -range
              );


            slider.max =
              String(
                range
              );


            slider.step =
              String(
                DBX_FADER_STEP
              );


            slider.value =
              String(
                value
              );


            state.bands[
              index
            ] =
              value;


            const valueLabel =
              channel.querySelector(
                `[data-value-index="${index}"]`
              );


            if (
              valueLabel
            ) {

              valueLabel.textContent =
                dbxFormatDb(
                  value
                );

            }


            const band =
              slider.closest(
                ".band"
              );


            if (
              band
            ) {

              dbxUpdateBandVisual(
                channelIndex,
                band,
                value
              );

            }

          }
        );


      if (
        typeof window.updateChannelAudio ===
        "function"
      ) {

        window.updateChannelAudio(
          channelIndex
        );

      }


      if (
        dbxReadyStatus
      ) {

        dbxReadyStatus.textContent =
          `CH${channelNumber} RANGE ±${range} dB`;

      }

    }
  );


  /* =======================================================
     BYPASS
     ======================================================= */

  bypassButton.addEventListener(
    "click",
    event => {

      state.bypass =
        !state.bypass;


      event.currentTarget.classList.toggle(
        "active",
        state.bypass
      );


      if (
        typeof window.updateChannelAudio ===
        "function"
      ) {

        window.updateChannelAudio(
          channelIndex
        );

      }


      dbxUpdateChannelStatusLights(
        channelIndex
      );


      if (
        dbxReadyStatus
      ) {

        dbxReadyStatus.textContent =
          state.bypass
            ? `CH${channelNumber} BYPASS ON`
            : `CH${channelNumber} BYPASS OFF`;

      }

    }
  );


  /* =======================================================
     TEST
     ======================================================= */

  testButton.addEventListener(
    "click",
    async event => {

      state.test =
        !state.test;


      const testing =
        state.test;


      if (
        testing
      ) {

        try {

          /* -----------------------------------------------
             CREATE AUDIO CONTEXT
             ----------------------------------------------- */

          if (
            typeof window.createAudioContext ===
            "function"
          ) {

            window.createAudioContext();

          }


          /* -----------------------------------------------
             START TEST OSCILLATOR
             ----------------------------------------------- */

          if (
            typeof window.startChannelTest ===
            "function"
          ) {

            window.startChannelTest(
              channelIndex
            );

          }


          /* -----------------------------------------------
             RESUME AUDIO
             ----------------------------------------------- */

          if (
            window.audioContext
          ) {

            await window.audioContext.resume();

          }

        }

        catch (error) {

          console.error(
            "DBX 2231 TEST gagal:",
            error
          );


          state.test =
            false;


          if (
            typeof window.stopChannelTest ===
            "function"
          ) {

            window.stopChannelTest(
              channelIndex
            );

          }


          testButton.classList.remove(
            "active"
          );


          dbxUpdateChannelStatusLights(
            channelIndex
          );


          return;

        }

      }

      else {

        if (
          typeof window.stopChannelTest ===
          "function"
        ) {

          window.stopChannelTest(
            channelIndex
          );

        }

      }


      event.currentTarget.classList.toggle(
        "active",
        testing
      );


      dbxUpdateChannelStatusLights(
        channelIndex
      );


      if (
        dbxReadyStatus
      ) {

        dbxReadyStatus.textContent =
          testing
            ? `CH${channelNumber} TEST 1kHz ON`
            : `CH${channelNumber} TEST OFF`;

      }

    }
  );


  /* =======================================================
     APPEND CHANNEL
     ======================================================= */

  dbxChannelsContainer.appendChild(
    channel
  );


  /* =======================================================
     UPDATE STATUS
     ======================================================= */

  dbxUpdateChannelStatusLights(
    channelIndex
  );

}


/* =========================================================
   BUILD CHANNELS
   ========================================================= */

function dbxBuildChannels() {

  if (
    !dbxChannelsContainer
  ) {

    console.error(
      "DBX 2231: #channels tidak ditemukan."
    );

    return;

  }


  dbxChannelsContainer.innerHTML =
    "";


  /* -------------------------------------------------------
     CH1
     ------------------------------------------------------- */

  dbxCreateChannel(0);


  /* -------------------------------------------------------
     CH2
     ------------------------------------------------------- */

  dbxCreateChannel(1);


  dbxUpdateAllStatusLights();

}


/* =========================================================
   EXPORT KE WINDOW
   ========================================================= */

window.DBX2231.frequencies =
  DBX_FREQUENCIES;


window.DBX2231.channelState =
  dbxChannelState;


window.DBX2231.buildChannels =
  dbxBuildChannels;


window.DBX2231.createChannel =
  dbxCreateChannel;


window.DBX2231.updateChannelStatusLights =
  dbxUpdateChannelStatusLights;


window.DBX2231.updateAllStatusLights =
  dbxUpdateAllStatusLights;


window.DBX2231.updateBandVisual =
  dbxUpdateBandVisual;


window.DBX2231.setBandValue =
  dbxSetBandValue;


/* ---------------------------------------------------------
   BACKWARD COMPATIBILITY

   Supaya file audio-engine.js lama yang masih memanggil:

       window.channelState
       window.frequencies
       window.buildChannels

   tetap bisa bekerja.
   --------------------------------------------------------- */

window.frequencies =
  DBX_FREQUENCIES;


window.channelState =
  dbxChannelState;


window.buildChannels =
  dbxBuildChannels;


window.createChannel =
  dbxCreateChannel;


window.updateChannelStatusLights =
  dbxUpdateChannelStatusLights;


window.updateAllStatusLights =
  dbxUpdateAllStatusLights;


window.updateBandVisual =
  dbxUpdateBandVisual;


window.setBandValue =
  dbxSetBandValue;


/* =========================================================
   INITIALIZE
   ========================================================= */

function dbxInitializeChannels() {

  dbxBuildChannels();

}


/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    dbxInitializeChannels,
    {
      once: true
    }
  );

}

else {

  dbxInitializeChannels();

}


/* =========================================================
   END
   ========================================================= */
