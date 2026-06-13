(function () {
  const boardWidth = 1600;
  const boardHeight = 900;
  const tiltRules = window.GameLogic.TILT_RULES;
  const maxTilt = tiltRules.max;
  const targetScores = [300, 700, 1500, 3200, 7000];
  const showdownsMax = 3;
  const maxDiscards = 2;
  const CLEAR_REWARD = 4;
  const PLAY_REWARD = 1;
  const DISCARD_REWARD = 2;
  const SHOP_REROLL_COST = 5;
  const MAX_OWNED_GHOSTS = 5;
  const logic = window.GameLogic;
  const content = window.GameContent;
  const roundRules = window.GameRoundRules;
  const animation = window.GameAnimations;
  const assets = window.GameAssets;
  const safeImage = window.SafeImage;
  const surgeCardView = window.SurgeCardView;
  const redEyeBets = content.RED_EYE_BETS;
  const shopGhostPool = content.GHOSTS;
  const shopPackPool = content.SHOP_PACKS;
  const { wait, pulseElement, playArtVfx } = animation;
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

  const state = window.GameRuntimeState.createRuntimeState({
    initialTargetScore: targetScores[0],
    initialStake: 12,
    showdownsMax,
    maxDiscards,
    shopRerollCost: SHOP_REROLL_COST
  });

  const {
    board, gameTableArt, handCards, playedCards, showdownButton, discardButton, targetScoreValue, scoreValue,
    showdownCount, discardCount, handCount, handZone, selectedCardTip, handName, chipsChip,
    multChip, chipsValue, multValue, stakeValue, tiltSection, tiltValue, meterHand, stressEyeArt, deckCount,
    deckStack, deckCards, jokerZone, jokerRow, jokerCount, ownedGhostTip, redEyeModal, redEyeModalClose,
    redEyeOptionsPanel, redEyeEntry, redEyePanelArt, redEyeStateText, redEyeEntryDetail, redEyeIcon, redEyeTooltip,
    failureOverlay, failureCard, failureTitle, failureSubtitle, failureStats, failureRestart,
    roundClearOverlay, roundClearCurrent, roundClearRewards, roundClearTotal, roundClearContinue,
    shopStage, shopGhostOffers, shopPackOffers, shopNextButton, shopRerollButton, shopMessage,
    globalRedFlash, redEyeArtVfx, wagerSealArtVfx, redEyeAnnouncement
  } = window.GameDom.collectGameDom(document);

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

  function artImage(host) {
    return host?.querySelector("img[data-safe-image]") || null;
  }

  function mountArtAssets() {
    safeImage?.mount(gameTableArt, {
      src: assets?.panel?.gameTable,
      className: "game-table-art-image"
    });
    safeImage?.mount(stressEyeArt, {
      src: assets?.stressEye?.cold,
      className: "state-art-image stress-eye-image"
    });
    safeImage?.mount(redEyePanelArt, {
      src: assets?.redEye?.inactive,
      className: "state-art-image red-eye-panel-image"
    });
    deckCards.forEach((card) => {
      safeImage?.mount(card, {
        src: assets?.cards?.deckBack,
        className: "deck-card-image"
      });
    });
  }

  function stressEyeState(tilt = state.currentTilt) {
    if (tilt >= 140) return "overload";
    if (tilt >= tiltRules.redEyeEnter) return "redEye";
    if (tilt >= 40) return "hot";
    return "cold";
  }

  function updateStressEyeArt(previousTilt = state.currentTilt) {
    if (!stressEyeArt || !safeImage || !assets?.stressEye) return;
    const nextState = stressEyeState();
    const changedState = stressEyeArt.dataset.assetState !== nextState;
    stressEyeArt.dataset.assetState = nextState;
    safeImage.setSource(artImage(stressEyeArt), assets.stressEye[nextState]);
    if (changedState) pulseElement(stressEyeArt, "asset-state-pulse");

    const now = performance.now();
    const lastFlash = Number(stressEyeArt.dataset.lastFlash || 0);
    if (state.currentTilt - previousTilt >= 2 && now - lastFlash > 320) {
      stressEyeArt.dataset.lastFlash = String(now);
      pulseElement(stressEyeArt, "asset-red-flash");
    }
  }

  function baseRedEyeArtState() {
    if (state.currentTilt >= 140 || state.failureType === "bustCard") return "burst";
    if (state.activeRedEyeBet || state.redEyeUnlocked || state.redEyeActive) return "active";
    return "inactive";
  }

  function updateRedEyePanelArt(forcedState = "") {
    if (!redEyePanelArt || !safeImage || !assets?.redEye) return;
    const forcedUntil = Number(redEyePanelArt.dataset.forcedUntil || 0);
    const heldState = forcedUntil > performance.now() ? redEyePanelArt.dataset.forcedState : "";
    if (!heldState && forcedUntil) {
      delete redEyePanelArt.dataset.forcedState;
      delete redEyePanelArt.dataset.forcedUntil;
    }
    const nextState = forcedState || heldState || baseRedEyeArtState();
    if (!assets.redEye[nextState]) return;
    redEyePanelArt.dataset.assetState = nextState;
    safeImage.setSource(artImage(redEyePanelArt), assets.redEye[nextState]);
  }

  function pulseRedEyePanelArt(stateName, className, duration = 760) {
    if (!redEyePanelArt) return;
    redEyePanelArt.dataset.forcedState = stateName;
    redEyePanelArt.dataset.forcedUntil = String(performance.now() + duration);
    updateRedEyePanelArt(stateName);
    pulseElement(redEyePanelArt, className);
    window.setTimeout(() => {
      delete redEyePanelArt.dataset.forcedState;
      delete redEyePanelArt.dataset.forcedUntil;
      updateRedEyePanelArt();
    }, duration);
  }

  function initialSeed() {
    return new URLSearchParams(window.location.search).get("seed") || "abyss-ui";
  }

  function shuffle(cards) {
    const copy = [...cards];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(state.rng() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function coinPrice(amount) {
    return `<span class="coin-symbol" aria-hidden="true">◉</span><span>${formatNumber(amount)}</span>`;
  }

  function currentGhostEffect(ghost) {
    return content.ghostEffect(ghost, state, tiltRules.redEyeMultiplier);
  }

  function ghostTipEffect(ghost) {
    return content.ghostDescription(ghost, state, tiltRules.redEyeMultiplier);
  }

  function ghostTermExplanations(ghost) {
    return ghost.terms || [];
  }

  function ghostTermsMarkup(ghost) {
    return ghostTermExplanations(ghost)
      .map(([term, explanation]) => `<div><dt>${term}</dt><dd>${explanation}</dd></div>`)
      .join("");
  }

  function ghostCardMarkup(ghost, extraClass = "") {
    const effect = currentGhostEffect(ghost);
    return `
      <article class="joker-card ${ghost.rarity} ${extraClass}" data-ghost="${ghost.id}">
        <div class="portrait ${ghost.portrait}" aria-hidden="true"></div>
        <h2>${ghost.name}</h2>
        <p>${effect}</p>
        <div class="stars">${ghost.stars}</div>
      </article>
    `;
  }

  function ghostRarityLabel(ghost) {
    return content.ghostRarityLabel(ghost);
  }

  function updateOwnedGhostTip() {
    const ghost = state.ownedGhosts.find((item) => item.id === state.selectedGhostId);
    const card = ghost ? jokerRow.querySelector(`.owned-ghost-card[data-ghost="${ghost.id}"]`) : null;
    jokerRow.querySelectorAll(".owned-ghost-card").forEach((node) => {
      node.classList.toggle("selected", node === card);
      node.setAttribute("aria-pressed", String(node === card));
    });

    if (!ghost || !card || state.phase !== "playing") {
      state.selectedGhostId = null;
      ownedGhostTip.classList.remove("show", "tip-left");
      ownedGhostTip.setAttribute("aria-hidden", "true");
      return;
    }

    const showOnLeft = card.offsetLeft + card.offsetWidth + 272 > jokerRow.offsetWidth;
    ownedGhostTip.querySelector("h3").textContent = ghost.name;
    ownedGhostTip.querySelector(".owned-ghost-effect").textContent = ghostTipEffect(ghost);
    ownedGhostTip.querySelector(".owned-ghost-terms").innerHTML = ghostTermsMarkup(ghost);
    ownedGhostTip.querySelector("span").textContent = ghostRarityLabel(ghost);
    ownedGhostTip.querySelector("strong").textContent = ghost.stars;
    ownedGhostTip.style.left = `${showOnLeft ? card.offsetLeft - 12 : card.offsetLeft + card.offsetWidth + 12}px`;
    ownedGhostTip.style.top = `${card.offsetTop + 54}px`;
    ownedGhostTip.classList.toggle("tip-left", showOnLeft);
    ownedGhostTip.classList.add("show");
    ownedGhostTip.setAttribute("aria-hidden", "false");
  }

  function renderOwnedGhosts() {
    jokerRow.innerHTML = state.ownedGhosts.map((ghost) => ghostCardMarkup(ghost, "owned-ghost-card")).join("");
    jokerRow.setAttribute("aria-label", state.ownedGhosts.length ? "已持有赌鬼牌" : "当前没有赌鬼牌");
    jokerCount.textContent = `${state.ownedGhosts.length} / ${MAX_OWNED_GHOSTS}`;
    jokerRow.querySelectorAll(".owned-ghost-card").forEach((card) => {
      const ghost = state.ownedGhosts.find((item) => item.id === card.dataset.ghost);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", ghost ? `${ghost.name}，点击查看详情` : "点击查看赌鬼详情");
    });
    if (!state.ownedGhosts.some((ghost) => ghost.id === state.selectedGhostId)) state.selectedGhostId = null;
    updateOwnedGhostTip();
  }

  function ownsGhost(jokerId) {
    return state.ownedGhosts.some((ghost) => ghost.jokerId === jokerId);
  }

  function ghostRules(jokerId) {
    return content.GHOST_RULES[jokerId] || {};
  }

  function removeOwnedGhost(jokerId) {
    const nextGhosts = state.ownedGhosts.filter((ghost) => ghost.jokerId !== jokerId);
    if (nextGhosts.length === state.ownedGhosts.length) return;
    state.ownedGhosts = nextGhosts;
    renderOwnedGhosts();
  }

  function generateShopGhostOffers(count = 3) {
    const ownedIds = new Set(state.ownedGhosts.map((ghost) => ghost.id));
    const available = shopGhostPool.filter((ghost) => !ownedIds.has(ghost.id));
    return shuffle(available).slice(0, count);
  }

  function generateShopPackOffers(count = 2) {
    return shopPackPool.slice(0, count);
  }

  function createPlayableCard(deckCard) {
    return {
      ...deckCard,
      uid: `${deckCard.deckId}-${Math.floor(state.rng() * 1000000)}`,
      trigger: "ON_RESOLVE",
      preview(run) {
        run.base += deckCard.chips;
      },
      apply(run) {
        run.base += deckCard.chips;
        return `${deckCard.rankLabel}${phaseSuit[deckCard.phase].suit}`;
      }
    };
  }

  function sortHandCards(cards) {
    const suitOrder = {
      kinetic: 4,
      pulse: 3,
      thermal: 2,
      toxic: 1
    };

    return [...cards].sort((a, b) => {
      const rankDiff = (b?.rank || 0) - (a?.rank || 0);
      if (rankDiff !== 0) return rankDiff;
      return (suitOrder[b?.phase] || 0) - (suitOrder[a?.phase] || 0);
    });
  }

  function sortHand() {
    state.hand = sortHandCards(state.hand.filter(Boolean));
  }

  function drawInitialHand() {
    state.rng = logic.createRng(initialSeed());
    state.deck = shuffle(logic.createStandardDeck()).map(createPlayableCard);
    state.discardPile = [];
    state.showdownsLeft = showdownsMax;
    state.discardsLeft = maxDiscards;
    state.failed = false;
    state.phase = "playing";
    state.failureType = null;
    state.pendingNextRoundTiltBonus = 0;
    state.pendingNextRoundTiltOverride = null;
    state.hand = drawCards(8);
    sortHand();
  }

  function refillDeckFromDiscardIfNeeded(cardCount) {
    if (state.deck.length >= cardCount || !state.discardPile.length) return;
    state.deck = state.deck.concat(shuffle(state.discardPile));
    state.discardPile = [];
  }

  function drawCards(cardCount) {
    refillDeckFromDiscardIfNeeded(cardCount);
    return state.deck.splice(0, cardCount);
  }

  function pips(suit, count) {
    return Array.from({ length: count }, () => `<span>${suit}</span>`).join("");
  }

  function cardFaceMarkup(card) {
    const cardSuit = phaseSuit[card.phase];
    const rank = card.rankLabel;
    const corner = `<div class="corner top">${rank}<span>${cardSuit.suit}</span></div>`;
    const bottom = `<div class="corner bottom">${rank}<span>${cardSuit.suit}</span></div>`;

    if (rank === "A") {
      return `${corner}<div class="ace-mark">${cardSuit.suit}</div>${bottom}`;
    }
    if (faceSymbolByRank[rank]) {
      const faceClass = rank === "K" ? "king" : rank === "Q" ? "queen" : "jack";
      return `${corner}<div class="royal-figure ${faceClass}">${faceSymbolByRank[rank]}</div>${bottom}`;
    }
    if (pipClassByRank[rank]) {
      return `${corner}<div class="pip-grid ${pipClassByRank[rank]}">${pips(cardSuit.suit, card.rank)}</div>${bottom}`;
    }
    return `${corner}<div class="ace-mark">${cardSuit.suit}</div>${bottom}`;
  }

  function renderCardAt(index) {
    const node = handCards[index];
    const card = state.hand[index];
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
    node.classList.toggle("selected", state.selectedIds.has(card.uid));
    node.innerHTML = cardFaceMarkup(card);
  }

  function renderHand() {
    const currentIds = new Set(state.hand.filter(Boolean).map((card) => card.uid));
    state.selectedIds = new Set([...state.selectedIds].filter((id) => currentIds.has(id)));
    handCards.forEach((_, index) => renderCardAt(index));
    updatePreview();
    updateDeckCount();
    updateCounts();
  }

  function updateDeckCount() {
    deckCount.textContent = `剩余 ${state.deck.length} 张`;
  }

  function updateTargetScore(readFromDom = false) {
    if (readFromDom) state.currentTargetScore = Number(targetScoreValue.textContent.replace(/,/g, "")) || state.currentTargetScore;
    targetScoreValue.textContent = formatNumber(state.currentTargetScore);
  }

  function updateCounts() {
    showdownCount.textContent = `${state.showdownsLeft} / ${showdownsMax}`;
    discardCount.textContent = `${state.discardsLeft} / ${maxDiscards}`;
    if (handCount) handCount.textContent = `${state.hand.length} / 8`;
    updateActionButtons();
  }

  function updateStake() {
    stakeValue.textContent = String(Math.round(state.currentStake));
  }

  function setShopMessage(message, tone = "") {
    if (!shopMessage) return;
    shopMessage.textContent = message;
    shopMessage.classList.remove("warning", "success");
    if (tone) shopMessage.classList.add(tone);
  }

  function renderShopGhostOffers() {
    shopGhostOffers.innerHTML = state.shopState.offeredGhosts
      .map((ghost, index) => {
        const sold = state.shopState.purchasedGhostSlots.has(index);
        const unaffordable = state.currentStake < ghost.price;
        const full = state.ownedGhosts.length >= MAX_OWNED_GHOSTS;
        const selected = state.shopState.selectedGhostSlot === index;
        if (sold) {
          return `
            <div class="shop-product shop-product-sold">
              <div class="shop-price is-sold">已售</div>
              <div class="shop-empty-slot">空位</div>
            </div>
          `;
        }
        return `
          <div class="shop-product shop-ghost-product ${selected ? "selected" : ""} ${unaffordable || full ? "cannot-buy" : ""}" data-shop-ghost="${index}">
            <div class="shop-price ${unaffordable ? "insufficient" : ""}">${coinPrice(ghost.price)}</div>
            <div class="shop-ghost-select" role="button" tabindex="0" aria-pressed="${selected}" aria-label="${ghost.name}，点击查看详情">
              ${ghostCardMarkup(ghost, "shop-ghost-card")}
            </div>
            <div class="shop-ghost-detail ${index < 2 ? "tip-right" : "tip-left"}" aria-hidden="${!selected}">
              <h3>${ghost.name}</h3>
              <p>${ghostTipEffect(ghost)}</p>
              <dl>${ghostTermsMarkup(ghost)}</dl>
              <div class="shop-ghost-detail-meta"><span>${ghostRarityLabel(ghost)}</span><strong>${ghost.stars}</strong></div>
            </div>
            <button class="shop-ghost-buy" type="button" data-shop-buy-ghost="${index}" ${unaffordable || full ? "disabled" : ""}>
              ${full ? "赌鬼已满" : unaffordable ? "赌资不足" : "购买"}
            </button>
          </div>
        `;
      })
      .join("");
  }

  function renderShopPackOffers() {
    shopPackOffers.innerHTML = state.shopState.offeredPacks
      .map((pack, index) => {
        const sold = state.shopState.purchasedPackSlots.has(index);
        const unaffordable = state.currentStake < pack.price;
        if (sold) {
          return `
            <div class="shop-pack-product shop-product-sold">
              <div class="shop-pack-price is-sold">空位</div>
              <div class="shop-pack-cover sold-pack">已售</div>
            </div>
          `;
        }
        return `
          <button class="shop-pack-product ${unaffordable ? "cannot-buy" : ""}" type="button" data-shop-pack="${index}" ${unaffordable ? "disabled" : ""}>
            <div class="shop-pack-price ${unaffordable ? "insufficient" : ""}">${coinPrice(pack.price)}</div>
            <div class="shop-pack-cover ${pack.tone}">
              <span class="pack-skull" aria-hidden="true">${pack.relief ? "◉" : "☠"}</span>
              <div class="shop-pack-tooltip" role="tooltip">
                <strong>${pack.name}</strong>
                <span>${pack.description}</span>
              </div>
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderShop() {
    if (!state.shopState.offeredGhosts.length) state.shopState.offeredGhosts = generateShopGhostOffers(3);
    if (!state.shopState.offeredPacks.length) state.shopState.offeredPacks = generateShopPackOffers(2);
    renderShopGhostOffers();
    renderShopPackOffers();
    if (shopRerollButton) {
      shopRerollButton.disabled = state.currentStake < state.shopState.rerollCost;
      shopRerollButton.classList.toggle("cannot-buy", state.currentStake < state.shopState.rerollCost);
      const costNode = shopRerollButton.querySelector("b");
      if (costNode) costNode.textContent = formatNumber(state.shopState.rerollCost);
    }
  }

  function buyShopGhost(slotIndex) {
    if (state.phase !== "shop" || state.settling) return;
    const ghost = state.shopState.offeredGhosts[slotIndex];
    if (!ghost || state.shopState.purchasedGhostSlots.has(slotIndex)) return;
    if (state.ownedGhosts.length >= MAX_OWNED_GHOSTS) {
      setShopMessage("赌鬼已满，无法购买。", "warning");
      return;
    }
    if (state.currentStake < ghost.price) {
      setShopMessage("赌资不足。", "warning");
      return;
    }
    state.currentStake -= ghost.price;
    state.ownedGhosts.push(ghost);
    state.shopState.purchasedGhostSlots.add(slotIndex);
    state.shopState.selectedGhostSlot = null;
    updateStake();
    renderOwnedGhosts();
    renderShop();
    setShopMessage(`已购买 ${ghost.name}。`, "success");
    pulseElement(document.querySelector(".stake-row"), "flash");
  }

  function buyShopPack(slotIndex) {
    if (state.phase !== "shop" || state.settling) return;
    const pack = state.shopState.offeredPacks[slotIndex];
    if (!pack || state.shopState.purchasedPackSlots.has(slotIndex)) return;
    if (state.currentStake < pack.price) {
      setShopMessage("赌资不足。", "warning");
      return;
    }
    state.currentStake -= pack.price;
    state.shopState.purchasedPackSlots.add(slotIndex);
    if (pack.relief) {
      updateTilt(state.currentTilt - pack.relief);
    }
    updateStake();
    renderShop();
    setShopMessage(
      pack.relief ? `已购买 ${pack.name}，上头值降低 ${pack.relief}。` : `已购买 ${pack.name}。`,
      "success"
    );
    pulseElement(document.querySelector(".stake-row"), "flash");
  }

  function rerollShopGhosts() {
    if (state.phase !== "shop" || state.settling) return;
    if (state.currentStake < state.shopState.rerollCost) {
      setShopMessage("赌资不足，无法重掷。", "warning");
      return;
    }
    state.currentStake -= state.shopState.rerollCost;
    state.shopState.offeredGhosts = generateShopGhostOffers(3);
    state.shopState.purchasedGhostSlots = new Set();
    state.shopState.selectedGhostSlot = null;
    updateStake();
    renderShop();
    setShopMessage("已重掷待售赌鬼。", "success");
    pulseElement(document.querySelector(".stake-row"), "flash");
  }

  function enterShopPhase() {
    state.phase = "shop";
    state.settling = false;
    state.selectedGhostId = null;
    updateOwnedGhostTip();
    state.selectedIds = new Set();
    state.selectedTipUid = null;
    handCards.forEach((card) => card.classList.remove("selected"));
    updateSelectedCardTip();
    playedCards.replaceChildren();
    closeRedEyeModal();
    redEyeTooltip.classList.remove("show");
    state.shopState = window.GameRuntimeState.createFreshShopState(SHOP_REROLL_COST);
    state.shopState.offeredGhosts = generateShopGhostOffers(3);
    state.shopState.offeredPacks = generateShopPackOffers(2);
    board.classList.add("shop-phase");
    shopStage.classList.add("show");
    shopStage.setAttribute("aria-hidden", "false");
    setShopMessage("");
    renderShop();
    updateActionButtons();
  }

  function closeShopPhase() {
    board.classList.remove("shop-phase");
    shopStage.classList.remove("show");
    shopStage.setAttribute("aria-hidden", "true");
    setShopMessage("");
  }

  function updateActionButtons() {
    const locked = state.failed || state.phase !== "playing" || state.settling || state.redEyeModalOpen;
    showdownButton.disabled = locked || state.showdownsLeft <= 0;
    discardButton.disabled = locked || state.discardsLeft <= 0;
  }

  function selectedHandNodes() {
    return handCards.filter((node) => node.classList.contains("selected") && !node.classList.contains("played-out"));
  }

  function selectedCards() {
    return selectedHandNodes()
      .map((node) => state.hand.find((card) => card.uid === node.dataset.uid))
      .filter(Boolean);
  }

  function hideSelectedCardTip() {
    state.selectedTipUid = null;
    selectedCardTip.classList.remove("show", "red", "black");
    selectedCardTip.setAttribute("aria-hidden", "true");
  }

  function updateSelectedCardTip() {
    const selectedNodes = selectedHandNodes();
    if (!selectedNodes.length) {
      hideSelectedCardTip();
      return;
    }

    let targetNode = selectedNodes.find((node) => node.dataset.uid === state.selectedTipUid);
    if (!targetNode) {
      targetNode = selectedNodes[selectedNodes.length - 1];
      state.selectedTipUid = targetNode.dataset.uid;
    }
    const card = state.hand.find((item) => item.uid === state.selectedTipUid);
    if (!card) return;

    const zoneRect = handZone.getBoundingClientRect();
    const cardRect = targetNode.getBoundingClientRect();
    const renderedScale = zoneRect.width / handZone.offsetWidth || 1;
    const left = (cardRect.left + cardRect.width / 2 - zoneRect.left) / renderedScale;
    const top = (cardRect.top - zoneRect.top) / renderedScale - 78;

    selectedCardTip.querySelector("strong").textContent = `${card.phaseLabel} ${card.rankLabel}`;
    selectedCardTip.querySelector("span").textContent = `+${card.chips} 筹码`;
    selectedCardTip.style.left = `${left}px`;
    selectedCardTip.style.top = `${top}px`;
    selectedCardTip.classList.remove("red", "black");
    selectedCardTip.classList.add(phaseSuit[card.phase].color, "show");
    selectedCardTip.setAttribute("aria-hidden", "false");
  }

  function selectedHandIndexes(selectedNodes) {
    return selectedNodes
      .map((node) => state.hand.findIndex((card) => card && card.uid === node.dataset.uid))
      .filter((index) => index >= 0);
  }

  function handNodesAtIndexes(indexes) {
    return indexes.map((index) => handCards[index]).filter(Boolean);
  }

  function holdHandCardsForDeal(indexes) {
    const targetNodes = handNodesAtIndexes(indexes);
    targetNodes.forEach((node) => node.classList.add("deal-settle"));
    if (targetNodes[0]) void targetNodes[0].offsetWidth;
    targetNodes.forEach((node) => node.classList.add("played-out"));
    if (targetNodes[0]) void targetNodes[0].offsetWidth;
    return targetNodes;
  }

  function refillHandAtIndexes(indexes) {
    const newCards = drawCards(indexes.length);
    indexes.forEach((handIndex, drawIndex) => {
      state.hand[handIndex] = newCards[drawIndex] || null;
    });
    state.hand = state.hand.filter(Boolean);
    if (state.hand.length < 8) {
      state.hand.push(...drawCards(8 - state.hand.length));
    }
    state.hand = state.hand.slice(0, 8);
    sortHand();
  }

  function commitPlayedCards(selectedNodes, cards) {
    const handIndexes = selectedHandIndexes(selectedNodes);
    cards.forEach((card) => state.discardPile.push(card));
    refillHandAtIndexes(handIndexes);
    state.selectedIds = new Set();
    renderHand();
  }

  function runState() {
    return {
      pressure: state.currentTilt,
      baseDebt: 0,
      redEyeActive: state.redEyeActive,
      redHeatStacks: 0,
      bloodshotStacks: state.bloodshotStacks,
      pendingWithdrawalBonusStacks: state.pendingWithdrawalBonusStacks,
      handLevels: {},
      ownedJokers: state.ownedGhosts.map((ghost) => ghost.jokerId)
    };
  }

  function resolveCard(card, run, options) {
    return logic.resolveModule(card, run, options);
  }

  function previewFor(cards, options = {}) {
    return logic.simulatePreview({
      slots: cards.slice(0, 5),
      state: runState(),
      baseProfit: 0,
      resolveModuleFn: resolveCard,
      slotCount: 5,
      redEyeBet: state.activeRedEyeBet,
      surgeCard: options.surgeCard || null
    });
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
    return Boolean(state.activeRedEyeBet);
  }

  function updatePreview() {
    const cards = selectedCards();
    const preview = handOnlyPreview(cards);
    handName.textContent = preview.sequence ? preview.sequence.name : "未出牌";
    chipsValue.textContent = String(Math.round(preview.base));
    multValue.textContent = Number(preview.multiplier).toFixed(2).replace(/\.00$/, "");
    updateSelectedCardTip();
    return preview;
  }

  function makePlayedCard(cardNode) {
    const clone = cardNode.cloneNode(true);
    clone.className = "playing-card played";
    clone.classList.add(cardNode.classList.contains("red") ? "red" : "black");
    return clone;
  }

  function makeFlyingDrawCard(cardNode) {
    const clone = makePlayedCard(cardNode);
    clone.classList.add("flying-card", "drawing-card", "card-back-flight");
    const face = document.createElement("div");
    face.className = "card-flight-face";
    face.innerHTML = clone.innerHTML;
    const back = document.createElement("div");
    back.className = "card-flight-back";
    back.innerHTML = '<span class="skull">☠</span>';
    clone.replaceChildren(face, back);
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
    return animation.animateTextNumber(element, from, to, duration, formatNumber);
  }

  function formatMultiplier(value) {
    return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function animateMultiplierNumber(from, to, duration) {
    return animation.animateValue(from, to, duration, (value, progress) => {
      multValue.textContent = formatMultiplier(progress === 1 ? to : value);
    });
  }

  function redEyeBaseMultiplier() {
    const perStack = ghostRules(content.RED_EYE_GHOST_IDS.bloodshotGlasses).redEyeMultiplierPerStack || 0;
    return tiltRules.redEyeMultiplier + (ownsGhost(content.RED_EYE_GHOST_IDS.bloodshotGlasses) ? state.bloodshotStacks * perStack : 0);
  }

  function updateGlobalHeatState() {
    const heatState = state.currentTilt >= 140
      ? "critical"
      : state.redEyeActive
        ? "red-eye"
        : state.currentTilt >= 80
          ? "preheat"
          : "normal";
    ["normal", "preheat", "red-eye", "critical"].forEach((className) => {
      board.classList.toggle(className, className === heatState);
    });
    board.classList.toggle("near-red-eye", state.currentTilt >= 95 && state.currentTilt < 140);
  }

  function updateRedEyeEntryCopy() {
    if (state.redEyeBetsBlockedThisRound) {
      redEyeStateText.textContent = "本关封锁";
      redEyeEntryDetail.textContent = "烂命保险已触发";
      return;
    }
    if (state.currentTilt >= 140) {
      redEyeStateText.textContent = "危险";
      redEyeEntryDetail.textContent = "再赌可能爆牌";
      return;
    }
    if (state.activeRedEyeBet) {
      redEyeStateText.textContent = state.activeRedEyeBet.name;
      redEyeEntryDetail.textContent = "正在使用红眼赌注";
      return;
    }
    if (state.redEyeUsedThisRound) {
      redEyeStateText.textContent = "已使用";
      redEyeEntryDetail.textContent = "本关已下注";
      return;
    }
    if (state.redEyeActive) {
      redEyeStateText.textContent = `红倍率 ×${redEyeBaseMultiplier().toFixed(1)}`;
      redEyeEntryDetail.textContent = "翻 1 张暗涌";
      return;
    }
    redEyeStateText.textContent = "未开启";
    redEyeEntryDetail.textContent = `还差 ${Math.max(0, tiltRules.redEyeEnter - Math.round(state.currentTilt))} 上头`;
  }

  function showRedEyeAnnouncement(title, subtitle, className = "") {
    redEyeAnnouncement.querySelector("strong").textContent = title;
    redEyeAnnouncement.querySelector("span").textContent = subtitle;
    redEyeAnnouncement.classList.remove("show", "bust-message");
    if (className) redEyeAnnouncement.classList.add(className);
    void redEyeAnnouncement.offsetWidth;
    redEyeAnnouncement.classList.add("show");
    window.setTimeout(() => redEyeAnnouncement.classList.remove("show", "bust-message"), 900);
  }

  function playRedEyeEntryAnimation() {
    pulseElement(tiltSection, "red-eye-breakthrough");
    globalRedFlash.classList.remove("bust-flash");
    pulseElement(globalRedFlash, "show");
    playArtVfx(redEyeArtVfx, "play-red-eye");
    pulseElement(deckStack, "surge-shake");
    showRedEyeAnnouncement("红眼", "红眼赌注已解锁");
  }

  function playRedEyeExitAnimation() {
    pulseElement(board, "cooling");
    pulseElement(tiltSection, "red-eye-closing");
  }

  async function animateGhostTriggers() {
    const ghosts = [...document.querySelectorAll(".joker-card")];
    for (const ghost of ghosts) {
      pulseElement(ghost, "triggering");
      await wait(85);
    }
  }

  function scoreStepSourceNode(step) {
    if (step.sourceType === "card") {
      return playedCards.querySelector(`.playing-card[data-uid="${step.sourceId}"]`);
    }
    if (step.sourceType === "joker") {
      const ghost = state.ownedGhosts.find((item) => item.jokerId === (step.jokerId || step.sourceId));
      return ghost ? jokerRow.querySelector(`.joker-card[data-ghost="${ghost.id}"]`) : null;
    }
    if (step.sourceType === "redEye") return redEyeEntry;
    if (step.sourceType === "surge") return deckStack;
    return document.querySelector(".hand-title");
  }

  function showScoreStepLabel(step, sourceNode) {
    const rect = boardRect(sourceNode.getBoundingClientRect());
    const popup = document.createElement("div");
    const ghostSource = step.sourceType === "joker";
    popup.className = ghostSource
      ? `ghost-multiplier-popup score-step-label ${step.operation}`
      : `score-step-label ${step.operation}`;
    popup.textContent = step.label;
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${ghostSource ? rect.top + rect.height - 18 : rect.top - 12}px`;
    board.appendChild(popup);
    window.setTimeout(() => popup.remove(), 920);
  }

  async function animateMultiplierSettlement(result) {
    const steps = result.multiplierEvents || [];
    const firstMultiplier = steps[0]?.multBefore ?? result.multiplier;
    const baseScore = Math.round(result.base * firstMultiplier);
    if (steps.some((step) => step.sourceType === "redEye")) {
      pulseRedEyePanelArt("burst", "art-burst", 920);
    }

    multValue.textContent = formatMultiplier(firstMultiplier);
    await animateNumber(scoreValue, state.currentScore, state.currentScore + baseScore, 260);

    const speed = steps.length > 4 ? 0.76 : 1;
    for (const step of steps) {
      const sourceNode = scoreStepSourceNode(step);
      const heavy = step.operation === "multiply";
      const surge = step.operation === "surge";
      const multDuration = Math.round((heavy ? 280 : 210) * speed);
      const scoreDuration = Math.round((heavy ? 280 : 220) * speed);

      if (sourceNode) {
        pulseElement(sourceNode, `score-source-${step.operation}`);
        showScoreStepLabel(step, sourceNode);
      }
      if (step.jokerId && step.sourceType !== "joker") {
        const ghost = state.ownedGhosts.find((item) => item.jokerId === step.jokerId);
        const ghostNode = ghost ? jokerRow.querySelector(`.joker-card[data-ghost="${ghost.id}"]`) : null;
        if (ghostNode) pulseElement(ghostNode, "triggering");
      }

      pulseElement(multChip, surge ? "surge-burst" : heavy ? "multiply-burst" : "mult-bump");
      if (heavy) pulseElement(board, "score-multiply-shake");
      await animateMultiplierNumber(step.multBefore, step.multAfter, multDuration);

      pulseElement(scoreValue.closest(".score-row"), heavy ? "score-jump-heavy" : "score-jump");
      await animateNumber(
        scoreValue,
        state.currentScore + step.scoreBefore,
        state.currentScore + step.scoreAfter,
        scoreDuration
      );
      await wait(Math.round((heavy ? 90 : 55) * speed));
    }

    multValue.textContent = formatMultiplier(result.multiplier);
    scoreValue.textContent = formatNumber(state.currentScore + result.profit);
  }

  function chipPopup(cardNode, amount) {
    const rect = boardRect(cardNode.getBoundingClientRect());
    const popup = document.createElement("div");
    popup.className = "chip-popup";
    popup.textContent = `+${Math.round(amount)}`;
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${rect.top - 54}px`;
    board.appendChild(popup);
    window.setTimeout(() => popup.remove(), 960);
  }

  async function animateSurgeReveal(surgeCard, result) {
    if (!surgeCard) return;
    pulseElement(redEyeEntry, "wager-press");
    pulseRedEyePanelArt("trigger", "art-triggering", 1180);
    pulseElement(deckStack, "surge-shake");

    const source = boardRect(deckStack.getBoundingClientRect());
    const surgeHype = logic.cardHypeValue(surgeCard);
    const reveal = surgeCardView?.create({
      phase: "hidden",
      value: surgeHype,
      hypeValue: surgeHype,
      colorClass: phaseSuit[surgeCard.phase].color,
      faceMarkup: cardFaceMarkup(surgeCard)
    }) || document.createElement("div");
    if (!surgeCardView) {
      reveal.className = "surge-reveal-card";
      reveal.innerHTML = `
        <div class="surge-card-face playing-card ${phaseSuit[surgeCard.phase].color}">${cardFaceMarkup(surgeCard)}</div>
        <div class="surge-card-back"><span class="skull">☠</span></div>
      `;
    }
    reveal.style.left = `${source.left + source.width / 2 - 58}px`;
    reveal.style.top = `${source.top + source.height / 2 - 84}px`;
    board.appendChild(reveal);
    await wait(30);
    surgeCardView?.update(reveal, {
      phase: "flying",
      value: surgeHype,
      hypeValue: surgeHype,
      faceMarkup: cardFaceMarkup(surgeCard)
    });
    reveal.classList.add("at-reveal");
    await wait(260);
    surgeCardView?.update(reveal, {
      phase: "flipping",
      value: surgeHype,
      hypeValue: surgeHype,
      faceMarkup: cardFaceMarkup(surgeCard)
    });
    await wait(30);
    if (surgeCardView) {
      surgeCardView.update(reveal, {
        phase: "revealed",
        value: surgeHype,
        hypeValue: surgeHype,
        faceMarkup: cardFaceMarkup(surgeCard)
      });
    } else {
      reveal.classList.add("is-face-up");
    }
    await wait(250);

    const revealRect = boardRect(reveal.getBoundingClientRect());
    const meterRect = boardRect(tiltSection.querySelector(".eye-meter").getBoundingClientRect());
    const hypeFly = document.createElement("div");
    hypeFly.className = "surge-hype-fly";
    hypeFly.textContent = `+${surgeHype} 上头`;
    hypeFly.style.left = `${revealRect.left + revealRect.width / 2}px`;
    hypeFly.style.top = `${revealRect.top + revealRect.height / 2}px`;
    board.appendChild(hypeFly);
    await wait(20);
    hypeFly.style.left = `${meterRect.left + meterRect.width / 2}px`;
    hypeFly.style.top = `${meterRect.top + meterRect.height / 2}px`;
    hypeFly.classList.add("is-flying");

    const iouHype = ownsGhost(content.RED_EYE_GHOST_IDS.redEyeIou)
      ? ghostRules(content.RED_EYE_GHOST_IDS.redEyeIou).surgeHype
      : 0;
    const intermediateTilt = result.insuranceTriggered
      ? result.pressure
      : Math.min(result.pressure, state.currentTilt + surgeHype + iouHype);
    await Promise.all([
      animateTilt(intermediateTilt, 280),
      wait(300)
    ]);
    pulseElement(tiltSection, "surge-impact");
    pulseElement(multChip, "red-mult-surge");
    reveal.classList.add("is-leaving");
    window.setTimeout(() => {
      reveal.remove();
      hypeFly.remove();
    }, 260);
    await wait(180);
  }

  async function animateCardChipScoring(cards, finalResult, handPreview) {
    const playedNodes = [...playedCards.querySelectorAll(".playing-card")];
    let runningBase = handPreview.base;

    for (let index = 0; index < cards.length; index += 1) {
      const node = playedNodes.find((playedNode) => playedNode.dataset.uid === cards[index].uid);
      if (!node) continue;
      const amount = cards[index].chips || 0;
      node.classList.add("counting");
      chipPopup(node, amount);
      await animateNumber(chipsValue, runningBase, runningBase + amount, 180);
      runningBase += amount;
      await wait(80);
      node.classList.remove("counting");
    }

    const repeatCount = state.activeRedEyeBet?.rules?.repeatScoringCards || 0;
    if (redEyeBetIsActive() && repeatCount > 0 && cards.length) {
      for (let repeat = 0; repeat < repeatCount; repeat += 1) {
        for (let index = 0; index < cards.length; index += 1) {
          const node = playedNodes.find((playedNode) => playedNode.dataset.uid === cards[index].uid);
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
    }

    if (Math.round(runningBase) !== Math.round(finalResult.base)) {
      await animateNumber(chipsValue, runningBase, finalResult.base, 220);
    }
  }

  function updateTilt(nextTilt) {
    const previousTilt = state.currentTilt;
    const wasRedEyeActive = state.redEyeActive;
    state.currentTilt = Math.max(0, Math.min(maxTilt, nextTilt));
    state.redEyeActive = logic.updateRedEyeState(state.currentTilt, state.redEyeActive);
    if (!wasRedEyeActive && state.redEyeActive) {
      if (ownsGhost(content.RED_EYE_GHOST_IDS.bloodshotGlasses)) {
        state.bloodshotStacks += ghostRules(content.RED_EYE_GHOST_IDS.bloodshotGlasses).stacksPerRedEyeEntry;
      }
      if (ownsGhost(content.RED_EYE_GHOST_IDS.withdrawalRebound) && state.withdrawalStacks > 0) {
        state.pendingWithdrawalBonusStacks = state.withdrawalStacks;
        state.withdrawalStacks = 0;
      }
      renderOwnedGhosts();
    }
    if (wasRedEyeActive && !state.redEyeActive) {
      if (ownsGhost(content.RED_EYE_GHOST_IDS.withdrawalRebound)) {
        state.withdrawalStacks += ghostRules(content.RED_EYE_GHOST_IDS.withdrawalRebound).stacksPerRedEyeExit;
      }
      state.pendingWithdrawalBonusStacks = 0;
      renderOwnedGhosts();
    }
    tiltValue.textContent = `${Math.round(state.currentTilt)} / ${maxTilt}`;
    meterHand.style.transform = `rotate(${-78 + (state.currentTilt / maxTilt) * 156}deg)`;
    tiltSection.classList.toggle("red-eye-awake", state.redEyeActive);
    tiltSection.querySelector(".eye-meter")?.setAttribute("aria-label", `上头值 ${Math.round(state.currentTilt)} / ${maxTilt}`);
    updateGlobalHeatState();
    updateRedEyeEntryCopy();
    updateStressEyeArt(previousTilt);
    updateRedEyePanelArt();
    if (!wasRedEyeActive && state.redEyeActive) playRedEyeEntryAnimation();
    if (wasRedEyeActive && !state.redEyeActive) playRedEyeExitAnimation();
  }

  function animateTilt(nextTilt, duration = 540) {
    const startTilt = state.currentTilt;
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
    if (!state.redEyeOfferIds.length) state.redEyeOfferIds = pickRedEyeOfferIds();
    redEyeOptionsPanel.innerHTML = state.redEyeOfferIds
      .map((id) => {
        const bet = redEyeBets[id];
        const [effect, ...costParts] = bet.text.split("。").filter(Boolean);
        const cost = costParts.join("。");
        return `
          <button class="red-eye-option-card" type="button" data-bet="${bet.id}">
            <span class="red-eye-option-name">${bet.name}</span>
            <span class="red-eye-option-icon" aria-hidden="true">${bet.icon}</span>
            <span class="red-eye-option-effect">${effect}</span>
            ${cost ? `<span class="red-eye-option-cost">${cost}</span>` : ""}
          </button>
        `;
      })
      .join("");
  }

  function openRedEyeModal() {
    if (state.phase === "failed" || state.failed || state.redEyeBetsBlockedThisRound || !state.redEyeUnlocked || state.redEyeUsedThisRound || state.activeRedEyeBet) return;
    state.redEyeModalOpen = true;
    renderRedEyeOptions();
    redEyeModal.classList.add("show");
    redEyeModal.setAttribute("aria-hidden", "false");
    updateActionButtons();
  }

  function closeRedEyeModal() {
    state.redEyeModalOpen = false;
    redEyeModal.classList.remove("show");
    redEyeModal.setAttribute("aria-hidden", "true");
    updateActionButtons();
  }

  function redEyeTooltipText() {
    if (state.activeRedEyeBet) {
      const preview = logic.redEyeHypePreview(state.activeRedEyeBet);
      const iouHype = ownsGhost(content.RED_EYE_GHOST_IDS.redEyeIou)
        ? ghostRules(content.RED_EYE_GHOST_IDS.redEyeIou).surgeHype
        : 0;
      const range = preview ? ` 暗涌风险：上头 +${preview.min + iouHype}~+${preview.max + iouHype}。` : "";
      return `${state.activeRedEyeBet.name}（下一手生效）：${state.activeRedEyeBet.text}${range}`;
    }
    if (state.redEyeBetsBlockedThisRound) return "烂命保险已触发，本关禁止继续使用红眼赌注。";
    if (state.redEyeUsedThisRound) return "本轮红眼赌注已使用。下一轮重新锁定。";
    if (state.redEyeUnlocked) return "红眼赌注已解锁。点击入口选择下一手加注。";
    return "尚未解锁红眼赌注。";
  }

  function showRedEyeStatus() {
    state.redEyeUnlocked = false;
    redEyeEntry.classList.add("has-choice");
    redEyeEntry.classList.remove("is-unlocked", "is-spent");
    redEyeStateText.textContent = state.activeRedEyeBet ? state.activeRedEyeBet.name : "已选择";
    redEyeIcon.textContent = state.activeRedEyeBet ? state.activeRedEyeBet.icon : "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
    board.classList.add("betting");
    updateRedEyeEntryCopy();
    pulseRedEyePanelArt("active", "asset-state-pulse");
  }

  function showRedEyeUnlocked() {
    if (state.redEyeBetsBlockedThisRound || state.redEyeUnlocked || state.redEyeUsedThisRound || state.activeRedEyeBet) return;
    state.redEyeUnlocked = true;
    redEyeEntry.classList.add("is-unlocked");
    redEyeEntry.classList.remove("has-choice", "is-spent");
    redEyeStateText.textContent = "已解锁";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
    pulseElement(redEyeEntry, "red-eye-waking");
    updateRedEyeEntryCopy();
    pulseRedEyePanelArt("active", "asset-state-pulse");
  }

  function consumeActiveRedEyeBetAfterShowdown() {
    if (!state.activeRedEyeBet) return;
    state.activeRedEyeBet = null;
    state.redEyeUsedThisRound = true;
    state.redEyeUnlocked = false;
    state.redEyeOfferIds = [];
    redEyeOptionsPanel.innerHTML = "";
    closeRedEyeModal();
    redEyeEntry.classList.remove("has-choice", "is-unlocked");
    redEyeEntry.classList.add("is-spent");
    redEyeStateText.textContent = state.redEyeBetsBlockedThisRound ? "本关封锁" : "已使用";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
    board.classList.remove("betting");
    updateRedEyeEntryCopy();
    updateRedEyePanelArt();
  }

  function handleRedEyeEntryClick() {
    if (state.failed || state.phase !== "playing" || state.settling || state.redEyeModalOpen) return;
    pulseElement(redEyeEntry, "wager-press");
    if (state.redEyeUnlocked && !state.redEyeUsedThisRound && !state.activeRedEyeBet) {
      openRedEyeModal();
      return;
    }
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.toggle("show");
  }

  function resetRedEyeForNextRound() {
    state.activeRedEyeBet = null;
    state.redEyeUnlocked = false;
    state.redEyeUsedThisRound = false;
    state.redEyeBetsBlockedThisRound = false;
    state.redEyeOfferIds = [];
    redEyeOptionsPanel.innerHTML = "";
    closeRedEyeModal();
    redEyeEntry.classList.remove("has-choice", "is-unlocked", "is-spent");
    redEyeEntry.classList.remove("round-failed");
    redEyeStateText.textContent = "未开启";
    redEyeIcon.textContent = "◉";
    redEyeTooltip.textContent = redEyeTooltipText();
    redEyeTooltip.classList.remove("show");
    redEyeEntry.removeAttribute("title");
    board.classList.remove("betting");
    updateRedEyeEntryCopy();
    updateRedEyePanelArt();
  }

  function unlockRedEyeIfNeeded() {
    if (state.phase !== "playing" || state.failed || state.redEyeBetsBlockedThisRound || !state.redEyeActive) return;
    if (state.activeRedEyeBet || state.redEyeUsedThisRound) return;
    showRedEyeUnlocked();
  }

  function checkFailureAfterScoring(result, candidateScore = state.currentScore) {
    return roundRules.checkFailureAfterScoring({
      resultPressure: result.pressure,
      currentTilt: state.currentTilt,
      maxTilt,
      activeBet: state.activeRedEyeBet,
      showdownsLeft: state.showdownsLeft,
      candidateScore,
      targetScore: state.currentTargetScore
    });
  }

  function commitRedEyeGhostResults(result) {
    let shouldRenderGhosts = false;
    if (result.withdrawalConsumedStacks > 0) {
      state.pendingWithdrawalBonusStacks = 0;
      shouldRenderGhosts = true;
    }
    if (result.insuranceTriggered) {
      const insuranceRules = ghostRules(content.RED_EYE_GHOST_IDS.rottenLifeInsurance);
      state.redEyeBetsBlockedThisRound = Boolean(insuranceRules.blockBetsOnTrigger);
      state.redEyeUnlocked = false;
      if (insuranceRules.destroyOnTrigger) removeOwnedGhost(content.RED_EYE_GHOST_IDS.rottenLifeInsurance);
      redEyeEntry.classList.remove("is-unlocked");
      redEyeStateText.textContent = state.activeRedEyeBet ? redEyeStateText.textContent : "本关封锁";
      redEyeTooltip.textContent = redEyeTooltipText();
      shouldRenderGhosts = false;
    }
    if (shouldRenderGhosts) renderOwnedGhosts();
  }

  function failureStat(label, value) {
    return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  function showFailureOverlay(type, payload) {
    state.failed = true;
    state.phase = "failed";
    state.failureType = type;
    const isBust = type === "bustCard";
    const title = isBust ? "爆牌" : "庄家通吃";
    const subtitle = isBust ? "上头过度，满盘皆输。" : "底注未清，赌桌收走一切。";

    failureTitle.textContent = title;
    failureSubtitle.textContent = subtitle;
    failureStats.innerHTML = isBust
      ? [
          failureStat("当前分数", formatNumber(payload.currentScore)),
          failureStat("目标分数", formatNumber(payload.targetScore)),
          failureStat("上头值", String(maxTilt))
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
    redEyeEntryDetail.textContent = subtitle;
    redEyeEntry.classList.remove("has-choice", "is-unlocked", "is-spent");
    redEyeEntry.classList.add("round-failed");
    updateActionButtons();
  }

  function canStealLineClear(score) {
    return roundRules.canStealLineClear({
      bet: state.activeRedEyeBet,
      score,
      targetScore: state.currentTargetScore
    });
  }

  function applyRedEyeRoundCostOnClear({ stealLineClears }) {
    const cost = roundRules.redEyeRoundCostOnClear({
      bet: state.activeRedEyeBet,
      stealLineClears
    });
    state.pendingNextRoundTiltBonus += cost.tiltBonus;
    if (cost.tiltOverride !== null) state.pendingNextRoundTiltOverride = cost.tiltOverride;
  }

  function calculateFlipDealerBonus(clearsTarget) {
    return roundRules.calculateFlipDealerBonus({
      bet: state.activeRedEyeBet,
      clearsTarget,
      currentTilt: state.currentTilt,
      maxTilt,
      currentStake: state.currentStake
    });
  }

  function calculateRoundReward({ flipBonus = 0 } = {}) {
    return roundRules.calculateRoundReward({
      clearReward: CLEAR_REWARD,
      playReward: PLAY_REWARD,
      discardReward: DISCARD_REWARD,
      showdownsLeft: state.showdownsLeft,
      discardsLeft: state.discardsLeft,
      flipBonus,
      formattedStake: formatNumber(state.currentStake)
    });
  }

  function renderRoundRewardRows(reward) {
    roundClearRewards.innerHTML = reward.lines
      .map((line) => `
        <div class="round-clear-row" data-key="${line.key}">
          <dt>${line.label}${line.detail ? `<small>${line.detail}</small>` : ""}</dt>
          <dd data-amount="${line.amount}">$0</dd>
        </div>
      `)
      .join("");
  }

  function animateMoney(element, from, to, duration = 420) {
    return animation.animateTextNumber(element, from, to, duration, (value) => `$${formatNumber(value)}`);
  }

  async function animateRoundRewardRows(reward) {
    const rows = [...roundClearRewards.querySelectorAll(".round-clear-row")];
    for (const row of rows) {
      const amountNode = row.querySelector("dd");
      const amount = Number(amountNode.dataset.amount || 0);
      row.classList.add("is-visible");
      await animateMoney(amountNode, 0, amount, 260);
      await wait(120);
    }
    await Promise.all([
      animateMoney(roundClearCurrent, 0, reward.total, 520),
      animateMoney(roundClearTotal, 0, reward.total, 520)
    ]);
    roundClearContinue.disabled = false;
    roundClearContinue.classList.add("is-ready");
  }

  async function showRoundClearOverlay(reward) {
    state.phase = "roundClear";
    state.pendingRoundReward = reward.total;
    roundClearCurrent.textContent = "$0";
    roundClearTotal.textContent = "$0";
    roundClearContinue.disabled = true;
    roundClearContinue.classList.remove("is-ready");
    renderRoundRewardRows(reward);
    roundClearOverlay.classList.add("show");
    roundClearOverlay.setAttribute("aria-hidden", "false");
    updateActionButtons();
    await wait(120);
    await animateRoundRewardRows(reward);
  }

  function hideRoundClearOverlay() {
    roundClearOverlay.classList.remove("show");
    roundClearOverlay.setAttribute("aria-hidden", "true");
    roundClearRewards.replaceChildren();
    roundClearCurrent.textContent = "$0";
    roundClearTotal.textContent = "$0";
    roundClearContinue.disabled = true;
    roundClearContinue.classList.remove("is-ready");
  }

  async function proceedToNextRound() {
    if (state.phase !== "roundClear" || state.settling) return;
    state.settling = true;
    roundClearContinue.disabled = true;
    state.currentStake += state.pendingRoundReward;
    state.pendingRoundReward = 0;
    updateStake();
    pulseElement(document.querySelector(".stake-row"), "flash");
    hideRoundClearOverlay();
    updateTilt(state.currentTilt - logic.tiltReliefForRound(state.roundIndex));
    enterShopPhase();
  }

  async function proceedToNextRoundFromShop() {
    if (state.phase !== "shop" || state.settling) return;
    state.settling = true;
    if (shopNextButton) shopNextButton.disabled = true;
    closeShopPhase();
    state.phase = "playing";
    await advanceRound();
    state.settling = false;
    if (shopNextButton) shopNextButton.disabled = false;
    updateActionButtons();
  }

  function hideFailureOverlay() {
    failureOverlay.classList.remove("show");
    failureOverlay.setAttribute("aria-hidden", "true");
    failureCard.classList.remove("failure-bust-card", "failure-house-takes");
  }

  function clearFailureEffects() {
    board.classList.remove("failure-bust-flash", "bust");
    tiltSection.classList.remove("bust-surge");
    playedCards.classList.remove("failure-bust-card", "failure-house-takes");
    if (jokerZone) jokerZone.classList.remove("house-eye-flash");
    redEyeEntry.classList.remove("round-failed");
    globalRedFlash.classList.remove("show", "bust-flash");
  }

  async function animateBustCard() {
    board.classList.add("bust");
    pulseElement(globalRedFlash, "bust-flash");
    showRedEyeAnnouncement("爆牌", "上头撞线", "bust-message");
    await wait(80);
    pulseElement(tiltSection, "bust-surge");
    pulseElement(board, "failure-bust-flash");
    playedCards.classList.add("failure-bust-card");
    await wait(300);
  }

  async function animateHouseTakes() {
    await wait(300);
    playedCards.classList.add("failure-house-takes");
    if (jokerZone) pulseElement(jokerZone, "house-eye-flash");
    await wait(520);
  }

  async function resetDemoRun() {
    window.GameRuntimeState.resetRuntimeState(state, {
      initialTargetScore: targetScores[0],
      initialStake: 12,
      showdownsMax,
      maxDiscards,
      shopRerollCost: SHOP_REROLL_COST
    });
    redEyeOptionsPanel.innerHTML = "";
    hideFailureOverlay();
    hideRoundClearOverlay();
    closeShopPhase();
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
    renderOwnedGhosts();
    await dealHandFromDeck();
    updateActionButtons();
  }

  function clearPlayedCardsAfterScore() {
    const playedNodes = [...playedCards.querySelectorAll(".playing-card")];
    if (!playedNodes.length) return Promise.resolve();
    const sourceRects = playedNodes.map((card) => boardRect(card.getBoundingClientRect()));
    const flyingCards = playedNodes.map((card, index) => {
      const clone = makeFlyingCard(card, sourceRects[index]);
      clone.classList.add("played-clearing-card");
      clone.style.zIndex = String(15 + index);
      return clone;
    });

    playedCards.classList.add("clearing");
    requestAnimationFrame(() => {
      flyingCards.forEach((card, index) => {
        const offset = index - (flyingCards.length - 1) / 2;
        card.style.left = `${boardWidth + 140 + index * 42}px`;
        card.style.top = `${sourceRects[index].top - 24 - Math.abs(offset) * 22}px`;
        card.style.transform = `rotate(${28 + index * 7}deg) scale(0.82)`;
        card.style.filter = "brightness(0.68) saturate(0.62)";
        card.style.opacity = "0";
      });
    });

    return new Promise((resolve) => {
      window.setTimeout(() => {
        flyingCards.forEach((card) => card.remove());
        playedCards.replaceChildren();
        playedCards.classList.remove("clearing");
        resolve();
      }, 460);
    });
  }

  function animateDiscardedCards(selectedNodes) {
    const sourceRects = selectedNodes.map((card) => boardRect(card.getBoundingClientRect()));
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
        card.style.left = `${boardWidth + 120 + index * 46}px`;
        card.style.top = `${sourceRects[index].top - 42 - Math.abs(offset) * 28}px`;
        card.style.width = "104px";
        card.style.height = "154px";
        card.style.transform = `rotate(${34 + index * 10}deg) scale(0.78)`;
        card.style.filter = "brightness(0.62) saturate(0.58)";
        card.style.opacity = "0";
      });
    });

    return new Promise((resolve) => {
      window.setTimeout(() => {
        flyingCards.forEach((card) => card.remove());
        resolve();
      }, 430);
    });
  }

  function animateDrawnCardsFromDeck(indexes) {
    const deckRect = boardRect(document.querySelector(".deck-stack").getBoundingClientRect());
    const sourceCenter = {
      x: deckRect.left + deckRect.width / 2,
      y: deckRect.top + deckRect.height / 2
    };
    const cardWidth = 124;
    const cardHeight = 184;
    const flyingCards = indexes
      .map((index, order) => {
        const targetNode = handCards[index];
        if (!targetNode || !state.hand[index]) return null;
        const targetParentRect = boardRect(targetNode.offsetParent.getBoundingClientRect());
        const targetStyle = getComputedStyle(targetNode);
        const targetBase = {
          left: targetParentRect.left + targetNode.offsetLeft,
          top: targetParentRect.top + targetNode.offsetTop
        };
        const clone = makeFlyingDrawCard(targetNode);
        clone.style.zIndex = String(16 + order);
        clone.style.left = `${sourceCenter.x - cardWidth / 2}px`;
        clone.style.top = `${sourceCenter.y - cardHeight / 2}px`;
        clone.style.width = `${cardWidth}px`;
        clone.style.height = `${cardHeight}px`;
        clone.style.transformOrigin = targetStyle.transformOrigin;
        clone.style.transform = `rotate(${-8 + order * 4}deg) scale(0.66)`;
        clone.style.filter = "brightness(0.88) saturate(0.78)";
        clone.style.transitionDelay = `${order * 58}ms`;
        board.appendChild(clone);
        return { clone, targetBase, targetTransform: targetStyle.transform };
      })
      .filter(Boolean);

    requestAnimationFrame(() => {
      flyingCards.forEach(({ clone, targetBase, targetTransform }) => {
        clone.style.left = `${targetBase.left}px`;
        clone.style.top = `${targetBase.top}px`;
        clone.style.transform = targetTransform;
        clone.style.filter = "brightness(0.88) saturate(0.78)";
      });
    });

    const duration = 940 + Math.max(0, flyingCards.length - 1) * 58;
    flyingCards.forEach(({ clone }, order) => {
      window.setTimeout(() => clone.classList.add("is-face-up"), 360 + order * 58);
    });
    return new Promise((resolve) => {
      window.setTimeout(() => {
        flyingCards.forEach(({ clone, targetBase, targetTransform }) => {
          clone.style.transition = "none";
          clone.style.transitionDelay = "0ms";
          clone.style.left = `${targetBase.left}px`;
          clone.style.top = `${targetBase.top}px`;
          clone.style.transform = targetTransform;
        });
        if (flyingCards[0]) void flyingCards[0].clone.offsetWidth;
        const targetNodes = handNodesAtIndexes(indexes);
        targetNodes.forEach((node) => node.classList.add("deal-settle"));
        if (targetNodes[0]) void targetNodes[0].offsetWidth;
        targetNodes.forEach((node) => node.classList.remove("played-out"));
        if (targetNodes[0]) void targetNodes[0].offsetWidth;
        requestAnimationFrame(() => {
          flyingCards.forEach(({ clone }) => clone.remove());
          targetNodes.forEach((node) => node.classList.remove("deal-settle"));
          resolve();
        });
      }, duration);
    });
  }

  async function dealHandFromDeck() {
    const previousSettling = state.settling;
    state.settling = true;
    handCards.forEach((node) => node.classList.add("deal-settle"));
    if (handCards[0]) void handCards[0].offsetWidth;
    renderHand();
    const indexes = handCards
      .map((node, index) => (node.dataset.uid ? index : -1))
      .filter((index) => index >= 0);
    holdHandCardsForDeal(indexes);
    updateActionButtons();
    await animateDrawnCardsFromDeck(indexes);
    state.settling = previousSettling;
    updateActionButtons();
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
          playedCards.classList.remove("preparing");
          requestAnimationFrame(() => {
            flyingCards.forEach((card) => card.remove());
            resolve();
          });
        }, 640);
      });
    });
  }

  async function advanceRound() {
    state.phase = "playing";
    state.roundIndex += 1;
    state.currentTargetScore = targetScores[state.roundIndex] ?? Math.round(state.currentTargetScore * 2.1);
    state.discardPile.push(...hand.filter(Boolean));
    resetRedEyeForNextRound();
    redEyeEntry.classList.remove("round-failed");
    const normalNextTilt = state.currentTilt + state.pendingNextRoundTiltBonus;
    const nextTilt = state.pendingNextRoundTiltOverride === null
      ? normalNextTilt
      : Math.max(state.pendingNextRoundTiltOverride, normalNextTilt);
    state.pendingNextRoundTiltBonus = 0;
    state.pendingNextRoundTiltOverride = null;
    updateTilt(nextTilt);
    state.currentScore = 0;
    scoreValue.textContent = "0";
    updateTargetScore();
    playedCards.replaceChildren();
    state.showdownsLeft = showdownsMax;
    state.discardsLeft = maxDiscards;
    state.failed = false;
    state.hand = drawCards(8);
    sortHand();
    await dealHandFromDeck();
    unlockRedEyeIfNeeded();
  }

  async function showdown() {
    if (state.failed || state.phase !== "playing" || state.settling || state.redEyeModalOpen || state.showdownsLeft <= 0) return;
    const selectedNodes = selectedHandNodes();
    const cards = selectedCards();
    if (!cards.length) return;

    state.settling = true;
    hideSelectedCardTip();
    updateActionButtons();
    const handPreview = handOnlyPreview(cards);
    const surgeCard = state.activeRedEyeBet?.rules?.surgeCount ? drawCards(1)[0] || null : null;
    if (surgeCard) {
      state.discardPile.push(surgeCard);
      updateDeckCount();
    }
    const result = previewFor(cards, { surgeCard });
    commitRedEyeGhostResults(result);
    const scoringCardIds = new Set(result.scoringCardIds);
    const scoringCards = cards.filter((card) => scoringCardIds.has(card.uid));

    await animateCardsToTable(selectedNodes);
    await wait(160);
    await animateSurgeReveal(surgeCard, result);

    handName.textContent = handPreview.sequence ? handPreview.sequence.name : "未出牌";
    pulseElement(document.querySelector(".hand-title"), "flash");
    await wait(160);

    chipsValue.textContent = String(Math.round(handPreview.base));
    pulseElement(chipsChip);
    await wait(190);

    await animateCardChipScoring(scoringCards, result, handPreview);
    await animateMultiplierSettlement(result);

    const nextScore = state.currentScore + result.profit;
    state.showdownsLeft = Math.max(0, state.showdownsLeft - 1);
    const lifeDebtWouldBurst = Boolean(state.activeRedEyeBet?.rules?.preventBust) && result.pressure >= maxTilt;
    const resolvedPressure = lifeDebtWouldBurst ? maxTilt - 1 : result.pressure;
    await animateTilt(resolvedPressure);
    pulseElement(tiltSection, "tilt-pulse");
    if (resolvedPressure >= 140) pulseElement(board, "critical-hit");
    board.classList.remove("betting");

    const burstFailure = checkFailureAfterScoring(result);
    updateCounts();
    if (burstFailure?.type === "bustCard") {
      await animateBustCard();
      showFailureOverlay("bustCard", {
        currentScore: state.currentScore,
        targetScore: state.currentTargetScore
      });
      state.settling = false;
      updateActionButtons();
      return;
    }

    state.currentScore = nextScore;
    scoreValue.textContent = formatNumber(state.currentScore);
    const stealLineClears = canStealLineClear(state.currentScore);
    const clearsTarget = state.currentScore >= state.currentTargetScore || stealLineClears;

    commitPlayedCards(selectedNodes, cards);
    updateCounts();

    if (clearsTarget) {
      applyRedEyeRoundCostOnClear({ stealLineClears, lifeDebtWouldBurst });
      const reward = calculateRoundReward({
        flipBonus: calculateFlipDealerBonus(clearsTarget)
      });
      await wait(240);
      await clearPlayedCardsAfterScore();
      await showRoundClearOverlay(reward);
    } else {
      const scoringFailure = checkFailureAfterScoring(result, state.currentScore);
      if (scoringFailure?.type === "houseTakes") {
        await animateHouseTakes();
        showFailureOverlay("houseTakes", {
          currentScore: state.currentScore,
          targetScore: state.currentTargetScore,
          shortfall: state.currentTargetScore - state.currentScore
        });
      } else {
        await wait(240);
        await clearPlayedCardsAfterScore();
        consumeActiveRedEyeBetAfterShowdown();
        unlockRedEyeIfNeeded();
      }
    }
    state.settling = false;
    updateActionButtons();
  }

  async function discardSelectedCards() {
    if (state.failed || state.phase !== "playing" || state.settling || state.redEyeModalOpen || state.discardsLeft <= 0) return;
    const selectedNodes = selectedHandNodes();
    if (!selectedNodes.length) {
      discardButton.title = "先选择要换掉的手牌";
      return;
    }
    discardButton.title = "";
    const changedIndexes = selectedNodes.map((node) => handCards.indexOf(node)).filter((index) => index >= 0);
    state.settling = true;
    hideSelectedCardTip();
    updateActionButtons();
    await animateDiscardedCards(selectedNodes);

    const drawnCardIds = [];
    changedIndexes.forEach((index) => {
      const oldCard = state.hand[index];
      if (oldCard) {
        state.discardPile.push(oldCard);
        state.selectedIds.delete(oldCard.uid);
      }
      state.hand[index] = drawCards(1)[0] || null;
      if (state.hand[index]) drawnCardIds.push(state.hand[index].uid);
    });

    sortHand();
    renderHand();
    const drawnIndexes = handCards
      .map((node, index) => (drawnCardIds.includes(node.dataset.uid) ? index : -1))
      .filter((index) => index >= 0);
    holdHandCardsForDeal(drawnIndexes);

    state.discardsLeft -= 1;
    redEyeTooltip.classList.remove("show");
    updateDeckCount();
    updateCounts();
    updatePreview();
    await animateDrawnCardsFromDeck(drawnIndexes);
    state.settling = false;
    updateCounts();
    updateDeckCount();
  }

  function bindEvents() {
    function toggleOwnedGhostTip(card) {
      state.selectedGhostId = state.selectedGhostId === card.dataset.ghost ? null : card.dataset.ghost;
      updateOwnedGhostTip();
    }

    jokerRow.addEventListener("click", (event) => {
      const card = event.target.closest(".owned-ghost-card");
      if (!card || !jokerRow.contains(card) || state.phase !== "playing") return;
      toggleOwnedGhostTip(card);
    });

    jokerRow.addEventListener("keydown", (event) => {
      const card = event.target.closest(".owned-ghost-card");
      if (!card || !jokerRow.contains(card) || state.phase !== "playing" || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      toggleOwnedGhostTip(card);
    });

    handCards.forEach((card) => {
      card.addEventListener("click", () => {
        if (state.failed || state.phase !== "playing" || state.settling || state.redEyeModalOpen || card.classList.contains("played-out")) return;
        if (!card.classList.contains("selected")) {
          const selectedCount = selectedHandNodes().length;
          if (selectedCount >= 5) return;
          state.selectedIds.add(card.dataset.uid);
          state.selectedTipUid = card.dataset.uid;
        } else {
          state.selectedIds.delete(card.dataset.uid);
          if (state.selectedTipUid === card.dataset.uid) state.selectedTipUid = null;
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
      if (state.failed || state.phase !== "playing" || state.redEyeBetsBlockedThisRound || state.activeRedEyeBet || !state.redEyeUnlocked || state.redEyeUsedThisRound) return;
      const bet = redEyeBets[button.dataset.bet];
      if (!bet || !state.redEyeOfferIds.includes(bet.id)) return;
      state.activeRedEyeBet = bet;
      closeRedEyeModal();
      pulseElement(redEyeEntry, "wager-press");
      playArtVfx(wagerSealArtVfx, "play-wager-seal");
      pulseElement(deckStack, "surge-shake");
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

    if (redEyeModalClose) redEyeModalClose.addEventListener("click", closeRedEyeModal);

    failureRestart.addEventListener("click", resetDemoRun);
    roundClearContinue.addEventListener("click", proceedToNextRound);
    if (shopNextButton) shopNextButton.addEventListener("click", proceedToNextRoundFromShop);
    if (shopRerollButton) shopRerollButton.addEventListener("click", rerollShopGhosts);
    if (shopGhostOffers) {
      shopGhostOffers.addEventListener("click", (event) => {
        const buyButton = event.target.closest("button[data-shop-buy-ghost]");
        if (buyButton && shopGhostOffers.contains(buyButton)) {
          buyShopGhost(Number(buyButton.dataset.shopBuyGhost));
          return;
        }
        const select = event.target.closest(".shop-ghost-select");
        if (!select || !shopGhostOffers.contains(select)) return;
        const product = select.closest("[data-shop-ghost]");
        const slotIndex = Number(product.dataset.shopGhost);
        state.shopState.selectedGhostSlot = state.shopState.selectedGhostSlot === slotIndex ? null : slotIndex;
        renderShopGhostOffers();
      });
      shopGhostOffers.addEventListener("keydown", (event) => {
        const select = event.target.closest(".shop-ghost-select");
        if (!select || !shopGhostOffers.contains(select) || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        const product = select.closest("[data-shop-ghost]");
        const slotIndex = Number(product.dataset.shopGhost);
        state.shopState.selectedGhostSlot = state.shopState.selectedGhostSlot === slotIndex ? null : slotIndex;
        renderShopGhostOffers();
      });
    }
    if (shopPackOffers) {
      shopPackOffers.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-shop-pack]");
        if (!button || !shopPackOffers.contains(button)) return;
        buyShopPack(Number(button.dataset.shopPack));
      });
    }
    if (shopStage) {
      shopStage.addEventListener("click", (event) => {
        if (state.phase !== "shop" || state.shopState.selectedGhostSlot === null) return;
        if (event.target.closest(".shop-ghost-product, button, .shop-pack-product")) return;
        state.shopState.selectedGhostSlot = null;
        renderShopGhostOffers();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.redEyeModalOpen) closeRedEyeModal();
      if (event.key === "Escape" && state.selectedGhostId) {
        state.selectedGhostId = null;
        updateOwnedGhostTip();
      }
      if (event.key === "Escape" && state.phase === "shop" && state.shopState.selectedGhostSlot !== null) {
        state.shopState.selectedGhostSlot = null;
        renderShopGhostOffers();
      }
    });

    document.addEventListener("click", (event) => {
      if (!redEyeEntry.contains(event.target)) redEyeTooltip.classList.remove("show");
      if (!event.target.closest(".joker-zone")) {
        state.selectedGhostId = null;
        updateOwnedGhostTip();
      }
    });

    window.addEventListener("resize", fitBoard);
    window.addEventListener("orientationchange", fitBoard);
  }

  async function init() {
    fitBoard();
    mountArtAssets();
    updateTargetScore();
    drawInitialHand();
    renderOwnedGhosts();
    updateTilt(state.currentTilt);
    bindEvents();
    await dealHandFromDeck();
    unlockRedEyeIfNeeded();
  }

  init();
})();
