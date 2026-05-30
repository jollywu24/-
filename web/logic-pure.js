(function (global) {
  const SEQUENCES = {
    highCard: { id: "highCard", name: "高牌", base: 5, mult: 1, limit: 0, baseGrowth: 3, multGrowth: 0.2 },
    pair: { id: "pair", name: "对子", base: 10, mult: 2, limit: 0, baseGrowth: 5, multGrowth: 0.35 },
    twoPair: { id: "twoPair", name: "两对", base: 20, mult: 2, limit: 0, baseGrowth: 7, multGrowth: 0.4 },
    threeKind: { id: "threeKind", name: "三条", base: 30, mult: 3, limit: 0, baseGrowth: 10, multGrowth: 0.55 },
    straight: { id: "straight", name: "顺子", base: 30, mult: 4, limit: 0, baseGrowth: 10, multGrowth: 0.65 },
    flush: { id: "flush", name: "同花", base: 35, mult: 4, limit: 0, baseGrowth: 12, multGrowth: 0.7 },
    fullHouse: { id: "fullHouse", name: "葫芦", base: 40, mult: 4, limit: 0, baseGrowth: 14, multGrowth: 0.75 },
    fourKind: { id: "fourKind", name: "四条", base: 60, mult: 7, limit: 0, baseGrowth: 18, multGrowth: 1 },
    straightFlush: { id: "straightFlush", name: "同花顺", base: 100, mult: 8, limit: 0, baseGrowth: 25, multGrowth: 1.2 }
  };

  const STANDARD_RANKS = [
    { value: 2, label: "2", chips: 2, pressure: 1 },
    { value: 3, label: "3", chips: 3, pressure: 1 },
    { value: 4, label: "4", chips: 4, pressure: 1 },
    { value: 5, label: "5", chips: 5, pressure: 2 },
    { value: 6, label: "6", chips: 6, pressure: 2 },
    { value: 7, label: "7", chips: 7, pressure: 2 },
    { value: 8, label: "8", chips: 8, pressure: 3 },
    { value: 9, label: "9", chips: 9, pressure: 3 },
    { value: 10, label: "10", chips: 10, pressure: 3 },
    { value: 11, label: "J", chips: 11, pressure: 4 },
    { value: 12, label: "Q", chips: 12, pressure: 4 },
    { value: 13, label: "K", chips: 13, pressure: 5 },
    { value: 14, label: "A", chips: 14, pressure: 6 }
  ];

  const STANDARD_PHASES = [
    { id: "kinetic", label: "黑桃" },
    { id: "pulse", label: "红桃" },
    { id: "thermal", label: "方片" },
    { id: "toxic", label: "梅花" }
  ];

  function createRng(seed = "abyss") {
    let hash = 2166136261;
    const text = String(seed);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    let state = hash >>> 0;
    return function rng() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function evaluateIgnitionSequence(slots, slotCount = 5) {
    const cards = slots
      .map((module, index) => (module ? { phase: module.phase, rank: cardRank(module, index) } : null))
      .filter(Boolean);
    if (!cards.length) return SEQUENCES.highCard;

    const exactFive = cards.length === slotCount;
    const rankCounts = countBy(cards.map((card) => card.rank));
    const countValues = [...rankCounts.values()].sort((a, b) => b - a);
    const pairs = countValues.filter((count) => count === 2).length;
    const flush = exactFive && cards.every((card) => card.phase === cards[0].phase);
    const straight = exactFive && isStraight(cards.map((card) => card.rank));

    if (straight && flush) return SEQUENCES.straightFlush;
    if (countValues[0] === 4) return SEQUENCES.fourKind;
    if (exactFive && countValues[0] === 3 && countValues[1] === 2) return SEQUENCES.fullHouse;
    if (flush) return SEQUENCES.flush;
    if (straight) return SEQUENCES.straight;
    if (countValues[0] === 3) return SEQUENCES.threeKind;
    if (pairs >= 2) return SEQUENCES.twoPair;
    if (pairs === 1) return SEQUENCES.pair;
    return SEQUENCES.highCard;
  }

  function cardRank(module, index) {
    const rank = Number(module.rank ?? module.chips ?? module.points ?? module.value);
    return Number.isFinite(rank) && rank > 0 ? rank : `slot-${index}`;
  }

  function countBy(values) {
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return counts;
  }

  function isStraight(ranks) {
    if (!ranks.every((rank) => typeof rank === "number")) return false;
    const unique = [...new Set(ranks)].sort((a, b) => a - b);
    if (unique.length !== 5) return false;
    const wheel = [2, 3, 4, 5, 14];
    if (unique.every((rank, index) => rank === wheel[index])) return true;
    return unique.every((rank, index) => index === 0 || rank - unique[index - 1] === 1);
  }

  function sequenceAtLevel(sequence, level = 1) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const extra = safeLevel - 1;
    return {
      ...sequence,
      level: safeLevel,
      base: sequence.base + extra * (sequence.baseGrowth || 0),
      mult: sequence.mult + extra * (sequence.multGrowth || 0)
    };
  }

  function applyIgnitionSequence(run, sequence, level = 1) {
    const leveled = sequenceAtLevel(sequence, level);
    run.base += leveled.base;
    run.multiplier *= leveled.mult;
    run.explosionLimit += leveled.limit;
    return leveled;
  }

  function applySimpleJokers(run, jokers = []) {
    for (const joker of jokers) {
      const id = typeof joker === "string" ? joker : joker.id;
      if (id === "chip_plus_30") run.base += 30;
      if (id === "mult_plus_2") run.multiplier += 2;
      if (id === "redline_coupon") {
        run.pressure += 12;
        run.multiplier += 3;
      }
      if (id === "coolant_pass") run.pressure = Math.max(0, run.pressure - 10);
      if (id === "safe_margin") run.explosionLimit += 10;
    }
  }

  function createRunState(state, baseProfit) {
    const owned = state.ownedJokers || [];
    return {
      base: baseProfit,
      multiplier: 1 + (owned.includes("red_heat_memory") ? (state.redHeatStacks || 0) : 0),
      pressure: state.pressure + state.baseDebt,
      explosionLimit: 100,
      nextDebt: 0,
      fuses: 0,
      insurance: false,
      risk: 0,
      redlineTrips: 0,
      redHeatStacks: state.redHeatStacks || 0,
      redlineWasActive: state.pressure + state.baseDebt >= 80,
      redlineRepeatLast: false,
      redlineRepeatUsed: false,
      redlinePowerDoubled: false
    };
  }

  function applyRedHeatCore(run, options = {}) {
    const owned = options.ownedJokers || [];
    const messages = [];
    const pressureBonus = owned.includes("thermal_crank") ? Math.max(0, run.pressure) * 0.15 : 0;
    if (pressureBonus > 0) {
      run.multiplier += pressureBonus;
      messages.push(`热压曲柄：当前压力 ${Math.round(run.pressure)}，倍率 +${pressureBonus.toFixed(2)}`);
    }

    const inRedline = run.pressure >= 80;
    if (inRedline && !run.redlineWasActive) {
      run.redlineTrips += 1;
      if (owned.includes("redline_protocol")) {
        run.multiplier *= 2;
        messages.push("红区协议：首次进红区，所有倍率 x2");
      }
      if (owned.includes("red_heat_memory")) {
        run.redHeatStacks += 1;
        run.multiplier += 1;
        messages.push(`红温记忆：永久倍率 +1（当前 ${run.redHeatStacks}）`);
        if (typeof options.onPermanentStack === "function") options.onPermanentStack(1);
      }
      if (owned.includes("echo_overload")) {
        run.redlineRepeatLast = true;
        messages.push("回声过载：本轮最后一张牌将重复触发");
      }
    }

    if (!inRedline && run.redlineWasActive) {
      run.redlineWasActive = false;
    } else if (inRedline) {
      run.redlineWasActive = true;
    }

    if (owned.includes("furnace_critical") && run.pressure > 90 && !run.redlinePowerDoubled) {
      run.base *= 2;
      run.redlinePowerDoubled = true;
      messages.push("熔炉临界：压力超过 90，基础功率 x2");
    }

    return messages;
  }

  function handlePressureLimit(run) {
    if (run.pressure <= run.explosionLimit) return "ok";
    if (run.fuses > 0) {
      run.fuses -= 1;
      run.pressure = Math.max(0, run.explosionLimit - 6);
      return "fuse";
    }
    if (run.insurance) {
      run.insurance = false;
      run.pressure = Math.max(0, run.explosionLimit - 4);
      return "insurance";
    }
    return "blown";
  }

  function resolveModule(module, run, options = {}) {
    if ((module.trigger || "ON_RESOLVE") !== "ON_RESOLVE") return "";
    if (options.preview) {
      module.preview(run);
      return "";
    }
    return module.apply(run);
  }

  function currentRunProfit(run) {
    return Math.max(0, Math.round(run.base * run.multiplier));
  }

  function createStandardDeck() {
    return STANDARD_PHASES.flatMap((phase) =>
      STANDARD_RANKS.map((rank) => ({
        id: `${phase.id}-${rank.value}`,
        deckId: `${phase.id}-${rank.value}`,
        phase: phase.id,
        phaseLabel: phase.label,
        rank: rank.value,
        rankLabel: rank.label,
        chips: rank.chips,
        pressureCost: rank.pressure
      }))
    );
  }

  function simulatePreview({ slots, state, baseProfit, resolveModuleFn, slotCount = 5 }) {
    if (!slots.some(Boolean)) {
      return {
        profit: 0,
        base: 0,
        pressure: state.pressure + state.baseDebt,
        multiplier: 1,
        limit: 100,
        sequence: null,
        riskText: "未装入"
      };
    }

    const run = createRunState(state, baseProfit);
    const sequence = evaluateIgnitionSequence(slots, slotCount);
    const sequenceLevel = state.handLevels?.[sequence.id] || 1;
    const leveledSequence = applyIgnitionSequence(run, sequence, sequenceLevel);
    applySimpleJokers(run, state.ownedJokers || []);
    applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
    if (typeof state.bossRule?.applyStart === "function") {
      state.bossRule.applyStart(run, slots);
      applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
    }

    let blown = false;
    for (const module of slots) {
      if (!module) continue;
      resolveModuleFn(module, run, { preview: true });
      if (typeof state.bossRule?.applyModule === "function") state.bossRule.applyModule(run, module);
      applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
      if (handlePressureLimit(run) === "blown") blown = true;
    }

    const lastModule = [...slots].reverse().find(Boolean);
    if (!blown && run.redlineRepeatLast && !run.redlineRepeatUsed && lastModule) {
      run.redlineRepeatUsed = true;
      resolveModuleFn(lastModule, run, { preview: true });
      if (typeof state.bossRule?.applyModule === "function") state.bossRule.applyModule(run, lastModule);
      applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
      if (handlePressureLimit(run) === "blown") blown = true;
    }

    const risk = Math.max(
      0,
      Math.min(
        100,
        (run.pressure / run.explosionLimit) * 100 + run.risk - run.fuses * 18 - (run.insurance ? 10 : 0)
      )
    );
    let riskText = "低";
    if (blown) riskText = "爆炸";
    else if (risk >= 90) riskText = "濒死";
    else if (risk >= 70) riskText = "高";
    else if (risk >= 45) riskText = "中";

    return {
      profit: currentRunProfit(run),
      base: run.base,
      pressure: run.pressure,
      multiplier: run.multiplier,
      limit: run.explosionLimit,
      sequence: leveledSequence,
      riskText
    };
  }

  const api = {
    SEQUENCES,
    STANDARD_RANKS,
    STANDARD_PHASES,
    createRng,
    evaluateIgnitionSequence,
    sequenceAtLevel,
    applyIgnitionSequence,
    createStandardDeck,
    applySimpleJokers,
    applyRedHeatCore,
    createRunState,
    resolveModule,
    currentRunProfit,
    simulatePreview
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.GameLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
