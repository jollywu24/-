(function (global) {
  function createFreshShopState(rerollCost) {
    return {
      offeredGhosts: [],
      offeredPacks: [],
      rerollCost,
      purchasedGhostSlots: new Set(),
      purchasedPackSlots: new Set(),
      selectedGhostSlot: null
    };
  }

  function createRuntimeState(options) {
    return {
      currentScore: 0,
      currentTargetScore: options.initialTargetScore,
      currentTilt: 0,
      redEyeActive: false,
      currentStake: options.initialStake,
      roundIndex: 0,
      settling: false,
      rng: null,
      deck: [],
      hand: [],
      discardPile: [],
      showdownsLeft: options.showdownsMax,
      discardsLeft: options.maxDiscards,
      failed: false,
      phase: "playing",
      failureType: null,
      selectedIds: new Set(),
      redEyeUnlocked: false,
      redEyeUsedThisRound: false,
      redEyeModalOpen: false,
      activeRedEyeBet: null,
      redEyeOfferIds: [],
      pendingNextRoundTiltBonus: 0,
      pendingNextRoundTiltOverride: null,
      pendingRoundReward: 0,
      ownedGhosts: [],
      bloodshotStacks: 0,
      withdrawalStacks: 0,
      pendingWithdrawalBonusStacks: 0,
      redEyeBetsBlockedThisRound: false,
      shopState: createFreshShopState(options.shopRerollCost),
      selectedTipUid: null,
      selectedGhostId: null
    };
  }

  function resetRuntimeState(state, options) {
    Object.assign(state, createRuntimeState(options));
    return state;
  }

  const api = { createFreshShopState, createRuntimeState, resetRuntimeState };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.GameRuntimeState = api;
})(typeof window !== "undefined" ? window : globalThis);
