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
      pressure: 10,
      text: "本手最后一张牌重复触发一次。上头值 +10。"
    },
    allIn: {
      id: "allIn",
      name: "梭哈",
      icon: "●",
      pressure: 15,
      text: "本手倍率 +2。上头值 +15。"
    },
    borrow: {
      id: "borrow",
      name: "借鬼钱",
      icon: "☠",
      pressure: 15,
      text: "本手筹码 +20。上头值 +15。"
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
  let roundIndex = 0;
  let settling = false;
  let rng;
  let deck = [];
  let hand = [];
  let discardPile = [];
  let showdownsLeft = showdownsMax;
  let discardsLeft = maxDiscards;
  let failed = false;
  let selectedIds = new Set();
  let redEyeOffered = false;
  let redEyeModalOpen = false;
  let activeRedEyeBet = null;
  let redEyeBetConsumed = false;

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
  const tiltSection = document.querySelector(".tilt-meter");
  const tiltValue = document.querySelector(".section-title strong");
  const meterHand = document.querySelector(".meter-hand");
  const deckCount = document.querySelector(".deck-count");
  const redEyeModal = document.querySelector(".red-eye-modal");
  const redEyeOptions = [...document.querySelectorAll(".red-eye-options button")];
  const redEyeEntry = document.querySelector(".red-eye-entry");
  const redEyeStateText = redEyeEntry.querySelector("strong");
  const redEyeIcon = document.querySelector(".red-eye-status-icon");
  const redEyeTooltip = document.querySelector(".red-eye-tooltip");

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

  function updateActionButtons() {
    showdownButton.disabled = failed || settling || redEyeModalOpen || showdownsLeft <= 0;
    discardButton.disabled = failed || settling || redEyeModalOpen || discardsLeft <= 0;
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
    return Boolean(activeRedEyeBet && !redEyeBetConsumed);
  }

  function applyRedEyeBet(result, cards) {
    if (!redEyeBetIsActive() || !cards.length) return result;

    const modified = {
      ...result,
      sequence: result.sequence ? { ...result.sequence } : null
    };

    if (activeRedEyeBet.id === "replay") {
      const lastCard = cards[cards.length - 1];
      const run = {
        base: modified.base,
        pressure: modified.pressure
      };
      lastCard.preview(run);
      modified.base = run.base;
      modified.pressure = run.pressure + activeRedEyeBet.pressure;
    }

    if (activeRedEyeBet.id === "allIn") {
      modified.multiplier += 2;
      modified.pressure += activeRedEyeBet.pressure;
    }

    if (activeRedEyeBet.id === "borrow") {
      modified.base += 20;
      modified.pressure += activeRedEyeBet.pressure;
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
      const node = playedNodes[playedNodes.length - 1];
      const amount = cards[cards.length - 1].chips || 0;
      if (node) {
        node.classList.add("counting");
        chipPopup(node, amount);
      }
      await animateNumber(chipsValue, runningBase, runningBase + amount, 180);
      runningBase += amount;
      await wait(80);
      if (node) node.classList.remove("counting");
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

  function openRedEyeModal() {
    if (redEyeOffered || activeRedEyeBet) return;
    redEyeOffered = true;
    redEyeModalOpen = true;
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
    if (!activeRedEyeBet) return "尚未选择红眼赌注。";
    const stateText = redEyeBetConsumed ? "已生效" : "待生效";
    return `${activeRedEyeBet.name}（${stateText}）：${activeRedEyeBet.text}`;
  }

  function showRedEyeStatus() {
    redEyeEntry.classList.add("has-choice");
    redEyeStateText.textContent = activeRedEyeBet ? activeRedEyeBet.name : "已选择";
    redEyeIcon.textContent = activeRedEyeBet ? activeRedEyeBet.icon : "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
  }

  function resetRedEyeForNextRound() {
    activeRedEyeBet = null;
    redEyeBetConsumed = false;
    redEyeOffered = false;
    closeRedEyeModal();
    redEyeEntry.classList.remove("has-choice");
    redEyeStateText.textContent = "未开启";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = "尚未选择红眼赌注。";
    redEyeTooltip.classList.remove("show");
    redEyeEntry.removeAttribute("title");
  }

  function triggerRedEyeIfNeeded() {
    if (currentTilt >= redEyeThreshold) openRedEyeModal();
  }

  function failRound() {
    failed = true;
    console.log("本局失败。");
    redEyeTooltip.textContent = "本局失败，刷新页面重开";
    redEyeEntry.title = "本局失败，刷新页面重开";
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
    updateTilt(currentTilt - tiltReliefOnClear);
    currentScore = 0;
    scoreValue.textContent = "0";
    updateTargetScore();
    playedCards.replaceChildren();
    showdownsLeft = showdownsMax;
    discardsLeft = maxDiscards;
    failed = false;
    hand = drawCards(8);
    renderHand();
  }

  async function showdown() {
    if (failed || settling || redEyeModalOpen || showdownsLeft <= 0) return;
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
    const clearsTarget = nextScore >= currentTargetScore;
    await animateNumber(scoreValue, currentScore, nextScore, 760);
    currentScore = nextScore;
    showdownsLeft = Math.max(0, showdownsLeft - 1);
    updateTilt(result.pressure);
    pulseElement(tiltSection, "tilt-pulse");
    if (result.pressure >= redEyeThreshold) pulseElement(redEyeEntry, "red-eye-waking");
    if (redEyeBetIsActive()) {
      redEyeBetConsumed = true;
      showRedEyeStatus();
    }

    commitPlayedCards(selectedNodes, cards);
    updateCounts();

    await wait(240);
    clearPlayedCardsAfterScore();
    await wait(280);
    if (clearsTarget) {
      advanceRound();
    } else if (showdownsLeft <= 0) {
      failRound();
    } else {
      triggerRedEyeIfNeeded();
    }
    settling = false;
    updateActionButtons();
  }

  function discardSelectedCards() {
    if (failed || settling || redEyeModalOpen || discardsLeft <= 0) return;
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
        if (settling || redEyeModalOpen || card.classList.contains("played-out")) return;
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

    redEyeOptions.forEach((button) => {
      button.addEventListener("click", () => {
        if (activeRedEyeBet) return;
        const bet = redEyeBets[button.dataset.bet];
        if (!bet) return;
        activeRedEyeBet = bet;
        redEyeBetConsumed = false;
        closeRedEyeModal();
        showRedEyeStatus();
        updatePreview();
      });
    });

    redEyeIcon.addEventListener("click", (event) => {
      event.stopPropagation();
      redEyeTooltip.classList.toggle("show");
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
    triggerRedEyeIfNeeded();
  }

  init();
})();
