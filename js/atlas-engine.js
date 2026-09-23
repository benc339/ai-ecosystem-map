/* AI Atlas scenario engine — illustrative / assumption math only.
   Never invents MODEL mids. OPEN stays OPEN unless user enters ASSUMPTION. */
(() => {
  const EVIDENCE = {
    DOCUMENTED: "DOCUMENTED",
    DERIVED: "DERIVED",
    CONDITIONAL: "CONDITIONAL",
    ASSUMPTION: "ASSUMPTION",
    ILLUSTRATIVE: "ILLUSTRATIVE",
    OPEN: "OPEN",
    DEMO: "DEMO",
  };

  function num(v, fallback = null) {
    if (v === "" || v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function coeffMap(coefficients) {
    const m = {};
    (coefficients || []).forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }

  function defaultScenario() {
    // 1e6 Rubin + 2.5e5 MI455X across 4 quarters — ILLUSTRATIVE only
    const quarters = ["2027Q1", "2027Q2", "2027Q3", "2027Q4"].map((id) => ({
      id,
      rubinUnits: 250000,
      mi455xUnits: 62500,
      qualifiedHbmStacks: null, // null = unconstrained (OPEN availability)
      packagingCapacity: null, // null = unconstrained
      powerAdditionsMw: 800,
    }));
    return {
      name: "Default illustrative",
      honestyLabel: "ILLUSTRATIVE",
      honestyBanner:
        "ILLUSTRATIVE scenario — not a shipment forecast. Unit targets are what-if inputs only.",
      deploymentLagQuarters: 1,
      assumptions: {
        mi455xStacksPerGpu: null, // OPEN unless user sets
        amdFacilityMwPerGpu: null, // OPEN unless user sets
      },
      quarters,
    };
  }

  function supplyPowerStressPreset() {
    const quarters = ["2027Q1", "2027Q2", "2027Q3", "2027Q4"].map((id, i) => ({
      id,
      rubinUnits: 250000,
      mi455xUnits: 62500,
      // Tight HBM + packaging early; power stays scarce → commissioning backlog
      qualifiedHbmStacks: i === 0 ? 1.5e6 : i === 1 ? 2.0e6 : 3.5e6,
      packagingCapacity: i < 2 ? 180000 : 280000,
      powerAdditionsMw: i === 0 ? 50 : i === 1 ? 80 : 120,
    }));
    return {
      name: "Supply + power stress",
      honestyLabel: "ILLUSTRATIVE",
      honestyBanner:
        "DEMO PRESET — ILLUSTRATIVE supply + power stress. Shows HBM/packaging limiting builds while power shortage delays commissioning without stopping chip-production math. Not a forecast.",
      deploymentLagQuarters: 2,
      assumptions: {
        mi455xStacksPerGpu: null, // use DOCUMENTED 12 from coefficient register
        amdFacilityMwPerGpu: null, // mixed AMD power stays OPEN
      },
      assumptionNotes: {},
      quarters,
    };
  }

  function resolveMi455xStacks(scenario, coeffs) {
    const user = num(scenario.assumptions?.mi455xStacksPerGpu, null);
    if (user !== null) {
      return {
        value: user,
        evidenceType: EVIDENCE.ASSUMPTION,
        formula: `user ASSUMPTION mi455xStacksPerGpu = ${user}`,
        notes: scenario.assumptionNotes?.mi455xStacksPerGpu || "User-entered ASSUMPTION — not primary.",
      };
    }
    const c = coeffs.mi455x_stacks_per_gpu;
    if (c && c.value != null && c.evidenceType !== "OPEN") {
      return {
        value: c.value,
        evidenceType: c.evidenceType,
        formula: c.formula || String(c.value),
        notes: c.notes,
      };
    }
    return {
      value: null,
      evidenceType: EVIDENCE.OPEN,
      formula: null,
      notes: "MI455X stacks/GPU missing from coefficient register — expected DOCUMENTED 12 from AMD product page.",
    };
  }

  function resolveAmdPower(scenario, coeffs) {
    const user = num(scenario.assumptions?.amdFacilityMwPerGpu, null);
    if (user !== null) {
      return {
        value: user,
        evidenceType: EVIDENCE.ASSUMPTION,
        formula: `user ASSUMPTION amdFacilityMwPerGpu = ${user} MW/GPU`,
        notes: "User-entered ASSUMPTION — not primary.",
      };
    }
    return {
      value: null,
      evidenceType: EVIDENCE.OPEN,
      formula: null,
      notes: "Mixed AMD power OPEN until AMD facility coefficient entered as ASSUMPTION.",
    };
  }

  function aggregateOutputs(scenario, coefficients) {
    const coeffs = coeffMap(coefficients);
    const rubinStacks = coeffs.rubin_stacks_per_gpu?.value ?? null;
    const rubinStacksEv = coeffs.rubin_stacks_per_gpu?.evidenceType || EVIDENCE.OPEN;
    const rubinGb = coeffs.rubin_hbm4_gb_per_gpu?.value;
    const micronGb = coeffs.micron_hbm4_gb_per_stack?.value;
    const dsx = coeffs.dsx_ref_gpus_per_100mw?.value; // 40000 per 100 MW

    const rubinUnits = (scenario.quarters || []).reduce((s, q) => s + (num(q.rubinUnits, 0) || 0), 0);
    const mi455xUnits = (scenario.quarters || []).reduce((s, q) => s + (num(q.mi455xUnits, 0) || 0), 0);

    const mi455xStacks = resolveMi455xStacks(scenario, coeffs);
    const amdPower = resolveAmdPower(scenario, coeffs);

    let rubinHbm = {
      value: null,
      evidenceType: EVIDENCE.OPEN,
      formula: null,
      notes: "Requires DERIVED rubin_stacks_per_gpu.",
    };
    if (rubinStacks != null && rubinGb != null && micronGb != null) {
      rubinHbm = {
        value: rubinUnits * rubinStacks,
        evidenceType: EVIDENCE.DERIVED,
        formula: `${rubinUnits.toLocaleString()} Rubin (ILLUSTRATIVE) × ${rubinStacks} stacks/GPU (DERIVED ${rubinGb}÷${micronGb})`,
        notes: "Stack equivalents from documented GB specs — unit count is ILLUSTRATIVE.",
      };
    }

    let mi455xHbm = {
      value: null,
      evidenceType: mi455xStacks.evidenceType,
      formula: mi455xStacks.formula,
      notes: mi455xStacks.notes,
    };
    if (mi455xStacks.value != null) {
      mi455xHbm = {
        value: mi455xUnits * mi455xStacks.value,
        evidenceType: mi455xStacks.evidenceType,
        formula: `${mi455xUnits.toLocaleString()} MI455X (ILLUSTRATIVE) × ${mi455xStacks.value} stacks/GPU (${mi455xStacks.evidenceType})`,
        notes: mi455xStacks.notes,
      };
    }

    let combined = {
      value: null,
      evidenceType: EVIDENCE.OPEN,
      formula: null,
      notes: "Combined HBM4 content OPEN while any family stacks are OPEN.",
    };
    if (rubinHbm.value != null && mi455xHbm.value != null) {
      combined = {
        value: rubinHbm.value + mi455xHbm.value,
        evidenceType: EVIDENCE.DERIVED,
        formula: `${rubinHbm.value.toLocaleString()} + ${mi455xHbm.value.toLocaleString()}`,
        notes: "Sum of family stack content — inputs ILLUSTRATIVE; coeffs labeled separately.",
      };
    } else if (rubinHbm.value != null && mi455xHbm.value == null) {
      combined = {
        value: null,
        evidenceType: EVIDENCE.OPEN,
        formula: `Rubin ${rubinHbm.value.toLocaleString()} + MI455X OPEN`,
        notes: "Partial: Rubin DERIVED known; MI455X stacks OPEN.",
        partialRubin: rubinHbm.value,
      };
    }

    let rubinPowerGw = {
      value: null,
      evidenceType: EVIDENCE.OPEN,
      formula: null,
      notes: "Needs CONDITIONAL DSX/MaxLPS 40k GPUs / 100 MW coefficient.",
    };
    if (dsx != null && dsx > 0) {
      const gw = (rubinUnits / dsx) * 0.1;
      rubinPowerGw = {
        value: gw,
        evidenceType: EVIDENCE.CONDITIONAL,
        formula: `${rubinUnits.toLocaleString()} ÷ ${dsx.toLocaleString()} × 0.1 GW  (= GPUs / (40k per 100 MW))`,
        notes:
          "CONDITIONAL on NVIDIA DSX/MaxLPS reference-design — NOT Cabinet TDP 330 kW math; NOT universal GPU power law.",
      };
    }

    let mixedPower = {
      value: null,
      evidenceType: EVIDENCE.OPEN,
      formula: null,
      notes: amdPower.notes,
    };
    if (amdPower.value != null && rubinPowerGw.value != null) {
      const amdGw = (mi455xUnits * amdPower.value) / 1000;
      mixedPower = {
        value: rubinPowerGw.value + amdGw,
        evidenceType: EVIDENCE.ASSUMPTION,
        formula: `Rubin CONDITIONAL ${rubinPowerGw.value} GW + MI455X (${mi455xUnits} × ${amdPower.value} MW/GPU) / 1000`,
        notes: "Includes AMD ASSUMPTION facility coefficient.",
      };
    }

    return {
      rubinUnits: { value: rubinUnits, evidenceType: EVIDENCE.ILLUSTRATIVE },
      mi455xUnits: { value: mi455xUnits, evidenceType: EVIDENCE.ILLUSTRATIVE },
      rubinHbmStacks: rubinHbm,
      mi455xHbmStacks: mi455xHbm,
      combinedHbmStacks: combined,
      rubinRefPowerGw: rubinPowerGw,
      mixedAmdPowerGw: mixedPower,
      mi455xStacksPerGpu: mi455xStacks,
      amdFacilityMwPerGpu: amdPower,
      dsxRefGpusPer100Mw: {
        value: dsx ?? null,
        evidenceType: coeffs.dsx_ref_gpus_per_100mw?.evidenceType || EVIDENCE.OPEN,
        notes: coeffs.dsx_ref_gpus_per_100mw?.notes,
      },
      cabinetTdpKw: {
        value: coeffs.nvl72_cabinet_tdp_kw?.value ?? null,
        evidenceType: coeffs.nvl72_cabinet_tdp_kw?.evidenceType || EVIDENCE.OPEN,
        notes: "Cabinet TDP only — kept ≠ IT nameplate; not used for GW coefficient.",
      },
    };
  }

  /**
   * Quarterly queue simulation.
   * Power shortage delays commissioning; does not stop chip-production math.
   */
  function simulateQueues(scenario, coefficients) {
    const coeffs = coeffMap(coefficients);
    const rubinStacks = coeffs.rubin_stacks_per_gpu?.value ?? 8;
    const mi455xSt = resolveMi455xStacks(scenario, coeffs);
    const dsx = coeffs.dsx_ref_gpus_per_100mw?.value ?? 40000;
    const lag = Math.max(0, Math.floor(num(scenario.deploymentLagQuarters, 0) || 0));
    const amdMw = resolveAmdPower(scenario, coeffs);

    let unbuiltRubin = 0;
    let unbuiltMi = 0;
    let hbmInventory = 0;
    let unusedPowerMw = 0;
    // pipeline[age] = { rubin, mi455x } waiting through deployment lag
    const pipeline = Array.from({ length: Math.max(lag, 1) }, () => ({ rubin: 0, mi: 0 }));
    let readyRubin = 0;
    let readyMi = 0;
    let commissionedRubin = 0;
    let commissionedMi = 0;

    const ledger = [];

    (scenario.quarters || []).forEach((q) => {
      const demandR = unbuiltRubin + (num(q.rubinUnits, 0) || 0);
      const demandM = unbuiltMi + (num(q.mi455xUnits, 0) || 0);

      const hbmIn = num(q.qualifiedHbmStacks, null);
      const hbmAvail = hbmIn === null ? Infinity : hbmInventory + hbmIn;
      const pack = num(q.packagingCapacity, null);
      const packAvail = pack === null ? Infinity : pack;

      // Allocate packaging across families proportional to demand (honest simple split)
      const demandTot = demandR + demandM;
      let packR = packAvail;
      let packM = packAvail;
      if (Number.isFinite(packAvail) && demandTot > 0) {
        packR = packAvail * (demandR / demandTot);
        packM = packAvail * (demandM / demandTot);
      }

      // HBM: Rubin always consumes derived stacks; MI455X only if stacks resolved
      let buildR = Math.min(demandR, packR);
      let buildM = Math.min(demandM, packM);

      if (Number.isFinite(hbmAvail)) {
        // Reserve HBM for Rubin first (documented path), then MI455X if known
        const maxRByHbm = Math.floor(hbmAvail / rubinStacks);
        buildR = Math.min(buildR, maxRByHbm);
        const hbmLeft = hbmAvail - buildR * rubinStacks;
        if (mi455xSt.value != null) {
          const maxMByHbm = Math.floor(hbmLeft / mi455xSt.value);
          buildM = Math.min(buildM, maxMByHbm);
        }
        // If MI455X stacks OPEN, do not invent HBM consumption — builds proceed without HBM deduct
        const consumed =
          buildR * rubinStacks + (mi455xSt.value != null ? buildM * mi455xSt.value : 0);
        hbmInventory = hbmAvail - consumed;
      } else {
        hbmInventory = 0; // unconstrained period — no inventory carry from Infinity
      }

      buildR = Math.max(0, Math.floor(buildR));
      buildM = Math.max(0, Math.floor(buildM));
      unbuiltRubin = Math.max(0, demandR - buildR);
      unbuiltMi = Math.max(0, demandM - buildM);

      // Deployment lag pipeline: age forward, then enqueue this quarter's builds
      let exiting = { rubin: 0, mi: 0 };
      if (lag === 0) {
        exiting = { rubin: buildR, mi: buildM };
      } else {
        exiting = pipeline.shift();
        pipeline.push({ rubin: buildR, mi: buildM });
        while (pipeline.length < lag) pipeline.push({ rubin: 0, mi: 0 });
      }
      readyRubin += exiting.rubin;
      readyMi += exiting.mi;

      const powerIn = num(q.powerAdditionsMw, 0) || 0;
      let powerPool = unusedPowerMw + powerIn;

      // Commission Rubin with CONDITIONAL DSX coeff; AMD only if ASSUMPTION set
      // MW needed for N Rubin GPUs = N / dsx * 100
      const mwPerRubin = 100 / dsx;
      let comR = 0;
      let comM = 0;

      if (readyRubin > 0 && mwPerRubin > 0) {
        const maxByPower = Math.floor(powerPool / mwPerRubin);
        comR = Math.min(readyRubin, Math.max(0, maxByPower));
        powerPool -= comR * mwPerRubin;
        readyRubin -= comR;
        commissionedRubin += comR;
      }

      if (amdMw.value != null && readyMi > 0) {
        const maxByPower = Math.floor(powerPool / amdMw.value);
        comM = Math.min(readyMi, Math.max(0, maxByPower));
        powerPool -= comM * amdMw.value;
        readyMi -= comM;
        commissionedMi += comM;
      }
      // If AMD power OPEN: MI455X stays in readyWaitingPower (cannot invent commission)

      unusedPowerMw = Math.max(0, powerPool);

      const shippedWaiting = pipeline.reduce(
        (a, p) => ({ rubin: a.rubin + p.rubin, mi: a.mi + p.mi }),
        { rubin: 0, mi: 0 }
      );

      ledger.push({
        quarter: q.id,
        demandRubin: demandR,
        demandMi455x: demandM,
        builtRubin: buildR,
        builtMi455x: buildM,
        unbuiltRubin,
        unbuiltMi455x: unbuiltMi,
        hbmInventory: Number.isFinite(hbmAvail) ? hbmInventory : null,
        hbmConstraintActive: Number.isFinite(hbmAvail),
        packagingConstraintActive: Number.isFinite(packAvail),
        shippedWaitingLagRubin: shippedWaiting.rubin,
        shippedWaitingLagMi455x: shippedWaiting.mi,
        readyWaitingPowerRubin: readyRubin,
        readyWaitingPowerMi455x: readyMi,
        commissionedRubin: comR,
        commissionedMi455x: comM,
        commissionedRubinCum: commissionedRubin,
        commissionedMi455xCum: commissionedMi,
        powerAdditionsMw: powerIn,
        unusedPowerMw,
        mi455xHbmEvidence: mi455xSt.evidenceType,
        amdPowerEvidence: amdMw.evidenceType,
      });
    });

    const last = ledger[ledger.length - 1] || {};
    return {
      ledger,
      state: {
        unbuiltOrders: {
          rubin: last.unbuiltRubin || 0,
          mi455x: last.unbuiltMi455x || 0,
        },
        hbmInventory: last.hbmInventory,
        shippedWaitingDeploymentLag: {
          rubin: last.shippedWaitingLagRubin || 0,
          mi455x: last.shippedWaitingLagMi455x || 0,
        },
        readyWaitingPower: {
          rubin: last.readyWaitingPowerRubin || 0,
          mi455x: last.readyWaitingPowerMi455x || 0,
        },
        commissioned: {
          rubin: last.commissionedRubinCum || 0,
          mi455x: last.commissionedMi455xCum || 0,
        },
        unusedPowerMw: last.unusedPowerMw || 0,
      },
      notes: [
        "Chip production (build) is limited by packaging + qualified HBM when those inputs are set; null = unconstrained ILLUSTRATIVE.",
        "Deployment lag moves built units into ready-waiting-power without blocking further builds.",
        "Power shortage delays commissioning only — it does not stop chip-production math.",
        "MI455X HBM consumption applies only when stacks/GPU is DOCUMENTED or ASSUMPTION; else OPEN.",
        "AMD commissioning requires amdFacilityMwPerGpu ASSUMPTION; else MI455X stays ready-waiting-power.",
      ],
    };
  }

  function run(scenario, coefficients) {
    return {
      scenarioMeta: {
        name: scenario.name,
        honestyLabel: scenario.honestyLabel || EVIDENCE.ILLUSTRATIVE,
        honestyBanner: scenario.honestyBanner,
        deploymentLagQuarters: scenario.deploymentLagQuarters,
      },
      outputs: aggregateOutputs(scenario, coefficients),
      queues: simulateQueues(scenario, coefficients),
      ranAt: new Date().toISOString(),
    };
  }

  function companyTemplates() {
    return [
      { id: "NVDA", name: "NVIDIA", symbol: "NVDA" },
      { id: "AMD", name: "AMD", symbol: "AMD" },
      { id: "MU", name: "Micron", symbol: "MU" },
      { id: "000660.KS", name: "SK hynix", symbol: "000660.KS" },
      { id: "Samsung", name: "Samsung Electronics", symbol: "005930.KS" },
    ].map((c) => ({
      ...c,
      // All EMPTY by default — no invented prices/shares/forecasts
      physicalVolume: "",
      volumeUnit: "units",
      allocationPct: "",
      price: "",
      priceUnit: "$/unit",
      revenue: "",
      opMarginPct: "",
      opProfit: "",
      reinvestment: "",
      opFcf: "",
      shares: "",
      pricePerShare: "",
      marketCap: "",
      horizonYears: "5",
      valueInHorizon: "",
      residualNeededAfter: "",
      terminalValue: "0",
      demoFilled: false,
      notes: "",
    }));
  }

  function demoFillCompany(c) {
    // Arbitrary synthetic numbers — DEMO ONLY
    const vol = 100000;
    const alloc = 0.25;
    const px = 4000;
    const rev = vol * alloc * px;
    const margin = 0.35;
    const op = rev * margin;
    const reinv = op * 0.2;
    const fcf = op - reinv;
    const shares = 1e9;
    const horizon = 5;
    const inH = fcf * horizon;
    return {
      ...c,
      physicalVolume: String(vol),
      allocationPct: String(alloc * 100),
      price: String(px),
      revenue: String(Math.round(rev)),
      opMarginPct: String(margin * 100),
      opProfit: String(Math.round(op)),
      reinvestment: String(Math.round(reinv)),
      opFcf: String(Math.round(fcf)),
      shares: String(shares),
      pricePerShare: "",
      marketCap: "",
      horizonYears: String(horizon),
      valueInHorizon: String(Math.round(inH)),
      residualNeededAfter: "",
      terminalValue: "0",
      demoFilled: true,
      notes: "DEMO ONLY — arbitrary synthetic numbers to exercise equations. Not a valuation.",
    };
  }

  function computeCompanyBridge(c) {
    const vol = num(c.physicalVolume, null);
    const alloc = num(c.allocationPct, null);
    const px = num(c.price, null);
    let revenue = num(c.revenue, null);
    if (revenue === null && vol !== null && alloc !== null && px !== null) {
      revenue = vol * (alloc / 100) * px;
    }
    const margin = num(c.opMarginPct, null);
    let opProfit = num(c.opProfit, null);
    if (opProfit === null && revenue !== null && margin !== null) {
      opProfit = revenue * (margin / 100);
    }
    const reinv = num(c.reinvestment, null);
    let fcf = num(c.opFcf, null);
    if (fcf === null && opProfit !== null && reinv !== null) {
      fcf = opProfit - reinv;
    }
    const shares = num(c.shares, null);
    const pps = num(c.pricePerShare, null);
    let mcap = num(c.marketCap, null);
    if (mcap === null && shares !== null && pps !== null) {
      mcap = shares * pps;
    }
    const horizon = num(c.horizonYears, null);
    const tv = num(c.terminalValue, 0) || 0;
    let valueInHorizon = num(c.valueInHorizon, null);
    if (valueInHorizon === null && fcf !== null && horizon !== null) {
      // Stub: undiscounted sum of horizon FCFs (not a calibrated DCF)
      valueInHorizon = fcf * horizon;
    }
    let residual = num(c.residualNeededAfter, null);
    if (residual === null && mcap !== null && valueInHorizon !== null) {
      residual = mcap - valueInHorizon - tv;
    }
    const empty =
      [vol, alloc, px, revenue, opProfit, fcf, shares, pps, mcap].every((x) => x === null);
    return {
      derived: {
        revenue,
        opProfit,
        opFcf: fcf,
        marketCap: mcap,
        valueInHorizon,
        residualNeededAfter: residual,
        terminalValue: tv,
      },
      empty,
      honesty: c.demoFilled
        ? "DEMO ONLY — arbitrary synthetic numbers."
        : empty
          ? "Bridge empty by default — no invented prices/shares/forecasts."
          : "User-entered / derived bridge — not a calibrated forecast unless sourced.",
    };
  }

  function toCsvLedger(ledger) {
    const cols = [
      "quarter",
      "demandRubin",
      "demandMi455x",
      "builtRubin",
      "builtMi455x",
      "unbuiltRubin",
      "unbuiltMi455x",
      "hbmInventory",
      "shippedWaitingLagRubin",
      "shippedWaitingLagMi455x",
      "readyWaitingPowerRubin",
      "readyWaitingPowerMi455x",
      "commissionedRubin",
      "commissionedMi455x",
      "commissionedRubinCum",
      "commissionedMi455xCum",
      "powerAdditionsMw",
      "unusedPowerMw",
      "mi455xHbmEvidence",
      "amdPowerEvidence",
    ];
    const lines = [cols.join(",")];
    (ledger || []).forEach((row) => {
      lines.push(cols.map((k) => {
        const v = row[k];
        if (v === null || v === undefined) return "";
        return String(v);
      }).join(","));
    });
    return lines.join("\n");
  }

  window.AtlasEngine = {
    EVIDENCE,
    defaultScenario,
    supplyPowerStressPreset,
    run,
    companyTemplates,
    demoFillCompany,
    computeCompanyBridge,
    toCsvLedger,
    aggregateOutputs,
    simulateQueues,
    num,
  };
})();
