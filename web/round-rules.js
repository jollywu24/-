(function (global) {
  function checkFailureAfterScoring(input) {
    if (!input.activeBet?.rules?.preventBust && (input.resultPressure >= input.maxTilt || input.currentTilt >= input.maxTilt)) {
      return { type: "bustCard" };
    }
    if (input.showdownsLeft <= 0 && input.candidateScore < input.targetScore) {
      return { type: "houseTakes" };
    }
    return null;
  }

  function canStealLineClear({ bet, score, targetScore }) {
    const threshold = bet?.rules?.clearThreshold;
    return Number.isFinite(threshold) && score >= targetScore * threshold && score < targetScore;
  }

  function redEyeRoundCostOnClear({ bet, stealLineClears }) {
    return {
      tiltBonus: (bet?.rules?.nextRoundTiltBonusOnClear || 0)
        + (stealLineClears ? bet?.rules?.nextRoundTiltBonusOnStealLine || 0 : 0),
      tiltOverride: bet?.rules?.nextRoundTiltFloorOnClear ?? null
    };
  }

  function calculateFlipDealerBonus({ bet, clearsTarget, currentTilt, maxTilt, currentStake }) {
    const minTilt = bet?.rules?.flipDealerMinTilt;
    const maxReward = bet?.rules?.flipDealerMaxReward;
    if (!Number.isFinite(minTilt) || !clearsTarget) return 0;
    if (currentTilt < minTilt || currentTilt >= maxTilt) return 0;
    return Math.min(currentStake, maxReward);
  }

  function rewardLine(key, label, amount, detail = "") {
    return { key, label, amount: Math.max(0, Math.round(amount || 0)), detail };
  }

  function calculateRoundReward(input) {
    const clearReward = input.clearReward;
    const remainingPlayReward = input.showdownsLeft * input.playReward;
    const remainingDiscardReward = input.discardsLeft * input.discardReward;
    const redEyeReward = 0;
    const ghostBonus = 0;
    const lines = [
      rewardLine("clearReward", "达标奖励", clearReward, "通关本局"),
      rewardLine("remainingPlayReward", "剩余摊牌奖励", remainingPlayReward, `${input.showdownsLeft} 次 × $${input.playReward}`),
      rewardLine("remainingDiscardReward", "剩余换牌奖励", remainingDiscardReward, `${input.discardsLeft} 次 × $${input.discardReward}`)
    ];

    if (redEyeReward > 0) lines.push(rewardLine("redEyeReward", "红眼赌注奖励", redEyeReward));
    if (input.flipBonus > 0) {
      lines.push(rewardLine("flipBonus", "翻庄奖励", input.flipBonus, `当前赌资 $${input.formattedStake}，最多额外 +$20`));
    }
    if (ghostBonus > 0) lines.push(rewardLine("ghostBonus", "赌鬼奖励", ghostBonus));

    return {
      clearReward,
      remainingPlayReward,
      remainingDiscardReward,
      redEyeReward,
      flipBonus: input.flipBonus,
      ghostBonus,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      lines
    };
  }

  const api = {
    checkFailureAfterScoring,
    canStealLineClear,
    redEyeRoundCostOnClear,
    calculateFlipDealerBonus,
    calculateRoundReward
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.GameRoundRules = api;
})(typeof window !== "undefined" ? window : globalThis);
