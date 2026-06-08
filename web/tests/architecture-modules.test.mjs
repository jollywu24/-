import test from 'node:test';
import assert from 'node:assert/strict';
import content from '../game-content.js';
import runtimeState from '../runtime-state.js';
import roundRules from '../round-rules.js';

const stateOptions = {
  initialTargetScore: 300,
  initialStake: 12,
  showdownsMax: 3,
  maxDiscards: 2,
  shopRerollCost: 5,
};

test('集中内容定义为红眼赌注与赌鬼提供唯一展示入口', () => {
  assert.equal(Object.keys(content.RED_EYE_BETS).length, 6);
  assert.equal(content.GHOSTS.length, 5);
  assert.equal(new Set(content.GHOSTS.map((ghost) => ghost.jokerId)).size, 5);
  assert.equal(content.GHOSTS.find((ghost) => ghost.id === 'redEyeIou').jokerId, content.RED_EYE_GHOST_IDS.redEyeIou);
  assert.equal(content.RED_EYE_BET_RULES.stealLine.clearThreshold, 0.9);
  assert.equal(content.GHOST_RULES[content.RED_EYE_GHOST_IDS.redEyeIou].betMultiplier, 1.25);

  const bloodshot = content.GHOSTS.find((ghost) => ghost.id === 'bloodshotGlasses');
  assert.match(content.ghostEffect(bloodshot, { bloodshotStacks: 2 }, 1.5), /×1\.7/);
});

test('运行时状态初始化和重置不会复用集合与数组', () => {
  const first = runtimeState.createRuntimeState(stateOptions);
  const second = runtimeState.createRuntimeState(stateOptions);
  first.selectedIds.add('card-1');
  first.shopState.purchasedGhostSlots.add(0);

  assert.equal(second.selectedIds.size, 0);
  assert.equal(second.shopState.purchasedGhostSlots.size, 0);

  first.currentScore = 999;
  runtimeState.resetRuntimeState(first, stateOptions);
  assert.equal(first.currentScore, 0);
  assert.equal(first.currentTargetScore, 300);
});

test('纯回合规则保持爆牌优先和红眼赌注跨轮结果', () => {
  assert.deepEqual(roundRules.checkFailureAfterScoring({
    resultPressure: 160,
    currentTilt: 159,
    maxTilt: 160,
    activeBet: null,
    showdownsLeft: 0,
    candidateScore: 0,
    targetScore: 300,
  }), { type: 'bustCard' });
  assert.equal(roundRules.checkFailureAfterScoring({
    resultPressure: 160,
    currentTilt: 159,
    maxTilt: 160,
    activeBet: content.RED_EYE_BETS.lifeDebt,
    showdownsLeft: 1,
    candidateScore: 0,
    targetScore: 300,
  }), null);

  assert.equal(roundRules.canStealLineClear({
    bet: content.RED_EYE_BETS.stealLine,
    score: 270,
    targetScore: 300,
  }), true);

  assert.deepEqual(roundRules.redEyeRoundCostOnClear({
    bet: content.RED_EYE_BETS.borrow,
    stealLineClears: false,
  }), {
    tiltBonus: 25,
    tiltOverride: null,
  });
  assert.equal(roundRules.redEyeRoundCostOnClear({
    bet: content.RED_EYE_BETS.stealLine,
    stealLineClears: true,
  }).tiltBonus, 30);
  assert.equal(roundRules.calculateFlipDealerBonus({
    bet: content.RED_EYE_BETS.flipDealer,
    clearsTarget: true,
    currentTilt: 145,
    maxTilt: 160,
    currentStake: 30,
  }), 20);
});

test('纯回合收益规则保持现有奖励数值', () => {
  const reward = roundRules.calculateRoundReward({
    clearReward: 4,
    playReward: 1,
    discardReward: 2,
    showdownsLeft: 2,
    discardsLeft: 1,
    flipBonus: 12,
    formattedStake: '12',
  });

  assert.equal(reward.total, 20);
  assert.deepEqual(reward.lines.map((line) => line.amount), [4, 2, 2, 12]);
});
