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
const copyPulvBtn = document.getElementById("copyPulvBtn");

const rosRowsInput = document.getElementById("rosRows");
const rosMinInput = document.getElementById("rosMin");
const rosMaxInput = document.getElementById("rosMax");
const trayAInput = document.getElementById("trayA");
const trayBInput = document.getElementById("trayB");
const trayTareInput = document.getElementById("trayTare");

const rosRowsError = document.getElementById("rosRowsError");
const rosMinError = document.getElementById("rosMinError");
const rosMaxError = document.getElementById("rosMaxError");
const trayAError = document.getElementById("trayAError");
const trayBError = document.getElementById("trayBError");
const trayTareError = document.getElementById("trayTareError");

const generateRosBtn = document.getElementById("generateRosBtn");
const rosDataBody = document.getElementById("rosDataBody");
const rosBatchNote = document.getElementById("rosBatchNote");
const copyRosBtn = document.getElementById("copyRosBtn");

const MIN_ALLOWED_M1 = 1500;
const MAX_ROWS = 500;
const PULV_CLUSTER_RADIUS = 5.0; // percentage points
const ROS_CLUSTER_RADIUS = 0.2; // kg/m², giving about 0.4 kg/m² total spread

let lastPulvRows = [];
let lastRosRows = [];

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
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function roundToTwoDecimals(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
  for (let attempt = 0; attempt < 2500; attempt++) {
    const m1 = randomInteger(settings.m1Min, settings.m1Max);
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

  const batchCentre = roundToOneDecimal(randomNumber(settings.pulvMin, settings.pulvMax));
  const localMin = Math.max(settings.pulvMin, batchCentre - PULV_CLUSTER_RADIUS);
  const localMax = Math.min(settings.pulvMax, batchCentre + PULV_CLUSTER_RADIUS);

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
  lastPulvRows = rows;
  copyPulvBtn.disabled = false;
  copyPulvBtn.textContent = "Copy data";
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

function validateRosInputs() {
  const rows = Number(rosRowsInput.value);
  const rosMin = Number(rosMinInput.value);
  const rosMax = Number(rosMaxInput.value);
  const trayA = Number(trayAInput.value);
  const trayB = Number(trayBInput.value);
  const tare = Number(trayTareInput.value);

  let valid = true;

  if (!Number.isInteger(rows) || rows < 1 || rows > MAX_ROWS) {
    rosRowsError.textContent = `Number of results must be an integer between 1 and ${MAX_ROWS}.`;
    valid = false;
  } else {
    rosRowsError.textContent = "";
  }

  if (!Number.isFinite(rosMin) || rosMin <= 0) {
    rosMinError.textContent = "Minimum Rate of Spread must be greater than 0 kg/m².";
    valid = false;
  } else {
    rosMinError.textContent = "";
  }

  if (!Number.isFinite(rosMax) || rosMax <= 0) {
    rosMaxError.textContent = "Maximum Rate of Spread must be greater than 0 kg/m².";
    valid = false;
  } else if (Number.isFinite(rosMin) && rosMax <= rosMin) {
    rosMaxError.textContent = "Maximum Rate of Spread must be greater than the minimum.";
    valid = false;
  } else {
    rosMaxError.textContent = "";
  }

  if (!Number.isFinite(trayA) || trayA <= 0) {
    trayAError.textContent = "Tray side A must be greater than 0 cm.";
    valid = false;
  } else {
    trayAError.textContent = "";
  }

  if (!Number.isFinite(trayB) || trayB <= 0) {
    trayBError.textContent = "Tray side B must be greater than 0 cm.";
    valid = false;
  } else {
    trayBError.textContent = "";
  }

  if (!Number.isFinite(tare) || tare < 0) {
    trayTareError.textContent = "Empty tray weight must be 0 kg or greater.";
    valid = false;
  } else {
    trayTareError.textContent = "";
  }

  if (!valid) return null;

  const area = (trayA / 100) * (trayB / 100);
  return { rows, rosMin, rosMax, trayA, trayB, tare: roundToTwoDecimals(tare), area };
}

function generateOneRosRow(targetRos, settings, localMin, localMax) {
  // We calculate the binder mass from the desired RoS, round the weights to
  // hundredths of a kilogram (as in the field report), and then recalculate
  // the displayed RoS from those final weights so every row is internally consistent.
  for (let attempt = 0; attempt < 1000; attempt++) {
    const adjustedTarget = roundToOneDecimal(
      Math.min(localMax, Math.max(localMin, targetRos + randomNumber(-0.05, 0.05)))
    );

    const net = roundToTwoDecimals(adjustedTarget * settings.area);
    if (net <= 0) continue;

    const gross = roundToTwoDecimals(settings.tare + net);
    const consistentNet = roundToTwoDecimals(gross - settings.tare);
    const actualRos = roundToOneDecimal(consistentNet / settings.area);

    if (actualRos < settings.rosMin || actualRos > settings.rosMax) continue;
    if (actualRos < localMin - 0.05 || actualRos > localMax + 0.05) continue;

    return {
      tare: settings.tare,
      gross,
      net: consistentNet,
      ros: actualRos
    };
  }

  throw new Error("Could not generate a valid Rate of Spread row with the selected settings.");
}

function generateRosData() {
  const settings = validateRosInputs();
  if (!settings) return;

  const batchCentre = roundToOneDecimal(randomNumber(settings.rosMin, settings.rosMax));
  const localMin = Math.max(settings.rosMin, batchCentre - ROS_CLUSTER_RADIUS);
  const localMax = Math.min(settings.rosMax, batchCentre + ROS_CLUSTER_RADIUS);

  const rows = [];

  try {
    for (let i = 0; i < settings.rows; i++) {
      const target = roundToOneDecimal(randomNumber(localMin, localMax));
      rows.push(generateOneRosRow(target, settings, localMin, localMax));
    }
  } catch (error) {
    rosDataBody.innerHTML = `<tr><td colspan="4" class="empty">${error.message}</td></tr>`;
    rosBatchNote.hidden = true;
    return;
  }

  rosDataBody.innerHTML = "";
  lastRosRows = rows;
  copyRosBtn.disabled = false;
  copyRosBtn.textContent = "Copy data";
  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.tare.toFixed(2)}</td>
      <td>${row.gross.toFixed(2)}</td>
      <td>${row.net.toFixed(2)}</td>
      <td>${row.ros.toFixed(1)}</td>
    `;
    rosDataBody.appendChild(tr);
  });

  rosBatchNote.textContent = `Tray area: ${settings.area.toFixed(4)} m². Generated around a batch centre of ${batchCentre.toFixed(1)} kg/m², within the selected ${settings.rosMin.toFixed(1)}–${settings.rosMax.toFixed(1)} kg/m² limits.`;
  rosBatchNote.hidden = false;
}


async function copyRowsToClipboard(rows, formatter, button) {
  if (!rows.length) return;
  const text = rows.map(formatter).join("\n");

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  const original = button.textContent;
  button.textContent = "Copied";
  button.classList.add("copied");
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove("copied");
  }, 1200);
}

pulverisationTab.addEventListener("click", () => switchTab("pulverisation"));
rosTab.addEventListener("click", () => switchTab("ros"));
generateBtn.addEventListener("click", generateData);
generateRosBtn.addEventListener("click", generateRosData);
copyPulvBtn.addEventListener("click", () => copyRowsToClipboard(
  lastPulvRows,
  row => `${row.m1}\t${row.m2}\t${row.m3}\t${row.pulverisation.toFixed(1)}`,
  copyPulvBtn
));
copyRosBtn.addEventListener("click", () => copyRowsToClipboard(
  lastRosRows,
  row => `${row.tare.toFixed(2)}\t${row.gross.toFixed(2)}\t${row.net.toFixed(2)}\t${row.ros.toFixed(1)}`,
  copyRosBtn
));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

switchTab("pulverisation");
