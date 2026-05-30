const anteTargets = [100, 300, 900, 3000, 10000, 32000, 95000, 280000];
    const slotCount = 5;
    const handSize = 8;
    const maxHands = 4;
    const maxDiscards = 3;
    const blinds = [
      { id: "small", name: "小盲注", mult: 1, reward: 3 },
      { id: "big", name: "大盲注", mult: 1.5, reward: 4 },
      { id: "boss", name: "Boss 盲注", mult: 2, reward: 6 }
    ];
    const EVENTS = {
      ON_RESOLVE: "ON_RESOLVE",
      ON_EXPLODE: "ON_EXPLODE",
      ON_HIGH_PRESSURE: "ON_HIGH_PRESSURE"
    };
    const triggerLabels = {
      ON_RESOLVE: "结算触发",
      ON_EXPLODE: "爆炸触发",
      ON_HIGH_PRESSURE: "红区触发"
    };
    const PHASES = {
      kinetic: { name: "黑桃", icon: "♠", color: "#202026", suitTone: "black" },
      pulse: { name: "红桃", icon: "♥", color: "#c73536", suitTone: "red" },
      thermal: { name: "方片", icon: "♦", color: "#d54533", suitTone: "red" },
      toxic: { name: "梅花", icon: "♣", color: "#202026", suitTone: "black" }
    };
    const { SEQUENCES, createRng, createStandardDeck, evaluateIgnitionSequence, sequenceAtLevel, applyIgnitionSequence, applySimpleJokers, applyRedHeatCore, createRunState, resolveModule, currentRunProfit } = window.GameLogic;

    const shopJokerCatalog = [
      { id: "thermal_crank", name: "热压曲柄", price: 5, text: "当前压力每 1 点，倍率 +0.15。" },
      { id: "redline_protocol", name: "红区协议", price: 6, text: "进入红区后，所有倍率翻倍。" },
      { id: "furnace_critical", name: "熔炉临界", price: 6, text: "压力超过 90，基础分 x2。" },
      { id: "red_heat_memory", name: "红温记忆", price: 7, text: "每次进入红区，永久倍率 +1。" },
      { id: "echo_overload", name: "回声过载", price: 7, text: "进入红区后，最后一张牌重复触发。" },
      { id: "chip_plus_30", name: "筹码小丑", price: 4, text: "每次出牌，基础分 +30。" },
      { id: "mult_plus_2", name: "倍率小丑", price: 5, text: "每次出牌，倍率 +2。" },
      { id: "redline_coupon", name: "红温赌徒", price: 6, text: "压力 +12，倍率 +3。" },
      { id: "coolant_pass", name: "冷静面具", price: 4, text: "每次出牌前，压力 -10。" },
      { id: "safe_margin", name: "保险边框", price: 5, text: "熔毁上限 +10。" }
    ];


    const CARD_PHASE_STYLES = [
      { id: "kinetic", style: ["#f7f2e8", "#e8ddcd", "#202026", "#202026", "#24242a"] },
      { id: "pulse", style: ["#fff3ee", "#efd6cf", "#c73536", "#c73536", "#c73536"] },
      { id: "thermal", style: ["#fff4ed", "#ecd7ce", "#d54533", "#d54533", "#d54533"] },
      { id: "toxic", style: ["#f6f0e6", "#e3d8c6", "#202026", "#202026", "#24242a"] }
    ];

    const sequenceCatalog = Object.values(SEQUENCES);
    const shopRefreshPrice = 2;
    const packPrice = 5;
    const bossRules = [
      { id: "faceTax", name: "人头牌过载", text: "J/Q/K/A 每张额外 +4 压力。", applyModule(run, module) {
        if (module.rank >= 11) run.pressure += 4;
      } },
      { id: "lowVoltage", name: "低压禁令", text: "2-6 点基础分减半。", applyModule(run, module) {
        if (module.rank <= 6) run.base -= Math.ceil(module.chips / 2);
      } },
      { id: "suitEcho", name: "同花泄漏", text: "本手重复花色越多，起手压力越高。", applyStart(run, slots) {
        const counts = new Map();
        slots.filter(Boolean).forEach((module) => counts.set(module.phase, (counts.get(module.phase) || 0) + 1));
        const repeats = [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
        if (repeats) run.pressure += repeats * 5;
      } }
    ];

    function createBaseCardTemplate(deckCard) {
      const phaseStyle = CARD_PHASE_STYLES.find((phase) => phase.id === deckCard.phase) || CARD_PHASE_STYLES[0];
      const phaseInfo = PHASES[deckCard.phase];
      return {
        id: deckCard.deckId,
        deckId: deckCard.deckId,
        name: `${deckCard.rankLabel}${phaseInfo.icon}`,
        kind: "base",
        resourceType: "POWER",
        layer: "L1",
        phase: deckCard.phase,
        rank: deckCard.rank,
        rankLabel: deckCard.rankLabel,
        chips: deckCard.chips,
        pressureCost: deckCard.pressureCost,
        trigger: EVENTS.ON_RESOLVE,
        style: phaseStyle.style,
        apply(run) {
          run.base += deckCard.chips;
          run.pressure += deckCard.pressureCost;
          return `${deckCard.rankLabel}${phaseInfo.icon} +${deckCard.chips} / ▲${deckCard.pressureCost}`;
        },
        preview(run) {
          run.base += deckCard.chips;
          run.pressure += deckCard.pressureCost;
        }
      };
    }

    const state = {
      cash: 0,
      score: 0,
      pressure: 0,
      ante: 1,
      blindIndex: 0,
      hands: maxHands,
      discards: maxDiscards,
      phase: "blind",
      best: Number(localStorage.getItem("abyss-best") || 0),
      baseDebt: 0,
      redHeatStacks: 0,
      ownedJokers: [],
      shop: [],
      payout: null,
      packChoices: [],
      handLevels: Object.fromEntries(sequenceCatalog.map((sequence) => [sequence.id, 1])),
      deck: [],
      discardPile: [],
      extraCards: [],
      bossRule: null,
      seed: initialSeed(),
      rng: null,
      uidCounter: 0,
      hand: [],
      slots: Array(slotCount).fill(null),
      selectedCards: [],
      selected: null,
      settling: false,
      sound: true,
      log: []
    };

    const els = {
      cash: document.getElementById("cash"),
      roundDisplay: document.getElementById("roundDisplay"),
      score: document.getElementById("score"),
      target: document.getElementById("target"),
      targetMeta: document.getElementById("targetMeta"),
      blindName: document.getElementById("blindName"),
      handsLeft: document.getElementById("handsLeft"),
      discardsLeft: document.getElementById("discardsLeft"),
      pressure: document.getElementById("pressure"),
      needle: document.getElementById("needle"),
      slots: document.getElementById("slots"),
      rack: document.getElementById("rack"),
      jokerStrip: document.getElementById("jokerStrip"),
      pull: document.getElementById("pullButton"),
      refresh: document.getElementById("refreshButton"),
      log: document.getElementById("log"),
      previewProfit: document.getElementById("previewProfit"),
      previewPressure: document.getElementById("previewPressure"),
      previewRisk: document.getElementById("previewRisk"),
      multiplierDisplay: document.getElementById("multiplierDisplay"),
      baseDisplay: document.getElementById("baseDisplay"),
      voltDisplay: document.getElementById("voltDisplay"),
      handNameDisplay: document.getElementById("handNameDisplay"),
      handLevelDisplay: document.getElementById("handLevelDisplay"),
      yieldBoost: document.getElementById("yieldBoost"),
      chainGain: document.getElementById("chainGain"),
      overloadGain: document.getElementById("overloadGain"),
      chainText: document.getElementById("chainText"),
      pressureTrend: document.getElementById("pressureTrend"),
      deckCount: document.getElementById("deckCount"),
      deckButton: document.getElementById("deckButton"),
      overlay: document.getElementById("overlay"),
      modalTitle: document.getElementById("modalTitle"),
      modalBody: document.getElementById("modalBody"),
      restart: document.getElementById("restartButton"),
      continue: document.getElementById("continueButton"),
      toast: document.getElementById("toast"),
      sound: document.getElementById("soundButton"),
      reset: document.getElementById("settingsButton"),
      help: document.getElementById("helpButton"),
      codex: document.getElementById("codexButton"),
      shopPanel: document.getElementById("shopPanel"),
      shopReroll: document.getElementById("shopRerollButton"),
      shopList: document.getElementById("shopList"),
      ownedJokers: document.getElementById("ownedJokers"),
      payoutPanel: document.getElementById("payoutPanel"),
      cashout: document.getElementById("cashoutButton"),
      payoutTarget: document.getElementById("payoutTarget"),
      payoutRating: document.getElementById("payoutRating"),
      payoutBlindText: document.getElementById("payoutBlindText"),
      payoutBlindReward: document.getElementById("payoutBlindReward"),
      payoutHandsText: document.getElementById("payoutHandsText"),
      payoutHandsReward: document.getElementById("payoutHandsReward"),
      payoutInterestText: document.getElementById("payoutInterestText"),
      payoutInterestReward: document.getElementById("payoutInterestReward"),
      resourceOverlay: document.getElementById("resourceOverlay"),
      resourceBody: document.getElementById("resourceBody"),
      resourceClose: document.getElementById("resourceCloseButton"),
      handTable: document.getElementById("handTable"),
      nextBlind: document.getElementById("nextBlindButton")
    };

    let audioContext;
    let toastTimer;

    function init() {
      state.rng = createRng(state.seed);
      detectEffectBackground();
      createSlots();
      newRound(true);
      bindEvents();
      render();
    }

    function detectEffectBackground() {
      const forced = new URLSearchParams(window.location.search).get("bg");
      if (forced) {
        setEffectBackground(forced === "1" ? "effect-bg.png" : forced);
        return;
      }
      const candidates = ["effect-bg.png", "effect-bg.jpg", "abyss-effect.png", "abyss-effect.jpg"];
      for (const src of candidates) {
        const image = new Image();
        image.onload = () => {
          if (document.body.classList.contains("bg-mode")) return;
          setEffectBackground(src);
        };
        image.src = `${src}?v=${Date.now()}`;
      }
    }

    function setEffectBackground(src) {
      document.documentElement.style.setProperty("--effect-bg", `url("${src}")`);
      document.body.classList.add("bg-mode");
      render();
    }

    function bindEvents() {
      els.pull.addEventListener("click", pullLever);
      els.refresh.addEventListener("click", discardCards);
      els.nextBlind.addEventListener("click", nextBlind);
      els.cashout.addEventListener("click", cashoutBlind);
      els.shopReroll.addEventListener("click", refreshShop);
      els.restart.addEventListener("click", restartGame);
      els.continue.addEventListener("click", () => els.overlay.classList.remove("show"));
      els.sound.addEventListener("click", () => {
        state.sound = !state.sound;
        toast(state.sound ? "音效已接入。" : "音效已断开。");
      });
      els.reset.addEventListener("click", restartGame);
      els.help.addEventListener("click", () => {
        toast("目标会指数增长。稳玩会断流，贪多会熔毁。");
      });
      els.codex.addEventListener("click", showResourceModal);
      els.deckButton.addEventListener("click", showResourceModal);
      els.resourceClose.addEventListener("click", hideResourceModal);
      els.resourceOverlay.addEventListener("click", (event) => {
        if (event.target === els.resourceOverlay) hideResourceModal();
      });

      window.addEventListener("keydown", (event) => {
        if (event.code === "Space") {
          event.preventDefault();
          if (!state.settling) pullLever();
        }
        if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          els.refresh.click();
        }
        if (event.key === "Escape") {
          state.selected = null;
          render();
        }
      });
    }

    function createSlots() {
      els.slots.innerHTML = "";
      for (let i = 0; i < slotCount; i += 1) {
        const wrap = document.createElement("div");
        wrap.className = "slot-wrap";
        wrap.innerHTML = `
          <div class="slot-label">选牌 ${i + 1}</div>
          <div class="slot empty" data-slot="${i}" aria-label="选中牌 ${i + 1}"></div>
        `;
        const slot = wrap.querySelector(".slot");
        slot.addEventListener("dragover", onSlotDragOver);
        slot.addEventListener("dragleave", onSlotDragLeave);
        slot.addEventListener("drop", onSlotDrop);
        slot.addEventListener("click", () => onSlotClick(i));
        els.slots.appendChild(wrap);
      }
    }

    function newRound(first = false) {
      state.slots = Array(slotCount).fill(null);
      state.selectedCards = [];
      state.selected = null;
      state.score = 0;
      state.hands = maxHands;
      state.discards = maxDiscards;
      state.phase = "blind";
      state.packChoices = [];
      state.bossRule = currentBlind().id === "boss" ? pickBossRule() : null;
      drawHand();
      if (first) {
        logLine(`牌局开始：Ante ${state.ante} ${currentBlind().name}，目标 ${scoreText(currentTarget())}。Seed ${state.seed}。`);
      } else {
        logLine(`进入 Ante ${state.ante} ${currentBlind().name}，目标 ${scoreText(currentTarget())}。`);
      }
      if (state.bossRule) logLine(`Boss 规则：${state.bossRule.name} - ${state.bossRule.text}`, "danger");
    }

    function drawHand() {
      state.deck = buildDrawPile();
      state.discardPile = [];
      state.hand = [];
      refillHand();
    }

    function refillHand() {
      while (state.hand.length < handSize) {
        if (!state.deck.length) {
          if (!state.discardPile.length) break;
          state.deck = shuffle(state.discardPile.splice(0));
        }
        state.hand.push(state.deck.pop());
      }
    }

    function buildDrawPile() {
      const base = createStandardDeck().map(createBaseCardTemplate);
      const extras = state.extraCards.map(createBaseCardTemplate);
      return shuffle([...base, ...extras].map(makeInstance));
    }

    function pickBossRule() {
      return bossRules[(state.ante + state.blindIndex + randInt(0, bossRules.length - 1)) % bossRules.length];
    }

    function makeInstance(module) {
      return {
        uid: `${module.id}-${state.uidCounter += 1}`,
        ...module
      };
    }

    function render() {
      els.cash.textContent = String(state.cash);
      if (els.roundDisplay) els.roundDisplay.textContent = `${state.blindIndex + 1}/8`;
      els.score.textContent = scoreText(state.score);
      els.target.textContent = scoreText(currentTarget());
      els.blindName.textContent = currentBlind().name;
      els.handsLeft.textContent = `${state.hands} / ${maxHands}`;
      els.discardsLeft.textContent = `${state.discards} / ${maxDiscards}`;
      els.targetMeta.textContent = state.bossRule
        ? `Ante ${state.ante} · ${state.bossRule.name} · 牌堆 ${state.deck.length}`
        : `Ante ${state.ante} · 奖励 ${money(clearReward())} · 牌堆 ${state.deck.length}`;
      const hasModule = selectedPlayCards().length > 0;
      const hasPlayedCards = state.slots.some(Boolean);
      const inBlind = state.phase === "blind";
      const showPlayedCards = state.settling && hasPlayedCards;
      document.body.classList.toggle("no-play-cards", !showPlayedCards && inBlind);
      renderPressure(state.pressure);
      renderSlots(showPlayedCards ? -1 : null);
      renderRack();
      renderOwnedJokerStrip();
      renderLog();
      renderPreview();
      renderEngine();
      renderDeck();
      renderHandReference();
      renderPayout();
      renderShop();

      els.pull.disabled = state.settling || !hasModule || !inBlind;
      els.refresh.disabled = state.settling || !inBlind || state.discards <= 0;
      document.body.classList.toggle("settling", state.settling);
      document.body.classList.toggle("critical", state.pressure >= 80 && !state.settling);
      document.body.classList.toggle("payout-open", state.phase === "payout");
      document.body.classList.toggle("shop-open", state.phase === "shop");
    }

    function renderPressure(value) {
      const clamped = Math.max(0, Math.min(100, value));
      const angle = 220 + (clamped / 100) * 140;
      els.needle.style.setProperty("--needle", `${angle}deg`);
      els.pressure.textContent = String(Math.round(value));
    }

    function renderSlots(active = -1) {
      const hasCards = state.slots.some(Boolean);
      els.slots.hidden = !hasCards && active === null;
      if (!hasCards && active === null) {
        els.slots.innerHTML = "";
        els.slots.classList.add("slots-empty");
        return;
      }
      els.slots.hidden = false;
      if (els.slots.querySelectorAll(".slot").length !== slotCount) createSlots();
      els.slots.classList.remove("slots-empty");
      const nodes = [...els.slots.querySelectorAll(".slot")];
      nodes.forEach((slot, index) => {
        slot.className = "slot";
        slot.dataset.slot = String(index);
        slot.innerHTML = "";
        if (active === index) slot.classList.add("active");
        const item = state.slots[index];
        if (!item) {
          slot.classList.add("empty");
        } else {
          slot.appendChild(createCard(item, "slot"));
        }
      });
    }

    function renderRack() {
      els.rack.innerHTML = "";
      if (!state.hand.length) {
        const empty = document.createElement("div");
        empty.className = "run-meta";
        empty.textContent = "手牌已空。";
        els.rack.appendChild(empty);
        return;
      }

      state.hand
        .filter((module) => !(state.settling && isSelectedForPlay(module.uid)))
        .forEach((module) => {
        els.rack.appendChild(createCard(module, "rack"));
        });
    }

    function renderLog() {
      els.log.innerHTML = state.log.map((entry) => `<div class="${entry.type || ""}">${entry.text}</div>`).join("");
      els.log.scrollTop = els.log.scrollHeight;
    }

    function renderPreview() {
      const hand = currentHandPreview();
      els.previewProfit.textContent = `${Math.round(hand.base)}`;
      els.previewPressure.textContent = `x${hand.mult.toFixed(2)}`;
      els.previewRisk.textContent = hand.sequence ? hand.sequence.name : "未出牌";
    }

    function renderEngine() {
      const hand = currentHandPreview();
      const filled = selectedPlayCards().length;
      const multiplier = hand.mult;
      const base = hand.base;
      const handLevel = hand.sequence ? state.handLevels[hand.sequence.id] || 1 : 1;
      if (els.handNameDisplay) els.handNameDisplay.textContent = hand.sequence ? hand.sequence.name : "未出牌";
      if (els.handLevelDisplay) els.handLevelDisplay.textContent = `等级${handLevel}`;
      if (els.multiplierDisplay) els.multiplierDisplay.textContent = `x${multiplier.toFixed(2)}`;
      if (els.baseDisplay) els.baseDisplay.textContent = `${Math.round(base)}`;
      if (els.voltDisplay) els.voltDisplay.textContent = `x${multiplier.toFixed(2)}`;
      if (els.yieldBoost) els.yieldBoost.textContent = `x${multiplier.toFixed(2)}`;
      if (els.chainGain) els.chainGain.textContent = hand.sequence ? hand.sequence.name : "未出牌";
      if (els.overloadGain) els.overloadGain.textContent = `+${state.redHeatStacks}`;
      if (els.chainText) els.chainText.textContent = `${filled} / ${slotCount}`;
      if (els.pressureTrend) els.pressureTrend.textContent = `${filled} / ${slotCount}`;
      document.querySelectorAll(".chain-track i").forEach((segment, index) => {
        segment.classList.toggle("lit", index < filled);
      });
      document.documentElement.style.setProperty("--chain-fill", `${filled / slotCount}`);
      document.documentElement.style.setProperty("--engine-heat", `${Math.min(1, Math.max(0, state.pressure / 100))}`);
    }

    function renderHandReference() {
      if (!els.handTable) return;
      els.handTable.innerHTML = sequenceCatalog.map((sequence) => {
        const leveled = sequenceAtLevel(sequence, state.handLevels[sequence.id] || 1);
        return `<div><strong>${sequence.name} Lv.${leveled.level} </strong><span>| ${leveled.base} · x${leveled.mult.toFixed(1)}</span></div>`;
      }).join("");
    }

    function renderOwnedJokerStrip() {
      if (!els.jokerStrip) return;
      if (!state.ownedJokers.length) {
        els.jokerStrip.innerHTML = Array.from({ length: 5 }, (_, index) => (
          `<div class="joker-empty" aria-label="空 Joker 位 ${index + 1}"></div>`
        )).join("");
        return;
      }
      els.jokerStrip.innerHTML = state.ownedJokers
        .map((id, index) => {
          const joker = shopJokerCatalog.find((item) => item.id === id);
          if (!joker) return "";
          const tones = ["red", "violet", "cyan", "amber", "green"];
          return `
            <article class="joker-card ${tones[index % tones.length]}">
              <span>JOKER</span>
              <strong>${joker.name}</strong>
              <p>${joker.text}</p>
            </article>
          `;
        })
        .join("");
    }

    function renderDeck() {
      if (!els.deckCount) return;
      const total = 52 + state.extraCards.length;
      els.deckCount.textContent = `${state.deck.length} / ${total}`;
    }

    function showResourceModal() {
      renderResourceModal();
      els.resourceOverlay.hidden = false;
      requestAnimationFrame(() => els.resourceOverlay.classList.add("show"));
    }

    function hideResourceModal() {
      els.resourceOverlay.classList.remove("show");
      setTimeout(() => {
        els.resourceOverlay.hidden = true;
      }, 120);
    }

    function renderResourceModal() {
      const handRows = sequenceCatalog.map((sequence) => {
        const leveled = sequenceAtLevel(sequence, state.handLevels[sequence.id] || 1);
        return `<div><strong>${sequence.name} Lv.${leveled.level}</strong><span>${leveled.base} x${leveled.mult.toFixed(1)}</span></div>`;
      }).join("");
      els.resourceBody.innerHTML = `
        <section class="resource-section">
          <h3>牌型</h3>
          <div class="resource-table">${handRows}</div>
        </section>
        <section class="resource-section">
          <h3>红温核心</h3>
          <div class="resource-table">
            <div><strong>热压曲柄</strong><span>压力每 1 点，倍率 +0.15</span></div>
            <div><strong>红区协议</strong><span>进入 80+ 红区，倍率 x2</span></div>
            <div><strong>熔炉临界</strong><span>压力超过 90，基础分 x2</span></div>
            <div><strong>红温记忆</strong><span>每次进红区，永久倍率 +1</span></div>
            <div><strong>回声过载</strong><span>进红区后最后一张牌重复触发</span></div>
          </div>
        </section>
        <section class="resource-section">
          <h3>当前资源</h3>
          <div class="resource-table">
            <div><strong>金币</strong><span>${money(state.cash)}</span></div>
            <div><strong>压力</strong><span>${Math.round(state.pressure)} / 100</span></div>
            <div><strong>牌组</strong><span>${state.deck.length} / ${52 + state.extraCards.length}</span></div>
          </div>
        </section>
      `;
    }

    function createCard(module, location) {
      const face = cardFace(module);
      const card = document.createElement("article");
      card.className = `card base-card ${location === "rack" ? "in-rack" : ""}`;
      card.draggable = false;
      card.dataset.uid = module.uid;
      card.style.setProperty("--card-a", module.style[0]);
      card.style.setProperty("--card-b", module.style[1]);
      card.style.setProperty("--icon", module.style[2]);
      card.style.setProperty("--name", module.style[3]);
      card.style.setProperty("--card-border", module.style[4]);
      card.style.setProperty("--card-glow", `${module.style[2]}44`);
      card.style.setProperty("--phase", phaseInfo(module).color);
      card.style.setProperty("--suit-color", phaseInfo(module).color);
      card.classList.add(phaseInfo(module).suitTone === "red" ? "red-suit" : "black-suit");
      if (location === "rack" && isSelectedForPlay(module.uid)) card.classList.add("selected");

      card.innerHTML = `
        <div class="card-corner top">
          <strong>${face.points}</strong>
          <span>${face.suit}</span>
        </div>
        <div class="card-center ${face.centerClass}">
          ${renderCardCenter(face)}
        </div>
        <div class="card-corner bottom">
          <strong>${face.points}</strong>
          <span>${face.suit}</span>
        </div>
        <div class="card-pressure ${face.pressureKind}">${face.pressure}</div>
      `;

      card.addEventListener("dragstart", (event) => {
        if (state.settling || state.phase !== "blind") return;
        event.dataTransfer.setData("text/plain", module.uid);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", (event) => {
        event.stopPropagation();
        if (state.settling || state.phase !== "blind") return;
        if (location === "slot") {
          unplaceModule(module.uid);
          return;
        }
        if (location === "rack") {
          toggleCardSelection(module.uid);
          return;
        }
      });
      return card;
    }

    const pipLayouts = {
      2: ["top-center", "bottom-center"],
      3: ["top-center", "middle-center", "bottom-center"],
      4: ["top-left", "top-right", "bottom-left", "bottom-right"],
      5: ["top-left", "top-right", "middle-center", "bottom-left", "bottom-right"],
      6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"],
      7: ["top-left", "top-right", "upper-center", "middle-left", "middle-right", "bottom-left", "bottom-right"],
      8: ["top-left", "top-right", "upper-center", "middle-left", "middle-right", "lower-center", "bottom-left", "bottom-right"],
      9: ["top-left", "top-right", "upper-left", "upper-right", "middle-center", "lower-left", "lower-right", "bottom-left", "bottom-right"],
      10: ["top-left", "top-right", "upper-left", "upper-right", "mid-upper-center", "mid-lower-center", "lower-left", "lower-right", "bottom-left", "bottom-right"]
    };

    function renderCardCenter(face) {
      const pips = pipLayouts[face.rank];
      if (pips) {
        return `<div class="pip-grid">${pips.map((position) => `<span class="pip ${position}">${face.suit}</span>`).join("")}</div>`;
      }
      const faceKind = face.rank === 14 ? "ace" : "royal";
      return `
        <div class="face-mark ${faceKind}">
          <strong>${face.points}</strong>
          <span>${face.suit}</span>
        </div>
      `;
    }

    function cardFace(module) {
      const rank = Number(module.rank || module.chips || 0);
      return {
        suit: phaseInfo(module).icon,
        rank,
        points: module.rankLabel || module.chips || 0,
        pressure: `▲${module.pressureCost || 0}`,
        pressureKind: module.pressureCost >= 5 ? "hot" : "cool",
        centerClass: rank >= 2 && rank <= 10 ? `pip-card rank-${rank}` : "face-card"
      };
    }

    function phaseInfo(module) {
      return PHASES[module.phase] || PHASES.kinetic;
    }

    function moduleTriggerText(module) {
      const labels = [triggerLabels[module.trigger || EVENTS.ON_RESOLVE]];
      if (module.guardTrigger) labels.push(triggerLabels[module.guardTrigger]);
      if (module.thresholdTrigger) labels.push(triggerLabels[module.thresholdTrigger]);
      return labels.filter(Boolean).join(" / ");
    }

    function onSlotDragOver(event) {
      event.preventDefault();
      event.currentTarget.classList.add("drop-ready");
    }

    function onSlotDragLeave(event) {
      event.currentTarget.classList.remove("drop-ready");
    }

    function onSlotDrop(event) {
      event.preventDefault();
      const uid = event.dataTransfer.getData("text/plain");
      event.currentTarget.classList.remove("drop-ready");
      toggleCardSelection(uid);
    }

    function onSlotClick(index) {
      if (!state.settling || state.phase !== "blind") return;
    }

    function toggleCardSelection(uid) {
      if (isSelectedForPlay(uid)) {
        state.selectedCards = state.selectedCards.filter((cardUid) => cardUid !== uid);
        tick(128, 0.03, "square");
        render();
        return;
      }
      if (state.selectedCards.length >= slotCount) {
        toast("最多选择 5 张牌。");
        return;
      }
      if (!state.hand.some((card) => card.uid === uid)) return;
      state.selectedCards.push(uid);
      tick(160, 0.035, "triangle");
      render();
    }

    function isSelectedForPlay(uid) {
      return state.selectedCards.includes(uid);
    }

    function placeModule(uid, index) {
      toggleCardSelection(uid);
    }

    function unplaceModule(uid) {
      if (isSelectedForPlay(uid)) toggleCardSelection(uid);
    }

    function discardCards() {
      if (state.settling || state.phase !== "blind") return;
      if (state.discards <= 0) {
        toast("没有弃牌次数了。");
        return;
      }

      const selected = selectedPlayCards();
      if (!selected.length) {
        toast("先选择要弃掉的牌。");
        return;
      }
      const discarded = new Set(selected.map((card) => card.uid));
      moveToDiscard(selected);
      state.hand = state.hand.filter((card) => !discarded.has(card.uid));
      state.slots = Array(slotCount).fill(null);
      state.selectedCards = [];
      logLine(`弃掉 ${selected.length} 张牌。`, "warn");
      state.discards -= 1;
      state.selected = null;
      refillHand();
      tick(180, 0.04, "triangle");
      render();
    }

    async function pullLever() {
      if (state.settling) return;
      const selected = selectedPlayCards();
      if (!selected.length) {
        toast("至少打出一张牌。");
        return;
      }

      state.slots = selected.concat(Array(slotCount).fill(null)).slice(0, slotCount);
      state.settling = true;
      els.overlay.classList.remove("show");
      state.hands -= 1;
      logLine(`Ante ${state.ante} ${currentBlind().name} 出牌。`, "warn");
      tick(96, 0.05, "sawtooth");
      render();

      const run = createRunState(state, baseProfit());
      const sequence = evaluateIgnitionSequence(state.slots);
      const sequenceLevel = state.handLevels[sequence.id] || 1;
      const leveledSequence = applyIgnitionSequence(run, sequence, sequenceLevel);
      applySimpleJokers(run, state.ownedJokers);
      logLine(`牌型：Lv.${sequenceLevel} ${leveledSequence.name}，基础 ${leveledSequence.base}，倍率 x${leveledSequence.mult.toFixed(2)}${leveledSequence.limit ? `，红线 +${leveledSequence.limit}` : ""}。`, leveledSequence.limit ? "warn" : "");
      logRedHeat(applyRedHeatCore(run, { ownedJokers: state.ownedJokers, onPermanentStack: addRedHeatStack }));
      applyBossStart(run);

      if (state.baseDebt > 0) {
        logLine(`旧债点火：基础压力 +${state.baseDebt}`, "danger");
        await animatePressure(state.pressure, run.pressure);
      }

      for (let index = 0; index < state.slots.length; index += 1) {
        const module = state.slots[index];
        if (!module) continue;
        const saved = await resolveSlot(index, module, run);
        if (!saved) return;
      }

      const lastIndex = lastFilledSlotIndex();
      if (run.redlineRepeatLast && !run.redlineRepeatUsed && lastIndex !== -1) {
        run.redlineRepeatUsed = true;
        logLine(`回声过载：最后一张牌重复触发。`, "danger");
        const saved = await resolveSlot(lastIndex, state.slots[lastIndex], run, true);
        if (!saved) return;
      }

      renderSlots();
      await finishRun(run);
    }

    async function resolveSlot(index, module, run, repeated = false) {
      renderSlots(index);
      tick(repeated ? 82 : 180 + index * 34, repeated ? 0.12 : 0.06, repeated ? "sawtooth" : index % 2 ? "square" : "sawtooth");
      await wait(repeated ? 360 : 470);

      const beforePressure = run.pressure;
      const beforeBase = run.base;
      const beforeMult = run.multiplier;
      const message = resolveModule(module, run);
      const bossMessage = applyBossModule(run, module);
      const redHeatMessages = applyRedHeatCore(run, { ownedJokers: state.ownedJokers, onPermanentStack: addRedHeatStack });
      const afterBase = run.base;
      const afterMult = run.multiplier;

      logLine(`${repeated ? "回声牌" : `第 ${index + 1} 张`}：${message}${bossMessage ? ` / ${bossMessage}` : ""}`, run.pressure >= 80 ? "danger" : "");
      logRedHeat(redHeatMessages);
      await Promise.all([
        animatePressure(beforePressure, run.pressure),
        animateDualCore(beforeBase, afterBase, beforeMult, afterMult)
      ]);
      shake(Math.min(24, 2 + run.pressure / 7 + (repeated ? 8 : 0)));

      if (run.pressure > run.explosionLimit) {
        return resolveExplosion(run, index);
      }
      return true;
    }

    function logRedHeat(messages) {
      messages.forEach((message) => logLine(message, message.includes("红区") || message.includes("临界") || message.includes("回声") ? "danger" : "warn"));
    }

    function addRedHeatStack(amount) {
      state.redHeatStacks += amount;
    }

    function applyBossStart(run) {
      if (!state.bossRule || typeof state.bossRule.applyStart !== "function") return;
      const before = run.pressure;
      state.bossRule.applyStart(run, state.slots);
      if (run.pressure !== before) {
        logLine(`Boss 规则触发：${state.bossRule.name}，压力 ${formatSigned(Math.round(run.pressure - before))}`, "danger");
      }
      logRedHeat(applyRedHeatCore(run, { ownedJokers: state.ownedJokers, onPermanentStack: addRedHeatStack }));
    }

    function applyBossModule(run, module) {
      if (!state.bossRule || typeof state.bossRule.applyModule !== "function") return "";
      const beforePressure = run.pressure;
      const beforeBase = run.base;
      state.bossRule.applyModule(run, module);
      const pressureDelta = Math.round(run.pressure - beforePressure);
      const baseDelta = Math.round(run.base - beforeBase);
      if (!pressureDelta && !baseDelta) return "";
      const parts = [];
      if (pressureDelta) parts.push(`压力 ${formatSigned(pressureDelta)}`);
      if (baseDelta) parts.push(`基础 ${formatSigned(baseDelta)}`);
      return `Boss ${parts.join("，")}`;
    }

    function lastFilledSlotIndex() {
      for (let index = state.slots.length - 1; index >= 0; index -= 1) {
        if (state.slots[index]) return index;
      }
      return -1;
    }

    async function resolveExplosion(run, index) {
      if (run.fuses > 0) {
        run.fuses -= 1;
        run.pressure = Math.max(0, run.explosionLimit - 6);
        logLine(`ON_EXPLODE：第 ${index + 1} 张后触发熔断器，爆炸被压回红线内。`, "danger");
        tick(54, 0.16, "sawtooth");
        await animatePressure(112, run.pressure);
        shake(18);
        return true;
      }

      if (run.insurance) {
        const salvage = Math.floor(currentRunProfit(run) * 0.5);
        state.cash += salvage;
        run.insurance = false;
        run.pressure = Math.max(0, run.explosionLimit - 4);
        run.base = Math.max(40, Math.floor(run.base * 0.35));
        run.multiplier = 1;
        logLine(`ON_EXPLODE：余烬保险保留 ${money(salvage)}，本轮收益烧成余烬。`, "danger");
        tick(72, 0.15, "triangle");
        await animatePressure(114, run.pressure);
        animateCash(state.cash - salvage, state.cash);
        shake(18);
        return true;
      }

      state.pressure = run.pressure;
      renderPressure(state.pressure);
      document.body.classList.add("boom");
      buzz();
      shake(28);
      logLine("压力越过 100，红温爆表。", "danger");
      await wait(700);
      document.body.classList.remove("boom");
      state.settling = false;
      render();
      endGame("红温爆表", "你把收益推上去了，也把压力推过了熔毁线。");
      return false;
    }

    async function finishRun(run) {
      const profit = currentRunProfit(run);
      const oldScore = state.score;
      state.score += profit;
      state.pressure = Math.max(0, Math.round(run.pressure - 16));
      state.baseDebt = run.nextDebt;

      tick(440, 0.11, "triangle");
      logLine(`本手得分 ${scoreText(profit)}，盲注累计 ${scoreText(state.score)}，残余压力 ${state.pressure}。`);
      await Promise.all([
        animateScore(oldScore, state.score),
        animatePressure(run.pressure, state.pressure)
      ]);

      const target = currentTarget();
      if (state.score < target && state.hands <= 0) {
        state.settling = false;
        render();
        endGame("盲注失败", `目标是 ${scoreText(target)}，你停在了 ${scoreText(state.score)}。`);
        return;
      }

      if (state.score < target) {
        removePlayedCards();
        refillHand();
        state.settling = false;
        render();
        return;
      }

      state.best = Math.max(state.best, state.ante);
      localStorage.setItem("abyss-best", String(state.best));
      state.payout = createPayoutBreakdown();
      logLine(`盲注通过：可提现 ${money(state.payout.total)}。`);

      if (state.ante >= anteTargets.length && state.blindIndex >= blinds.length - 1) {
        state.cash += state.payout.total;
        state.payout = null;
        state.settling = false;
        render();
        endGame("牌局完成", `你带着 ${money(state.cash)} 离桌。`);
        return;
      }

      state.phase = "payout";
      state.slots = Array(slotCount).fill(null);
      state.selectedCards = [];
      state.selected = null;
      state.settling = false;
      render();
    }

    function removePlayedCards() {
      const playedCards = state.slots.filter(Boolean);
      const played = new Set(playedCards.map((card) => card.uid));
      moveToDiscard(playedCards);
      state.hand = state.hand.filter((card) => !played.has(card.uid));
      state.slots = Array(slotCount).fill(null);
      state.selectedCards = [];
      state.selected = null;
    }

    function moveToDiscard(cards) {
      const moved = cards.filter(Boolean);
      if (moved.length) state.discardPile.push(...moved);
    }

    function selectedPlayCards() {
      const byUid = new Map(state.hand.map((card) => [card.uid, card]));
      return state.selectedCards.map((uid) => byUid.get(uid)).filter(Boolean);
    }

    function currentHandPreview() {
      const selected = selectedPlayCards();
      if (!selected.length) {
        return { base: 0, mult: 1, sequence: null };
      }
      const sequence = evaluateIgnitionSequence(selected, slotCount);
      const level = state.handLevels[sequence.id] || 1;
      const leveled = sequenceAtLevel(sequence, level);
      return {
        base: leveled.base,
        mult: leveled.mult,
        sequence: leveled
      };
    }

    function baseProfit() {
      return 0;
    }

    function currentBlind() {
      return blinds[state.blindIndex] || blinds[0];
    }

    function currentTarget() {
      return Math.round((anteTargets[state.ante - 1] || anteTargets.at(-1)) * currentBlind().mult);
    }

    function createPayoutBreakdown() {
      const blindReward = currentBlind().reward;
      const handsBonus = Math.max(0, state.hands);
      const interest = Math.min(5, Math.floor(state.cash / 5));
      return {
        target: currentTarget(),
        blindName: currentBlind().name,
        blindReward,
        handsBonus,
        interest,
        total: blindReward + handsBonus + interest
      };
    }

    function clearReward() {
      const payout = createPayoutBreakdown();
      return payout.total;
    }

    function cashoutBlind() {
      if (state.phase !== "payout" || !state.payout) return;
      const payout = state.payout;
      const before = state.cash;
      state.cash += payout.total;
      state.payout = null;
      logLine(`提现 ${money(payout.total)}：盲注 ${money(payout.blindReward)}，剩余出牌 ${money(payout.handsBonus)}，利息 ${money(payout.interest)}。`);
      animateCash(before, state.cash);
      enterShop();
      render();
    }

    function enterShop() {
      state.phase = "shop";
      state.slots = Array(slotCount).fill(null);
      state.selectedCards = [];
      state.selected = null;
      state.payout = null;
      state.packChoices = [];
      state.shop = buildShopOffers();
      toast("盲注通过，进入商店。");
      requestAnimationFrame(() => els.shopPanel?.scrollIntoView({ block: "start", behavior: "smooth" }));
    }

    function nextBlind() {
      if (state.phase !== "shop") return;
      state.blindIndex += 1;
      if (state.blindIndex >= blinds.length) {
        state.blindIndex = 0;
        state.ante += 1;
      }
      newRound();
      render();
    }

    function buyJoker(id) {
      if (state.phase !== "shop") return;
      const offer = shopJokerCatalog.find((joker) => joker.id === id);
      if (!offer) return;
      if (state.ownedJokers.includes(id)) {
        toast("已经拥有这张 Joker。");
        return;
      }
      if (state.cash < offer.price) {
        toast("资金不够。");
        return;
      }
      state.cash -= offer.price;
      state.ownedJokers.push(id);
      state.shop = state.shop.filter((item) => item.id !== id);
      logLine(`购买 Joker：${offer.name}。`);
      render();
    }

    function buildShopOffers() {
      const jokerOffers = shuffle([...shopJokerCatalog])
        .filter((offer) => !state.ownedJokers.includes(offer.id))
        .slice(0, 2)
        .map((offer) => ({ ...offer, type: "joker" }));
      const upgradeOffers = shuffle([...sequenceCatalog])
        .slice(0, 1)
        .map((sequence) => createUpgradeOffer(sequence.id));
      return shuffle([
        ...jokerOffers,
        ...upgradeOffers,
        { type: "pack", id: "standard-pack", name: "违禁卡包", price: packPrice, text: "打开 3 张标准牌，选择 1 张复制进之后的牌堆。" }
      ]);
    }

    function createUpgradeOffer(sequenceId) {
      const sequence = SEQUENCES[sequenceId];
      const level = state.handLevels[sequenceId] || 1;
      return {
        type: "upgrade",
        id: `upgrade-${sequenceId}`,
        sequenceId,
        name: `升级：${sequence.name}`,
        price: upgradePrice(sequenceId),
        text: `当前 Lv.${level}，升级后基础 +${sequence.baseGrowth}，倍率 +${sequence.multGrowth.toFixed(2)}。`
      };
    }

    function upgradePrice(sequenceId) {
      const level = state.handLevels[sequenceId] || 1;
      return 3 + level * 2;
    }

    function buyUpgrade(sequenceId) {
      if (state.phase !== "shop") return;
      const sequence = SEQUENCES[sequenceId];
      if (!sequence) return;
      const price = upgradePrice(sequenceId);
      if (state.cash < price) {
        toast("资金不够。");
        return;
      }
      state.cash -= price;
      state.handLevels[sequenceId] = (state.handLevels[sequenceId] || 1) + 1;
      state.shop = state.shop.filter((item) => item.sequenceId !== sequenceId);
      logLine(`升级牌型：${sequence.name} 到 Lv.${state.handLevels[sequenceId]}。`, "warn");
      render();
    }

    function buyPack() {
      if (state.phase !== "shop") return;
      if (state.cash < packPrice) {
        toast("资金不够。");
        return;
      }
      state.cash -= packPrice;
      state.packChoices = shuffle(createStandardDeck()).slice(0, 3);
      state.shop = state.shop.filter((item) => item.type !== "pack");
      logLine("打开违禁卡包：选择 1 张牌加入之后的牌堆。", "warn");
      render();
    }

    function pickPackCard(deckId) {
      if (state.phase !== "shop") return;
      const card = state.packChoices.find((choice) => choice.deckId === deckId);
      if (!card) return;
      state.extraCards.push({ ...card });
      state.packChoices = [];
      logLine(`卡包加入：${card.rankLabel}${phaseInfo(card).icon}。`, "warn");
      render();
    }

    function refreshShop() {
      if (state.phase !== "shop") return;
      if (state.cash < shopRefreshPrice) {
        toast("刷新资金不够。");
        return;
      }
      state.cash -= shopRefreshPrice;
      state.packChoices = [];
      state.shop = buildShopOffers();
      logLine(`刷新商店：花费 ${money(shopRefreshPrice)}。`, "warn");
      render();
    }

    function sellJoker(id) {
      if (state.phase !== "shop") return;
      const offer = shopJokerCatalog.find((joker) => joker.id === id);
      if (!offer || !state.ownedJokers.includes(id)) return;
      const refund = Math.max(1, Math.floor(offer.price / 2));
      state.ownedJokers = state.ownedJokers.filter((jokerId) => jokerId !== id);
      state.cash += refund;
      logLine(`出售 Joker：${offer.name}，回收 ${money(refund)}。`, "warn");
      render();
    }

    function renderShop() {
      if (!els.shopPanel) return;
      const open = state.phase === "shop";
      els.shopPanel.classList.toggle("show", open);
      els.shopPanel.hidden = !open;
      if (!open) return;
      if (els.shopReroll) els.shopReroll.textContent = `重掷 ${money(shopRefreshPrice)}`;

      els.ownedJokers.innerHTML = renderOwnedJokers();
      els.shopList.innerHTML = `
        ${state.shop.map(renderShopOffer).join("") || `<div class="run-meta">商店已售空。</div>`}
        ${renderPackChoices()}
      `;
      els.shopList.querySelectorAll("[data-buy-joker]").forEach((button) => {
        button.addEventListener("click", () => buyJoker(button.dataset.buyJoker));
      });
      els.shopList.querySelectorAll("[data-buy-upgrade]").forEach((button) => {
        button.addEventListener("click", () => buyUpgrade(button.dataset.buyUpgrade));
      });
      els.shopList.querySelectorAll("[data-buy-pack]").forEach((button) => {
        button.addEventListener("click", buyPack);
      });
      els.shopList.querySelectorAll("[data-pick-pack]").forEach((button) => {
        button.addEventListener("click", () => pickPackCard(button.dataset.pickPack));
      });
      els.ownedJokers.querySelectorAll("[data-sell-joker]").forEach((button) => {
        button.addEventListener("click", () => sellJoker(button.dataset.sellJoker));
      });
    }

    function renderPayout() {
      if (!els.payoutPanel) return;
      const open = state.phase === "payout" && state.payout;
      els.payoutPanel.hidden = !open;
      els.payoutPanel.classList.toggle("show", Boolean(open));
      if (!open) return;

      const payout = state.payout;
      els.cashout.textContent = `提现：${money(payout.total)}`;
      els.payoutTarget.textContent = scoreText(payout.target);
      els.payoutRating.textContent = "$".repeat(Math.max(1, Math.min(5, payout.total)));
      els.payoutBlindText.textContent = `${payout.blindName} 奖励`;
      els.payoutBlindReward.textContent = money(payout.blindReward);
      els.payoutHandsText.textContent = `剩余出牌次数 ${state.hands}（每次 $1）`;
      els.payoutHandsReward.textContent = money(payout.handsBonus);
      els.payoutInterestText.textContent = `每 $5 获得 $1 利息（最高 $5）`;
      els.payoutInterestReward.textContent = money(payout.interest);
    }

    function renderOwnedJokers() {
      if (!state.ownedJokers.length) return "已拥有：无";
      const jokers = state.ownedJokers
        .map((id) => shopJokerCatalog.find((joker) => joker.id === id))
        .filter(Boolean)
        .map((joker) => `<button class="owned-joker" type="button" data-sell-joker="${joker.id}" title="出售 ${joker.name}">${joker.name} · 售 ${money(Math.max(1, Math.floor(joker.price / 2)))}</button>`)
        .join("");
      return `<div>已拥有：</div><div class="owned-joker-list">${jokers}</div>`;
    }

    function renderShopOffer(offer) {
      const action = offer.type === "joker"
        ? `data-buy-joker="${offer.id}"`
        : offer.type === "upgrade"
          ? `data-buy-upgrade="${offer.sequenceId}"`
          : `data-buy-pack="${offer.id}"`;
      const label = offer.type === "joker" ? "JOKER" : offer.type === "upgrade" ? "VOUCHER" : "PACK";
      return `
        <button class="shop-card ${offer.type}" type="button" ${action}>
          <span class="shop-card-price">${money(offer.price)}</span>
          <span class="shop-card-kind">${label}</span>
          <strong>${offer.name}</strong>
          <p>${offer.text}</p>
        </button>
      `;
    }

    function renderPackChoices() {
      if (!state.packChoices.length) return "";
      return `
        <section class="pack-choices">
          <div class="preview-title">卡包三选一</div>
          <div class="pack-choice-list">
            ${state.packChoices.map((card) => `
              <button class="pack-choice" type="button" data-pick-pack="${card.deckId}">
                <strong>${card.rankLabel}${phaseInfo(card).icon}</strong>
                <span>基础 ${card.chips} / 压力 ${card.pressureCost}</span>
              </button>
            `).join("")}
          </div>
        </section>
      `;
    }

    function restartGame() {
      state.cash = 0;
      state.score = 0;
      state.pressure = 0;
      state.ante = 1;
      state.blindIndex = 0;
      state.hands = maxHands;
      state.discards = maxDiscards;
      state.phase = "blind";
      state.baseDebt = 0;
      state.redHeatStacks = 0;
      state.ownedJokers = [];
      state.shop = [];
      state.payout = null;
      state.packChoices = [];
      state.handLevels = Object.fromEntries(sequenceCatalog.map((sequence) => [sequence.id, 1]));
      state.deck = [];
      state.discardPile = [];
      state.extraCards = [];
      state.bossRule = null;
      state.slots = Array(slotCount).fill(null);
      state.selectedCards = [];
      state.rng = createRng(state.seed);
      state.uidCounter = 0;
      state.settling = false;
      state.log = [];
      els.overlay.classList.remove("show");
      document.body.classList.remove("boom", "critical");
      newRound(true);
      render();
    }

    function endGame(title, body) {
      els.modalTitle.textContent = title;
      els.modalBody.textContent = body;
      els.overlay.classList.add("show");
      tick(title.includes("完成") ? 520 : 80, 0.18, title.includes("完成") ? "triangle" : "sawtooth");
    }

    function logLine(text, type = "") {
      state.log.push({ text, type });
      state.log = state.log.slice(-24);
      renderLog();
    }

    function toast(text) {
      clearTimeout(toastTimer);
      els.toast.textContent = text;
      els.toast.classList.add("show");
      toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
    }

    function animateCash(from, to) {
      return animateNumber(from, to, 620, (value) => {
        els.cash.textContent = money(value);
      });
    }

    function animateScore(from, to) {
      return animateNumber(from, to, 620, (value) => {
        els.score.textContent = scoreText(value);
      });
    }

    function animatePressure(from, to) {
      return animateNumber(from, to, 540, (value) => {
        state.pressure = Math.round(value);
        renderPressure(state.pressure);
        document.body.classList.toggle("critical", state.pressure >= 80);
      });
    }

    function animateDualCore(baseFrom, baseTo, multFrom, multTo) {
      const start = performance.now();
      const duration = 420;
      return new Promise((resolve) => {
        function frame(now) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const baseNow = baseFrom + (baseTo - baseFrom) * eased;
          const multNow = multFrom + (multTo - multFrom) * eased;
          if (els.baseDisplay) els.baseDisplay.textContent = `${Math.round(baseNow)} A`;
          if (els.voltDisplay) els.voltDisplay.textContent = `x${multNow.toFixed(2)}`;
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    function animateNumber(from, to, duration, renderValue) {
      const start = performance.now();
      return new Promise((resolve) => {
        function frame(now) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          renderValue(Math.round(from + (to - from) * eased));
          if (t < 1) {
            requestAnimationFrame(frame);
          } else {
            renderValue(to);
            renderPreview();
            resolve();
          }
        }
        requestAnimationFrame(frame);
      });
    }

    function shake(strength) {
      let frames = 8;
      function step() {
        const offset = (Math.random() - 0.5) * strength;
        document.documentElement.style.setProperty("--shake-x", `${offset}px`);
        frames -= 1;
        if (frames > 0) {
          requestAnimationFrame(step);
        } else {
          document.documentElement.style.setProperty("--shake-x", "0px");
        }
      }
      step();
    }

    function tick(frequency = 180, volume = 0.04, type = "square") {
      if (!state.sound) return;
      try {
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.value = volume;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);
        oscillator.stop(audioContext.currentTime + 0.13);
      } catch (error) {
        state.sound = false;
      }
    }

    function buzz() {
      if (!state.sound) return;
      [62, 74, 51, 96].forEach((frequency, index) => {
        setTimeout(() => tick(frequency, 0.14, "sawtooth"), index * 92);
      });
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function money(value) {
      return `$${Math.round(value).toLocaleString("zh-CN")}`;
    }

    function scoreText(value) {
      return Math.round(value).toLocaleString("zh-CN");
    }

    function formatSigned(value) {
      return value >= 0 ? `+${value}` : `${value}`;
    }

    function randInt(min, max) {
      return Math.floor(state.rng() * (max - min + 1)) + min;
    }

    function randFloat(min, max) {
      return state.rng() * (max - min) + min;
    }

    function shuffle(list) {
      for (let i = list.length - 1; i > 0; i -= 1) {
        const j = randInt(0, i);
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }

    function iconSvg(name) {
      const icons = {
        turbine: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22"></circle><circle cx="32" cy="32" r="8"></circle><path d="M32 10c8 7 9 14 2 22"></path><path d="M54 32c-7 8-14 9-22 2"></path><path d="M32 54c-8-7-9-14-2-22"></path><path d="M10 32c7-8 14-9 22-2"></path></svg>`,
        canister: `<svg viewBox="0 0 64 64"><path d="M24 10h16l3 8v32l-4 6H25l-4-6V18l3-8Z"></path><path d="M24 18h18"></path><path d="M25 37c7-6 14-6 19 0"></path><path d="M32 27v11"></path><path d="M27 32h10"></path></svg>`,
        dial: `<svg viewBox="0 0 64 64"><path d="M14 42a22 22 0 1 1 36 0"></path><path d="M32 42l12-18"></path><path d="M18 42h28"></path><circle cx="32" cy="42" r="4"></circle></svg>`,
        skull: `<svg viewBox="0 0 64 64"><path d="M16 29c0-12 7-20 16-20s16 8 16 20c0 7-4 11-8 14v9H24v-9c-4-3-8-7-8-14Z"></path><circle cx="25" cy="29" r="4"></circle><circle cx="39" cy="29" r="4"></circle><path d="M28 42h8"></path><path d="M27 52v-6"></path><path d="M37 52v-6"></path></svg>`,
        coin: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="18" ry="23"></ellipse><path d="M38 13c9 3 15 11 15 19s-6 16-15 19"></path><path d="M30 20v24"></path><path d="M24 26c2-4 13-5 16 0 3 6-13 6-10 12 3 5 13 4 15 0"></path></svg>`,
        bolt: `<svg viewBox="0 0 64 64"><path d="M36 6 16 35h15l-4 23 21-31H33l3-21Z"></path></svg>`,
        box: `<svg viewBox="0 0 64 64"><path d="M12 20h40v33H12z"></path><path d="M18 14h28l6 6H12l6-6Z"></path><path d="M25 31a7 7 0 1 1 12 5c-4 3-5 5-5 9"></path><path d="M32 51h.01"></path></svg>`,
        unknown: `<svg viewBox="0 0 64 64"><path d="M32 7 53 20v24L32 57 11 44V20L32 7Z"></path><path d="M25 26a8 8 0 1 1 13 6c-4 3-6 5-6 10"></path><path d="M32 49h.01"></path></svg>`,
        gauge: `<svg viewBox="0 0 64 64"><path d="M11 45a25 25 0 1 1 42 0"></path><path d="M32 45l17-20"></path><path d="M17 45h30"></path><path d="M45 16l5-5"></path><path d="M20 16l-5-5"></path></svg>`,
        shield: `<svg viewBox="0 0 64 64"><path d="M32 8 50 15v14c0 13-7 22-18 27-11-5-18-14-18-27V15l18-7Z"></path><path d="M24 33h16"></path><path d="M32 25v16"></path></svg>`
      };
      return icons[name] || icons.box;
    }

    function initialSeed() {
      const params = new URLSearchParams(window.location.search);
      return params.get("seed") || localStorage.getItem("abyss-seed") || "redline-001";
    }

    init();

const BUILD_SHA = window.__BUILD_SHA__ || 'dev';
const v=document.getElementById('buildVersion'); if (v) v.textContent = `build: ${BUILD_SHA}`;
