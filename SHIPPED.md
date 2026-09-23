# SHIPPED — AI Ecosystem Demand Map · Atlas-parity

**As of:** 2026-09-24 Europe/Amsterdam  
**Owner deliverable:** `/workspace/ai-ecosystem/map-app/`  
**Do not push to GitHub from this agent — parent hosts / Pages.**

## What was built

1. **Derived graph** `data/map.json` — layers, nodes, edges, hard+soft tickers, open RQs, legend, warnings, **`coefficients`**, **`sourceRegister`**.
2. **Zero-build SPA** — `index.html` + `css/styles.css` + `js/app.js` + `js/atlas-engine.js`.
3. **Atlas-parity UX:** Scenario panel, live engine outputs, queues/state, quarterly ledger, Companies bridges + uncertainty-horizon stub, Coefficients/Sources inspector, Export JSON/CSV + Import JSON, “Supply + power stress” preset.
4. **Kept:** L0→L4 swimlanes, filters (layer / OPEN / hard / soft / search), drawer, ticker/RQ/connections, audit mode, soft HOLD demotion.
5. **`scripts/build_map_data.py`** — regenerates coefficients + source register from curated dossier (no invented mids).
6. **Docs:** `README.md`, `RESEARCH-NOTES.md` (Atlas URL table), this `SHIPPED.md`.

## Feature checklist

| # | Feature | Status |
|---|---|---|
| 1 | Scenario panel (editable quarterly targets, HBM, packaging, lag, power) | **DONE** — default 1e6+2.5e5 marked ILLUSTRATIVE |
| 2 | Engine outputs (stacks, combined, ref power GW, mixed AMD) | **DONE** — evidence-labeled |
| 3 | Queues/state (unbuilt, HBM inv, ship-wait lag, ready-wait power) | **DONE** |
| 4 | Inspector (formula, assumptions, sources, evidence, RQs) | **DONE** — nodes + coeffs + engine outs |
| 5 | Companies bridges + demo button | **DONE** — empty default; DEMO ONLY banner |
| 6 | Uncertainty-horizon stub (TV default 0) | **DONE** |
| 7 | Export JSON + CSV ledger + import JSON | **DONE** |
| 8 | “Supply + power stress” preset | **DONE** |
| 9 | README + SHIPPED honesty labels | **DONE** |
| — | Soft HOLD demotion / Ranker untouched / no MODEL mid edits | **CONFIRMED** |

## Coefficients left OPEN (and why)

| Coefficient | Why OPEN |
|---|---|
| `amd_facility_mw_per_gpu` | No AMD MaxLPS-equivalent primary — mixed Rubin+AMD power stays OPEN until ASSUMPTION. |
| Quarterly Rubin / MI455X **unit shipments** | No primary unit guidance (dossier OPEN memo) — scenario targets ILLUSTRATIVE only. |
| Industry **HBM4 WPM / allocation** | No primary numeric capacity/allocation for model inputs. |
| Global **energization MW** mid | Refuse inventing from Cabinet TDP; MaxLPS coeff is CONDITIONAL reference only. |

## Documented / derived / conditional (wired)

| Coeff | Type | Value |
|---|---|---|
| Rubin HBM4 GB/GPU | DOCUMENTED | 288 |
| Micron HBM4 GB/stack | DOCUMENTED | 36 |
| Rubin stacks/GPU | DERIVED | 8 (=288÷36) |
| MI455X GB/GPU | DOCUMENTED | 432 |
| MI455X stacks/GPU | DOCUMENTED | 12 |
| Helios GPUs/rack | DOCUMENTED | 72 |
| NVL72 GPUs / Vera CPUs | DOCUMENTED | 72 / 36 |
| Cabinet TDP | DOCUMENTED | 330 kW (≠ IT nameplate) |
| DSX/MaxLPS GPUs per 100 MW | CONDITIONAL | 40,000 |

## Default illustrative parity (engine-checked)

| Output | Result | Label |
|---|---:|---|
| Rubin HBM4 stack equiv. | 8,000,000 | DERIVED × ILLUSTRATIVE units |
| MI455X HBM4 stacks | 3,000,000 | DOCUMENTED × ILLUSTRATIVE units |
| Combined HBM4 | 11,000,000 | DERIVED |
| Rubin ref-factory power | 2.5 GW | CONDITIONAL (40k/100 MW) |
| Mixed + AMD power | OPEN | until AMD facility ASSUMPTION |

## Paths

```
map-app/
  index.html
  css/styles.css
  js/app.js
  js/atlas-engine.js
  data/map.json
  scripts/build_map_data.py
  README.md
  SHIPPED.md
  RESEARCH-NOTES.md
```

## How to open locally

```bash
cd /workspace/ai-ecosystem/map-app && python3 -m http.server 8765
# → http://127.0.0.1:8765/
```

## Confirmations

- **Zero invented MODEL mids** — `model/MODEL-v0.md` not edited; Ranker/STRICT untouched.
- Soft HOLD tickers remain demoted.
- No GitHub push from this deliverable.
