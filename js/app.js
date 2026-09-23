/* AI Ecosystem Demand Map + Atlas scenario SPA — zero-build */
(() => {
  const state = {
    data: null,
    view: "map",
    search: "",
    layers: new Set(["L0", "L1", "L2", "L3", "L4"]),
    openOnly: false,
    hardOnly: false,
    softOnly: false,
    audit: false,
    scenario: null,
    run: null,
    companies: null,
    editHistory: [],
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const escAttr = (s) => esc(s).replace(/'/g, "&#39;");

  const clamp = (s, n = 140) => {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  };

  const fmt = (v, digits = 2) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "OPEN";
    if (typeof v !== "number") return String(v);
    if (Math.abs(v) >= 1e6) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return v.toLocaleString(undefined, { maximumFractionDigits: digits });
  };

  const pill = (status) => {
    const s = String(status || "open").toLowerCase();
    return `<span class="pill ${escAttr(s)}">${esc(String(status || "open").toUpperCase())}</span>`;
  };

  const logEdit = (action, detail) => {
    state.editHistory.push({
      at: new Date().toISOString(),
      action,
      detail,
    });
  };

  const nodeHasOpen = (n) => (n.metrics || []).some((m) => m.status === "open");

  const matchQ = (text) => {
    const q = state.search.trim().toLowerCase();
    if (!q) return true;
    return String(text || "")
      .toLowerCase()
      .includes(q);
  };

  const srcById = (id) => (state.data.sourceRegister || []).find((s) => s.id === id);
  const coeffById = (id) => (state.data.coefficients || []).find((c) => c.id === id);

  async function load() {
    const res = await fetch("data/map.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load data/map.json (${res.status})`);
    state.data = await res.json();
    state.scenario = AtlasEngine.defaultScenario();
    state.companies = AtlasEngine.companyTemplates();
    boot();
  }

  function boot() {
    const { meta, layers, legend } = state.data;
    $("#topMeta").innerHTML = [
      `asOf <strong>${esc(meta.asOf)}</strong>`,
      `generated <strong>${esc(meta.generatedAt)}</strong>`,
      `${meta.counts.nodes} nodes · ${meta.counts.edges} edges · ${meta.counts.coefficients || 0} coeffs`,
    ].join(" · ");
    $("#footerCounts").textContent = `Warnings: ${meta.warnings.length} · Open RQs: ${meta.counts.openQuestions} · Sources: ${meta.counts.sourceRegister || 0}`;

    $("#layerFilters").innerHTML = layers
      .map((l) => `<button type="button" class="layer-chip active" data-layer="${l.id}">${l.id}</button>`)
      .join("");

    $("#legendBody").innerHTML = (legend || [])
      .map(
        (x) =>
          `<div class="legend-row"><span class="pill ${escAttr(x.key)}">${esc(x.label)}</span><span>${esc(x.meaning)}</span></div>`
      )
      .join("");

    bind();
    syncScenarioForm();
    rerun();
    render();
  }

  function bind() {
    $("#search").addEventListener("input", (e) => {
      state.search = e.target.value;
      render();
    });
    $("#openOnly").addEventListener("change", (e) => {
      state.openOnly = e.target.checked;
      render();
    });
    $("#hardOnly").addEventListener("change", (e) => {
      state.hardOnly = e.target.checked;
      if (e.target.checked) {
        state.softOnly = false;
        $("#softOnly").checked = false;
      }
      render();
    });
    $("#softOnly").addEventListener("change", (e) => {
      state.softOnly = e.target.checked;
      if (e.target.checked) {
        state.hardOnly = false;
        $("#hardOnly").checked = false;
      }
      render();
    });
    $("#auditMode").addEventListener("change", (e) => {
      state.audit = e.target.checked;
      document.body.classList.toggle("audit", state.audit);
      render();
    });
    $("#layerFilters").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-layer]");
      if (!btn) return;
      const id = btn.dataset.layer;
      if (state.layers.has(id)) state.layers.delete(id);
      else state.layers.add(id);
      btn.classList.toggle("active", state.layers.has(id));
      render();
    });
    $$(".tab").forEach((tab) =>
      tab.addEventListener("click", () => {
        state.view = tab.dataset.view;
        $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
        $$(".view").forEach((v) => v.classList.remove("active"));
        const viewId = "view" + state.view.charAt(0).toUpperCase() + state.view.slice(1);
        $("#" + viewId).classList.add("active");
        render();
      })
    );
    $("#drawerClose").addEventListener("click", closeDrawer);
    $("#backdrop").addEventListener("click", closeDrawer);
    $("#btnLegend").addEventListener("click", () => $("#legendDialog").showModal());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });

    $("#btnPresetDefault").addEventListener("click", () => {
      state.scenario = AtlasEngine.defaultScenario();
      logEdit("preset", "Default illustrative");
      syncScenarioForm();
      rerun();
      render();
    });
    $("#btnPresetStress").addEventListener("click", () => {
      state.scenario = AtlasEngine.supplyPowerStressPreset();
      logEdit("preset", "Supply + power stress");
      syncScenarioForm();
      rerun();
      render();
    });
    $("#btnResetScenario").addEventListener("click", () => {
      state.scenario = AtlasEngine.defaultScenario();
      logEdit("reset", "scenario");
      syncScenarioForm();
      rerun();
      render();
    });

    $("#scName").addEventListener("change", () => {
      readScenarioForm();
      rerun();
      render();
    });
    $("#scLag").addEventListener("change", () => {
      readScenarioForm();
      rerun();
      render();
    });
    $("#scMiStacks").addEventListener("change", () => {
      readScenarioForm();
      rerun();
      render();
    });
    $("#scAmdMw").addEventListener("change", () => {
      readScenarioForm();
      rerun();
      render();
    });
    $("#scQuarterTable").addEventListener("change", (e) => {
      if (e.target.matches("input")) {
        readScenarioForm();
        rerun();
        renderScenarioOutputs();
        renderScenarioLedger();
      }
    });

    $("#btnDemoFill").addEventListener("click", () => {
      state.companies = state.companies.map((c) => AtlasEngine.demoFillCompany(c));
      logEdit("demoFill", "companies");
      renderCompanies();
    });
    $("#btnClearCompanies").addEventListener("click", () => {
      state.companies = AtlasEngine.companyTemplates();
      logEdit("clear", "companies");
      renderCompanies();
    });

    $("#btnExportJson").addEventListener("click", exportJson);
    $("#btnExportCsv").addEventListener("click", exportCsv);
    $("#importJson").addEventListener("change", importJson);
  }

  function syncScenarioForm() {
    const sc = state.scenario;
    $("#scName").value = sc.name || "";
    $("#scLag").value = sc.deploymentLagQuarters ?? 1;
    $("#scMiStacks").value =
      sc.assumptions?.mi455xStacksPerGpu != null ? sc.assumptions.mi455xStacksPerGpu : "";
    $("#scAmdMw").value =
      sc.assumptions?.amdFacilityMwPerGpu != null ? sc.assumptions.amdFacilityMwPerGpu : "";
    $("#scQuarterTable tbody").innerHTML = (sc.quarters || [])
      .map(
        (q, i) => `<tr data-qi="${i}">
        <td class="mono">${esc(q.id)}<input type="hidden" data-f="id" value="${escAttr(q.id)}" /></td>
        <td><input type="number" data-f="rubinUnits" value="${q.rubinUnits ?? ""}" step="1" min="0" /></td>
        <td><input type="number" data-f="mi455xUnits" value="${q.mi455xUnits ?? ""}" step="1" min="0" /></td>
        <td><input type="number" data-f="qualifiedHbmStacks" value="${q.qualifiedHbmStacks ?? ""}" step="1" min="0" placeholder="unconstrained" /></td>
        <td><input type="number" data-f="packagingCapacity" value="${q.packagingCapacity ?? ""}" step="1" min="0" placeholder="unconstrained" /></td>
        <td><input type="number" data-f="powerAdditionsMw" value="${q.powerAdditionsMw ?? ""}" step="1" min="0" /></td>
      </tr>`
      )
      .join("");
    const banner = $("#honestyBanner");
    banner.hidden = false;
    banner.textContent = sc.honestyBanner || "ILLUSTRATIVE scenario — not a shipment forecast.";
  }

  function readScenarioForm() {
    const sc = state.scenario;
    sc.name = $("#scName").value;
    sc.deploymentLagQuarters = AtlasEngine.num($("#scLag").value, 0);
    const mi = AtlasEngine.num($("#scMiStacks").value, null);
    const amd = AtlasEngine.num($("#scAmdMw").value, null);
    sc.assumptions = sc.assumptions || {};
    sc.assumptions.mi455xStacksPerGpu = mi;
    sc.assumptions.amdFacilityMwPerGpu = amd;
    sc.honestyLabel = "ILLUSTRATIVE";
    $$("#scQuarterTable tbody tr").forEach((tr) => {
      const i = Number(tr.dataset.qi);
      const q = sc.quarters[i];
      if (!q) return;
      tr.querySelectorAll("input[data-f]").forEach((inp) => {
        const f = inp.dataset.f;
        if (f === "id") {
          q.id = inp.value;
          return;
        }
        const blank = inp.value === "";
        q[f] = blank ? null : AtlasEngine.num(inp.value, null);
      });
    });
    logEdit("scenarioEdit", sc.name);
  }

  function rerun() {
    state.run = AtlasEngine.run(state.scenario, state.data.coefficients || []);
  }

  function filteredNodes() {
    return state.data.nodes.filter((n) => {
      if (!state.layers.has(n.layer)) return false;
      if (state.openOnly && !nodeHasOpen(n)) return false;
      const blob = [n.id, n.title, n.summary, ...(n.tags || []), ...(n.metrics || []).map((m) => m.label + m.value)].join(" ");
      return matchQ(blob);
    });
  }

  function filteredEdges() {
    return state.data.edges.filter((e) => {
      if (state.openOnly && e.qtyStatus !== "open" && e.qtyStatus !== "partial") return false;
      return matchQ([e.id, e.title, e.claim, e.sourcePath].join(" "));
    });
  }

  function filteredTickers() {
    return state.data.tickers.filter((t) => {
      if (state.hardOnly && t.sleeveType !== "hard") return false;
      if (state.softOnly && t.sleeveType !== "soft") return false;
      if (state.openOnly && t.qtyStatus !== "open") return false;
      return matchQ([t.symbol, t.name, ...(t.themes || []), ...(t.processIds || [])].join(" "));
    });
  }

  function render() {
    if (!state.data) return;
    renderMap();
    renderTickers();
    renderRqs();
    renderEdgesFull();
    renderScenarioOutputs();
    renderScenarioLedger();
    renderCompanies();
    renderCoeffs();
  }

  function renderMap() {
    const visible = new Set(filteredNodes().map((n) => n.id));
    $("#swimlanes").innerHTML = state.data.layers
      .filter((l) => state.layers.has(l.id))
      .map((layer) => {
        const laneNodes = state.data.nodes.filter((n) => n.layer === layer.id);
        return `<section class="lane">
          <div class="lane-head">
            <h2>${esc(layer.id)} · ${esc(layer.title)}</h2>
            <p>${esc(layer.description)}</p>
          </div>
          <div class="lane-nodes">
            ${laneNodes
              .map((n) => {
                const pills = (n.metrics || []).slice(0, 4).map((m) => pill(m.status)).join("");
                const audit = state.audit
                  ? `<div class="muted mono" style="margin-top:6px;font-size:11px">conf ${esc(n.confidence || "—")} · asOf ${esc(n.asOf || "—")}</div>`
                  : "";
                return `<button type="button" class="node-card ${visible.has(n.id) ? "" : "dim"}" data-node="${escAttr(n.id)}">
                  <div class="kind">${esc(n.kind || n.layer)}</div>
                  <h3>${esc(n.title)}</h3>
                  <div class="blurb">${esc(clamp(n.summary, 160))}</div>
                  <div class="metric-pills">${pills}</div>
                  ${audit}
                </button>`;
              })
              .join("")}
          </div>
        </section>`;
      })
      .join("");

    $("#swimlanes").onclick = (e) => {
      const btn = e.target.closest("[data-node]");
      if (btn) openNode(btn.dataset.node);
    };

    $("#edgeList").innerHTML = filteredEdges()
      .map(
        (e) => `<button type="button" class="edge-item" data-edge="${escAttr(e.id)}">
          <div class="eid">${esc(e.id.replace(/^CONN-\d{4}-\d{2}-\d{2}-/, ""))}</div>
          <div class="etitle">${esc(e.title)}</div>
          <div class="metric-pills" style="margin-top:6px">${pill(e.qtyStatus === "partial" ? "secondary" : e.qtyStatus)}<span class="pill">${esc(e.confidence)}</span></div>
        </button>`
      )
      .join("");
    $("#edgeList").onclick = (e) => {
      const btn = e.target.closest("[data-edge]");
      if (btn) openEdge(btn.dataset.edge);
    };
  }

  function outCard(label, cell, unit = "") {
    const ev = cell?.evidenceType || "OPEN";
    const val =
      cell?.value === null || cell?.value === undefined
        ? "OPEN"
        : typeof cell.value === "number"
          ? fmt(cell.value)
          : String(cell.value);
    return `<button type="button" class="out-card" data-out="${escAttr(label)}">
      <div class="label">${esc(label)}</div>
      <div class="value">${esc(val)}${unit && val !== "OPEN" ? ` <span class="muted" style="font-size:12px">${esc(unit)}</span>` : ""}</div>
      <div class="metric-pills">${pill(ev)}</div>
      <div class="formula">${esc(cell?.formula || cell?.notes || "")}</div>
    </button>`;
  }

  function renderScenarioOutputs() {
    if (!state.run) return;
    const o = state.run.outputs;
    const q = state.run.queues.state;
    $("#scOutputs").innerHTML = [
      outCard("Rubin units (sum)", o.rubinUnits, "GPUs"),
      outCard("MI455X units (sum)", o.mi455xUnits, "GPUs"),
      outCard("Rubin HBM4 stack equiv.", o.rubinHbmStacks, "stacks"),
      outCard("MI455X HBM4 stacks", o.mi455xHbmStacks, "stacks"),
      outCard("Combined HBM4 content", o.combinedHbmStacks, "stacks"),
      outCard("Rubin ref-factory power", o.rubinRefPowerGw, "GW"),
      outCard("Mixed + AMD power", o.mixedAmdPowerGw, "GW"),
      outCard("Cabinet TDP (label only)", o.cabinetTdpKw, "kW"),
    ].join("");
    $("#scOutputs").onclick = (e) => {
      const card = e.target.closest("[data-out]");
      if (!card) return;
      openOutputInspector(card.dataset.out);
    };

    $("#scQueues").innerHTML = [
      outCard("Unbuilt orders (Rubin)", { value: q.unbuiltOrders.rubin, evidenceType: "ILLUSTRATIVE", notes: "Demand not built due to HBM/packaging constraints when set." }),
      outCard("Unbuilt orders (MI455X)", { value: q.unbuiltOrders.mi455x, evidenceType: "ILLUSTRATIVE" }),
      outCard("HBM inventory", {
        value: q.hbmInventory,
        evidenceType: q.hbmInventory === null ? "OPEN" : "ILLUSTRATIVE",
        notes: q.hbmInventory === null ? "Unconstrained HBM path (qualified availability left blank)." : "Remaining qualified stacks after builds.",
      }),
      outCard("Shipped · waiting lag (R)", { value: q.shippedWaitingDeploymentLag.rubin, evidenceType: "ILLUSTRATIVE", notes: "Built but still in deployment-lag pipeline." }),
      outCard("Shipped · waiting lag (M)", { value: q.shippedWaitingDeploymentLag.mi455x, evidenceType: "ILLUSTRATIVE" }),
      outCard("Ready · waiting power (R)", { value: q.readyWaitingPower.rubin, evidenceType: "ILLUSTRATIVE", notes: "Past lag; power shortage delays commissioning without stopping builds." }),
      outCard("Ready · waiting power (M)", {
        value: q.readyWaitingPower.mi455x,
        evidenceType: o.amdFacilityMwPerGpu?.evidenceType === "OPEN" ? "OPEN" : "ILLUSTRATIVE",
        notes: "AMD commissioning needs amdFacilityMwPerGpu ASSUMPTION; else stays waiting.",
      }),
      outCard("Commissioned cum (Rubin)", { value: q.commissioned.rubin, evidenceType: "CONDITIONAL", notes: "Uses DSX/MaxLPS 40k/100MW CONDITIONAL coeff." }),
      outCard("Unused power pool", { value: q.unusedPowerMw, evidenceType: "ILLUSTRATIVE", notes: "MW" }),
    ].join("");
  }

  function renderScenarioLedger() {
    if (!state.run) return;
    const rows = state.run.queues.ledger || [];
    $("#scLedgerTable tbody").innerHTML = rows
      .map(
        (r) => `<tr>
        <td class="mono">${esc(r.quarter)}</td>
        <td class="mono">${fmt(r.builtRubin, 0)} / ${fmt(r.builtMi455x, 0)}</td>
        <td class="mono">${fmt(r.unbuiltRubin, 0)} / ${fmt(r.unbuiltMi455x, 0)}</td>
        <td class="mono">${r.hbmInventory === null ? "∞/OPEN" : fmt(r.hbmInventory, 0)}</td>
        <td class="mono">${fmt(r.shippedWaitingLagRubin, 0)} / ${fmt(r.shippedWaitingLagMi455x, 0)}</td>
        <td class="mono">${fmt(r.readyWaitingPowerRubin, 0)} / ${fmt(r.readyWaitingPowerMi455x, 0)}</td>
        <td class="mono">${fmt(r.commissionedRubin, 0)} / ${fmt(r.commissionedMi455x, 0)}</td>
        <td class="mono">+${fmt(r.powerAdditionsMw, 0)} · left ${fmt(r.unusedPowerMw, 1)}</td>
      </tr>`
      )
      .join("");
  }

  function openOutputInspector(label) {
    const o = state.run.outputs;
    const map = {
      "Rubin units (sum)": o.rubinUnits,
      "MI455X units (sum)": o.mi455xUnits,
      "Rubin HBM4 stack equiv.": o.rubinHbmStacks,
      "MI455X HBM4 stacks": o.mi455xHbmStacks,
      "Combined HBM4 content": o.combinedHbmStacks,
      "Rubin ref-factory power": o.rubinRefPowerGw,
      "Mixed + AMD power": o.mixedAmdPowerGw,
      "Cabinet TDP (label only)": o.cabinetTdpKw,
    };
    const cell = map[label] || {};
    const relatedCoeffs = (state.data.coefficients || []).filter((c) =>
      ["rubin", "mi455x", "dsx", "cabinet", "helios", "micron", "amd_facility"].some((k) =>
        c.id.includes(k)
      )
    );
    const rqs = [...new Set(relatedCoeffs.flatMap((c) => c.unresolvedRQs || []))];
    const sources = relatedCoeffs
      .flatMap((c) => c.sourceIds || [])
      .map(srcById)
      .filter(Boolean);
    openDrawer(
      `Engine output · ${cell.evidenceType || "OPEN"}`,
      label,
      `<dl class="kv">
        <dt>Value</dt><dd class="mono">${esc(fmt(cell.value))}</dd>
        <dt>Evidence</dt><dd>${pill(cell.evidenceType || "OPEN")}</dd>
        <dt>Formula</dt><dd class="mono">${esc(cell.formula || "—")}</dd>
        <dt>Notes</dt><dd>${esc(cell.notes || "—")}</dd>
      </dl>
      <div class="section-title">Assumptions</div>
      <ul class="warn-list">
        <li>Unit targets are ILLUSTRATIVE — not shipment forecasts (quarterly units remain OPEN in MODEL).</li>
        <li>Cabinet TDP 330 kW ≠ IT nameplate — not used for GW coefficient.</li>
        <li>DSX/MaxLPS 40k/100MW is CONDITIONAL reference-design only.</li>
      </ul>
      <div class="section-title">Source links</div>
      <ul class="sources">${
        sources
          .map((s) => {
            const link = s.url
              ? `<div><a href="${escAttr(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></div>`
              : `<div>${esc(s.title)}</div>`;
            return `<li>${link}<div class="path">${esc(s.path || "")}</div><div class="metric-pills" style="margin-top:4px">${pill(s.evidenceType)}</div></li>`;
          })
          .join("") || "<li class='muted'>See Coefficients tab</li>"
      }</ul>
      <div class="section-title">Unresolved RQs</div>
      <p>${rqs.length ? esc(rqs.join(", ")) : "None attached to these coeffs (unit shipments / HBM allocation / energization MW stay OPEN globally)."}</p>`
    );
  }

  function renderCompanies() {
    const anyDemo = (state.companies || []).some((c) => c.demoFilled);
    const banner = $("#demoBanner");
    if (banner) banner.hidden = !anyDemo;

    $("#companiesGrid").innerHTML = (state.companies || [])
      .map((c, i) => {
        const bridge = AtlasEngine.computeCompanyBridge(c);
        const d = bridge.derived;
        return `<article class="company-card ${c.demoFilled ? "demo" : ""}" data-ci="${i}">
          <h3>${esc(c.symbol)} · ${esc(c.name)} ${c.demoFilled ? pill("DEMO") : ""}</h3>
          <p class="muted small">${esc(bridge.honesty)}</p>
          <div class="bridge-grid">
            ${field(i, "physicalVolume", "Physical volume", c.physicalVolume)}
            ${field(i, "allocationPct", "Allocation %", c.allocationPct)}
            ${field(i, "price", "Price ($/unit)", c.price)}
            ${field(i, "revenue", "Revenue (override)", c.revenue)}
            ${field(i, "opMarginPct", "Op margin %", c.opMarginPct)}
            ${field(i, "opProfit", "Op profit (override)", c.opProfit)}
            ${field(i, "reinvestment", "Reinvestment", c.reinvestment)}
            ${field(i, "opFcf", "Op FCF (override)", c.opFcf)}
            ${field(i, "shares", "Shares", c.shares)}
            ${field(i, "pricePerShare", "Price / share", c.pricePerShare)}
            ${field(i, "marketCap", "Market cap (override)", c.marketCap)}
          </div>
          <div class="horizon-box">
            <div class="section-title" style="margin-top:0">Uncertainty horizon stub</div>
            <div class="bridge-grid">
              ${field(i, "horizonYears", "Horizon (years)", c.horizonYears)}
              ${field(i, "valueInHorizon", "Value in horizon (override)", c.valueInHorizon)}
              ${field(i, "terminalValue", "Terminal value (default 0)", c.terminalValue)}
              ${field(i, "residualNeededAfter", "Residual needed after (override)", c.residualNeededAfter)}
            </div>
            <div class="derived-line">
              derived rev ${esc(fmt(d.revenue))} · op ${esc(fmt(d.opProfit))} · FCF ${esc(fmt(d.opFcf))}<br/>
              in-horizon ${esc(fmt(d.valueInHorizon))} · TV ${esc(fmt(d.terminalValue))} · residual ${esc(fmt(d.residualNeededAfter))}
            </div>
          </div>
        </article>`;
      })
      .join("");

    $("#companiesGrid").onchange = (e) => {
      const inp = e.target.closest("input[data-ci]");
      if (!inp) return;
      const i = Number(inp.dataset.ci);
      const f = inp.dataset.f;
      state.companies[i][f] = inp.value;
      if (state.companies[i].demoFilled && f !== "notes") {
        /* keep demo flag so banner stays until clear */
      }
      logEdit("companyEdit", `${state.companies[i].symbol}.${f}`);
      renderCompanies();
    };
  }

  function field(i, f, label, val) {
    return `<label>${esc(label)}<input type="text" data-ci="${i}" data-f="${escAttr(f)}" value="${escAttr(val ?? "")}" /></label>`;
  }

  function renderCoeffs() {
    $("#coeffList").innerHTML = (state.data.coefficients || [])
      .map(
        (c) => `<button type="button" class="coeff-item" data-coeff="${escAttr(c.id)}">
          <div class="cid">${esc(c.id)}</div>
          <div class="clabel">${esc(c.label)}</div>
          <div class="cval">${c.value === null || c.value === undefined ? "OPEN" : esc(String(c.value))} <span class="muted">${esc(c.unit || "")}</span></div>
          <div class="metric-pills" style="margin-top:6px">${pill(c.evidenceType)}</div>
        </button>`
      )
      .join("");
    $("#coeffList").onclick = (e) => {
      const b = e.target.closest("[data-coeff]");
      if (b) openCoeff(b.dataset.coeff);
    };

    $("#sourceList").innerHTML = (state.data.sourceRegister || [])
      .map(
        (s) => `<button type="button" class="coeff-item" data-src="${escAttr(s.id)}">
          <div class="cid">${esc(s.id)}</div>
          <div class="clabel">${esc(s.title)}</div>
          <div class="cval muted" style="font-size:11px">${esc(s.path || "—")}</div>
          <div class="metric-pills" style="margin-top:6px">${pill(s.evidenceType)}</div>
        </button>`
      )
      .join("");
    $("#sourceList").onclick = (e) => {
      const b = e.target.closest("[data-src]");
      if (b) openSource(b.dataset.src);
    };
  }

  function openCoeff(id) {
    const c = coeffById(id);
    if (!c) return;
    const sources = (c.sourceIds || [])
      .map(srcById)
      .filter(Boolean)
      .map((s) => {
        const link = s.url
          ? `<div><a href="${escAttr(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></div>`
          : `<div>${esc(s.title)}</div>`;
        const also = (s.alsoUrls || [])
          .map((u) => `<div><a href="${escAttr(u)}" target="_blank" rel="noopener">${esc(u)}</a></div>`)
          .join("");
        return `<li>${link}${also}<div class="path">${esc(s.path || "")}</div><div style="margin-top:4px">${pill(s.evidenceType)}</div><div class="muted" style="margin-top:4px">${esc(s.excerpt || "")}</div></li>`;
      })
      .join("");
    openDrawer(
      `Coefficient · ${c.evidenceType}`,
      c.label,
      `<dl class="kv">
        <dt>ID</dt><dd class="mono">${esc(c.id)}</dd>
        <dt>Value</dt><dd class="mono">${c.value === null || c.value === undefined ? "OPEN" : esc(String(c.value))} ${esc(c.unit || "")}</dd>
        <dt>Evidence</dt><dd>${pill(c.evidenceType)}</dd>
        <dt>Formula</dt><dd class="mono">${esc(c.formula || "—")}</dd>
        <dt>Notes</dt><dd>${esc(c.notes || "—")}</dd>
        <dt>Unresolved RQs</dt><dd>${esc((c.unresolvedRQs || []).join(", ") || "—")}</dd>
      </dl>
      <div class="section-title">Sources</div>
      <ul class="sources">${sources || "<li class='muted'>None</li>"}</ul>`
    );
  }

  function openSource(id) {
    const s = srcById(id);
    if (!s) return;
    const also = (s.alsoUrls || [])
      .map((u) => `<li><a href="${escAttr(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>`)
      .join("");
    openDrawer(
      `Source · ${s.evidenceType}`,
      s.title,
      `<dl class="kv">
        <dt>ID</dt><dd class="mono">${esc(s.id)}</dd>
        <dt>Evidence</dt><dd>${pill(s.evidenceType)}</dd>
        <dt>As of</dt><dd>${esc(s.asOf || "—")}</dd>
        <dt>Path</dt><dd class="mono">${esc(s.path || "—")}</dd>
        <dt>URL</dt><dd>${s.url ? `<a href="${escAttr(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : "—"}</dd>
      </dl>
      <div class="section-title">Excerpt</div>
      <p>${esc(s.excerpt || "")}</p>
      ${also ? `<div class="section-title">Also</div><ul class="sources">${also}</ul>` : ""}`
    );
  }

  function renderTickers() {
    const tb = $("#tickerTable tbody");
    tb.innerHTML = filteredTickers()
      .map((t) => {
        const nodes = (t.nodeIds || [])
          .map((id) => {
            const n = state.data.nodes.find((x) => x.id === id);
            return `<button type="button" class="linkish" data-node="${escAttr(id)}">${esc(n ? n.title : id)}</button>`;
          })
          .join("<br/>");
        return `<tr class="${t.sleeveType === "soft" ? "soft-row" : ""}" data-ticker="${escAttr(t.symbol)}">
          <td class="mono"><strong>${esc(t.symbol)}</strong></td>
          <td>${esc(t.name || "—")}</td>
          <td><span class="badge ${escAttr(t.sleeveType)}">${esc(t.sleeveType.toUpperCase())}${t.fold ? " · " + esc(t.fold) : ""}</span></td>
          <td><span class="badge ${escAttr(t.qtyStatus)}">${esc((t.qtyStatus || "").toUpperCase())}</span></td>
          <td>${esc((t.themes || []).join(" · "))}${
            t.softThemes
              ? `<div class="muted" style="margin-top:4px">also soft: ${esc(t.softThemes.join("; "))}</div>`
              : ""
          }${t.note ? `<div class="muted" style="margin-top:4px">${esc(t.note)}</div>` : ""}</td>
          <td>${nodes || "—"}</td>
        </tr>`;
      })
      .join("");
    tb.onclick = (e) => {
      const n = e.target.closest("[data-node]");
      if (n) return openNode(n.dataset.node);
      const tr = e.target.closest("[data-ticker]");
      if (tr) openTicker(tr.dataset.ticker);
    };
  }

  function renderRqs() {
    const q = state.search.trim().toLowerCase();
    const rows = state.data.openQuestions.filter((r) => {
      if (!q) return true;
      return [r.id, r.title, r.blocks, r.path, r.priority].join(" ").toLowerCase().includes(q);
    });
    $("#rqTable tbody").innerHTML = rows
      .map((r) => {
        const p0 = String(r.priority || "").toLowerCase().includes("p0");
        return `<tr>
          <td class="mono">${esc(r.id)}</td>
          <td><span class="badge ${p0 ? "p0" : "open"}">${esc(r.priority || "open")}</span></td>
          <td>${esc(r.title)}</td>
          <td>${esc(r.blocks || "—")}</td>
          <td class="mono">${esc(r.path)}</td>
        </tr>`;
      })
      .join("");
  }

  function renderEdgesFull() {
    $("#edgesFull").innerHTML = filteredEdges()
      .map(
        (e) => `<article class="conn-card" data-edge="${escAttr(e.id)}">
          <div class="eid mono muted">${esc(e.id)}</div>
          <h3>${esc(e.title)}</h3>
          <div class="claim">${esc(e.claim)}</div>
          <div class="metric-pills" style="margin-top:8px">
            ${pill(e.qtyStatus === "partial" ? "secondary" : e.qtyStatus)}
            <span class="pill">conf ${esc(e.confidence)}</span>
          </div>
          <div class="muted mono" style="margin-top:8px;font-size:11px">${esc(e.sourcePath)}</div>
        </article>`
      )
      .join("");
    $("#edgesFull").onclick = (e) => {
      const card = e.target.closest("[data-edge]");
      if (card) openEdge(card.dataset.edge);
    };
  }

  function openDrawer(kicker, title, html) {
    $("#drawerKicker").textContent = kicker;
    $("#drawerTitle").textContent = title;
    $("#drawerBody").innerHTML = html;
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
    $("#backdrop").classList.add("open");
  }

  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
    $("#backdrop").classList.remove("open");
  }

  function openNode(id) {
    const n = state.data.nodes.find((x) => x.id === id);
    if (!n) return;
    const metrics = (n.metrics || [])
      .map(
        (m) => `<tr class="${m.status === "open" ? "open-row" : ""}">
          <td>${esc(m.label)}</td>
          <td>${esc(m.value)}${m.unit ? ` <span class="muted">${esc(m.unit)}</span>` : ""}</td>
          <td>${m.ci ? esc(m.ci) : "—"}</td>
          <td>${pill(m.status)}</td>
        </tr>`
      )
      .join("");
    const sources = (n.sources || [])
      .map((s) => {
        const link = s.url
          ? `<div><a href="${escAttr(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></div>`
          : `<div>${esc(s.title)}</div>`;
        return `<li>${link}<div class="path">${esc(s.path || "")}</div></li>`;
      })
      .join("");
    const related = (n.relatedConnectionIds || [])
      .map((cid) => {
        const e = state.data.edges.find((x) => x.id === cid);
        return `<li><button type="button" class="linkish" data-edge="${escAttr(cid)}">${esc(e ? e.title : cid)}</button></li>`;
      })
      .join("");
    const openGaps = (n.metrics || []).filter((m) => m.status === "open");
    const relatedCoeffs = (state.data.coefficients || []).filter((c) =>
      (n.tags || []).some((t) => c.id.toLowerCase().includes(String(t).toLowerCase()) || c.label.toLowerCase().includes(n.title.toLowerCase().slice(0, 8)))
      || (n.id.includes("hbm") && c.id.includes("hbm"))
      || (n.id.includes("nvl72") && c.id.includes("nvl72"))
      || (n.id.includes("rubin") && c.id.includes("rubin"))
      || (n.id.includes("amd") && c.id.includes("mi455x"))
    );
    const coeffHtml = relatedCoeffs
      .map(
        (c) =>
          `<li><button type="button" class="linkish" data-coeff="${escAttr(c.id)}">${esc(c.label)}</button> ${pill(c.evidenceType)} <span class="mono muted">${c.value ?? "OPEN"}</span></li>`
      )
      .join("");
    const rqHits = state.data.openQuestions
      .filter((r) => (n.tags || []).some((t) => String(r.id).includes(t) || String(r.title).toLowerCase().includes(n.title.toLowerCase().slice(0, 6))) || (relatedCoeffs.flatMap((c) => c.unresolvedRQs || []).includes(r.id)))
      .slice(0, 6);
    openDrawer(
      `Node · ${n.layer}`,
      n.title,
      `<dl class="kv">
        <dt>Layer</dt><dd>${esc(n.layer)} · ${esc(n.kind || "")}</dd>
        <dt>Confidence</dt><dd>${esc(n.confidence || "—")}</dd>
        <dt>As of</dt><dd>${esc(n.asOf || "—")}</dd>
        <dt>ID</dt><dd class="mono">${esc(n.id)}</dd>
      </dl>
      <p>${esc(n.summary || "")}</p>
      ${
        openGaps.length
          ? `<div class="section-title">OPEN gaps</div>
             <ul class="warn-list">${openGaps.map((g) => `<li>${esc(g.label)}: ${esc(g.value)}</li>`).join("")}</ul>`
          : ""
      }
      <div class="section-title">Metrics</div>
      <table class="metrics-table">
        <thead><tr><th>Label</th><th>Value</th><th>CI</th><th>Status</th></tr></thead>
        <tbody>${metrics || `<tr><td colspan="4" class="muted">None</td></tr>`}</tbody>
      </table>
      <div class="section-title">Atlas coefficients (related)</div>
      <ul class="sources">${coeffHtml || "<li class='muted'>None linked</li>"}</ul>
      <div class="section-title">Sources</div>
      <ul class="sources">${sources || "<li class='muted'>No sources listed</li>"}</ul>
      <div class="section-title">Related connections</div>
      <ul class="sources">${related || "<li class='muted'>None</li>"}</ul>
      <div class="section-title">Unresolved RQs</div>
      <ul class="sources">${
        rqHits.map((r) => `<li><span class="badge open">${esc(r.id)}</span> ${esc(r.title)}</li>`).join("") ||
        "<li class='muted'>See Open RQs tab</li>"
      }</ul>
      <div class="tag-row">${(n.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`
    );
    $("#drawerBody").onclick = (e) => {
      const b = e.target.closest("[data-edge]");
      if (b) return openEdge(b.dataset.edge);
      const c = e.target.closest("[data-coeff]");
      if (c) openCoeff(c.dataset.coeff);
    };
  }

  function openEdge(id) {
    const e = state.data.edges.find((x) => x.id === id);
    if (!e) return;
    const ends = [e.from, e.to, ...(e.alsoTo || [])];
    const endHtml = ends
      .map((nid) => {
        const n = state.data.nodes.find((x) => x.id === nid);
        return `<button type="button" class="linkish" data-node="${escAttr(nid)}">${esc(n ? `${n.layer} · ${n.title}` : nid)}</button>`;
      })
      .join("<br/>");
    openDrawer(
      "Connection memo",
      e.title,
      `<dl class="kv">
        <dt>Confidence</dt><dd>${esc(e.confidence)}</dd>
        <dt>Qty status</dt><dd>${pill(e.qtyStatus === "partial" ? "secondary" : e.qtyStatus)}</dd>
        <dt>Status</dt><dd>${esc(e.status)}</dd>
        <dt>Source</dt><dd class="mono">${esc(e.sourcePath)}</dd>
      </dl>
      <div class="section-title">Claim</div>
      <p>${esc(e.claim)}</p>
      <div class="section-title">Linked nodes</div>
      <p>${endHtml}</p>
      <p class="muted" style="margin-top:16px">Open the markdown memo in the repo for full falsifiers / OPEN list. Relative path above is the audit trail.</p>`
    );
    $("#drawerBody").onclick = (ev) => {
      const b = ev.target.closest("[data-node]");
      if (b) openNode(b.dataset.node);
    };
  }

  function openTicker(symbol) {
    const t = state.data.tickers.find((x) => x.symbol === symbol);
    if (!t) return;
    const nodes = (t.nodeIds || [])
      .map((id) => {
        const n = state.data.nodes.find((x) => x.id === id);
        return `<li><button type="button" class="linkish" data-node="${escAttr(id)}">${esc(n ? n.title : id)}</button></li>`;
      })
      .join("");
    openDrawer(
      "Ticker sleeve",
      t.symbol + (t.name ? ` · ${t.name}` : ""),
      `<dl class="kv">
        <dt>Sleeve</dt><dd><span class="badge ${escAttr(t.sleeveType)}">${esc(t.sleeveType.toUpperCase())}</span> ${t.fold ? "· " + esc(t.fold) : ""}</dd>
        <dt>Qty</dt><dd><span class="badge ${escAttr(t.qtyStatus)}">${esc((t.qtyStatus || "").toUpperCase())}</span></dd>
        <dt>Process</dt><dd class="mono">${esc((t.processIds || []).join(", ") || "—")}</dd>
      </dl>
      ${t.note ? `<p class="muted">${esc(t.note)}</p>` : ""}
      <div class="section-title">Themes</div>
      <p>${esc((t.themes || []).join(" · ") || "—")}</p>
      ${t.softThemes ? `<div class="section-title">Soft overlay themes</div><p class="muted">${esc(t.softThemes.join("; "))}</p>` : ""}
      <div class="section-title">Linked nodes</div>
      <ul class="sources">${nodes || "<li class='muted'>None</li>"}</ul>`
    );
    $("#drawerBody").onclick = (e) => {
      const b = e.target.closest("[data-node]");
      if (b) openNode(b.dataset.node);
    };
  }

  function downloadBlob(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    rerun();
    const payload = {
      exportedAt: new Date().toISOString(),
      honesty: "Scenario unit targets are ILLUSTRATIVE — not shipment forecasts. No invented MODEL mids.",
      scenario: state.scenario,
      calcs: state.run,
      coefficients: state.data.coefficients,
      sourceRegister: state.data.sourceRegister,
      companies: state.companies,
      editHistory: state.editHistory,
      meta: state.data.meta,
    };
    downloadBlob("atlas-scenario-export.json", JSON.stringify(payload, null, 2), "application/json");
    logEdit("export", "json");
  }

  function exportCsv() {
    rerun();
    const csv = AtlasEngine.toCsvLedger(state.run.queues.ledger);
    downloadBlob("atlas-quarterly-ledger.csv", csv, "text/csv");
    logEdit("export", "csv");
  }

  function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result);
        if (raw.scenario) {
          state.scenario = raw.scenario;
          syncScenarioForm();
        }
        if (raw.companies) state.companies = raw.companies;
        if (Array.isArray(raw.editHistory)) {
          state.editHistory = state.editHistory.concat(raw.editHistory);
        }
        logEdit("import", file.name);
        rerun();
        render();
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  load().catch((err) => {
    document.body.innerHTML = `<pre style="padding:24px;color:#e57373">Failed to load map: ${esc(err.message)}\n\nRun from map-app/: python3 -m http.server 8765</pre>`;
  });
})();
