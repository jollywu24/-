(function (global) {
  function collectGameDom(document) {
    const board = document.querySelector(".game-board");
    const redEyeEntry = document.querySelector(".red-eye-entry");
    const chipsChip = document.querySelector(".score-chip.blue");
    const multChip = document.querySelector(".score-chip.red");

    return {
      board,
      handCards: [...document.querySelectorAll(".hand-card")],
      playedCards: document.querySelector(".played-cards"),
      showdownButton: document.querySelector(".showdown-button"),
      discardButton: document.querySelector(".discard-button"),
      targetScoreValue: document.querySelector(".score-row .red-number"),
      scoreValue: document.querySelectorAll(".score-row strong")[1],
      showdownCount: document.querySelectorAll(".count-stack strong")[0],
      discardCount: document.querySelectorAll(".count-stack strong")[1],
      handCount: document.querySelector(".hand-count"),
      handZone: document.querySelector(".hand-zone"),
      selectedCardTip: document.querySelector(".selected-card-tip"),
      handName: document.querySelector(".hand-title strong"),
      chipsChip,
      multChip,
      chipsValue: chipsChip.querySelector("strong"),
      multValue: multChip.querySelector("strong"),
      stakeValue: document.querySelector(".stake-row strong"),
      tiltSection: document.querySelector(".tilt-meter"),
      tiltValue: document.querySelector(".section-title strong"),
      meterHand: document.querySelector(".meter-hand"),
      deckCount: document.querySelector(".deck-count"),
      deckStack: document.querySelector(".deck-stack"),
      jokerZone: document.querySelector(".joker-zone"),
      jokerRow: document.querySelector(".joker-row"),
      jokerCount: document.querySelector(".joker-count"),
      ownedGhostTip: document.querySelector(".owned-ghost-tip"),
      redEyeModal: document.querySelector(".red-eye-modal"),
      redEyeModalClose: document.querySelector(".red-eye-modal-close"),
      redEyeOptionsPanel: document.querySelector(".red-eye-options"),
      redEyeEntry,
      redEyeStateText: redEyeEntry.querySelector("strong"),
      redEyeEntryDetail: redEyeEntry.querySelector(".red-eye-entry-detail"),
      redEyeIcon: document.querySelector(".red-eye-status-icon"),
      redEyeTooltip: document.querySelector(".red-eye-tooltip"),
      failureOverlay: document.querySelector(".failure-overlay"),
      failureCard: document.querySelector(".failure-card"),
      failureTitle: document.querySelector(".failure-title"),
      failureSubtitle: document.querySelector(".failure-subtitle"),
      failureStats: document.querySelector(".failure-stats"),
      failureRestart: document.querySelector(".failure-restart"),
      roundClearOverlay: document.querySelector(".round-clear-overlay"),
      roundClearCurrent: document.querySelector(".round-clear-current strong"),
      roundClearRewards: document.querySelector(".round-clear-rewards"),
      roundClearTotal: document.querySelector(".round-clear-total strong"),
      roundClearContinue: document.querySelector(".round-clear-continue"),
      shopStage: document.querySelector(".shop-stage"),
      shopGhostOffers: document.querySelector(".shop-ghost-offers"),
      shopPackOffers: document.querySelector(".shop-pack-offers"),
      shopNextButton: document.querySelector(".shop-next-button"),
      shopRerollButton: document.querySelector(".shop-reroll-button"),
      shopMessage: document.querySelector(".shop-message"),
      globalRedFlash: document.querySelector(".global-red-flash"),
      redEyeArtVfx: document.querySelector(".art-vfx-red-eye"),
      wagerSealArtVfx: document.querySelector(".art-vfx-wager-seal"),
      redEyeAnnouncement: document.querySelector(".red-eye-announcement")
    };
  }

  const api = { collectGameDom };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.GameDom = api;
})(typeof window !== "undefined" ? window : globalThis);
