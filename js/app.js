/* AI Ecosystem Demand Map — zero-build SPA */
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

  const pill = (status) => {
    const s = status || "open";
    return `<span class="pill ${escAttr(s)}">${esc(String(s).toUpperCase())}</span>`;
  };

  const nodeHasOpen = (n) => (n.metrics || []).some((m) => m.status === "open");

  const matchQ = (text) => {
    const q = state.search.trim().toLowerCase();
    if (!q) return true;
    return String(text || "")
      .toLowerCase()
      .includes(q);
  };

  async function load() {
    const res = await fetch("data/map.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load data/map.json (${res.status})`);
    state.data = await res.json();
    boot();
  }

  function boot() {
    const { meta, layers, legend } = state.data;
    $("#topMeta").innerHTML = [
      `asOf <strong>${esc(meta.asOf)}</strong>`,
      `generated <strong>${esc(meta.generatedAt)}</strong>`,
      `${meta.counts.nodes} nodes · ${meta.counts.edges} edges · ${meta.counts.tickersHard} hard / ${meta.counts.tickersSoft} soft`,
    ].join(" · ");
    $("#footerCounts").textContent = `Warnings: ${meta.warnings.length} · Open RQs: ${meta.counts.openQuestions}`;

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
      <div class="section-title">Sources</div>
      <ul class="sources">${sources || "<li class='muted'>No sources listed</li>"}</ul>
      <div class="section-title">Related connections</div>
      <ul class="sources">${related || "<li class='muted'>None</li>"}</ul>
      <div class="tag-row">${(n.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`
    );
    $("#drawerBody").onclick = (e) => {
      const b = e.target.closest("[data-edge]");
      if (b) openEdge(b.dataset.edge);
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

  load().catch((err) => {
    document.body.innerHTML = `<pre style="padding:24px;color:#e57373">Failed to load map: ${esc(err.message)}\n\nRun from map-app/: python3 -m http.server 8765</pre>`;
  });
})();
