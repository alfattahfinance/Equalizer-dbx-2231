/* =========================================================
   APPLICATION NAVIGATION
   ========================================================= */

const pageContainer =
  document.getElementById(
    "pageContainer"
  );


let equalizerPage = null;

let echoPage = null;


/* =========================================================
   EQUALIZER PAGE
   ========================================================= */

function renderEqualizerPage() {

  const page =
    document.createElement(
      "section"
    );


  page.className =
    "app-page";


  page.id =
    "equalizerPage";


  page.innerHTML = `

    <section class="device-title">

      <div>

        <div class="device-name">
          DBX 2231
        </div>

        <div class="device-subtitle">
          DUAL CHANNEL GRAPHIC EQUALIZER
        </div>

      </div>

      <div class="preset-area">

        <select id="presetSelect">

          <option value="flat">
            FLAT
          </option>

          <option value="vocal">
            VOKAL CLEAR
          </option>

          <option value="live">
            LIVE BAND
          </option>

          <option value="feedback">
            ANTI-FEEDBACK
          </option>

        </select>

        <button
          class="hardware-button"
          id="applyPresetButton"
          type="button"
        >
          APPLY PRESET
        </button>

      </div>

    </section>


    <div class="channels-scroll">

      <section
        class="channels"
        id="channels"
      ></section>

    </div>

  `;


  pageContainer.appendChild(
    page
  );


  equalizerPage =
    page;


  if (
    typeof buildChannels ===
    "function"
  ) {

    buildChannels();

  }


  return page;

}


/* =========================================================
   ECHO PAGE
   ========================================================= */

function renderEcho() {

  echoPage =
    renderEchoPage();


  pageContainer.appendChild(
    echoPage
  );

}


/* =========================================================
   SHOW PAGE
   ========================================================= */

function showPage(
  pageName
) {

  if (equalizerPage) {

    equalizerPage.classList.toggle(
      "hidden",
      pageName !== "equalizer"
    );

  }


  if (echoPage) {

    echoPage.classList.toggle(
      "hidden",
      pageName !== "echo"
    );

  }


  document
    .querySelectorAll(
      ".page-button"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.page ===
            pageName
        );

      }
    );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

document
  .querySelectorAll(
    ".page-button"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          showPage(
            button.dataset.page
          );

        }
      );

    }
  );


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
     * Buat halaman.
     */

    renderEqualizerPage();

    renderEcho();


    /*
     * Echo disembunyikan dulu.
     */

    showPage(
      "equalizer"
    );

  }
);
