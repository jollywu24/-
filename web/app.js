(function () {
  const boardWidth = 1600;
  const boardHeight = 900;
  const redEyeThreshold = 60;
  const tiltReliefOnClear = 30;
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
  let settling = false;
  let rng;
  let deck = [];
  let hand = [];
  let discardPile = [];
  let discardsLeft = 1;
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
  const discardCount = document.querySelectorAll(".count-stack strong")[1];
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
    discardsLeft = 1;
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
    updateDiscardCount();
  }

  function updateDeckCount() {
    deckCount.textContent = `剩余 ${deck.length} 张`;
  }

  function updateTargetScore() {
    currentTargetScore = Number(targetScoreValue.textContent.replace(/,/g, "")) || currentTargetScore;
    targetScoreValue.textContent = formatNumber(currentTargetScore);
  }

  function updateDiscardCount() {
    discardCount.textContent = `${discardsLeft} / ${maxDiscards}`;
    discardButton.disabled = discardsLeft <= 0;
  }

  function selectedHandNodes() {
    return handCards.filter((node) => node.classList.contains("selected") && !node.classList.contains("played-out"));
  }

  function selectedCards() {
    return selectedHandNodes()
      .map((node) => hand.find((card) => card.uid === node.dataset.uid))
      .filter(Boolean);
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
    const preview = previewFor(cards);
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
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatNumber(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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
  }

  function closeRedEyeModal() {
    redEyeModalOpen = false;
    redEyeModal.classList.remove("show");
    redEyeModal.setAttribute("aria-hidden", "true");
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
  }

  function triggerRedEyeIfNeeded() {
    if (currentTilt >= redEyeThreshold) openRedEyeModal();
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

  function collectHandToDiscard() {
    hand.forEach((card) => {
      if (card) discardPile.push(card);
    });
  }

  function advanceRound() {
    collectHandToDiscard();
    resetRedEyeForNextRound();
    updateTilt(currentTilt - tiltReliefOnClear);
    currentScore = 0;
    scoreValue.textContent = "0";
    playedCards.replaceChildren();
    discardsLeft = 1;
    hand = drawCards(8);
    renderHand();
  }

  async function showdown() {
    if (settling || redEyeModalOpen) return;
    const selectedNodes = selectedHandNodes();
    const cards = selectedCards();
    if (!cards.length) return;

    settling = true;
    const result = previewFor(cards);

    await animateCardsToTable(selectedNodes);

    handName.textContent = result.sequence ? result.sequence.name : "未出牌";
    chipsValue.textContent = String(Math.round(result.base));
    multValue.textContent = Number(result.multiplier).toFixed(2).replace(/\.00$/, "");
    chipsChip.classList.remove("flash");
    multChip.classList.remove("flash");
    void chipsChip.offsetWidth;
    chipsChip.classList.add("flash");
    multChip.classList.add("flash");

    const nextScore = currentScore + result.profit;
    const clearsTarget = nextScore >= currentTargetScore;
    animateNumber(scoreValue, currentScore, nextScore, 760);
    currentScore = nextScore;
    updateTilt(result.pressure);
    if (redEyeBetIsActive()) {
      redEyeBetConsumed = true;
      showRedEyeStatus();
    }

    selectedNodes.forEach((node) => selectedIds.delete(node.dataset.uid));

    window.setTimeout(() => {
      if (clearsTarget) {
        advanceRound();
      } else {
        triggerRedEyeIfNeeded();
      }
      settling = false;
    }, 880);
  }

  function discardSelectedCards() {
    if (settling || redEyeModalOpen || discardsLeft <= 0) return;
    const selectedNodes = selectedHandNodes();
    if (!selectedNodes.length) return;
    refillDeckFromDiscardIfNeeded(selectedNodes.length);
    if (deck.length < selectedNodes.length) return;

    selectedNodes.forEach((node) => {
      const index = handCards.indexOf(node);
      const oldCard = hand[index];
      discardPile.push(oldCard);
      selectedIds.delete(oldCard.uid);
      hand[index] = deck.shift();
      renderCardAt(index);
    });

    discardsLeft -= 1;
    redEyeTooltip.classList.remove("show");
    updateDeckCount();
    updateDiscardCount();
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
