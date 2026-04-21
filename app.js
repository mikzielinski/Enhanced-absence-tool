"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const ENTITIES = {
  dk_aarhus: {
    label: "Denmark — Qiagen Aarhus",
    months: ["Sep-25","Oct-25","Nov-25","Dec-25","Jan-26","Feb-26","Mar-26","Apr-26","May-26","Jun-26","Jul-26","Aug-26"],
    absenceTypeMap: {
      // E-days Absence Type value (lowercase, trimmed) → { code, type }
      "holiday":                                          { code: 748,  type: "Vacation" },
      "company free days (\"feriefri\")":                { code: 629,  type: "Extra vacation days" },
      "company free days (\u201cferiefri\u201d)":        { code: 629,  type: "Extra vacation days" },
      "company free days (\u00e2\u20ac\u0153feriefri\u00e2\u20ac)": { code: 629, type: "Extra vacation days" },
    },
    balanceTypeMap: {
      "holiday":                                          "Holiday",
      "company free days (\"feriefri\")":                "Special",
      "company free days (\u201cferiefri\u201d)":        "Special",
      "company free days (\u00e2\u20ac\u0153feriefri\u00e2\u20ac)": "Special",
    },
    // Column names in the E-days source file
    sourceColumns: {
      employeeId: ["Employee Number", "SAP ID", "Employee No"],
      absenceType: ["Absence Type"],
      from: ["From"],
      to: ["To"],
      days: ["Total Days", "Days"],
      status: ["Status"],
      name: ["First Name", "Name"],
    },
  },
  dk_ab: {
    label: "Denmark — Qiagen AB",
    months: ["Sep-25","Oct-25","Nov-25","Dec-25","Jan-26","Feb-26","Mar-26","Apr-26","May-26","Jun-26","Jul-26","Aug-26"],
    absenceTypeMap: {
      "holiday":                                          { code: 748,  type: "Vacation" },
      "company free days (\"feriefri\")":                { code: 629,  type: "Extra vacation days" },
      "company free days (\u201cferiefri\u201d)":        { code: 629,  type: "Extra vacation days" },
      "company free days (\u00e2\u20ac\u0153feriefri\u00e2\u20ac)": { code: 629, type: "Extra vacation days" },
    },
    balanceTypeMap: {
      "holiday":                                          "Holiday",
      "company free days (\"feriefri\")":                "Special",
      "company free days (\u201cferiefri\u201d)":        "Special",
      "company free days (\u00e2\u20ac\u0153feriefri\u00e2\u20ac)": "Special",
    },
    sourceColumns: {
      employeeId: ["Employee Number", "SAP ID", "Employee No"],
      absenceType: ["Absence Type"],
      from: ["From"],
      to: ["To"],
      days: ["Total Days", "Days"],
      status: ["Status"],
      name: ["First Name", "Name"],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

const state = {
  entity: "dk_aarhus",
  p1SourceWb: null,
  p2SourceWb: null,
  p2MasterWb: null,
  p4MasterWb: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// UI REFS
// ─────────────────────────────────────────────────────────────────────────────

const ui = {
  entityLabel: document.getElementById("entityLabel"),
  entityPills: document.querySelectorAll(".entity-pill"),
  processTabs: document.querySelectorAll(".process-tab"),

  panelP1: document.getElementById("panel-p1"),
  panelP2: document.getElementById("panel-p2"),
  panelP4: document.getElementById("panel-p4"),

  p1SourceFile: document.getElementById("p1-source-file"),
  p1SourceSheet: document.getElementById("p1-source-sheet"),
  p1Error: document.getElementById("p1-error"),
  btnP1: document.getElementById("btn-p1"),

  p2Month: document.getElementById("p2-month"),
  p2SourceFile: document.getElementById("p2-source-file"),
  p2SourceSheet: document.getElementById("p2-source-sheet"),
  p2MasterFile: document.getElementById("p2-master-file"),
  p2MasterSheet: document.getElementById("p2-master-sheet"),
  p2Error: document.getElementById("p2-error"),
  btnP2: document.getElementById("btn-p2"),

  p4MasterFile: document.getElementById("p4-master-file"),
  p4MasterSheet: document.getElementById("p4-master-sheet"),
  p4PayslipFiles: document.getElementById("p4-payslip-files"),
  p4Error: document.getElementById("p4-error"),
  btnP4: document.getElementById("btn-p4"),

  resultDot: document.getElementById("result-dot"),
  resultContent: document.getElementById("result-content"),
  logOutput: document.getElementById("log-output"),
};

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

init();

function init() {
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // Entity pills
  ui.entityPills.forEach((pill) => {
    if (pill.classList.contains("disabled")) return;
    pill.addEventListener("click", () => {
      ui.entityPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.entity = pill.dataset.entity;
      ui.entityLabel.textContent = ENTITIES[state.entity].label;
      populateMonthSelect();
      resetAllForms();
      log(`Entity: ${ENTITIES[state.entity].label}`);
    });
  });

  // Process tabs
  ui.processTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      ui.processTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const key = tab.dataset.tab;
      ui.panelP1.classList.toggle("hidden", key !== "p1");
      ui.panelP2.classList.toggle("hidden", key !== "p2");
      ui.panelP4.classList.toggle("hidden", key !== "p4");
    });
  });

  // File pickers
  ui.p1SourceFile.addEventListener("change", (e) => loadWorkbook(e, "p1Source", ui.p1SourceSheet, ui.p1Error));
  ui.p2SourceFile.addEventListener("change", (e) => loadWorkbook(e, "p2Source", ui.p2SourceSheet, ui.p2Error));
  ui.p2MasterFile.addEventListener("change", (e) => loadWorkbook(e, "p2Master", ui.p2MasterSheet, ui.p2Error));
  ui.p4MasterFile.addEventListener("change", (e) => loadWorkbook(e, "p4Master", ui.p4MasterSheet, ui.p4Error));
  ui.p4PayslipFiles.addEventListener("change", refreshButtons);

  // Sheet selects → refresh buttons
  [ui.p1SourceSheet, ui.p2SourceSheet, ui.p2MasterSheet, ui.p4MasterSheet].forEach((s) =>
    s.addEventListener("change", refreshButtons)
  );

  // Run buttons
  ui.btnP1.addEventListener("click", runProcess1);
  ui.btnP2.addEventListener("click", runProcess2);
  ui.btnP4.addEventListener("click", runProcess4);

  // Initial state
  ui.entityLabel.textContent = ENTITIES[state.entity].label;
  populateMonthSelect();
  fillSelect(ui.p1SourceSheet, []);
  fillSelect(ui.p2SourceSheet, []);
  fillSelect(ui.p2MasterSheet, []);
  fillSelect(ui.p4MasterSheet, []);
  refreshButtons();
}

function populateMonthSelect() {
  const months = ENTITIES[state.entity].months;
  ui.p2Month.innerHTML = "";
  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m; opt.textContent = m;
    ui.p2Month.appendChild(opt);
  });
  // Auto-select current month
  const now = new Date();
  const cur = now.toLocaleString("en-US", { month: "short" }) + "-" + String(now.getFullYear()).slice(-2);
  ui.p2Month.value = months.includes(cur) ? cur : months[0];
}

function resetAllForms() {
  state.p1SourceWb = null;
  state.p2SourceWb = null;
  state.p2MasterWb = null;
  state.p4MasterWb = null;
  [ui.p1SourceFile, ui.p2SourceFile, ui.p2MasterFile, ui.p4MasterFile, ui.p4PayslipFiles].forEach((f) => { f.value = ""; });
  fillSelect(ui.p1SourceSheet, []);
  fillSelect(ui.p2SourceSheet, []);
  fillSelect(ui.p2MasterSheet, []);
  fillSelect(ui.p4MasterSheet, []);
  refreshButtons();
}

function refreshButtons() {
  ui.btnP1.disabled = !(state.p1SourceWb && ui.p1SourceSheet.value);
  ui.btnP2.disabled = !(state.p2SourceWb && ui.p2SourceSheet.value && state.p2MasterWb && ui.p2MasterSheet.value);
  ui.btnP4.disabled = !(state.p4MasterWb && ui.p4MasterSheet.value && (ui.p4PayslipFiles.files || []).length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKBOOK LOADING
// ─────────────────────────────────────────────────────────────────────────────

async function loadWorkbook(event, stateKey, sheetSelect, errorEl) {
  const file = event.target.files?.[0];
  fillSelect(sheetSelect, []);
  state[stateKey + "Wb"] = null;
  hideError(errorEl);
  if (!file) { refreshButtons(); return; }
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheets = getSheetNames(wb);
    state[stateKey + "Wb"] = wb;
    fillSelect(sheetSelect, sheets);
    log(`Loaded: ${file.name} (${sheets.length} sheet(s): ${sheets.join(", ")})`);
    refreshButtons();
  } catch (err) {
    showError(errorEl, `Could not read file: ${err.message}`);
  }
}

function getSheetNames(wb) {
  return wb.SheetNames.filter(Boolean);
}

function fillSelect(el, values) {
  el.innerHTML = "";
  const clean = Array.isArray(values) ? values.map((v) => String(v || "").trim()).filter(Boolean) : [];
  if (!clean.length) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = "— no sheets —";
    el.appendChild(o);
    return;
  }
  clean.forEach((name) => {
    const o = document.createElement("option");
    o.value = name; o.textContent = name;
    el.appendChild(o);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS 1 — FLEXI ABSENCE INPUT FEED
// ─────────────────────────────────────────────────────────────────────────────

async function runProcess1() {
  clearLog();
  hideError(ui.p1Error);
  setResultRunning();
  try {
    log("=== Process 1 — Flexi Absence Input Feed ===");
    const entity = ENTITIES[state.entity];
    const sourceFile = ui.p1SourceFile.files?.[0];
    if (!sourceFile) throw new Error("Please select the E-days source file.");
    const sheetName = ui.p1SourceSheet.value;
    if (!sheetName) throw new Error("Please select a sheet.");

    log(`Reading source: ${sourceFile.name} / ${sheetName}`);
    const buf = await sourceFile.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const rows = sheetToObjects(wb, sheetName);
    log(`  Source rows: ${rows.length}`);

    const flexiRows = buildFlexiRows(rows, entity);
    log(`  Approved + mapped rows: ${flexiRows.length}`);

    const outWb = buildSimpleWorkbook("Flexi absence input", [
      "EMPLOYEE NUMBER", "Absence Code", "NAME", "Absence Type", "From", "To", "Days",
    ], flexiRows);
    writeWorkbookDownload(outWb, "Flexi-absence input.xlsx");

    log(`Done. Generated ${flexiRows.length} row(s).`);
    setResultSuccess({
      process: "Process 1 — Flexi Absence Input Feed",
      entity: entity.label,
      stats: [
        { label: "Rows Generated", val: flexiRows.length, cls: "ok" },
      ],
      file: "Flexi-absence input.xlsx",
    });
  } catch (err) {
    showError(ui.p1Error, err.message);
    setResultError(err.message);
    log(`ERROR: ${err.message}`, "error");
  }
}

function buildFlexiRows(rows, entity) {
  const cols = entity.sourceColumns;
  const typeMap = entity.absenceTypeMap;

  const idCol     = findColumnName(rows, cols.employeeId);
  const typeCol   = findColumnName(rows, cols.absenceType);
  const fromCol   = findColumnName(rows, cols.from);
  const toCol     = findColumnName(rows, cols.to);
  const daysCol   = findColumnName(rows, cols.days);
  const statusCol = findColumnName(rows, cols.status);

  if (!idCol)     throw new Error(`Could not find Employee ID column. Tried: ${cols.employeeId.join(", ")}`);
  if (!typeCol)   throw new Error(`Could not find Absence Type column. Tried: ${cols.absenceType.join(", ")}`);
  if (!fromCol)   throw new Error(`Could not find From date column. Tried: ${cols.from.join(", ")}`);
  if (!toCol)     throw new Error(`Could not find To date column. Tried: ${cols.to.join(", ")}`);
  if (!daysCol)   throw new Error(`Could not find Days column. Tried: ${cols.days.join(", ")}`);
  if (!statusCol) throw new Error(`Could not find Status column. Tried: ${cols.status.join(", ")}`);

  log(`  Columns → ID:${idCol}, Type:${typeCol}, From:${fromCol}, To:${toCol}, Days:${daysCol}, Status:${statusCol}`);

  const filtered = rows
    .filter((row) => {
      const status = String(row[statusCol] || "").trim().toLowerCase();
      if (status !== "approved") return false;
      const absType = normalizeAbsenceType(String(row[typeCol] || ""));
      return absType in typeMap;
    })
    .map((row) => {
      const absType = normalizeAbsenceType(String(row[typeCol] || ""));
      const mapped  = typeMap[absType];
      const from    = parseDateValue(row[fromCol]);
      const to      = parseDateValue(row[toCol]);
      const days    = round2(Number(row[daysCol]) || 0);
      const empId   = normalizeSap(row[idCol]);
      return {
        "EMPLOYEE NUMBER": empId,
        "Absence Code":    mapped.code,
        "NAME":            "",
        "Absence Type":    mapped.type,
        "From":            from ? formatDateDMY(from) : String(row[fromCol] || ""),
        "To":              to   ? formatDateDMY(to)   : String(row[toCol]   || ""),
        "Days":            days,
      };
    })
    .filter((r) => r["EMPLOYEE NUMBER"]);

  return filtered;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS 2 — UPDATE MASTER FILE
// ─────────────────────────────────────────────────────────────────────────────

async function runProcess2() {
  clearLog();
  hideError(ui.p2Error);
  setResultRunning();
  try {
    log("=== Process 2 — Update Master File ===");
    const entity     = ENTITIES[state.entity];
    const monthLabel = ui.p2Month.value;
    const sourceFile = ui.p2SourceFile.files?.[0];
    const masterFile = ui.p2MasterFile.files?.[0];
    if (!sourceFile) throw new Error("Please select the E-days source file.");
    if (!masterFile) throw new Error("Please select the master file.");

    const srcSheet    = ui.p2SourceSheet.value;
    const masterSheet = ui.p2MasterSheet.value;

    log(`Reading source: ${sourceFile.name} / ${srcSheet}`);
    const srcBuf = await sourceFile.arrayBuffer();
    const srcWb  = XLSX.read(srcBuf, { type: "array" });
    const rows   = sheetToObjects(srcWb, srcSheet);
    const summary = buildBalanceSummary(rows, entity);
    log(`  Balance summary: ${summary.length} employee(s)`);
    summary.forEach((r) => log(`  SAP ${r["SAP ID"]}: Holiday=${r.Holiday}, Special=${r.Special}`));

    log(`Reading master: ${masterFile.name} / ${masterSheet}`);
    const masterBuf   = await masterFile.arrayBuffer();
    const masterWb    = XLSX.read(masterBuf, { type: "array" });
    const updatePlan  = buildMasterUpdatePlan(masterWb, masterSheet, summary, monthLabel);

    const outBytes = applyMasterUpdatesViaWorksheetXml(masterBuf, updatePlan);
    const outName  = buildUpdatedMasterName(masterFile.name, monthLabel);
    writeBytesDownload(outBytes, outName);

    log(`Done. Updated ${updatePlan.updates.length} employee(s).`);
    setResultSuccess({
      process: "Process 2 — Update Master File",
      entity: entity.label,
      stats: [
        { label: "Employees Updated", val: updatePlan.updates.length, cls: "ok" },
        { label: "Month", val: monthLabel, cls: "" },
      ],
      file: outName,
    });
  } catch (err) {
    showError(ui.p2Error, err.message);
    setResultError(err.message);
    log(`ERROR: ${err.message}`, "error");
  }
}

function buildBalanceSummary(rows, entity) {
  const cols      = entity.sourceColumns;
  const balMap    = entity.balanceTypeMap;
  const idCol     = findColumnName(rows, cols.employeeId);
  const typeCol   = findColumnName(rows, cols.absenceType);
  const daysCol   = findColumnName(rows, cols.days);
  const statusCol = findColumnName(rows, cols.status);

  if (!idCol || !typeCol || !daysCol || !statusCol)
    throw new Error("Could not find required columns in source sheet for Process 2.");

  const map = new Map();
  rows.forEach((row) => {
    const status = String(row[statusCol] || "").trim().toLowerCase();
    if (status !== "approved") return;
    const sap  = normalizeSap(row[idCol]);
    if (!sap) return;
    const abs  = normalizeAbsenceType(String(row[typeCol] || ""));
    const type = balMap[abs];
    if (!type) return; // not tracked (e.g. Sickness)
    const days = round2(Number(row[daysCol]) || 0);
    if (!map.has(sap)) map.set(sap, { "SAP ID": sap, Holiday: 0, Special: 0 });
    const rec = map.get(sap);
    rec[type] = round2((rec[type] || 0) + days);
  });
  return Array.from(map.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS 4 — PAYSLIP RECONCILIATION
// ─────────────────────────────────────────────────────────────────────────────

async function runProcess4() {
  clearLog();
  hideError(ui.p4Error);
  setResultRunning();
  try {
    log("=== Process 4 — Payslip Reconciliation ===");
    const entity      = ENTITIES[state.entity];
    const masterFile  = ui.p4MasterFile.files?.[0];
    const masterSheet = ui.p4MasterSheet.value;
    const pdfFiles    = Array.from(ui.p4PayslipFiles.files || []);

    if (!masterFile)        throw new Error("Please select the master file.");
    if (!masterSheet)       throw new Error("Please select a sheet in the master file.");
    if (!pdfFiles.length)   throw new Error("Please select at least one payslip PDF.");

    log(`Reading master: ${masterFile.name} / ${masterSheet}`);
    const masterBuf = await masterFile.arrayBuffer();

    const holidaySummary = await readSheetColumnsDirect(masterBuf, masterSheet, {
      idCandidates:    ["SAP ID", "ID", "Holid"],
      nameCandidates:  ["Employee", "Name", "Employee Name", "First name", "Last name"],
      valueCandidates: ["Total holiday balance"],
      valueLabel:      "Total holiday balance",
    });
    const specialSummary = await readSheetColumnsDirect(masterBuf, masterSheet, {
      idCandidates:    ["SAP ID", "ID", "Holid"],
      nameCandidates:  ["Employee", "Name", "Employee Name", "First name", "Last name"],
      valueCandidates: ["Total special holiday balance"],
      valueLabel:      "Total special holiday balance",
    });

    const totals = {}, specials = {}, names = {};
    holidaySummary.forEach((r) => {
      totals[r["SAP ID"]] = r["Total holiday balance"];
      if (r["Employee Name"]) names[r["SAP ID"]] = r["Employee Name"];
    });
    specialSummary.forEach((r) => { specials[r["SAP ID"]] = r["Total special holiday balance"]; });
    log(`  Master records: ${Object.keys(totals).length}`);

    const records = [];
    for (const file of pdfFiles) {
      log(`Parsing: ${file.name}`);
      const { records: recs, pagesTotal, pagesWithText } = await parsePayslipBatch(file);
      records.push(...recs);
      log(`  Pages: ${pagesTotal}, with text: ${pagesWithText}, employees: ${recs.length}`);
      recs.forEach((r) =>
        log(`  p${r.page ?? "?"}: ID=${r.sap_id} | Holiday=${r.payslip_holidays_total ?? "null"} | Special=${r.payslip_special_total ?? "null"}`)
      );
    }

    if (!records.length) throw new Error("No employee records found in the payslip PDFs.");

    const reconcRows = records.map((rec) => {
      const sap = rec.sap_id;
      const eh  = totals[sap] ?? null;
      const es  = specials[sap] ?? null;
      const ph  = rec.payslip_holidays_total;
      const ps  = rec.payslip_special_total;
      return {
        "SAP ID / Employee No":          sap,
        "Employee Name":                 names[sap] || rec.name || "Unknown",
        "Excel report value":            eh,
        "Payslip value":                 ph,
        "Result":                        eh !== null && ph !== null ? round2(eh) === round2(ph) : false,
        "Excel special holiday balance": es,
        "Payslip special holiday value": ps,
        "Special result":                es !== null && ps !== null ? round2(es) === round2(ps) : true,
      };
    });

    const outBytes = buildPayslipReportWorkbook(reconcRows);
    const outName  = `Payslip reconciliation ${todayIso()}.xlsx`;
    downloadStyledXlsx(outBytes, outName);

    const mismatches = reconcRows.filter((r) => !(r["Result"] && r["Special result"])).length;
    log(`Done. Records: ${reconcRows.length}, Mismatches: ${mismatches}`);
    setResultSuccess({
      process: "Process 4 — Payslip Reconciliation",
      entity: entity.label,
      stats: [
        { label: "Total Records", val: reconcRows.length, cls: "" },
        { label: "Matched", val: reconcRows.length - mismatches, cls: "ok" },
        { label: "Mismatched", val: mismatches, cls: mismatches > 0 ? "warn" : "ok" },
      ],
      file: outName,
    });
  } catch (err) {
    showError(ui.p4Error, err.message);
    setResultError(err.message);
    log(`ERROR: ${err.message}`, "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER FILE — PLAN + APPLY (preserved from original tool, format-safe)
// ─────────────────────────────────────────────────────────────────────────────

function buildMasterUpdatePlan(workbook, sheetName, summaryRows, monthLabel) {
  const ws = workbook.Sheets[sheetName];
  if (!ws || !ws["!ref"]) throw new Error("Master sheet is empty or does not exist.");
  const range     = XLSX.utils.decode_range(ws["!ref"]);
  const monthCols = findMonthColumns(ws, range, monthLabel);

  const bySap = new Map();
  for (let r = 0; r <= range.e.r; r++) {
    const sap = normalizeSap(getWsCellValue(ws, r, 0));
    if (sap) bySap.set(sap, r);
  }

  const updates = [];
  summaryRows.forEach((rec) => {
    const rowIdx = bySap.get(rec["SAP ID"]);
    if (rowIdx === undefined) {
      log(`(!) SAP ${rec["SAP ID"]} not found in master — skipped.`, "warn");
      return;
    }
    updates.push({
      sap: rec["SAP ID"],
      rowIdx,
      holiday: rec.Holiday ? round2(rec.Holiday) : null,
      special: rec.Special ? round2(rec.Special) : null,
    });
    log(`  OK SAP ${rec["SAP ID"]}: Holiday=${round2(rec.Holiday)}, Special=${round2(rec.Special)}`);
  });

  return { sheetName, monthIdx: monthCols.holidayIdx, specialIdx: monthCols.specialIdx, updates };
}

function findMonthColumns(ws, range, monthLabel) {
  const target = normalizeMonthLabel(monthLabel);
  const seenMonths = [];
  const matches = [];
  const maxHeaderRow = Math.min(range.e.r, 4);
  for (let r = 0; r <= maxHeaderRow; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const normalized = normalizeMonthCell(ws, r, c);
      if (normalized) seenMonths.push(normalized);
      if (normalized === target) matches.push({ row: r, col: c });
    }
  }
  for (const match of matches) {
    const pair = resolveMonthPairColumns(ws, range, match.row, match.col);
    if (pair) return pair;
  }
  throw new Error(`Month '${monthLabel}' not found in master header. Found: ${[...new Set(seenMonths)].join(", ")}`);
}

function normalizeMonthCell(ws, rowIdx, colIdx) {
  const ref  = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
  const cell = ws[ref];
  if (!cell) return "";
  return normalizeMonthLabel(cell.w) || normalizeMonthLabel(cell.v) || normalizeMonthLabel(getWsCellValue(ws, rowIdx, colIdx));
}

function resolveMonthPairColumns(ws, range, monthRow, monthCol) {
  const pairRows = [monthRow + 1, monthRow + 2].filter((r) => r <= range.e.r);
  for (const row of pairRows) {
    const left  = normalizeSubheaderLabel(getWsCellValue(ws, row, monthCol));
    const right = normalizeSubheaderLabel(getWsCellValue(ws, row, monthCol + 1));
    if (left === "holiday" && right === "special") return { holidayIdx: monthCol, specialIdx: monthCol + 1 };
    if (left === "special" && right === "holiday") return { holidayIdx: monthCol + 1, specialIdx: monthCol };
  }
  if (monthCol + 1 <= range.e.c) return { holidayIdx: monthCol, specialIdx: monthCol + 1 };
  if (monthCol - 1 >= 0)          return { holidayIdx: monthCol, specialIdx: monthCol - 1 };
  return null;
}

function normalizeSubheaderLabel(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return "";
  if (text.includes("special")) return "special";
  if (text.includes("holiday")) return "holiday";
  return "";
}

function getWsCellValue(ws, rowIdx, colIdx) {
  const ref  = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
  const cell = ws[ref];
  if (!cell) return null;
  return cell.w ?? cell.v ?? null;
}

function applyMasterUpdatesViaWorksheetXml(workbookBytes, updatePlan) {
  if (!workbookBytes)   throw new Error("Missing original master file bytes.");
  if (!window.fflate)   throw new Error("fflate library not available.");
  const bytes  = new Uint8Array(workbookBytes);
  const zipped = window.fflate.unzipSync(bytes);
  const wbXmlPath  = "xl/workbook.xml";
  const wbRelsPath = "xl/_rels/workbook.xml.rels";
  const wbXml      = getZipXml(zipped, wbXmlPath);
  const updatedWbXml = ensureWorkbookFullRecalcOnLoad(wbXml);
  const wbRelsXml  = getZipXml(zipped, wbRelsPath);
  const sheetPath  = resolveWorksheetPath(wbXml, wbRelsXml, updatePlan.sheetName);
  const sheetXml   = getZipXml(zipped, sheetPath);
  const updatedSheetXml = updateWorksheetXmlValues(sheetXml, updatePlan);
  zipped[wbXmlPath]  = window.fflate.strToU8(updatedWbXml);
  zipped[sheetPath]  = window.fflate.strToU8(updatedSheetXml);
  return window.fflate.zipSync(zipped, { level: 0 });
}

function ensureWorkbookFullRecalcOnLoad(workbookXml) {
  const doc = new DOMParser().parseFromString(workbookXml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("Failed to parse workbook.xml.");
  const root = doc.documentElement;
  const calcPr = findChild(root, "calcPr") || createChild(doc, root, "calcPr");
  calcPr.setAttribute("calcMode", "auto");
  calcPr.setAttribute("fullCalcOnLoad", "1");
  calcPr.setAttribute("forceFullCalc", "1");
  const s = new XMLSerializer().serializeToString(doc);
  return s.startsWith("<?xml") ? s : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${s}`;
}

function updateWorksheetXmlValues(sheetXml, updatePlan) {
  const doc = new DOMParser().parseFromString(sheetXml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("Failed to parse sheet XML.");
  const sheetData = findChild(doc.documentElement, "sheetData");
  if (!sheetData) throw new Error("Sheet XML has no sheetData element.");
  updatePlan.updates.forEach((u) => {
    setXmlCellByCoords(doc, sheetData, u.rowIdx + 1, updatePlan.monthIdx   + 1, u.holiday);
    setXmlCellByCoords(doc, sheetData, u.rowIdx + 1, updatePlan.specialIdx + 1, u.special);
  });
  const s = new XMLSerializer().serializeToString(doc);
  return s.startsWith("<?xml") ? s : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${s}`;
}

function setXmlCellByCoords(doc, sheetData, rowNum, colNum, value) {
  const ref     = `${colNumToLetter(colNum)}${rowNum}`;
  const rowNode = findXmlRow(sheetData, rowNum);
  if (!rowNode) throw new Error(`Row ${rowNum} not found in master sheet. Aborting to protect formatting.`);
  const cellNode = findXmlCell(rowNode, ref);
  if (!cellNode) throw new Error(`Cell ${ref} not found in master sheet. Aborting to protect formatting.`);
  writeNumericToCell(doc, cellNode, value);
}

function findXmlRow(sheetData, rowNumber) {
  return getChildren(sheetData, "row").find((r) => Number(r.getAttribute("r") || 0) === rowNumber) || null;
}

function writeNumericToCell(doc, cellNode, value) {
  const hasFormula = !!findChild(cellNode, "f");
  if (value === null || value === undefined || value === "") {
    if (hasFormula) { getOrCreate(doc, cellNode, "v").textContent = ""; return; }
    removeChildren(cellNode, "v");
    removeChildren(cellNode, "is");
    cellNode.removeAttribute("t");
    return;
  }
  cellNode.removeAttribute("t");
  removeChildren(cellNode, "is");
  getOrCreate(doc, cellNode, "v").textContent = String(Number(value));
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER FILE — DIRECT COLUMN READ (for Process 4)
// ─────────────────────────────────────────────────────────────────────────────

async function readSheetColumnsDirect(arrayBuffer, sheetName, opts) {
  if (!window.fflate) throw new Error("fflate not available.");
  const bytes  = new Uint8Array(arrayBuffer);
  const zipped = window.fflate.unzipSync(bytes);
  const shared = parseSharedStrings(zipped);
  const allTables = buildAllSheetTables(zipped, shared);
  const targetTable = allTables[sheetName];
  if (!targetTable) throw new Error(`Sheet '${sheetName}' not found.`);
  evaluateSheetFormulas(targetTable, allTables);

  const values = new Map();
  targetTable.forEach((cell, ref) => values.set(ref, cell.raw));

  const rowNums = [...new Set([...values.keys()].map((ref) => parseInt(ref.replace(/[A-Z]+/g, ""), 10)))]
    .filter((n) => !isNaN(n)).sort((a, b) => a - b);

  const headerMap = {}, headerRaw = {};

  function addHeaderRow(rNum) {
    [...values.keys()].filter((ref) => parseInt(ref.replace(/[A-Z]+/g, ""), 10) === rNum).forEach((ref) => {
      const col = ref.replace(/[0-9]/g, "");
      const val = values.get(ref);
      if (typeof val !== "string" || !val.trim()) return;
      const norm = val.replace(/\s+/g, " ").trim();
      headerMap[col] = norm.toLowerCase();
      headerRaw[col] = norm;
    });
  }

  if (rowNums[0]) addHeaderRow(rowNums[0]);
  const row2 = rowNums[1];
  if (row2) {
    const hasText = [...values.keys()]
      .filter((r) => parseInt(r.replace(/[A-Z]+/g, ""), 10) === row2)
      .some((r) => typeof values.get(r) === "string" && values.get(r).trim());
    if (hasText) addHeaderRow(row2);
  }

  log(`  Headers in '${sheetName}': ${Object.values(headerRaw).join(" | ")}`);

  function findCol(candidates) {
    for (const cand of candidates) {
      const cl = cand.toLowerCase().replace(/\s+/g, " ").trim();
      for (const [col, hdr] of Object.entries(headerMap)) {
        if (hdr === cl) return col;
      }
    }
    for (const cand of candidates) {
      const cl = cand.toLowerCase().replace(/\s+/g, " ").trim();
      if (cl.length < 6) continue;
      for (const [col, hdr] of Object.entries(headerMap)) {
        if (hdr.startsWith(cl)) return col;
      }
    }
    return null;
  }

  const idCol    = findCol(opts.idCandidates);
  const nameCol  = findCol(opts.nameCandidates || []);
  const valueCol = findCol(opts.valueCandidates);

  if (!idCol)    throw new Error(`ID column not found in '${sheetName}'. Tried: ${opts.idCandidates.join(", ")}. Headers: ${Object.values(headerRaw).join(" | ")}`);
  if (!valueCol) throw new Error(`Value column '${opts.valueCandidates[0]}' not found in '${sheetName}'. Headers: ${Object.values(headerRaw).join(" | ")}`);

  const result = [];
  rowNums.forEach((rNum) => {
    const idRaw = values.get(`${idCol}${rNum}`);
    const sap   = normalizeSap(idRaw);
    if (!sap || !/^[0-9]+$/.test(sap)) return;
    const val  = values.get(`${valueCol}${rNum}`);
    const num  = typeof val === "number" ? val : null;
    let name = "";
    if (nameCol) {
      const nv = values.get(`${nameCol}${rNum}`);
      name = typeof nv === "string" ? nv : "";
    }
    const rec = { "SAP ID": sap, "Employee Name": name };
    rec[opts.valueLabel] = num;
    result.push(rec);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF PAYSLIP PARSING (Danish format — same as original tool)
// ─────────────────────────────────────────────────────────────────────────────

async function parsePayslipBatch(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf   = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pagesTotal = pdf.numPages || 0;
  if (pagesTotal <= 0) throw new Error(`Payslip PDF has no pages: ${file.name}`);
  const records = [];
  let pagesWithText = 0;
  for (let i = 1; i <= pagesTotal; i++) {
    const page = await pdf.getPage(i);
    const text = await extractPageText(page);
    if (!text) continue;
    pagesWithText++;
    if (!/employeeno/i.test(text)) continue;
    const rec = parseEmployeeBlock(text);
    rec.page = i;
    if (rec.sap_id === "UNKNOWN") { log(`  p${i}: could not read SAP ID — skipped`, "warn"); continue; }
    records.push(rec);
  }
  if (pagesWithText === 0) throw new Error(`PDF contains no readable text: ${file.name}`);
  if (records.length === 0) throw new Error(`No employee records found in: ${file.name}`);
  return { records, pagesTotal, pagesWithText };
}

function parseEmployeeBlock(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  let sap_id = "UNKNOWN";
  for (const line of lines) {
    const m = line.match(/employeeno[:\s]+([0-9]{4,})/i);
    if (m) { sap_id = normalizeSap(m[1]); break; }
  }
  if (sap_id === "UNKNOWN") {
    for (let i = 0; i < lines.length; i++) {
      if (!/employeeno/i.test(lines[i])) continue;
      const nums = lines[i].match(/([0-9]{4,})/);
      if (nums) { sap_id = normalizeSap(nums[1]); break; }
      const next = lines[i + 1] || "";
      const n2 = next.match(/([0-9]{4,})/);
      if (n2) { sap_id = normalizeSap(n2[1]); break; }
    }
  }
  let name = "Unknown";
  for (let i = 0; i < lines.length; i++) {
    if (!/employeeno/i.test(lines[i])) continue;
    const prev = lines[i - 1] || "";
    if (prev && !/[0-9]/.test(prev) && prev.trim().split(/\s+/).length >= 2) name = prev.trim();
    break;
  }
  let payslip_holidays_total = null;
  for (const line of lines) {
    if (!/holidays\s+total/i.test(line)) continue;
    const nums = extractLineNumbers(line);
    if (nums.length >= 1) payslip_holidays_total = nums[nums.length - 1];
    break;
  }
  let payslip_special_total = null;
  for (const line of lines) {
    if (!/special\s+holidays?/i.test(line)) continue;
    const nums = extractLineNumbers(line);
    if (nums.length >= 1) payslip_special_total = nums[nums.length - 1];
    break;
  }
  return { sap_id, name, payslip_holidays_total, payslip_special_total };
}

async function extractPageText(page) {
  const textContent = await page.getTextContent();
  const items = (textContent.items || [])
    .map((item) => ({ str: String(item?.str || "").trim(), x: Number(item?.transform?.[4] || 0), y: Number(item?.transform?.[5] || 0) }))
    .filter((i) => i.str);
  if (!items.length) return "";
  items.sort((a, b) => { const dy = b.y - a.y; return Math.abs(dy) > 2 ? dy : a.x - b.x; });
  const lines = [];
  let cur = [], curY = null;
  items.forEach((item) => {
    if (curY === null || Math.abs(item.y - curY) <= 2) { cur.push(item); if (curY === null) curY = item.y; }
    else { lines.push(cur); cur = [item]; curY = item.y; }
  });
  if (cur.length) lines.push(cur);
  return lines.map((l) => l.sort((a, b) => a.x - b.x).map((i) => i.str).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean).join("\n");
}

function extractLineNumbers(line) {
  return line.split(/\s+/).map(parseDanishNumber).filter((n) => n !== null);
}

function parseDanishNumber(raw) {
  const s = String(raw || "").replace(/\u00a0/g, "").trim();
  if (!s || !/[0-9]/.test(s)) return null;
  const clean = s.replace(/[^0-9,.\-]/g, "");
  const hasDot = clean.includes("."), hasComma = clean.includes(",");
  let numeric;
  if (hasDot && hasComma) {
    numeric = clean.lastIndexOf(",") > clean.lastIndexOf(".")
      ? Number(clean.replaceAll(".", "").replaceAll(",", "."))
      : Number(clean.replaceAll(",", ""));
  } else if (hasComma) {
    numeric = Number(clean.replaceAll(",", "."));
  } else {
    numeric = Number(clean);
  }
  return Number.isFinite(numeric) ? round2(numeric) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// XLSX BUILDING — STYLED OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

function buildSimpleWorkbook(sheetName, headers, rows) {
  const wsRows = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? null))];
  const ws = XLSX.utils.aoa_to_sheet(wsRows);
  applyHeaderStyles(ws, headers.length);
  autoWidth(ws, wsRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function applyHeaderStyles(ws, count) {
  const HEADER_FILL = { fgColor: { rgb: "FF1A3A8F" } };
  const HEADER_FONT = { bold: true, color: { rgb: "FFFFFFFF" } };
  for (let c = 0; c < count; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[ref]) ws[ref] = { t: "s", v: "" };
    ws[ref].s = { fill: HEADER_FILL, font: HEADER_FONT, alignment: { horizontal: "center", wrapText: true } };
  }
}

function autoWidth(ws, rows) {
  const widthMap = [];
  rows.forEach((row) => row.forEach((v, i) => {
    const len = String(v ?? "").length;
    widthMap[i] = Math.min(Math.max(widthMap[i] || 8, len + 2), 50);
  }));
  ws["!cols"] = widthMap.map((wch) => ({ wch }));
}

function buildPayslipReportWorkbook(rows) {
  const headers = [
    "SAP ID / Employee No", "Employee Name",
    "Excel report value", "Payslip value", "Result",
    "Excel special holiday balance", "Payslip special holiday value", "Special result",
  ];
  return buildStyledXlsx("Reconciliation", headers, rows,
    (row) => { const isFalse = (v) => v === false || v === "FALSE" || v === 0; return isFalse(row["Result"]) || isFalse(row["Special result"]); }
  );
}

function buildStyledXlsx(sheetName, headers, rows, isRedRow) {
  function esc(v) {
    return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  const strings = []; const strIdx = new Map();
  function si(val) {
    const s = String(val ?? "");
    if (!strIdx.has(s)) { strIdx.set(s, strings.length); strings.push(s); }
    return strIdx.get(s);
  }
  headers.forEach((h) => si(h));
  rows.forEach((row) => headers.forEach((h) => { const v = row[h]; if (v !== null && v !== undefined && typeof v !== "number") si(String(v)); }));

  function colLetter(n) {
    let s = "";
    for (let c = n; c >= 0; c = Math.floor(c / 26) - 1) s = String.fromCharCode(65 + (c % 26)) + s;
    return s;
  }

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><sz val="11"/><name val="Calibri"/><b/><color rgb="FFFFFFFF"/></font>
    <font><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1A3A8F"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFF0000"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFill="1"/>
  </cellXfs>
</styleSheet>`;

  let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n  <sheetData>`;
  sheetXml += `<row r="1">`;
  headers.forEach((h, ci) => { sheetXml += `<c r="${colLetter(ci)}1" t="s" s="1"><v>${si(h)}</v></c>`; });
  sheetXml += `</row>`;
  rows.forEach((row, ri) => {
    const rn = ri + 2; const red = isRedRow(row); const s = red ? ` s="2"` : "";
    sheetXml += `<row r="${rn}">`;
    headers.forEach((h, ci) => {
      const ref = `${colLetter(ci)}${rn}`; const v = row[h];
      if (v === null || v === undefined) { sheetXml += `<c r="${ref}"${s}/>`; }
      else if (typeof v === "number")    { sheetXml += `<c r="${ref}"${s}><v>${v}</v></c>`; }
      else if (typeof v === "boolean")   { sheetXml += `<c r="${ref}" t="s"${s}><v>${si(v ? "TRUE" : "FALSE")}</v></c>`; }
      else                               { sheetXml += `<c r="${ref}" t="s"${s}><v>${si(String(v))}</v></c>`; }
    });
    sheetXml += `</row>`;
  });
  sheetXml += `</sheetData></worksheet>`;

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">\n${strings.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join("")}\n</sst>`;
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n  <sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets>\n</workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>\n  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n</Relationships>`;
  const appRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>\n  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n</Types>`;

  const enc = window.fflate.strToU8;
  return window.fflate.zipSync({
    "[Content_Types].xml": enc(contentTypes),
    "_rels/.rels":          enc(appRels),
    "xl/workbook.xml":      enc(wbXml),
    "xl/_rels/workbook.xml.rels": enc(wbRels),
    "xl/worksheets/sheet1.xml":   enc(sheetXml),
    "xl/sharedStrings.xml": enc(ssXml),
    "xl/styles.xml":         enc(stylesXml),
  }, { level: 6 });
}

// ─────────────────────────────────────────────────────────────────────────────
// XLSX ZIP HELPERS (shared string parsing, sheet tables, formula eval)
// ─────────────────────────────────────────────────────────────────────────────

function parseSharedStrings(zipped) {
  const ssBytes = zipped["xl/sharedStrings.xml"];
  if (!ssBytes) return [];
  const xml = window.fflate.strFromU8(ssBytes);
  const doc  = new DOMParser().parseFromString(xml, "application/xml");
  const sis  = doc.getElementsByTagName("si");
  const arr  = [];
  for (let i = 0; i < sis.length; i++) {
    const ts = sis[i].getElementsByTagName("t");
    let s = "";
    for (let j = 0; j < ts.length; j++) s += ts[j].textContent || "";
    arr.push(s);
  }
  return arr;
}

function buildAllSheetTables(zipped, sharedStrings) {
  const wbXml  = window.fflate.strFromU8(zipped["xl/workbook.xml"]);
  const wbRels = window.fflate.strFromU8(zipped["xl/_rels/workbook.xml.rels"]);
  const wbDoc  = new DOMParser().parseFromString(wbXml,  "application/xml");
  const relDoc = new DOMParser().parseFromString(wbRels, "application/xml");
  const ridToPath = {};
  const rels = relDoc.getElementsByTagName("Relationship");
  for (let i = 0; i < rels.length; i++) ridToPath[rels[i].getAttribute("Id")] = rels[i].getAttribute("Target");

  const tables = {};
  const sheetEls = wbDoc.getElementsByTagName("sheet");
  for (let i = 0; i < sheetEls.length; i++) {
    const el   = sheetEls[i];
    const name = el.getAttribute("name") || "";
    const rid  = el.getAttribute("r:id") || el.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || "";
    let target = ridToPath[rid] || "";
    if (!target) continue;
    target = target.replace(/^\//, "");
    if (!target.startsWith("xl/")) target = "xl/" + target.replace(/^\.?\//, "");
    const wsBytes = zipped[target];
    if (!wsBytes) continue;
    const wsXml = window.fflate.strFromU8(wsBytes);
    const doc2  = new DOMParser().parseFromString(wsXml, "application/xml");
    const sd    = findChild(doc2.documentElement, "sheetData");
    const table = new Map();
    if (sd) getChildren(sd, "row").forEach((row) => {
      getChildren(row, "c").forEach((cell) => {
        const ref  = cell.getAttribute("r") || "";
        const type = cell.getAttribute("t") || "";
        const vEl  = findChild(cell, "v"); const fEl = findChild(cell, "f");
        const vTxt = vEl ? vEl.textContent.trim() : "";
        const fTxt = fEl ? fEl.textContent.trim() : "";
        let raw = null;
        if (type === "s") { const idx = parseInt(vTxt, 10); raw = isNaN(idx) ? null : (sharedStrings[idx] || null); }
        else if (vTxt !== "") { const n = Number(vTxt); raw = isFinite(n) ? n : vTxt; }
        table.set(ref, { raw, formula: fTxt || null });
      });
    });
    tables[name] = table;
  }
  return tables;
}

function evaluateSheetFormulas(targetTable, allTables) {
  function getVal(sheetName, ref) {
    const tbl  = sheetName ? (allTables[sheetName] || targetTable) : targetTable;
    const cell = tbl ? tbl.get(ref) : null;
    if (!cell) return 0;
    return typeof cell.raw === "number" ? cell.raw : 0;
  }
  function evalFormula(formula, selfRef) {
    let f = formula.startsWith("=") ? formula.slice(1) : formula;
    f = f.replace(/'([^']+)'!([A-Z]{1,3}[0-9]+)/g, (_, sheet, ref) => String(getVal(sheet, ref)));
    f = f.replace(/([A-Za-z][A-Za-z0-9 ]*)!([A-Z]{1,3}[0-9]+)/g, (_, sheet, ref) => String(getVal(sheet.trim(), ref)));
    f = f.replace(/([A-Z]{1,3}[0-9]+)/g, (match) => {
      if (match === selfRef) return "0";
      const cell = targetTable.get(match);
      if (!cell) return "0";
      return typeof cell.raw === "number" ? String(cell.raw) : "0";
    });
    if (!/^[\d\s+\-*/.()eE]+$/i.test(f)) return null;
    try { const r = Function('"use strict"; return (' + f + ");")(); return isFinite(r) ? Math.round(r * 100) / 100 : null; }
    catch { return null; }
  }
  for (let pass = 0; pass < 15; pass++) {
    let changed = false;
    targetTable.forEach((cell, ref) => {
      if (!cell.formula) return;
      const r = evalFormula(cell.formula, ref);
      if (r !== null && cell.raw !== r) { cell.raw = r; changed = true; }
    });
    if (!changed) break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// XML / ZIP UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function getZipXml(zipped, path) {
  const u8 = zipped[path];
  if (!u8) throw new Error(`Missing '${path}' in XLSX archive.`);
  return window.fflate.strFromU8(u8);
}

function resolveWorksheetPath(workbookXml, workbookRelsXml, sheetName) {
  const wbDoc  = new DOMParser().parseFromString(workbookXml,     "application/xml");
  const relDoc = new DOMParser().parseFromString(workbookRelsXml, "application/xml");
  const sheets = wbDoc.getElementsByTagName("sheet");
  let relId = "";
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getAttribute("name") === sheetName) {
      relId = sheets[i].getAttribute("r:id") || sheets[i].getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || "";
      break;
    }
  }
  if (!relId) throw new Error(`Sheet '${sheetName}' not found in workbook.xml.`);
  const rels = relDoc.getElementsByTagName("Relationship");
  let target = "";
  for (let i = 0; i < rels.length; i++) {
    if (rels[i].getAttribute("Id") === relId) { target = rels[i].getAttribute("Target") || ""; break; }
  }
  if (!target) throw new Error(`Relationship for sheet '${sheetName}' not found.`);
  const clean = target.replace(/^\//, "");
  return clean.startsWith("xl/") ? clean : `xl/${clean.replace(/^\.?\//, "")}`;
}

function findChild(parent, localName) {
  const children = parent?.childNodes || [];
  for (let i = 0; i < children.length; i++) {
    if (children[i].nodeType === 1 && children[i].localName === localName) return children[i];
  }
  return null;
}

function getChildren(parent, localName) {
  const result = []; const children = parent?.childNodes || [];
  for (let i = 0; i < children.length; i++) {
    if (children[i].nodeType === 1 && children[i].localName === localName) result.push(children[i]);
  }
  return result;
}

function findXmlCell(rowNode, ref) {
  return getChildren(rowNode, "c").find((c) => (c.getAttribute("r") || "") === ref) || null;
}

function createChild(doc, parent, localName) {
  const el = doc.createElementNS(parent.namespaceURI, localName);
  parent.appendChild(el);
  return el;
}

function getOrCreate(doc, parent, localName) {
  return findChild(parent, localName) || createChild(doc, parent, localName);
}

function removeChildren(parent, localName) {
  [...(parent?.childNodes || [])].forEach((c) => {
    if (c.nodeType === 1 && c.localName === localName) parent.removeChild(c);
  });
}

function colNumToLetter(n) {
  let name = "";
  while (n > 0) { const rem = (n - 1) % 26; name = String.fromCharCode(65 + rem) + name; n = Math.floor((n - 1) / 26); }
  return name || "A";
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function sheetToObjects(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet '${sheetName}' not found.`);
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
}

function findColumnName(rows, candidates) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  for (const cand of candidates) {
    const cl = cand.toLowerCase().replace(/\s+/g, " ").trim();
    const found = keys.find((k) => k.toLowerCase().replace(/\s+/g, " ").trim() === cl);
    if (found) return found;
  }
  // Partial match
  for (const cand of candidates) {
    const cl = cand.toLowerCase().replace(/\s+/g, " ").trim();
    if (cl.length < 4) continue;
    const found = keys.find((k) => k.toLowerCase().replace(/\s+/g, " ").trim().startsWith(cl));
    if (found) return found;
  }
  return null;
}

function normalizeAbsenceType(raw) {
  const normalized = String(raw || "").replace(/\s+/g, " ").trim().toLowerCase();
  // Normalize feriefri variants -- encoding artifacts from E-days export
  if (normalized.includes("feriefri")) return 'company free days ("feriefri")';
  return normalized;
}

function normalizeSap(value) {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const num = Number(raw);
  if (!isNaN(num)) return String(Math.trunc(num));
  return raw.split(".")[0].trim();
}

function parseDateValue(value) {
  if (!value) return null;
  // Excel serial number
  const num = Number(value);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    // Excel date serial → JS Date (Excel epoch is 1/1/1900, serial 1 = Jan 1 1900)
    // Note: Excel wrongly treats 1900 as a leap year so we subtract 1 for dates after Feb 28 1900
    const excelEpoch = new Date(Date.UTC(1900, 0, 1));
    const d = new Date(excelEpoch.getTime() + (num - 2) * 86400000);
    if (!isNaN(d.getTime())) return d;
  }
  // DD/MM/YYYY
  const dmy = String(value).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
    if (!isNaN(d.getTime())) return d;
  }
  // ISO YYYY-MM-DD
  const iso = String(value).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateDMY(date) {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

function normalizeMonthLabel(raw) {
  if (raw === null || raw === undefined) return "";
  const text = String(raw).trim();
  if (!text) return "";
  const shortMatch = text.match(/^([A-Za-z]{3})[-\s]?(\d{2}|\d{4})$/);
  if (shortMatch) {
    const month = shortMatch[1][0].toUpperCase() + shortMatch[1].slice(1, 3).toLowerCase();
    const year  = shortMatch[2].length === 2 ? shortMatch[2] : shortMatch[2].slice(-2);
    return `${month}-${year}`.toLowerCase();
  }
  const d = parseDateValue(raw);
  if (!d) return "";
  const month = d.toLocaleString("en-US", { month: "short" });
  const year  = String(d.getFullYear()).slice(-2);
  return `${month}-${year}`.toLowerCase();
}

function round2(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildUpdatedMasterName(baseName, monthLabel) {
  const orig  = String(baseName || "master.xlsx");
  const month = String(monthLabel || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const suf   = month ? `-${month}` : "";
  return orig.toLowerCase().endsWith(".xlsx") ? `${orig.slice(0, -5)}-updated${suf}.xlsx` : `${orig}-updated${suf}.xlsx`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE DOWNLOAD HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function writeWorkbookDownload(wb, filename) {
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : filename + ".xlsx", { cellStyles: true });
}

function writeBytesDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename.endsWith(".xlsx") ? filename : filename + ".xlsx";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadStyledXlsx(bytes, filename) {
  writeBytesDownload(bytes, filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS — LOG + RESULT
// ─────────────────────────────────────────────────────────────────────────────

function log(msg, level) {
  const el  = ui.logOutput;
  const cls = level === "error" ? "log-line-error" : level === "warn" ? "log-line-warn" : "";
  const line = document.createElement("span");
  if (cls) line.className = cls;
  line.textContent = msg + "\n";
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function clearLog() {
  ui.logOutput.innerHTML = "";
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideError(el) {
  el.classList.add("hidden");
  el.textContent = "";
}

function setResultRunning() {
  ui.resultDot.className = "result-dot running";
  ui.resultContent.innerHTML = `<span style="color:var(--text-muted);font-style:italic;">Running…</span>`;
}

function setResultSuccess({ process, entity, stats, file }) {
  ui.resultDot.className = "result-dot ok";
  const statsHtml = stats.map((s) =>
    `<div class="stat-item"><div class="stat-val ${s.cls || ""}">${s.val}</div><div class="stat-label">${s.label}</div></div>`
  ).join("");
  ui.resultContent.innerHTML = `
    <div style="margin-bottom:10px;">
      <strong style="font-size:.9rem">${process}</strong>
      <span style="color:var(--text-muted);font-size:.8rem;margin-left:8px;">${entity}</span>
    </div>
    <div class="result-stats">${statsHtml}</div>
    ${file ? `<div style="margin-top:10px;font-size:.8rem;color:var(--ok);">✓ Downloaded: <strong>${file}</strong></div>` : ""}
  `;
}

function setResultError(msg) {
  ui.resultDot.className = "result-dot error";
  ui.resultContent.innerHTML = `<span style="color:var(--danger);font-size:.85rem;">✗ Error: ${msg}</span>`;
}
