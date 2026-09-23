# AI Ecosystem Demand Map · Atlas-parity

Auditable, human-first L0→L4 demand map for the AI-ecosystem factory, upgraded with **AI Atlas v0.1** scenario capabilities. Built for **clarity + auditability** — never invent OPEN quantities or MODEL mids.

## Run locally

```bash
cd /workspace/ai-ecosystem/map-app
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

Zero build step. Static HTML/CSS/JS + `data/map.json`.

## Atlas-parity features

| Feature | Honesty |
|---|---|
| **Scenario panel** | Editable quarterly Rubin / MI455X unit targets, optional qualified HBM stacks, packaging capacity, deployment lag, power additions (MW). Default 1e6 Rubin + 2.5e5 MI455X is **ILLUSTRATIVE — not a forecast**. |
| **Engine outputs** | Rubin HBM4 stack equiv. (DERIVED 288÷36); MI455X stacks (DOCUMENTED 12); combined HBM4; Rubin ref-factory GW from MaxLPS **40k GPUs / 100 MW** (**CONDITIONAL**); mixed AMD power **OPEN** until ASSUMPTION. |
| **Queues / state** | Unbuilt orders, HBM inventory, shipped-waiting-deployment-lag, ready-waiting-power. Power shortage delays commissioning **without** stopping chip-production math. |
| **Inspector** | Formula, assumptions, source links, evidence type (DOCUMENTED / DERIVED / CONDITIONAL / ASSUMPTION / ILLUSTRATIVE / OPEN), unresolved RQs. |
| **Companies** | NVDA / AMD / MU / 000660.KS / Samsung bridges: volume → allocation/price → revenue → op profit → reinvestment → FCF → valuation. Prices/shares **empty by default**. “Arbitrary demo numbers” button → **DEMO ONLY**. |
| **Uncertainty-horizon stub** | Share of value inside horizon vs residual needed after; terminal value default **0**. |
| **Export / import** | JSON (scenario + calcs + coefficients + source register + edit history); quarterly CSV ledger; scenario JSON import. |
| **Presets** | Default illustrative · **Supply + power stress**. |

Existing map features kept: L0–L4 swimlanes, filters, soft HOLD demotion, audit mode, ticker / RQ / connections views.

## Evidence types (Atlas)

| Type | Meaning |
|---|---|
| DOCUMENTED | Primary-spec coefficient (product page / IR / DSX guide) |
| DERIVED | Arithmetic from documented specs (e.g. 288÷36 ≈ 8) — not a forecast |
| CONDITIONAL | Reference-design coeff (MaxLPS 40k/100 MW) — not universal law |
| ASSUMPTION | User-entered scenario assumption |
| ILLUSTRATIVE | Scenario what-if input — not a shipment forecast |
| OPEN | Explicitly unknown — never invent a mid |
| SECONDARY / SOFT HOLD | Sell-side color / impure PROCESS sleeves |

### Coefficients wired from `sources/2026-09-24-atlas-coefficient-dossier.md`

- Rubin **288 GB** HBM4 — DOCUMENTED
- Micron **36 GB** 12H — DOCUMENTED → **~8 stacks/Rubin** DERIVED
- NVL72 **72 + 36** — DOCUMENTED
- MaxLPS **40k GPUs / 100 MW** — CONDITIONAL
- MI455X **432 GB / 12 stacks**; Helios **72** — DOCUMENTED
- Cabinet TDP **330 kW** — DOCUMENTED (≠ IT nameplate)

**Still OPEN:** quarterly unit shipments, industry HBM4 WPM/allocation, global energization MW, AMD facility MW/GPU (mixed power).

## What’s derived vs curated

| Artifact | Nature |
|---|---|
| `data/map.json` | Curated derived graph + `coefficients` + `sourceRegister` from factory markdown / Atlas dossier. Not a free-form invention surface. |
| `scripts/build_map_data.py` | Regenerator. Prefer curated dicts — never invent MODEL mids. |
| `js/atlas-engine.js` | Pure scenario math (ILLUSTRATIVE / labeled coeffs only). |
| UI (`index.html`, `css/`, `js/app.js`) | Hand-written SPA. |

### Honesty rules

- **OPEN stays OPEN** — no invented ASP, units, attach rates, kg, WPM, CDUs/MW, Mid $.
- Scenario unit targets are **ILLUSTRATIVE**, never forecasts.
- Soft PROCESS sleeves = **HOLD / impure / not MODEL $**.
- Cabinet TDP 330 kW ≠ IT nameplate — refuse TDP→facility IT MW invention.
- Do **not** edit `/workspace/ai-ecosystem/model/MODEL-v0.md` mids from this app.

## Regenerate data

```bash
cd /workspace/ai-ecosystem/map-app
python3 scripts/build_map_data.py
```

## Source of truth

- `METHOD.md`, `model/MODEL-v0.md`, `connections/*`, `tasks/CLAIM-LEDGER.md`
- `sources/2026-09-24-atlas-coefficient-dossier.md` (+ OPEN memos)
- `map-app/RESEARCH-NOTES.md` (Atlas URL table)
