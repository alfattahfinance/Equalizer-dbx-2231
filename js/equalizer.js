/* =========================================================
   DBX 2231 EQUALIZER
   ========================================================= */

const frequencies = [
  20, 25, 31.5, 40, 50, 63, 80,
  100, 125, 160, 200, 250, 315,
  400, 500, 630, 800, 1000,
  1250, 1600, 2000, 2500, 3150,
  4000, 5000, 6300, 8000,
  10000, 12500, 16000, 20000
];


const channelState = [

  {
    gain: 0,
    lowCut: false,
    range: 15,
    bypass: false,
    bands: Array(31).fill(0)
  },

  {
    gain: 0,
    lowCut: false,
    range: 15,
    bypass: false,
    bands: Array(31).fill(0)
  }

];


let channelGraphs = [];


function initializeEqualizerEngine() {

  if (!audioContext) {
    return;
  }


  /*
   * CH1 LEFT
   */

  const ch1 =
    createEqualizerChannel(0);


  /*
   * CH2 RIGHT
   */

  const ch2 =
    createEqualizerChannel(1);


  channelGraphs = [
    ch1,
    ch2
  ];


  /*
   * INPUT dari Echo
   */

  /*
   * CH1
   */

  stereoSplitter.connect(
    ch1.inputGain,
    0
  );


  /*
   * CH2
   */

  stereoSplitter.connect(
    ch2.inputGain,
    1
  );


  /*
   * CH1 → MERGER
   */

  ch1.analyser.connect(
    stereoMerger,
    0,
    0
  );


  /*
   * CH2 → MERGER
   */

  ch2.analyser.connect(
    stereoMerger,
    0,
    1
  );

}


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
    "highpass";


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
          "peaking";


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


  graph.inputGain.gain.value =
    dbToGain(
      state.gain
    );


  graph.lowCut.frequency.value =
    state.bypass
      ? 5
      : state.lowCut
        ? 40
        : 5;


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
