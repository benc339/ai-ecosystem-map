# RESEARCH-NOTES — primary URL enrichment

**As of:** 2026-09-23 Europe/Amsterdam  
**Scope:** Explanatory copy + stable primary URLs for **already-known** claims only. **No new quantitative midpoints.**

## URLs added / confirmed on `data/map.json` sources

| Claim (already in MODEL/CONN) | Primary URL | Notes |
|---|---|---|
| Vera Rubin NVL72 **Cabinet TDP 330 kW** (labeled Cabinet TDP only) | https://docs.nvidia.com/dsx/facilities-infra/reference-design-overview | NVIDIA DSX Facilities Infrastructure Reference Design Overview — Cabinet TDP scales to Vera Rubin NVL72 at 330 kW. **≠ IT nameplate / Max-Q/P.** |
| Meta × Broadcom MTIA multi-GW partnership (initial **>1 GW**) | https://www.broadcom.com/company/news/product-releases/64236 | Product releases page (PR 2026-04-14). |
| Same MTIA PR (IR mirror) | https://investors.broadcom.com/news-releases/news-release-details/broadcom-announces-extended-partnership-meta-deploy-technology | Investor-relations mirror of the same announcement. |
| CDU / cold-plate lead-time bands (Cooling Report) | https://thecoolingreport.com/intel/data-center-cooling-supply-chain-guide-2026.html | Already cited in MODEL L2 — attach rates still OPEN. |
| US DC electrical LT 18–36 mo (WoodMac) | https://www.woodmac.com/press-releases/data-center-demand-drives-us-electrical-equipment-market-to-$65b-reshaping-industry-dynamics/ | Already cited in MODEL L2 — $/MW OPEN. |
| Rubin Q3 start / Q4 ramp (secondary) | https://wccftech.com/nvidia-confirms-vera-rubin-launch-in-q3-volume-ramp-q4-blackwell-continues-to-see-massive-demand/ | Remains **secondary** cadence color — demote when primary transcript lands. |

## Explicitly not added as MODEL mids

- HSBC+JPM ~$13k TPU ASP dual — stays SECONDARY ONLY on nodes/claims.
- SemiAnalysis Max-Q/P ~180–230 kW — not merged into Cabinet TDP cell.
- Any CDUs/MW, wafers/GPU, ABF kg, chip CI from GW.

## Limits

Web research used only to attach stable URLs and clarify labels for claims already present in MODEL/CONN/ledger. No new numeric cells.


## Atlas coefficient primary URLs — 2026-09-24

Appended by Atlas primary-source research stream. **Stable T0 URLs only.** **No new quantitative MODEL mids.**

| Claim (Atlas coefficient / known) | Evidence | Primary URL |
|---|---|---|
| Rubin GPU **288 GB HBM4** | DOCUMENTED | https://www.nvidia.com/en-us/data-center/vera-rubin-nvl72/ |
| Micron HBM4 **36GB 12H** volume shipment / designed for Vera Rubin | DOCUMENTED (vendor PR) | https://www.globenewswire.com/news-release/2026/03/16/3256773/0/en/micron-in-high-volume-production-of-hbm4-designed-for-nvidia-vera-rubin-pcie-gen6-ssd-and-socamm2.html |
| ≈**8 stacks/Rubin** (288/36) | **DERIVED** (not NVDA-named) | (from above two) |
| NVL72 = **72 Rubin + 36 Vera** | DOCUMENTED | https://www.nvidia.com/en-us/data-center/vera-rubin-nvl72/ |
| **40K** Rubin GPUs / **100 MW** with MaxLPS | **CONDITIONAL** DSX/MaxLPS reference | https://www.nvidia.com/en-us/data-center/vera-rubin-nvl72/ · https://docs.nvidia.com/dsx/maxlps/overview · https://developer.nvidia.com/blog/maximizing-ai-factory-performance-per-watt-with-nvidia-dsx-maxlps/ |
| AMD MI455X **432 GB HBM4**, **12 stacks**; Helios **72** GPUs; volume **2H 2026** | DOCUMENTED | https://www.amd.com/en/products/accelerators/instinct/mi400/mi455x.html · https://www.amd.com/en/products/rackscale-solutions/helios.html |
| Cabinet TDP **330 kW** NVL72 | DOCUMENTED (reconfirm) | https://docs.nvidia.com/dsx/facilities-infra/reference-design-overview |

**Dossier:** `sources/2026-09-24-atlas-coefficient-dossier.md`  
**OPEN memos:** `sources/2026-09-24-atlas-open-accelerator-shipments.md`, `...-hbm4-capacity.md`, `...-deployable-power.md`  
**Contracts:** `tasks/atlas-research-contracts-2026-09-24.md` (proposal only — do not rewrite MODEL).
