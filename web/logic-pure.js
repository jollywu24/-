(function (global) {
  const CONTENT = global.GameContent
    || (typeof module !== "undefined" && module.exports ? require("./game-content.js") : null);
  const TILT_RULES = {
    max: 160,
    redEyeEnter: 100,
    redEyeExit: 80,
    redEyeMultiplier: 1.5,
    clearRelief: {
      normal: 25,
      elite: 35,
      boss: 50
    }
  };
  const RED_EYE_GHOSTS = CONTENT?.RED_EYE_GHOST_IDS || {
    bloodshotGlasses: "bloodshot_glasses",
    redEyeIou: "red_eye_iou",
    smallCardCourage: "small_card_courage",
    rottenLifeInsurance: "rotten_life_insurance",
    withdrawalRebound: "withdrawal_rebound"
  };
  const GHOST_RULES = CONTENT?.GHOST_RULES || {};
  const RED_EYE_BET_RULES = CONTENT?.RED_EYE_BET_RULES || {};

  const SEQUENCES = {
    highCard: { id: "highCard", name: "高牌", base: 5, mult: 1, hype: 0, limit: 0, baseGrowth: 3, multGrowth: 0.2 },
    pair: { id: "pair", name: "对子", base: 10, mult: 2, hype: 2, limit: 0, baseGrowth: 5, multGrowth: 0.35 },
    twoPair: { id: "twoPair", name: "两对", base: 20, mult: 2, hype: 4, limit: 0, baseGrowth: 7, multGrowth: 0.4 },
    threeKind: { id: "threeKind", name: "三条", base: 30, mult: 3, hype: 6, limit: 0, baseGrowth: 10, multGrowth: 0.55 },
    straight: { id: "straight", name: "顺子", base: 30, mult: 4, hype: 8, limit: 0, baseGrowth: 10, multGrowth: 0.65 },
    flush: { id: "flush", name: "同花", base: 35, mult: 4, hype: 8, limit: 0, baseGrowth: 12, multGrowth: 0.7 },
    fullHouse: { id: "fullHouse", name: "葫芦", base: 40, mult: 4, hype: 10, limit: 0, baseGrowth: 14, multGrowth: 0.75 },
    fourKind: { id: "fourKind", name: "四条", base: 60, mult: 7, hype: 12, limit: 0, baseGrowth: 18, multGrowth: 1 },
    straightFlush: { id: "straightFlush", name: "同花顺", base: 100, mult: 8, hype: 14, limit: 0, baseGrowth: 25, multGrowth: 1.2 }
  };

  const STANDARD_RANKS = [
    { value: 2, label: "2", chips: 2, pressure: 2 },
    { value: 3, label: "3", chips: 3, pressure: 3 },
    { value: 4, label: "4", chips: 4, pressure: 4 },
    { value: 5, label: "5", chips: 5, pressure: 5 },
    { value: 6, label: "6", chips: 6, pressure: 6 },
    { value: 7, label: "7", chips: 7, pressure: 7 },
    { value: 8, label: "8", chips: 8, pressure: 8 },
    { value: 9, label: "9", chips: 9, pressure: 9 },
    { value: 10, label: "10", chips: 10, pressure: 10 },
    { value: 11, label: "J", chips: 11, pressure: 10 },
    { value: 12, label: "Q", chips: 12, pressure: 10 },
    { value: 13, label: "K", chips: 13, pressure: 10 },
    { value: 14, label: "A", chips: 14, pressure: 11 }
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

  function effectiveScoringCards(cards, sequence = null) {
    if (!cards.length) return [];
    const limitedCards = cards.filter(Boolean).slice(0, 5);
    if (!limitedCards.every((card) => Number.isFinite(Number(cardRank(card, 0))))) return limitedCards;
    const activeSequence = sequence || evaluateIgnitionSequence(limitedCards, 5);
    if (["straight", "flush", "fullHouse", "straightFlush"].includes(activeSequence.id)) return limitedCards;

    const rankCounts = new Map();
    limitedCards.forEach((card) => {
      const rank = cardRank(card, 0);
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
    });

    if (activeSequence.id === "highCard") {
      const highestRank = Math.max(...limitedCards.map((card) => cardRank(card, 0)));
      return limitedCards.filter((card) => cardRank(card, 0) === highestRank).slice(0, 1);
    }

    if (activeSequence.id === "pair") {
      const pairRank = [...rankCounts.entries()].find(([, count]) => count === 2)?.[0];
      return limitedCards.filter((card) => cardRank(card, 0) === pairRank);
    }

    if (activeSequence.id === "twoPair") {
      const pairRanks = new Set([...rankCounts.entries()].filter(([, count]) => count === 2).map(([rank]) => rank));
      return limitedCards.filter((card) => pairRanks.has(cardRank(card, 0)));
    }

    if (activeSequence.id === "threeKind") {
      const tripleRank = [...rankCounts.entries()].find(([, count]) => count === 3)?.[0];
      return limitedCards.filter((card) => cardRank(card, 0) === tripleRank);
    }

    if (activeSequence.id === "fourKind") {
      const quadRank = [...rankCounts.entries()].find(([, count]) => count === 4)?.[0];
      return limitedCards.filter((card) => cardRank(card, 0) === quadRank);
    }

    return limitedCards;
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

  function cardHypeValue(card) {
    const rank = Number(cardRank(card, 0));
    if (!Number.isFinite(rank)) return 0;
    if (rank >= 2 && rank <= 10) return rank;
    if (rank >= 11 && rank <= 13) return 10;
    if (rank === 14) return 11;
    return 0;
  }

  function redEyeHypePreview(redEyeBet) {
    if (!redEyeBet) return null;
    return {
      min: 2,
      max: 11
    };
  }

  function calculateHypeBreakdown({ cards = [], sequence = null, redEyeBet = null, surgeCard = null }) {
    const hypeBaseFromCards = redEyeBet ? 0 : cards.reduce((sum, card) => sum + cardHypeValue(card), 0);
    const hypeFromHandType = redEyeBet ? 0 : sequence?.hype || 0;
    const hypeFromRedEyeBet = 0;
    const hypeFromSurgeCard = redEyeBet && surgeCard ? cardHypeValue(surgeCard) : 0;
    const hypeDeltaTotal = hypeBaseFromCards + hypeFromHandType + hypeFromRedEyeBet + hypeFromSurgeCard;
    const preview = redEyeBet && !surgeCard ? redEyeHypePreview(redEyeBet) : null;
    return {
      hypeBaseFromCards,
      hypeFromHandType,
      hypeFromRedEyeBet,
      hypeFromSurgeCard,
      hypeDelta: hypeDeltaTotal,
      hypeDeltaTotal,
      surgeCard: surgeCard || null,
      hypePreviewMin: preview ? hypeBaseFromCards + hypeFromHandType + preview.min : hypeDeltaTotal,
      hypePreviewMax: preview ? hypeBaseFromCards + hypeFromHandType + preview.max : hypeDeltaTotal
    };
  }

  function applyIgnitionSequence(run, sequence, level = 1) {
    const leveled = sequenceAtLevel(sequence, level);
    run.base += leveled.base;
    run.multiplier *= leveled.mult;
    run.explosionLimit += leveled.limit;
    return leveled;
  }

  function recordMultiplierEvent(run, event) {
    if (event.multBefore === event.multAfter) return;
    run.multiplierEvents.push({
      sourceId: event.sourceId || "",
      sourceType: event.sourceType || "system",
      jokerId: event.jokerId || "",
      label: event.label,
      operation: event.operation,
      multBefore: event.multBefore,
      multAfter: event.multAfter
    });
  }

  function applySimpleJokers(run, jokers = []) {
    for (const joker of jokers) {
      const id = typeof joker === "string" ? joker : joker.id;
      if (id === "chip_plus_30") run.base += 30;
      if (id === "mult_plus_2") {
        const multBefore = run.multiplier;
        run.multiplier += 2;
        recordMultiplierEvent(run, {
          sourceId: id,
          sourceType: "joker",
          jokerId: id,
          label: "+2 倍率",
          operation: "add",
          multBefore,
          multAfter: run.multiplier
        });
      }
      if (id === "redline_coupon") {
        run.pressure += 12;
        const multBefore = run.multiplier;
        run.multiplier += 3;
        recordMultiplierEvent(run, {
          sourceId: id,
          sourceType: "joker",
          jokerId: id,
          label: "+3 倍率",
          operation: "add",
          multBefore,
          multAfter: run.multiplier
        });
      }
      if (id === "coolant_pass") run.pressure = Math.max(0, run.pressure - 10);
    }
  }

  function updateRedEyeState(pressure, wasActive = false) {
    if (wasActive) return pressure > TILT_RULES.redEyeExit;
    return pressure >= TILT_RULES.redEyeEnter;
  }

  function roundTypeForIndex(roundIndex = 0) {
    return ["normal", "elite", "boss"][Math.max(0, Math.floor(roundIndex)) % 3];
  }

  function tiltReliefForRound(roundIndex = 0) {
    return TILT_RULES.clearRelief[roundTypeForIndex(roundIndex)];
  }

  function createRunState(state, baseProfit) {
    const owned = state.ownedJokers || [];
    const startingPressure = state.pressure + state.baseDebt;
    const redEyeActive = updateRedEyeState(startingPressure, Boolean(state.redEyeActive));
    return {
      base: baseProfit,
      multiplier: 1 + (owned.includes("red_heat_memory") ? (state.redHeatStacks || 0) : 0),
      pressure: startingPressure,
      explosionLimit: TILT_RULES.max,
      nextDebt: 0,
      fuses: 0,
      insurance: false,
      risk: 0,
      redlineTrips: 0,
      redHeatStacks: state.redHeatStacks || 0,
      bloodshotStacks: state.bloodshotStacks || 0,
      pendingWithdrawalBonusStacks: state.pendingWithdrawalBonusStacks || 0,
      withdrawalConsumedStacks: 0,
      multiplierEvents: [],
      insuranceTriggered: false,
      abyssInsuranceAvailable: redEyeActive && owned.includes(RED_EYE_GHOSTS.rottenLifeInsurance),
      redlineWasActive: redEyeActive,
      redEyeActive,
      redEyeMultiplierApplied: false,
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

    const inRedline = updateRedEyeState(run.pressure, run.redlineWasActive);
    if (inRedline && !run.redlineWasActive) {
      run.redlineTrips += 1;
      if (owned.includes(RED_EYE_GHOSTS.bloodshotGlasses)) {
        run.bloodshotStacks += GHOST_RULES[RED_EYE_GHOSTS.bloodshotGlasses]?.stacksPerRedEyeEntry || 1;
        messages.push(`血丝眼镜：获得 1 层血丝（当前 ${run.bloodshotStacks}）`);
      }
      if (owned.includes("redline_protocol")) {
        const multBefore = run.multiplier;
        run.multiplier *= 2;
        recordMultiplierEvent(run, {
          sourceId: "redline_protocol",
          sourceType: "joker",
          jokerId: "redline_protocol",
          label: "×2 倍率",
          operation: "multiply",
          multBefore,
          multAfter: run.multiplier
        });
        messages.push("红区协议：首次进红区，所有倍率 x2");
      }
      if (owned.includes("red_heat_memory")) {
        run.redHeatStacks += 1;
        const multBefore = run.multiplier;
        run.multiplier += 1;
        recordMultiplierEvent(run, {
          sourceId: "red_heat_memory",
          sourceType: "joker",
          jokerId: "red_heat_memory",
          label: "+1 倍率",
          operation: "add",
          multBefore,
          multAfter: run.multiplier
        });
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
    run.redEyeActive = inRedline;

    if (inRedline && !run.redEyeMultiplierApplied) {
      const bloodshotPerStack = GHOST_RULES[RED_EYE_GHOSTS.bloodshotGlasses]?.redEyeMultiplierPerStack || 0.1;
      const bloodshotBonus = owned.includes(RED_EYE_GHOSTS.bloodshotGlasses) ? run.bloodshotStacks * bloodshotPerStack : 0;
      const redEyeMultiplier = TILT_RULES.redEyeMultiplier + bloodshotBonus;
      const multBefore = run.multiplier;
      run.multiplier *= redEyeMultiplier;
      recordMultiplierEvent(run, {
        sourceId: bloodshotBonus > 0 ? RED_EYE_GHOSTS.bloodshotGlasses : "red-eye",
        sourceType: bloodshotBonus > 0 ? "joker" : "redEye",
        jokerId: bloodshotBonus > 0 ? RED_EYE_GHOSTS.bloodshotGlasses : "",
        label: `×${redEyeMultiplier.toFixed(1)} 倍率`,
        operation: "multiply",
        multBefore,
        multAfter: run.multiplier
      });
      run.redEyeMultiplierApplied = true;
      messages.push(`红眼：本手倍率 x${(TILT_RULES.redEyeMultiplier + bloodshotBonus).toFixed(1)}`);
    }

    if (owned.includes("furnace_critical") && run.pressure >= TILT_RULES.redEyeEnter && !run.redlinePowerDoubled) {
      run.base *= 2;
      run.redlinePowerDoubled = true;
      messages.push("熔炉临界：进入红眼，基础功率 x2");
    }

    return messages;
  }

  function handlePressureLimit(run) {
    if (run.pressure < run.explosionLimit) return "ok";
    if (run.abyssInsuranceAvailable) {
      run.abyssInsuranceAvailable = false;
      run.insuranceTriggered = true;
      run.pressure = GHOST_RULES[RED_EYE_GHOSTS.rottenLifeInsurance]?.resetTilt || 120;
      return "insurance";
    }
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

  function applyRedEyeBet(run, cards, redEyeBet, surgeCard, ownedJokers = []) {
    if (!redEyeBet) return;
    const betRules = RED_EYE_BET_RULES[redEyeBet.id] || redEyeBet.rules || {};
    for (let repeat = 0; repeat < (betRules.repeatScoringCards || 0); repeat += 1) {
      cards.forEach((card) => {
        run.base += Number(card?.chips || 0);
      });
    }
    if (betRules.handMultiplier) {
      const multBefore = run.multiplier;
      run.multiplier *= betRules.handMultiplier;
      recordMultiplierEvent(run, {
        sourceId: redEyeBet.id,
        sourceType: "redEye",
        label: `×${betRules.handMultiplier} 倍率`,
        operation: "multiply",
        multBefore,
        multAfter: run.multiplier
      });
    }
    if (betRules.chips) run.base += betRules.chips;
    if (ownedJokers.includes(RED_EYE_GHOSTS.redEyeIou)) {
      const iouMultiplier = GHOST_RULES[RED_EYE_GHOSTS.redEyeIou]?.betMultiplier || 1.25;
      const multBefore = run.multiplier;
      run.multiplier *= iouMultiplier;
      recordMultiplierEvent(run, {
        sourceId: RED_EYE_GHOSTS.redEyeIou,
        sourceType: "joker",
        jokerId: RED_EYE_GHOSTS.redEyeIou,
        label: `×${iouMultiplier} 倍率`,
        operation: "multiply",
        multBefore,
        multAfter: run.multiplier
      });
    }
    const surgeValue = surgeCard ? cardHypeValue(surgeCard) : 0;
    const smallCardLimit = GHOST_RULES[RED_EYE_GHOSTS.smallCardCourage]?.maxSurgeForMultiplier || 5;
    if (ownedJokers.includes(RED_EYE_GHOSTS.smallCardCourage) && surgeValue <= smallCardLimit) {
      const multBefore = run.multiplier;
      run.multiplier += surgeValue;
      recordMultiplierEvent(run, {
        sourceId: surgeCard?.uid ?? surgeCard?.deckId ?? "surge",
        sourceType: "surge",
        jokerId: RED_EYE_GHOSTS.smallCardCourage,
        label: `暗涌 +${surgeValue} 倍率`,
        operation: "surge",
        multBefore,
        multAfter: run.multiplier
      });
    }
    if (ownedJokers.includes(RED_EYE_GHOSTS.withdrawalRebound) && run.pendingWithdrawalBonusStacks > 0) {
      run.withdrawalConsumedStacks = run.pendingWithdrawalBonusStacks;
      const multiplierPerStack = GHOST_RULES[RED_EYE_GHOSTS.withdrawalRebound]?.multiplierPerStack || 1.3;
      const withdrawalMultiplier = Math.pow(multiplierPerStack, run.pendingWithdrawalBonusStacks);
      const multBefore = run.multiplier;
      run.multiplier *= withdrawalMultiplier;
      recordMultiplierEvent(run, {
        sourceId: RED_EYE_GHOSTS.withdrawalRebound,
        sourceType: "joker",
        jokerId: RED_EYE_GHOSTS.withdrawalRebound,
        label: `×${withdrawalMultiplier.toFixed(2)} 倍率`,
        operation: "multiply",
        multBefore,
        multAfter: run.multiplier
      });
      run.pendingWithdrawalBonusStacks = 0;
    }
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

  function simulatePreview({ slots, state, baseProfit, resolveModuleFn, slotCount = 5, redEyeBet = null, surgeCard = null }) {
    if (!slots.some(Boolean)) {
      return {
        profit: 0,
        base: 0,
        pressure: state.pressure + state.baseDebt,
        multiplier: 1,
        limit: TILT_RULES.max,
        sequence: null,
        hypeBaseFromCards: 0,
        hypeFromHandType: 0,
        hypeFromRedEyeBet: 0,
        hypeFromSurgeCard: 0,
        hypeDelta: 0,
        hypeDeltaTotal: 0,
        scoringCardIds: [],
        surgeCard: null,
        multiplierEvents: [],
        hypePreviewMin: 0,
        hypePreviewMax: 0,
        riskText: "未装入"
      };
    }

    const activeCards = slots.filter(Boolean).slice(0, slotCount);
    const run = createRunState(state, baseProfit);
    const sequence = evaluateIgnitionSequence(activeCards, slotCount);
    const scoringCards = effectiveScoringCards(activeCards, sequence);
    const scoringCardIds = scoringCards
      .map((card) => card.uid ?? card.deckId ?? card.id)
      .filter((id) => id !== undefined && id !== null);
    const sequenceLevel = state.handLevels?.[sequence.id] || 1;
    const leveledSequence = applyIgnitionSequence(run, sequence, sequenceLevel);
    applySimpleJokers(run, state.ownedJokers || []);
    applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
    if (typeof state.bossRule?.applyStart === "function") {
      state.bossRule.applyStart(run, activeCards);
      applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
    }

    let blown = false;
    for (const module of scoringCards) {
      if (!module) continue;
      const multBefore = run.multiplier;
      resolveModuleFn(module, run, { preview: true });
      recordMultiplierEvent(run, {
        sourceId: module.uid ?? module.deckId ?? module.id,
        sourceType: "card",
        label: `${run.multiplier >= multBefore ? "+" : ""}${(run.multiplier - multBefore).toFixed(2)} 倍率`,
        operation: "add",
        multBefore,
        multAfter: run.multiplier
      });
      if (typeof state.bossRule?.applyModule === "function") state.bossRule.applyModule(run, module);
      applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
      if (handlePressureLimit(run) === "blown") blown = true;
    }

    applyRedEyeBet(run, scoringCards, redEyeBet, surgeCard, state.ownedJokers || []);
    const hypeBreakdown = calculateHypeBreakdown({
      cards: scoringCards,
      sequence: leveledSequence,
      redEyeBet,
      surgeCard
    });
    const bloodshotHype = state.ownedJokers?.includes(RED_EYE_GHOSTS.bloodshotGlasses) && !state.redEyeActive
      ? GHOST_RULES[RED_EYE_GHOSTS.bloodshotGlasses]?.normalHype || 3
      : 0;
    const redEyeIouHype = redEyeBet && state.ownedJokers?.includes(RED_EYE_GHOSTS.redEyeIou)
      ? GHOST_RULES[RED_EYE_GHOSTS.redEyeIou]?.surgeHype || 3
      : 0;
    hypeBreakdown.hypeFromBloodshotGlasses = bloodshotHype;
    hypeBreakdown.hypeFromRedEyeIou = redEyeIouHype;
    hypeBreakdown.hypeDelta += bloodshotHype + redEyeIouHype;
    hypeBreakdown.hypeDeltaTotal += bloodshotHype + redEyeIouHype;
    run.pressure += hypeBreakdown.hypeDeltaTotal;
    applyRedHeatCore(run, { ownedJokers: state.ownedJokers || [] });
    if (handlePressureLimit(run) === "blown") blown = true;

    const lastModule = [...scoringCards].reverse().find(Boolean);
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
      scoringCardIds,
      bloodshotStacks: run.bloodshotStacks,
      withdrawalConsumedStacks: run.withdrawalConsumedStacks,
      insuranceTriggered: run.insuranceTriggered,
      multiplierEvents: run.multiplierEvents.map((event) => ({
        ...event,
        base: run.base,
        scoreBefore: Math.max(0, Math.round(run.base * event.multBefore)),
        scoreAfter: Math.max(0, Math.round(run.base * event.multAfter))
      })),
      ...hypeBreakdown,
      riskText
    };
  }

  const api = {
    TILT_RULES,
    RED_EYE_GHOSTS,
    SEQUENCES,
    STANDARD_RANKS,
    STANDARD_PHASES,
    createRng,
    evaluateIgnitionSequence,
    effectiveScoringCards,
    sequenceAtLevel,
    cardHypeValue,
    redEyeHypePreview,
    calculateHypeBreakdown,
    applyIgnitionSequence,
    createStandardDeck,
    applySimpleJokers,
    updateRedEyeState,
    roundTypeForIndex,
    tiltReliefForRound,
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
