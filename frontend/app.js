const SETTINGS_STORAGE_KEY = "signalDeskAiSettings";
const DECISIONS_STORAGE_KEY = "signalDeskActionDecisions";

const state = {
  analysis: null,
  selectedActionId: null,
  decisions: {},
  ai: {
    apiKey: "",
    model: "gpt-4.1-mini",
    remember: false
  }
};

const dom = {
  csvInput: document.querySelector("#csvInput"),
  sampleButton: document.querySelector("#sampleButton"),
  resetButton: document.querySelector("#resetButton"),
  dataStatus: document.querySelector("#dataStatus"),
  actionFilter: document.querySelector("#actionFilter"),
  actionList: document.querySelector("#actionList"),
  angleList: document.querySelector("#angleList"),
  campaignRows: document.querySelector("#campaignRows"),
  detailTitle: document.querySelector("#detailTitle"),
  detailBody: document.querySelector("#detailBody"),
  detailStats: document.querySelector("#detailStats"),
  briefOutput: document.querySelector("#briefOutput"),
  memoOutput: document.querySelector("#memoOutput"),
  variantOutput: document.querySelector("#variantOutput"),
  memoMode: document.querySelector("#memoMode"),
  copyBrief: document.querySelector("#copyBrief"),
  generateMemo: document.querySelector("#generateMemo"),
  demoButton: document.querySelector("#demoButton"),
  generateVariants: document.querySelector("#generateVariants"),
  exportMarkdown: document.querySelector("#exportMarkdown"),
  metricSpend: document.querySelector("#metricSpend"),
  metricSpendSub: document.querySelector("#metricSpendSub"),
  metricLeads: document.querySelector("#metricLeads"),
  metricLeadsSub: document.querySelector("#metricLeadsSub"),
  metricQcpl: document.querySelector("#metricQcpl"),
  metricQcplSub: document.querySelector("#metricQcplSub"),
  metricRisk: document.querySelector("#metricRisk"),
  metricRiskSub: document.querySelector("#metricRiskSub"),
  openaiKey: document.querySelector("#openaiKey"),
  modelSelect: document.querySelector("#modelSelect"),
  rememberKey: document.querySelector("#rememberKey"),
  clearKey: document.querySelector("#clearKey"),
  aiSettingsStatus: document.querySelector("#aiSettingsStatus"),
  workflowControls: document.querySelector("#workflowControls"),
  approvedPlan: document.querySelector("#approvedPlan"),
  standupOutput: document.querySelector("#standupOutput"),
  copyStandup: document.querySelector("#copyStandup"),
  clearDecisions: document.querySelector("#clearDecisions"),
  editRowSelect: document.querySelector("#editRowSelect"),
  editSpend: document.querySelector("#editSpend"),
  editImpressions: document.querySelector("#editImpressions"),
  editClicks: document.querySelector("#editClicks"),
  editLeads: document.querySelector("#editLeads"),
  editQualified: document.querySelector("#editQualified"),
  editRevenue: document.querySelector("#editRevenue"),
  editCampaign: document.querySelector("#editCampaign"),
  editAdName: document.querySelector("#editAdName"),
  editCreativeText: document.querySelector("#editCreativeText"),
  applyRowEdit: document.querySelector("#applyRowEdit"),
  editStatus: document.querySelector("#editStatus")
};

async function api(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function loadSample() {
  setBusy("Loading sample data...");
  const analysis = await api("/api/sample-account");
  setAnalysis(analysis, "Sample data loaded");
}

async function uploadCSV(file) {
  setBusy(`Uploading ${file.name}...`);
  const form = new FormData();
  form.append("file", file);
  const analysis = await api("/api/analyze-csv", { method: "POST", body: form });
  setAnalysis(analysis, file.name);
}

function setAnalysis(analysis, label) {
  state.analysis = analysis;
  state.selectedActionId = analysis.actions[0]?.id || null;
  dom.dataStatus.textContent = `${label}: ${analysis.rows.length} rows normalized, ${analysis.actions.length} actions generated.`;
  render();
}

function resetApp() {
  state.analysis = null;
  state.selectedActionId = null;
  dom.csvInput.value = "";
  dom.dataStatus.textContent = "No account loaded.";
  dom.memoMode.textContent = "Agent fallback ready";
  render();
}

function selectedAction() {
  return state.analysis?.actions.find((action) => action.id === state.selectedActionId) || null;
}

function loadAiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    state.ai.apiKey = saved.apiKey || "";
    state.ai.model = saved.model || "gpt-4.1-mini";
    state.ai.remember = Boolean(saved.apiKey);
  } catch {
    state.ai = { apiKey: "", model: "gpt-4.1-mini", remember: false };
  }
  syncAiSettingsControls();
}

function syncAiSettingsControls() {
  dom.openaiKey.value = state.ai.apiKey;
  dom.modelSelect.value = state.ai.model;
  dom.rememberKey.checked = state.ai.remember;
  updateAiSettingsStatus();
}

function updateAiSettingsFromControls() {
  state.ai.apiKey = dom.openaiKey.value.trim();
  state.ai.model = dom.modelSelect.value || "gpt-4.1-mini";
  state.ai.remember = dom.rememberKey.checked;
  persistAiSettings();
  updateAiSettingsStatus();
}

function persistAiSettings() {
  if (state.ai.remember && state.ai.apiKey) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      apiKey: state.ai.apiKey,
      model: state.ai.model
    }));
    return;
  }
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
}

function clearAiSettings() {
  state.ai.apiKey = "";
  state.ai.remember = false;
  persistAiSettings();
  syncAiSettingsControls();
}

function updateAiSettingsStatus() {
  if (!state.ai.apiKey) {
    dom.aiSettingsStatus.textContent = "Fallback mode ready. No key stored by the server.";
    return;
  }
  dom.aiSettingsStatus.textContent = state.ai.remember
    ? `OpenAI ready with ${state.ai.model}. Key remembered in this browser.`
    : `OpenAI ready with ${state.ai.model}. Key kept for this session.`;
}

function aiRequestSettings() {
  return {
    api_key: state.ai.apiKey,
    model: state.ai.model
  };
}
function loadActionDecisions() {
  try {
    state.decisions = JSON.parse(localStorage.getItem(DECISIONS_STORAGE_KEY) || "{}");
  } catch {
    state.decisions = {};
  }
}

function persistActionDecisions() {
  localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(state.decisions));
}

function decisionFor(actionId) {
  return state.decisions[actionId] || "new";
}

function setActionDecision(actionId, decision) {
  if (!actionId) return;
  if (state.decisions[actionId] === decision) {
    delete state.decisions[actionId];
  } else {
    state.decisions[actionId] = decision;
  }
  persistActionDecisions();
  render();
}

function clearActionDecisions() {
  state.decisions = {};
  localStorage.removeItem(DECISIONS_STORAGE_KEY);
  render();
}

function decisionLabel(decision) {
  return {
    approved: "Approved",
    review: "Needs Review",
    ignored: "Ignored",
    done: "Done",
    new: "New"
  }[decision] || "New";
}

function decisionClass(decision) {
  return decision === "new" ? "" : `decision-${decision}`;
}

function render() {
  renderMetrics();
  renderActions();
  renderDetail();
  renderAngles();
  renderBrief();
  renderAiPlaceholders();
  renderStandupPlan();
  renderTable();
  renderRowEditor();
}

function renderMetrics() {
  const account = state.analysis?.account || {};
  const risk = (state.analysis?.actions || [])
    .filter((action) => action.type === "urgent")
    .reduce((total, action) => total + action.impact, 0);

  dom.metricSpend.textContent = money(account.spend || 0);
  dom.metricSpendSub.textContent = state.analysis ? `${state.analysis.rows.length} imported rows` : "Awaiting data";
  dom.metricLeads.textContent = number(account.leads || 0);
  dom.metricLeadsSub.textContent = state.analysis ? `${number(account.qualified_leads)} qualified` : "Awaiting data";
  dom.metricQcpl.textContent = money(account.qcpl || 0);
  dom.metricQcplSub.textContent = state.analysis ? `${percent(account.qualified_rate)} qualified rate` : "Awaiting data";
  dom.metricRisk.textContent = money(risk);
  dom.metricRiskSub.textContent = state.analysis ? `${(state.analysis.actions || []).filter((action) => action.type === "urgent").length} urgent actions` : "Awaiting data";
}

function renderActions() {
  const filter = dom.actionFilter.value;
  const visible = (state.analysis?.actions || []).filter((action) => filter === "all" || action.type === filter);
  if (!visible.length) {
    dom.actionList.className = "action-list empty-state";
    dom.actionList.textContent = state.analysis ? "No actions match this filter." : "Load data to generate optimization actions.";
    return;
  }

  dom.actionList.className = "action-list";
  dom.actionList.innerHTML = visible.map((action) => {
    const decision = decisionFor(action.id);
    return `
      <button class="action-card ${action.type} ${state.selectedActionId === action.id ? "selected" : ""}" data-action-id="${action.id}" type="button">
        <div class="action-topline">
          <strong>${escapeHTML(action.title)}</strong>
          <span class="pill ${action.type}">${escapeHTML(labelForType(action.type))}</span>
        </div>
        <p>${escapeHTML(action.summary)}</p>
        ${decision !== "new" ? `<span class="decision-pill ${decisionClass(decision)}">${decisionLabel(decision)}</span>` : ""}
      </button>
    `;
  }).join("");

  dom.actionList.querySelectorAll("[data-action-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedActionId = button.dataset.actionId;
      render();
    });
  });
}

function renderDetail() {
  const action = selectedAction();
  if (!action) {
    dom.detailTitle.textContent = "Select an action";
    dom.detailBody.textContent = state.analysis ? "No recommendation is currently selected." : "The system will show the metrics, reasoning, and next step for the selected recommendation.";
    dom.detailStats.innerHTML = "";
    dom.workflowControls.innerHTML = "";
    return;
  }

  const group = action.group;
  dom.detailTitle.textContent = action.title;
  dom.detailBody.textContent = `${action.summary} Next step: ${action.next_step}`;
  dom.detailStats.innerHTML = [
    ["Impact", money(action.impact)],
    ["Confidence", action.confidence],
    ["Spend", money(group.spend)],
    ["Qualified CPL", money(group.qcpl)],
    ["CTR", percent(group.ctr)],
    ["Lead CVR", percent(group.cvr)]
  ].map(([term, description]) => `<div><dt>${term}</dt><dd>${description}</dd></div>`).join("");
  renderWorkflowControls(action);
}


function renderWorkflowControls(action) {
  const current = decisionFor(action.id);
  const options = [
    ["approved", "Approve"],
    ["review", "Needs Review"],
    ["ignored", "Ignore"],
    ["done", "Mark Done"]
  ];
  dom.workflowControls.innerHTML = `
    <div class="workflow-status">Status: <strong>${decisionLabel(current)}</strong></div>
    <div class="workflow-buttons">
      ${options.map(([decision, label]) => `
        <button class="workflow-button ${current === decision ? "active" : ""} ${decisionClass(decision)}" data-decision="${decision}" type="button">${label}</button>
      `).join("")}
    </div>
  `;
  dom.workflowControls.querySelectorAll("[data-decision]").forEach((button) => {
    button.addEventListener("click", () => setActionDecision(action.id, button.dataset.decision));
  });
}

function renderStandupPlan() {
  if (!state.analysis?.actions?.length) {
    dom.approvedPlan.className = "standup-list empty-state";
    dom.approvedPlan.textContent = "Approve actions to build today's operating plan.";
    dom.standupOutput.value = "Load an account, then approve actions to generate a team standup plan.";
    return;
  }

  const actions = state.analysis.actions;
  const approved = actions.filter((action) => decisionFor(action.id) === "approved");
  const review = actions.filter((action) => decisionFor(action.id) === "review");
  const done = actions.filter((action) => decisionFor(action.id) === "done");
  const ignored = actions.filter((action) => decisionFor(action.id) === "ignored");

  if (!approved.length && !review.length && !done.length) {
    dom.approvedPlan.className = "standup-list empty-state";
    dom.approvedPlan.textContent = "No decisions yet. Approve the actions the team should take today.";
  } else {
    dom.approvedPlan.className = "standup-list";
    dom.approvedPlan.innerHTML = [
      ...approved.map((action) => standupCard(action, "Approved")),
      ...review.map((action) => standupCard(action, "Needs Review")),
      ...done.map((action) => standupCard(action, "Done"))
    ].join("");
  }

  dom.standupOutput.value = buildStandupText(approved, review, done, ignored);
}

function standupCard(action, label) {
  return `
    <article class="standup-card">
      <span class="decision-pill ${decisionClass(decisionFor(action.id))}">${label}</span>
      <strong>${escapeHTML(action.title)}</strong>
      <p>${escapeHTML(action.next_step)}</p>
    </article>
  `;
}

function buildStandupText(approved, review, done, ignored) {
  const account = state.analysis?.account || {};
  const risk = (state.analysis?.actions || [])
    .filter((action) => action.type === "urgent")
    .reduce((total, action) => total + action.impact, 0);
  const lines = [
    "Signal Desk Team Standup Plan",
    "",
    `Account read: ${money(account.spend || 0)} spend, ${number(account.leads || 0)} leads, ${number(account.qualified_leads || 0)} qualified leads, ${money(account.qcpl || 0)} Q-CPL.`,
    `Budget at risk: ${money(risk)}.`,
    "",
    "Approved moves:"
  ];

  if (approved.length) {
    approved.forEach((action, index) => {
      lines.push(`${index + 1}. ${action.title} - ${action.next_step} Impact: ${money(action.impact)}. Owner: media buyer.`);
    });
  } else {
    lines.push("- No approved actions yet.");
  }

  lines.push("", "Needs review:");
  if (review.length) {
    review.forEach((action) => lines.push(`- ${action.title}: ${action.summary}`));
  } else {
    lines.push("- No review items marked.");
  }

  lines.push("", "Completed:");
  if (done.length) {
    done.forEach((action) => lines.push(`- ${action.title}`));
  } else {
    lines.push("- No completed actions marked.");
  }

  if (ignored.length) {
    lines.push("", `Ignored for now: ${ignored.length} action${ignored.length === 1 ? "" : "s"}.`);
  }

  lines.push("", "Next check-in: Review qualified CPL, lead conversion rate, and qualified lead rate after the next spend window.");
  return lines.join("\n");
}

function renderAngles() {
  if (!state.analysis?.angles?.length) {
    dom.angleList.className = "angle-list empty-state";
    dom.angleList.textContent = "Winning message analysis appears after data is loaded.";
    return;
  }

  const bestScore = Math.max(...state.analysis.angles.map((angle) => angle.score), 1);
  dom.angleList.className = "angle-list";
  dom.angleList.innerHTML = state.analysis.angles.map((angle) => `
    <article class="angle-card">
      <header>
        <h4>${escapeHTML(angle.angle)}</h4>
        <span class="pill">${money(angle.qcpl)} Q-CPL</span>
      </header>
      <p>${number(angle.qualified_leads)} qualified leads from ${money(angle.spend)} spend. Qualified rate: ${percent(angle.qualified_rate)}.</p>
      <div class="bar" aria-hidden="true"><span style="width: ${Math.max(8, (angle.score / bestScore) * 100)}%"></span></div>
    </article>
  `).join("");
}

async function renderBrief() {
  const action = selectedAction();
  if (!action || !state.analysis) {
    dom.briefOutput.value = state.analysis ? "Select an action to generate an experiment plan." : "Load an account, select an action, then generate an experiment plan.";
    return;
  }

  dom.briefOutput.value = "Generating experiment plan...";
  try {
    const result = await api("/api/generate-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_id: action.id, analysis: state.analysis })
    });
    dom.briefOutput.value = result.brief;
  } catch (error) {
    dom.briefOutput.value = `Experiment plan generation failed: ${error.message}`;
  }
}

function renderAiPlaceholders() {
  if (!state.analysis) {
    dom.memoOutput.value = "Load an account, then generate an AI media action memo.";
    dom.variantOutput.value = "Select an action, then generate ad copy ideas.";
  }
}

async function runDemo() {
  dom.dataStatus.textContent = "Running full demo workflow...";
  if (!state.analysis) {
    await loadSample();
  }
  await generateMemo();
  await generateVariants();
  document.querySelector("#actions")?.scrollIntoView({ behavior: "smooth", block: "start" });
  dom.dataStatus.textContent = `Full demo ready: ${state.analysis.rows.length} rows analyzed, ${state.analysis.actions.length} actions ranked.`;
}

async function generateMemo() {
  if (!state.analysis) return;
  dom.memoOutput.value = "Generating action memo...";
  const result = await api("/api/ai/daily-memo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis: state.analysis, ...aiRequestSettings() })
  });
  // `mode` tells judges whether this run used OpenAI or the deterministic no-key fallback.
  dom.memoMode.textContent = result.mode === "openai" ? "OpenAI" : "Agent Fallback";
  dom.memoOutput.value = result.content;
}

async function generateVariants() {
  const action = selectedAction();
  if (!action || !state.analysis) return;
  dom.variantOutput.value = "Generating ad copy ideas...";
  const result = await api("/api/ai/creative-variants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_id: action.id, analysis: state.analysis, ...aiRequestSettings() })
  });
  dom.variantOutput.value = result.content;
}



function rowGroupKey(row) {
  return `${row.platform} :: ${row.campaign} :: ${row.ad_name}`;
}

function sourceRowsForGroup(group) {
  const rows = state.analysis?.rows || [];
  return rows.filter((row) => row.platform === group.platform && row.campaign === group.campaign && row.ad_name === group.ad_name);
}

function sourceRowsForRow(row) {
  const rows = state.analysis?.rows || [];
  return rows.filter((item) => rowGroupKey(item) === rowGroupKey(row));
}

function selectedRowRollupSummary(row) {
  const rows = sourceRowsForRow(row);
  const totalLeads = rows.reduce((sum, item) => sum + item.leads, 0);
  const totalSpend = rows.reduce((sum, item) => sum + item.spend, 0);
  const rowIndex = rows.findIndex((item) => item.id === row.id) + 1;
  return `Editing source row ${rowIndex} of ${rows.length}. This row has ${number(row.leads)} leads; the Campaign / Ad Snapshot rollup totals ${number(totalLeads)} leads and ${money(totalSpend)} spend.`;
}

function renderRowEditor() {
  const rows = state.analysis?.rows || [];
  if (!rows.length) {
    dom.editRowSelect.innerHTML = `<option value="">Load data to edit rows</option>`;
    dom.editStatus.textContent = "Load an account to make row-level corrections.";
    setRowEditorDisabled(true);
    return;
  }

  setRowEditorDisabled(false);
  const currentId = dom.editRowSelect.value || rows[0].id;
  dom.editRowSelect.innerHTML = rows.map((row) => `
    <option value="${escapeHTML(row.id)}">${escapeHTML(row.date || "No date")} - ${escapeHTML(row.platform)} - ${escapeHTML(row.campaign)} - ${escapeHTML(row.ad_name)}</option>
  `).join("");
  dom.editRowSelect.value = rows.some((row) => row.id === currentId) ? currentId : rows[0].id;
  fillRowEditor();
}

function setRowEditorDisabled(disabled) {
  [
    dom.editRowSelect,
    dom.editSpend,
    dom.editImpressions,
    dom.editClicks,
    dom.editLeads,
    dom.editQualified,
    dom.editRevenue,
    dom.editCampaign,
    dom.editAdName,
    dom.editCreativeText,
    dom.applyRowEdit
  ].forEach((element) => { element.disabled = disabled; });
}

function editableRow() {
  const rows = state.analysis?.rows || [];
  return rows.find((row) => row.id === dom.editRowSelect.value) || rows[0] || null;
}

function fillRowEditor() {
  const row = editableRow();
  if (!row) return;
  dom.editSpend.value = row.spend ?? 0;
  dom.editImpressions.value = row.impressions ?? 0;
  dom.editClicks.value = row.clicks ?? 0;
  dom.editLeads.value = row.leads ?? 0;
  dom.editQualified.value = row.qualified_leads ?? 0;
  dom.editRevenue.value = row.revenue ?? 0;
  dom.editCampaign.value = row.campaign || "";
  dom.editAdName.value = row.ad_name || "";
  dom.editCreativeText.value = row.creative_text || "";
  dom.editStatus.textContent = selectedRowRollupSummary(row);
}

async function applyRowEdit() {
  const row = editableRow();
  if (!row || !state.analysis) return;
  const editedRows = state.analysis.rows.map((item) => {
    if (item.id !== row.id) return item;
    return {
      ...item,
      spend: numericInput(dom.editSpend),
      impressions: numericInput(dom.editImpressions),
      clicks: numericInput(dom.editClicks),
      leads: numericInput(dom.editLeads),
      qualified_leads: numericInput(dom.editQualified),
      revenue: numericInput(dom.editRevenue),
      campaign: dom.editCampaign.value.trim() || "Untitled Campaign",
      ad_name: dom.editAdName.value.trim() || "Untitled Ad",
      creative_text: dom.editCreativeText.value.trim()
    };
  });
  dom.editStatus.textContent = "Re-running analysis with corrected row...";
  const analysis = await api("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: editedRows })
  });
  state.analysis = analysis;
  state.selectedActionId = analysis.actions[0]?.id || null;
  dom.dataStatus.textContent = `Corrections applied: ${analysis.rows.length} rows normalized, ${analysis.actions.length} actions generated.`;
  render();
  dom.editStatus.textContent = "Correction applied. Action queue and standup plan were recalculated.";
}

function numericInput(input) {
  const value = Number(input.value);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function renderTable() {
  if (!state.analysis?.campaigns?.length) {
    dom.campaignRows.innerHTML = `<tr><td colspan="11">No rows loaded.</td></tr>`;
    return;
  }

  dom.campaignRows.innerHTML = state.analysis.campaigns.map((group) => {
    const sourceCount = sourceRowsForGroup(group).length;
    return `
    <tr>
      <td>${escapeHTML(group.platform)}</td>
      <td>${escapeHTML(group.campaign)}</td>
      <td>${escapeHTML(group.ad_name)}</td>
      <td>${sourceCount}</td>
      <td>${money(group.spend)}</td>
      <td>${number(group.clicks)}</td>
      <td>${number(group.leads)}</td>
      <td>${number(group.qualified_leads)}</td>
      <td>${money(group.cpl)}</td>
      <td>${money(group.qcpl)}</td>
      <td>${percent(group.ctr)}</td>
    </tr>
  `;
  }).join("");
}

async function exportActions() {
  if (!state.analysis?.actions?.length) return;
  const result = await api("/api/export-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.analysis)
  });
  await navigator.clipboard?.writeText(result.markdown);
  dom.exportMarkdown.textContent = "Copied";
  setTimeout(() => { dom.exportMarkdown.textContent = "Export Actions"; }, 1100);
}

function setBusy(message) {
  dom.dataStatus.textContent = message;
}

function money(value) {
  if (!Number.isFinite(value)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function number(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value || 0);
}

function percent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${number(value * 100)}%`;
}

function labelForType(type) {
  return {
    urgent: "Urgent",
    scale: "Scale",
    creative: "Creative",
    "landing-page": "Landing Page"
  }[type] || "Action";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

dom.openaiKey.addEventListener("input", updateAiSettingsFromControls);
dom.modelSelect.addEventListener("change", updateAiSettingsFromControls);
dom.rememberKey.addEventListener("change", updateAiSettingsFromControls);
dom.clearKey.addEventListener("click", clearAiSettings);
dom.sampleButton.addEventListener("click", () => loadSample().catch((error) => { dom.dataStatus.textContent = error.message; }));
dom.resetButton.addEventListener("click", resetApp);
dom.actionFilter.addEventListener("change", renderActions);
dom.demoButton.addEventListener("click", () => runDemo().catch((error) => { dom.dataStatus.textContent = error.message; }));
dom.generateMemo.addEventListener("click", () => generateMemo().catch((error) => { dom.memoOutput.value = error.message; }));
dom.generateVariants.addEventListener("click", () => generateVariants().catch((error) => { dom.variantOutput.value = error.message; }));
dom.copyStandup.addEventListener("click", async () => {
  dom.standupOutput.select();
  await navigator.clipboard?.writeText(dom.standupOutput.value);
  dom.copyStandup.textContent = "Copied";
  setTimeout(() => { dom.copyStandup.textContent = "Copy Standup"; }, 1100);
});
dom.clearDecisions.addEventListener("click", clearActionDecisions);
dom.editRowSelect.addEventListener("change", fillRowEditor);
dom.applyRowEdit.addEventListener("click", () => applyRowEdit().catch((error) => { dom.editStatus.textContent = error.message; }));
dom.copyBrief.addEventListener("click", async () => {
  dom.briefOutput.select();
  await navigator.clipboard?.writeText(dom.briefOutput.value);
  dom.copyBrief.textContent = "Copied";
  setTimeout(() => { dom.copyBrief.textContent = "Copy Plan"; }, 1100);
});
dom.exportMarkdown.addEventListener("click", () => exportActions().catch((error) => { dom.dataStatus.textContent = error.message; }));
dom.csvInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  uploadCSV(file).catch((error) => { dom.dataStatus.textContent = error.message; });
});

loadAiSettings();
loadActionDecisions();
resetApp();