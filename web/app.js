(function () {
  const boardWidth = 1600;
  const boardHeight = 900;
  const redEyeThreshold = 60;
  const tiltReliefOnClear = 30;
  const targetScores = [300, 700, 1500, 3200, 7000];
  const showdownsMax = 3;
  const maxDiscards = 2;
  const logic = window.GameLogic;
  const redEyeBets = {
    replay: {
      id: "replay",
      name: "再押一手",
      icon: "♠",
      pressure: 15,
      text: "本手所有已出牌重复触发 1 次。上头值 +15。"
    },
    redDouble: {
      id: "redDouble",
      name: "红眼翻倍",
      icon: "●",
      pressure: 20,
      text: "本手倍率 ×2。上头值 +20。"
    },
    borrow: {
      id: "borrow",
      name: "借鬼钱",
      icon: "☠",
      pressure: 0,
      text: "本手筹码 +100。下一轮起始上头值 +25。"
    },
    stealLine: {
      id: "stealLine",
      name: "偷过线",
      icon: "◇",
      pressure: 0,
      text: "本手结算后，若分数达到目标 90%，直接视为达标。下一轮起始上头值 +30。"
    },
    flipDealer: {
      id: "flipDealer",
      name: "翻庄",
      icon: "↟",
      pressure: 0,
      text: "若本手过关且上头值处于 95-99，当前赌资翻倍，最多额外获得 20。"
    },
    lifeDebt: {
      id: "lifeDebt",
      name: "欠命",
      icon: "†",
      pressure: 0,
      text: "本手不会爆牌；若本应爆牌，上头值停在 99。若本手后成功过关，下一轮从 90 开始。"
    }
  };
  const phaseSuit = {
    kinetic: { suit: "♠", color: "black" },
    pulse: { suit: "♥", color: "red" },
    thermal: { suit: "♦", color: "red" },
    toxic: { suit: "♣", color: "black" }
  };
  const pipClassByRank = {
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten"
  };
  const faceSymbolByRank = {
    J: "♜",
    Q: "♕",
    K: "♛"
  };

  let currentScore = 0;
  let currentTargetScore = 300;
  let currentTilt = 0;
  let currentStake = 12;
  let roundIndex = 0;
  let settling = false;
  let rng;
  let deck = [];
  let hand = [];
  let discardPile = [];
  let showdownsLeft = showdownsMax;
  let discardsLeft = maxDiscards;
  let failed = false;
  let phase = "playing";
  let failureType = null;
  let selectedIds = new Set();
  let redEyeUnlocked = false;
  let redEyeUsedThisRound = false;
  let redEyeModalOpen = false;
  let activeRedEyeBet = null;
  let redEyeOfferIds = [];
  let pendingNextRoundTiltBonus = 0;
  let pendingNextRoundTiltOverride = null;

  const board = document.querySelector(".game-board");
  const handCards = [...document.querySelectorAll(".hand-card")];
  const playedCards = document.querySelector(".played-cards");
  const showdownButton = document.querySelector(".showdown-button");
  const discardButton = document.querySelector(".discard-button");
  const targetScoreValue = document.querySelector(".score-row .red-number");
  const scoreValue = document.querySelectorAll(".score-row strong")[1];
  const showdownCount = document.querySelectorAll(".count-stack strong")[0];
  const discardCount = document.querySelectorAll(".count-stack strong")[1];
  const handCount = document.querySelector(".hand-count");
  const handName = document.querySelector(".hand-title strong");
  const chipsChip = document.querySelector(".score-chip.blue");
  const multChip = document.querySelector(".score-chip.red");
  const chipsValue = chipsChip.querySelector("strong");
  const multValue = multChip.querySelector("strong");
  const stakeValue = document.querySelector(".stake-row strong");
  const tiltSection = document.querySelector(".tilt-meter");
  const tiltValue = document.querySelector(".section-title strong");
  const meterHand = document.querySelector(".meter-hand");
  const deckCount = document.querySelector(".deck-count");
  const jokerZone = document.querySelector(".joker-zone");
  const redEyeModal = document.querySelector(".red-eye-modal");
  const redEyeOptionsPanel = document.querySelector(".red-eye-options");
  const redEyeEntry = document.querySelector(".red-eye-entry");
  const redEyeStateText = redEyeEntry.querySelector("strong");
  const redEyeIcon = document.querySelector(".red-eye-status-icon");
  const redEyeTooltip = document.querySelector(".red-eye-tooltip");
  const failureOverlay = document.querySelector(".failure-overlay");
  const failureCard = document.querySelector(".failure-card");
  const failureTitle = document.querySelector(".failure-title");
  const failureSubtitle = document.querySelector(".failure-subtitle");
  const failureStats = document.querySelector(".failure-stats");
  const failureRestart = document.querySelector(".failure-restart");

  function fitBoard() {
    const scale = Math.min(window.innerWidth / boardWidth, window.innerHeight / boardHeight);
    document.documentElement.style.setProperty("--scale", String(scale));
  }

  function currentScale() {
    return Number(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  }

  function boardRect(rect) {
    const scale = currentScale();
    const outer = board.getBoundingClientRect();
    return {
      left: (rect.left - outer.left) / scale,
      top: (rect.top - outer.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale
    };
  }

  function formatNumber(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function initialSeed() {
    return new URLSearchParams(window.location.search).get("seed") || "abyss-ui";
  }

  function shuffle(cards) {
    const copy = [...cards];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function createPlayableCard(deckCard) {
    return {
      ...deckCard,
      uid: `${deckCard.deckId}-${Math.floor(rng() * 1000000)}`,
      trigger: "ON_RESOLVE",
      preview(run) {
        run.base += deckCard.chips;
        run.pressure += deckCard.pressureCost;
      },
      apply(run) {
        run.base += deckCard.chips;
        run.pressure += deckCard.pressureCost;
        return `${deckCard.rankLabel}${phaseSuit[deckCard.phase].suit}`;
      }
    };
  }

  function drawInitialHand() {
    rng = logic.createRng(initialSeed());
    deck = shuffle(logic.createStandardDeck()).map(createPlayableCard);
    discardPile = [];
    showdownsLeft = showdownsMax;
    discardsLeft = maxDiscards;
    failed = false;
    phase = "playing";
    failureType = null;
    pendingNextRoundTiltBonus = 0;
    pendingNextRoundTiltOverride = null;
    hand = drawCards(8);
  }

  function refillDeckFromDiscardIfNeeded(cardCount) {
    if (deck.length >= cardCount || !discardPile.length) return;
    deck = deck.concat(shuffle(discardPile));
    discardPile = [];
  }

  function drawCards(cardCount) {
    refillDeckFromDiscardIfNeeded(cardCount);
    return deck.splice(0, cardCount);
  }

  function pips(suit, count) {
    return Array.from({ length: count }, () => `<span>${suit}</span>`).join("");
  }

  function cardFaceMarkup(card) {
    const phase = phaseSuit[card.phase];
    const rank = card.rankLabel;
    const corner = `<div class="corner top">${rank}<span>${phase.suit}</span></div>`;
    const bottom = `<div class="corner bottom">${rank}<span>${phase.suit}</span></div>`;

    if (rank === "A") {
      return `${corner}<div class="ace-mark">${phase.suit}</div>${bottom}`;
    }
    if (faceSymbolByRank[rank]) {
      const faceClass = rank === "K" ? "king" : rank === "Q" ? "queen" : "jack";
      return `${corner}<div class="royal-figure ${faceClass}">${faceSymbolByRank[rank]}</div>${bottom}`;
    }
    if (pipClassByRank[rank]) {
      return `${corner}<div class="pip-grid ${pipClassByRank[rank]}">${pips(phase.suit, card.rank)}</div>${bottom}`;
    }
    return `${corner}<div class="ace-mark">${phase.suit}</div>${bottom}`;
  }

  function renderCardAt(index) {
    const node = handCards[index];
    const card = hand[index];
    if (!card) {
      node.removeAttribute("data-uid");
      node.removeAttribute("data-deck-id");
      node.classList.remove("red", "black", "selected", "played-out");
      node.innerHTML = "";
      return;
    }
    node.dataset.uid = card.uid;
    node.dataset.deckId = card.deckId;
    node.classList.remove("red", "black", "selected", "played-out");
    node.classList.add(phaseSuit[card.phase].color);
    node.innerHTML = cardFaceMarkup(card);
  }

  function renderHand() {
    handCards.forEach((_, index) => renderCardAt(index));
    selectedIds = new Set();
    updatePreview();
    updateDeckCount();
    updateCounts();
  }

  function updateDeckCount() {
    deckCount.textContent = `剩余 ${deck.length} 张`;
  }

  function updateTargetScore(readFromDom = false) {
    if (readFromDom) currentTargetScore = Number(targetScoreValue.textContent.replace(/,/g, "")) || currentTargetScore;
    targetScoreValue.textContent = formatNumber(currentTargetScore);
  }

  function updateCounts() {
    showdownCount.textContent = `${showdownsLeft} / ${showdownsMax}`;
    discardCount.textContent = `${discardsLeft} / ${maxDiscards}`;
    if (handCount) handCount.textContent = `${hand.length} / 8`;
    updateActionButtons();
  }

  function updateStake() {
    stakeValue.textContent = String(Math.round(currentStake));
  }

  function updateActionButtons() {
    const locked = failed || phase === "failed" || settling || redEyeModalOpen;
    showdownButton.disabled = locked || showdownsLeft <= 0;
    discardButton.disabled = locked || discardsLeft <= 0;
  }

  function selectedHandNodes() {
    return handCards.filter((node) => node.classList.contains("selected") && !node.classList.contains("played-out"));
  }

  function selectedCards() {
    return selectedHandNodes()
      .map((node) => hand.find((card) => card.uid === node.dataset.uid))
      .filter(Boolean);
  }

  function selectedHandIndexes(selectedNodes) {
    return selectedNodes
      .map((node) => hand.findIndex((card) => card && card.uid === node.dataset.uid))
      .filter((index) => index >= 0);
  }

  function refillHandAtIndexes(indexes) {
    const newCards = drawCards(indexes.length);
    indexes.forEach((handIndex, drawIndex) => {
      hand[handIndex] = newCards[drawIndex] || null;
    });
    hand = hand.filter(Boolean);
    if (hand.length < 8) {
      hand.push(...drawCards(8 - hand.length));
    }
    hand = hand.slice(0, 8);
  }

  function commitPlayedCards(selectedNodes, cards) {
    const handIndexes = selectedHandIndexes(selectedNodes);
    cards.forEach((card) => discardPile.push(card));
    refillHandAtIndexes(handIndexes);
    selectedIds = new Set();
    renderHand();
  }

  function runState() {
    return {
      pressure: currentTilt,
      baseDebt: 0,
      redHeatStacks: 0,
      handLevels: {},
      ownedJokers: []
    };
  }

  function resolveCard(card, run, options) {
    return logic.resolveModule(card, run, options);
  }

  function previewFor(cards) {
    const result = logic.simulatePreview({
      slots: cards.slice(0, 5),
      state: runState(),
      baseProfit: 0,
      resolveModuleFn: resolveCard,
      slotCount: 5
    });
    return applyRedEyeBet(result, cards);
  }

  function handOnlyPreview(cards) {
    if (!cards.length) return { base: 0, multiplier: 1, sequence: null };
    const sequence = logic.evaluateIgnitionSequence(cards.slice(0, 5), 5);
    const leveled = logic.sequenceAtLevel(sequence, 1);
    return {
      base: leveled.base,
      multiplier: leveled.mult,
      sequence: leveled
    };
  }

  function redEyeBetIsActive() {
    return Boolean(activeRedEyeBet);
  }

  function activeRedEyeBetId() {
    return activeRedEyeBet ? activeRedEyeBet.id : "";
  }

  function applyRedEyeBet(result, cards) {
    if (!redEyeBetIsActive() || !cards.length) return result;

    const modified = {
      ...result,
      sequence: result.sequence ? { ...result.sequence } : null
    };

    if (activeRedEyeBet.id === "replay") {
      const run = {
        base: modified.base,
        pressure: modified.pressure
      };
      cards.forEach((card) => card.preview(run));
      modified.base = run.base;
      modified.pressure = run.pressure + activeRedEyeBet.pressure;
    }

    if (activeRedEyeBet.id === "redDouble") {
      modified.multiplier *= 2;
      modified.pressure += activeRedEyeBet.pressure;
    }

    if (activeRedEyeBet.id === "borrow") {
      modified.base += 100;
    }

    modified.profit = logic.currentRunProfit({
      base: modified.base,
      multiplier: modified.multiplier
    });
    return modified;
  }

  function updatePreview() {
    const cards = selectedCards();
    const preview = handOnlyPreview(cards);
    handName.textContent = preview.sequence ? preview.sequence.name : "未出牌";
    chipsValue.textContent = String(Math.round(preview.base));
    multValue.textContent = Number(preview.multiplier).toFixed(2).replace(/\.00$/, "");
    return preview;
  }

  function makePlayedCard(cardNode) {
    const clone = cardNode.cloneNode(true);
    clone.className = "playing-card played";
    clone.classList.add(cardNode.classList.contains("red") ? "red" : "black");
    return clone;
  }

  function makeFlyingCard(cardNode, rect) {
    const clone = makePlayedCard(cardNode);
    clone.classList.add("flying-card");
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.transform = "rotate(0deg)";
    clone.style.filter = "brightness(1.08)";
    board.appendChild(clone);
    return clone;
  }

  function animateNumber(element, from, to, duration) {
    const start = performance.now();
    return new Promise((resolve) => {
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatNumber(from + (to - from) * eased);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function pulseElement(element, className = "flash") {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  async function animateGhostTriggers() {
    const ghosts = [...document.querySelectorAll(".joker-card")];
    for (const ghost of ghosts) {
      pulseElement(ghost, "triggering");
      await wait(85);
    }
  }

  function chipPopup(cardNode, amount) {
    const popup = document.createElement("div");
    popup.className = "chip-popup";
    popup.textContent = `+${Math.round(amount)}`;
    cardNode.appendChild(popup);
    window.setTimeout(() => popup.remove(), 720);
  }

  async function animateCardChipScoring(cards, finalResult, handPreview) {
    const playedNodes = [...playedCards.querySelectorAll(".playing-card")];
    let runningBase = handPreview.base;

    for (let index = 0; index < cards.length; index += 1) {
      const node = playedNodes[index];
      if (!node) continue;
      const amount = cards[index].chips || 0;
      node.classList.add("counting");
      chipPopup(node, amount);
      await animateNumber(chipsValue, runningBase, runningBase + amount, 180);
      runningBase += amount;
      await wait(80);
      node.classList.remove("counting");
    }

    if (redEyeBetIsActive() && activeRedEyeBet.id === "replay" && cards.length) {
      for (let index = 0; index < cards.length; index += 1) {
        const node = playedNodes[index];
        const amount = cards[index].chips || 0;
        if (!node) continue;
        node.classList.add("counting");
        chipPopup(node, amount);
        await animateNumber(chipsValue, runningBase, runningBase + amount, 150);
        runningBase += amount;
        await wait(55);
        node.classList.remove("counting");
      }
    }

    if (Math.round(runningBase) !== Math.round(finalResult.base)) {
      await animateNumber(chipsValue, runningBase, finalResult.base, 220);
    }
  }

  function updateTilt(nextTilt) {
    currentTilt = Math.max(0, Math.min(100, nextTilt));
    tiltValue.textContent = `${Math.round(currentTilt)}%`;
    meterHand.style.transform = `rotate(${-78 + currentTilt * 1.58}deg)`;
    tiltSection.classList.toggle("red-eye-awake", currentTilt >= redEyeThreshold);
  }

  function animateTilt(nextTilt, duration = 540) {
    const startTilt = currentTilt;
    const start = performance.now();
    return new Promise((resolve) => {
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        updateTilt(startTilt + (nextTilt - startTilt) * eased);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          updateTilt(nextTilt);
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  function pickRedEyeOfferIds() {
    return shuffle(Object.keys(redEyeBets)).slice(0, 3);
  }

  function renderRedEyeOptions() {
    if (!redEyeOfferIds.length) redEyeOfferIds = pickRedEyeOfferIds();
    redEyeOptionsPanel.innerHTML = redEyeOfferIds
      .map((id) => {
        const bet = redEyeBets[id];
        return `
          <button type="button" data-bet="${bet.id}">
            ${bet.name}
            <span>${bet.text}</span>
          </button>
        `;
      })
      .join("");
  }

  function openRedEyeModal() {
    if (phase === "failed" || failed || !redEyeUnlocked || redEyeUsedThisRound || activeRedEyeBet) return;
    redEyeModalOpen = true;
    renderRedEyeOptions();
    redEyeModal.classList.add("show");
    redEyeModal.setAttribute("aria-hidden", "false");
    updateActionButtons();
  }

  function closeRedEyeModal() {
    redEyeModalOpen = false;
    redEyeModal.classList.remove("show");
    redEyeModal.setAttribute("aria-hidden", "true");
    updateActionButtons();
  }

  function redEyeTooltipText() {
    if (activeRedEyeBet) return `${activeRedEyeBet.name}（下一手生效）：${activeRedEyeBet.text}`;
    if (redEyeUsedThisRound) return "本轮红眼赌注已使用。下一轮重新锁定。";
    if (redEyeUnlocked) return "红眼赌注已解锁。点击入口选择下一手加注。";
    return "尚未解锁红眼赌注。";
  }

  function showRedEyeStatus() {
    redEyeUnlocked = false;
    redEyeEntry.classList.add("has-choice");
    redEyeEntry.classList.remove("is-unlocked", "is-spent");
    redEyeStateText.textContent = activeRedEyeBet ? activeRedEyeBet.name : "已选择";
    redEyeIcon.textContent = activeRedEyeBet ? activeRedEyeBet.icon : "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
  }

  function showRedEyeUnlocked() {
    if (redEyeUnlocked || redEyeUsedThisRound || activeRedEyeBet) return;
    redEyeUnlocked = true;
    redEyeEntry.classList.add("is-unlocked");
    redEyeEntry.classList.remove("has-choice", "is-spent");
    redEyeStateText.textContent = "已解锁";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
    pulseElement(redEyeEntry, "red-eye-waking");
  }

  function consumeActiveRedEyeBetAfterShowdown() {
    if (!activeRedEyeBet) return;
    activeRedEyeBet = null;
    redEyeUsedThisRound = true;
    redEyeUnlocked = false;
    redEyeOfferIds = [];
    redEyeOptionsPanel.innerHTML = "";
    closeRedEyeModal();
    redEyeEntry.classList.remove("has-choice", "is-unlocked");
    redEyeEntry.classList.add("is-spent");
    redEyeStateText.textContent = "已使用";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
  }

  function handleRedEyeEntryClick() {
    if (failed || phase === "failed" || settling || redEyeModalOpen) return;
    if (redEyeUnlocked && !redEyeUsedThisRound && !activeRedEyeBet) {
      openRedEyeModal();
      return;
    }
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.toggle("show");
  }

  function resetRedEyeForNextRound() {
    activeRedEyeBet = null;
    redEyeUnlocked = false;
    redEyeUsedThisRound = false;
    redEyeOfferIds = [];
    redEyeOptionsPanel.innerHTML = "";
    closeRedEyeModal();
    redEyeEntry.classList.remove("has-choice", "is-unlocked", "is-spent");
    redEyeEntry.classList.remove("round-failed");
    redEyeStateText.textContent = "未开启";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
    redEyeEntry.removeAttribute("title");
  }

  function unlockRedEyeIfNeeded() {
    if (phase !== "playing" || failed || currentTilt < redEyeThreshold) return;
    if (activeRedEyeBet || redEyeUsedThisRound) return;
    showRedEyeUnlocked();
  }

  function checkFailureAfterScoring(result, candidateScore = currentScore) {
    const lifeDebtPreventsBust = activeRedEyeBetId() === "lifeDebt";
    if (!lifeDebtPreventsBust && (result.pressure >= 100 || currentTilt >= 100)) {
      return { type: "bustCard" };
    }
    if (showdownsLeft <= 0 && candidateScore < currentTargetScore) {
      return { type: "houseTakes" };
    }
    return null;
  }

  function failureStat(label, value) {
    return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  function showFailureOverlay(type, payload) {
    failed = true;
    phase = "failed";
    failureType = type;
    const isBust = type === "bustCard";
    const title = isBust ? "爆牌" : "庄家通吃";
    const subtitle = isBust ? "上头过度，满盘皆输。" : "底注未清，赌桌收走一切。";

    failureTitle.textContent = title;
    failureSubtitle.textContent = subtitle;
    failureStats.innerHTML = isBust
      ? [
          failureStat("当前分数", formatNumber(payload.currentScore)),
          failureStat("目标分数", formatNumber(payload.targetScore)),
          failureStat("上头值", "100")
        ].join("")
      : [
          failureStat("目标分数", formatNumber(payload.targetScore)),
          failureStat("当前分数", formatNumber(payload.currentScore)),
          failureStat("差额", formatNumber(payload.shortfall))
        ].join("");

    failureCard.classList.remove("failure-bust-card", "failure-house-takes");
    failureCard.classList.add(isBust ? "failure-bust-card" : "failure-house-takes");
    failureOverlay.classList.add("show");
    failureOverlay.setAttribute("aria-hidden", "false");
    redEyeTooltip.textContent = `${title}：${subtitle}`;
    redEyeEntry.title = `${title}：${subtitle}`;
    redEyeStateText.textContent = title;
    redEyeEntry.classList.remove("has-choice", "is-unlocked", "is-spent");
    redEyeEntry.classList.add("round-failed");
    updateActionButtons();
  }

  function canStealLineClear(score) {
    return activeRedEyeBetId() === "stealLine"
      && score >= currentTargetScore * 0.9
      && score < currentTargetScore;
  }

  function applyRedEyeRoundCostOnClear({ stealLineClears, lifeDebtWouldBurst }) {
    const betId = activeRedEyeBetId();
    if (betId === "borrow") pendingNextRoundTiltBonus += 25;
    if (stealLineClears) pendingNextRoundTiltBonus += 30;
    if (betId === "lifeDebt" && lifeDebtWouldBurst) pendingNextRoundTiltOverride = 90;
  }

  function applyFlipDealerRewardIfNeeded(clearsTarget) {
    if (activeRedEyeBetId() !== "flipDealer" || !clearsTarget) return;
    if (currentTilt < 95 || currentTilt >= 100) return;
    const gain = Math.min(currentStake, 20);
    currentStake += gain;
    updateStake();
    pulseElement(document.querySelector(".stake-row"), "flash");
  }

  function hideFailureOverlay() {
    failureOverlay.classList.remove("show");
    failureOverlay.setAttribute("aria-hidden", "true");
    failureCard.classList.remove("failure-bust-card", "failure-house-takes");
  }

  function clearFailureEffects() {
    board.classList.remove("failure-bust-flash");
    tiltSection.classList.remove("bust-surge");
    playedCards.classList.remove("failure-bust-card", "failure-house-takes");
    if (jokerZone) jokerZone.classList.remove("house-eye-flash");
    redEyeEntry.classList.remove("round-failed");
  }

  async function animateBustCard() {
    await wait(200);
    pulseElement(tiltSection, "bust-surge");
    pulseElement(board, "failure-bust-flash");
    playedCards.classList.add("failure-bust-card");
    await wait(420);
  }

  async function animateHouseTakes() {
    await wait(300);
    playedCards.classList.add("failure-house-takes");
    if (jokerZone) pulseElement(jokerZone, "house-eye-flash");
    await wait(520);
  }

  function resetDemoRun() {
    currentScore = 0;
    currentTargetScore = targetScores[0];
    currentTilt = 0;
    currentStake = 12;
    roundIndex = 0;
    settling = false;
    failed = false;
    phase = "playing";
    failureType = null;
    activeRedEyeBet = null;
    redEyeUnlocked = false;
    redEyeUsedThisRound = false;
    redEyeModalOpen = false;
    redEyeOfferIds = [];
    redEyeOptionsPanel.innerHTML = "";
    pendingNextRoundTiltBonus = 0;
    pendingNextRoundTiltOverride = null;
    selectedIds = new Set();
    hideFailureOverlay();
    clearFailureEffects();
    closeRedEyeModal();
    redEyeEntry.classList.remove("has-choice", "is-unlocked", "is-spent");
    redEyeStateText.textContent = "未开启";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
    redEyeEntry.removeAttribute("title");
    scoreValue.textContent = "0";
    updateStake();
    updateTargetScore();
    updateTilt(0);
    playedCards.replaceChildren();
    drawInitialHand();
    renderHand();
    updateActionButtons();
  }

  function clearPlayedCardsAfterScore() {
    if (!playedCards.children.length) return;
    playedCards.classList.remove("scoring");
    playedCards.classList.add("clearing");
    window.setTimeout(() => {
      playedCards.replaceChildren();
      playedCards.classList.remove("clearing");
    }, 260);
  }

  function animateDiscardedCards(selectedNodes) {
    const sourceRects = selectedNodes.map((card) => boardRect(card.getBoundingClientRect()));
    const deckRect = boardRect(document.querySelector(".deck-stack").getBoundingClientRect());
    const flyingCards = selectedNodes.map((card, index) => {
      const clone = makeFlyingCard(card, sourceRects[index]);
      clone.classList.add("discarding-card");
      clone.style.zIndex = String(13 + index);
      return clone;
    });
    selectedNodes.forEach((card) => card.classList.add("played-out"));

    requestAnimationFrame(() => {
      flyingCards.forEach((card, index) => {
        const offset = index - (flyingCards.length - 1) / 2;
        card.style.left = `${deckRect.left + 40 + offset * 9}px`;
        card.style.top = `${deckRect.top + 36 + Math.abs(offset) * 5}px`;
        card.style.width = "86px";
        card.style.height = "126px";
        card.style.transform = `rotate(${(index % 2 ? 1 : -1) * (22 + index * 8)}deg) scale(0.72)`;
        card.style.filter = "brightness(0.82) saturate(0.72)";
      });
    });

    window.setTimeout(() => flyingCards.forEach((card) => card.remove()), 420);
  }

  function markNewCardsEntering(indexes) {
    indexes.forEach((index, order) => {
      const node = handCards[index];
      if (!node || !hand[index]) return;
      node.classList.add("draw-in");
      node.style.setProperty("--draw-delay", `${order * 42}ms`);
      window.setTimeout(() => {
        node.classList.remove("draw-in");
        node.style.removeProperty("--draw-delay");
      }, 520 + order * 42);
    });
  }

  function animateCardsToTable(selectedNodes) {
    const sourceRects = selectedNodes.map((card) => boardRect(card.getBoundingClientRect()));
    const nextPlayedCards = selectedNodes.map(makePlayedCard);

    playedCards.classList.add("preparing");
    playedCards.replaceChildren(...nextPlayedCards);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const targetRects = nextPlayedCards.map((card) => boardRect(card.getBoundingClientRect()));
        const flyingCards = selectedNodes.map((card, index) => makeFlyingCard(card, sourceRects[index]));

        selectedNodes.forEach((card) => card.classList.add("played-out"));

        requestAnimationFrame(() => {
          flyingCards.forEach((card, index) => {
            const target = targetRects[index];
            card.style.left = `${target.left}px`;
            card.style.top = `${target.top}px`;
            card.style.width = `${target.width}px`;
            card.style.height = `${target.height}px`;
            card.style.filter = "brightness(1.02)";
          });
        });

        window.setTimeout(() => {
          flyingCards.forEach((card) => card.remove());
          playedCards.classList.remove("preparing");
          resolve();
        }, 640);
      });
    });
  }

  function advanceRound() {
    roundIndex += 1;
    currentTargetScore = targetScores[roundIndex] ?? Math.round(currentTargetScore * 2.1);
    discardPile.push(...hand.filter(Boolean));
    resetRedEyeForNextRound();
    redEyeEntry.classList.remove("round-failed");
    const relievedTilt = Math.max(0, currentTilt - tiltReliefOnClear);
    const nextTilt = pendingNextRoundTiltOverride ?? relievedTilt + pendingNextRoundTiltBonus;
    pendingNextRoundTiltBonus = 0;
    pendingNextRoundTiltOverride = null;
    updateTilt(nextTilt);
    currentScore = 0;
    scoreValue.textContent = "0";
    updateTargetScore();
    playedCards.replaceChildren();
    showdownsLeft = showdownsMax;
    discardsLeft = maxDiscards;
    failed = false;
    hand = drawCards(8);
    renderHand();
    unlockRedEyeIfNeeded();
  }

  async function showdown() {
    if (failed || phase === "failed" || settling || redEyeModalOpen || showdownsLeft <= 0) return;
    const selectedNodes = selectedHandNodes();
    const cards = selectedCards();
    if (!cards.length) return;

    settling = true;
    updateActionButtons();
    const result = previewFor(cards);
    const handPreview = handOnlyPreview(cards);

    await animateCardsToTable(selectedNodes);
    await wait(160);

    handName.textContent = handPreview.sequence ? handPreview.sequence.name : "未出牌";
    pulseElement(document.querySelector(".hand-title"), "flash");
    await wait(160);

    chipsValue.textContent = String(Math.round(handPreview.base));
    pulseElement(chipsChip);
    await wait(190);

    await animateCardChipScoring(cards, result, handPreview);

    multValue.textContent = Number(handPreview.multiplier).toFixed(2).replace(/\.00$/, "");
    await wait(120);
    multValue.textContent = Number(result.multiplier).toFixed(2).replace(/\.00$/, "");
    pulseElement(multChip);
    playedCards.classList.add("scoring");
    await wait(150);

    const nextScore = currentScore + result.profit;
    showdownsLeft = Math.max(0, showdownsLeft - 1);
    const lifeDebtWouldBurst = activeRedEyeBetId() === "lifeDebt" && result.pressure >= 100;
    const resolvedPressure = lifeDebtWouldBurst ? 99 : result.pressure;
    await animateTilt(resolvedPressure);
    pulseElement(tiltSection, "tilt-pulse");

    const burstFailure = checkFailureAfterScoring(result);
    updateCounts();
    if (burstFailure?.type === "bustCard") {
      await animateBustCard();
      showFailureOverlay("bustCard", {
        currentScore,
        targetScore: currentTargetScore
      });
      settling = false;
      updateActionButtons();
      return;
    }

    await animateNumber(scoreValue, currentScore, nextScore, 760);
    currentScore = nextScore;
    const stealLineClears = canStealLineClear(currentScore);
    const clearsTarget = currentScore >= currentTargetScore || stealLineClears;

    commitPlayedCards(selectedNodes, cards);
    updateCounts();

    if (clearsTarget) {
      applyRedEyeRoundCostOnClear({ stealLineClears, lifeDebtWouldBurst });
      applyFlipDealerRewardIfNeeded(clearsTarget);
      await wait(240);
      clearPlayedCardsAfterScore();
      await wait(280);
      advanceRound();
    } else {
      const scoringFailure = checkFailureAfterScoring(result, currentScore);
      if (scoringFailure?.type === "houseTakes") {
        await animateHouseTakes();
        showFailureOverlay("houseTakes", {
          currentScore,
          targetScore: currentTargetScore,
          shortfall: currentTargetScore - currentScore
        });
      } else {
        await wait(240);
        clearPlayedCardsAfterScore();
        await wait(280);
        consumeActiveRedEyeBetAfterShowdown();
        unlockRedEyeIfNeeded();
      }
    }
    settling = false;
    updateActionButtons();
  }

  function discardSelectedCards() {
    if (failed || phase === "failed" || settling || redEyeModalOpen || discardsLeft <= 0) return;
    const selectedNodes = selectedHandNodes();
    if (!selectedNodes.length) {
      discardButton.title = "先选择要换掉的手牌";
      return;
    }
    discardButton.title = "";
    const changedIndexes = selectedNodes.map((node) => handCards.indexOf(node)).filter((index) => index >= 0);
    animateDiscardedCards(selectedNodes);

    selectedNodes.forEach((node) => {
      const index = handCards.indexOf(node);
      const oldCard = hand[index];
      discardPile.push(oldCard);
      selectedIds.delete(oldCard.uid);
      hand[index] = drawCards(1)[0] || null;
      renderCardAt(index);
    });

    hand = hand.filter(Boolean);
    if (hand.length < 8) hand.push(...drawCards(8 - hand.length));
    discardsLeft -= 1;
    redEyeTooltip.classList.remove("show");
    renderHand();
    markNewCardsEntering(changedIndexes);
    updateDeckCount();
    updateCounts();
    updatePreview();
  }

  function bindEvents() {
    handCards.forEach((card) => {
      card.addEventListener("click", () => {
        if (failed || phase === "failed" || settling || redEyeModalOpen || card.classList.contains("played-out")) return;
        if (!card.classList.contains("selected")) {
          const selectedCount = selectedHandNodes().length;
          if (selectedCount >= 5) return;
          selectedIds.add(card.dataset.uid);
        } else {
          selectedIds.delete(card.dataset.uid);
        }
        card.classList.toggle("selected");
        redEyeTooltip.classList.remove("show");
        updatePreview();
      });
    });

    showdownButton.addEventListener("click", showdown);
    discardButton.addEventListener("click", discardSelectedCards);

    redEyeOptionsPanel.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-bet]");
      if (!button || !redEyeOptionsPanel.contains(button)) return;
      if (failed || phase === "failed" || activeRedEyeBet || !redEyeUnlocked || redEyeUsedThisRound) return;
      const bet = redEyeBets[button.dataset.bet];
      if (!bet || !redEyeOfferIds.includes(bet.id)) return;
      activeRedEyeBet = bet;
      closeRedEyeModal();
      showRedEyeStatus();
      updatePreview();
    });

    redEyeEntry.addEventListener("click", (event) => {
      if (event.target.closest(".red-eye-tooltip")) return;
      handleRedEyeEntryClick();
    });

    redEyeModal.addEventListener("click", (event) => {
      if (event.target === redEyeModal) closeRedEyeModal();
    });

    redEyeIcon.addEventListener("click", (event) => {
      event.stopPropagation();
      handleRedEyeEntryClick();
    });

    failureRestart.addEventListener("click", resetDemoRun);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && redEyeModalOpen) closeRedEyeModal();
    });

    document.addEventListener("click", (event) => {
      if (!redEyeEntry.contains(event.target)) redEyeTooltip.classList.remove("show");
    });

    window.addEventListener("resize", fitBoard);
    window.addEventListener("orientationchange", fitBoard);
  }

  function init() {
    fitBoard();
    updateTargetScore();
    drawInitialHand();
    renderHand();
    updateTilt(currentTilt);
    bindEvents();
    unlockRedEyeIfNeeded();
  }

  init();
})();
