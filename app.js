const pulverisationTab = document.getElementById("pulverisationTab");
const rosTab = document.getElementById("rosTab");
const pulverisationPanel = document.getElementById("pulverisationPanel");
const rosPanel = document.getElementById("rosPanel");

const rowsInput = document.getElementById("rows");
const pulvMinInput = document.getElementById("pulvMin");
const pulvMaxInput = document.getElementById("pulvMax");
const m1MinInput = document.getElementById("m1Min");
const m1MaxInput = document.getElementById("m1Max");

const rowsError = document.getElementById("rowsError");
const pulvMinError = document.getElementById("pulvMinError");
const pulvMaxError = document.getElementById("pulvMaxError");
const m1MinError = document.getElementById("m1MinError");
const m1MaxError = document.getElementById("m1MaxError");

const generateBtn = document.getElementById("generateBtn");
const dataBody = document.getElementById("dataBody");
const batchNote = document.getElementById("batchNote");

const MIN_ALLOWED_M1 = 1500;
const MAX_ROWS = 500;
const CLUSTER_RADIUS = 5.0; // percentage points

function switchTab(tabName) {
  const showPulverisation = tabName === "pulverisation";

  pulverisationTab.classList.toggle("active", showPulverisation);
  rosTab.classList.toggle("active", !showPulverisation);
  pulverisationTab.setAttribute("aria-selected", String(showPulverisation));
  rosTab.setAttribute("aria-selected", String(!showPulverisation));

  pulverisationPanel.classList.toggle("active", showPulverisation);
  rosPanel.classList.toggle("active", !showPulverisation);
  pulverisationPanel.hidden = !showPulverisation;
  rosPanel.hidden = showPulverisation;
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNumber(min, max) {
  return min + Math.random() * (max - min);
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function calculatePulverisation(m1, m2, m3) {
  return 100 * (m1 - m2) / (m1 - m3);
}

function validateInputs() {
  const rows = Number(rowsInput.value);
  const pulvMin = Number(pulvMinInput.value);
  const pulvMax = Number(pulvMaxInput.value);
  const m1Min = Number(m1MinInput.value);
  const m1Max = Number(m1MaxInput.value);

  let valid = true;

  if (!Number.isInteger(rows) || rows < 1 || rows > MAX_ROWS) {
    rowsError.textContent = `Number of results must be an integer between 1 and ${MAX_ROWS}.`;
    valid = false;
  } else {
    rowsError.textContent = "";
  }

  if (!Number.isFinite(pulvMin) || pulvMin <= 0 || pulvMin >= 100) {
    pulvMinError.textContent = "Minimum pulverisation must be greater than 0% and less than 100%.";
    valid = false;
  } else {
    pulvMinError.textContent = "";
  }

  if (!Number.isFinite(pulvMax) || pulvMax <= 0 || pulvMax >= 100) {
    pulvMaxError.textContent = "Maximum pulverisation must be greater than 0% and less than 100%.";
    valid = false;
  } else if (Number.isFinite(pulvMin) && pulvMax <= pulvMin) {
    pulvMaxError.textContent = "Maximum pulverisation must be greater than the minimum.";
    valid = false;
  } else {
    pulvMaxError.textContent = "";
  }

  if (!Number.isInteger(m1Min) || m1Min < MIN_ALLOWED_M1) {
    m1MinError.textContent = `Minimum m1 must be an integer of at least ${MIN_ALLOWED_M1} g.`;
    valid = false;
  } else {
    m1MinError.textContent = "";
  }

  if (!Number.isInteger(m1Max) || m1Max <= m1Min) {
    m1MaxError.textContent = "Maximum m1 must be an integer greater than minimum m1.";
    valid = false;
  } else {
    m1MaxError.textContent = "";
  }

  if (!valid) return null;
  return { rows, pulvMin, pulvMax, m1Min, m1Max };
}

function generateOneRow(targetPulverisation, settings) {
  // Rejection sampling is used because m1, m2 and m3 must all be whole grams.
  // The displayed result is always recalculated from those final integer values.
  for (let attempt = 0; attempt < 2500; attempt++) {
    const m1 = randomInteger(settings.m1Min, settings.m1Max);

    // Similar scale to typical PLV samples: m3 remains well below m1,
    // while still leaving enough integer resolution to hit the target closely.
    const minDifference = Math.max(250, Math.round(m1 * 0.22));
    const maxDifference = Math.max(minDifference + 1, Math.round(m1 * 0.48));
    const denominator = randomInteger(minDifference, Math.min(maxDifference, m1 - 2));
    const m3 = m1 - denominator;

    const idealM2 = m1 - (targetPulverisation / 100) * denominator;
    const m2 = Math.round(idealM2);

    if (!(m1 > m2 && m2 > m3)) continue;

    const actual = calculatePulverisation(m1, m2, m3);
    const displayed = roundToOneDecimal(actual);

    if (displayed < settings.pulvMin || displayed > settings.pulvMax) continue;
    if (Math.abs(displayed - targetPulverisation) > 0.2) continue;

    return { m1, m2, m3, pulverisation: displayed };
  }

  throw new Error("Could not generate a valid pulverisation row with the selected settings.");
}

function generateData() {
  const settings = validateInputs();
  if (!settings) return;

  // Select one centre for the batch, then constrain every result to a local
  // neighbourhood of +/- 5 percentage points without leaving the user range.
  const batchCentre = roundToOneDecimal(randomNumber(settings.pulvMin, settings.pulvMax));
  const localMin = Math.max(settings.pulvMin, batchCentre - CLUSTER_RADIUS);
  const localMax = Math.min(settings.pulvMax, batchCentre + CLUSTER_RADIUS);

  const rows = [];

  try {
    for (let i = 0; i < settings.rows; i++) {
      const target = roundToOneDecimal(randomNumber(localMin, localMax));
      rows.push(generateOneRow(target, settings));
    }
  } catch (error) {
    dataBody.innerHTML = `<tr><td colspan="4" class="empty">${error.message}</td></tr>`;
    batchNote.hidden = true;
    return;
  }

  dataBody.innerHTML = "";
  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.m1}</td>
      <td>${row.m2}</td>
      <td>${row.m3}</td>
      <td>${row.pulverisation.toFixed(1)}</td>
    `;
    dataBody.appendChild(tr);
  });

  batchNote.textContent = `Generated around a batch centre of ${batchCentre.toFixed(1)}%, within the selected ${settings.pulvMin.toFixed(1)}–${settings.pulvMax.toFixed(1)}% limits.`;
  batchNote.hidden = false;
}

pulverisationTab.addEventListener("click", () => switchTab("pulverisation"));
rosTab.addEventListener("click", () => switchTab("ros"));
generateBtn.addEventListener("click", generateData);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

switchTab("pulverisation");
