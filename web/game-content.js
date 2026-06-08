(function (global) {
  const RED_EYE_BETS = {
    replay: {
      id: "replay",
      name: "再押一手",
      icon: "♠",
      text: "本手所有有效牌重复触发 1 次。追加 1 张暗涌牌。",
      rules: { repeatScoringCards: 1, surgeCount: 1 }
    },
    redDouble: {
      id: "redDouble",
      name: "红眼翻倍",
      icon: "●",
      text: "本手倍率 ×2。追加 1 张暗涌牌。",
      rules: { handMultiplier: 2, surgeCount: 1 }
    },
    borrow: {
      id: "borrow",
      name: "借鬼钱",
      icon: "☠",
      text: "本手筹码 +100。追加 1 张暗涌牌，下一轮起始上头 +25。",
      rules: { chips: 100, nextRoundTiltBonusOnClear: 25, surgeCount: 1 }
    },
    stealLine: {
      id: "stealLine",
      name: "偷过线",
      icon: "◇",
      text: "若分数达到目标 90%，直接视为达标。追加 1 张暗涌牌，下轮上头 +30。",
      rules: { clearThreshold: 0.9, nextRoundTiltBonusOnStealLine: 30, surgeCount: 1 }
    },
    flipDealer: {
      id: "flipDealer",
      name: "翻庄",
      icon: "↟",
      text: "鬼压桌时过关赌资翻倍，最多额外 +20。追加 1 张暗涌牌。",
      rules: { flipDealerMinTilt: 140, flipDealerMaxReward: 20, surgeCount: 1 }
    },
    lifeDebt: {
      id: "lifeDebt",
      name: "欠命",
      icon: "†",
      text: "本手不会爆牌，追加 1 张暗涌牌。若成功过关，下一轮上头至少 90。",
      rules: { preventBust: true, nextRoundTiltFloorOnClear: 90, surgeCount: 1 }
    }
  };

  const RED_EYE_GHOST_IDS = {
    bloodshotGlasses: "bloodshot_glasses",
    redEyeIou: "red_eye_iou",
    smallCardCourage: "small_card_courage",
    rottenLifeInsurance: "rotten_life_insurance",
    withdrawalRebound: "withdrawal_rebound"
  };

  const GHOSTS = [
    {
      id: "bloodshotGlasses",
      name: "血丝眼镜",
      price: 7,
      effect: "普通手 +3 上头；进红眼叠血丝",
      description: "普通状态下，每次计分结束后上头值 +3。每次进入红眼获得 1 层血丝；每层让红眼基础倍率额外 +0.1。",
      terms: [
        ["红眼", "上头值达到 100 时进入，降到 80 以下时退出。"],
        ["血丝", "永久叠加的层数，每层提高红眼基础倍率。"]
      ],
      stars: "★★★◇◇",
      rarity: "rare-purple",
      portrait: "debtor",
      rules: { normalHype: 3, stacksPerRedEyeEntry: 1, redEyeMultiplierPerStack: 0.1 },
      jokerId: RED_EYE_GHOST_IDS.bloodshotGlasses
    },
    {
      id: "redEyeIou",
      name: "红眼借据",
      price: 8,
      effect: "红眼赌注 ×1.25；暗涌额外 +3 上头",
      description: "使用红眼赌注时，本手最终红倍率额外 ×1.25。暗涌牌翻开后，上头值再额外 +3。",
      terms: [
        ["暗涌牌", "使用红眼赌注后额外翻开的牌；只增加上头值，不参与牌型和筹码计算。"]
      ],
      stars: "★★★★◇",
      rarity: "rare-orange",
      portrait: "collector",
      rules: { betMultiplier: 1.25, surgeHype: 3 },
      jokerId: RED_EYE_GHOST_IDS.redEyeIou
    },
    {
      id: "smallCardCourage",
      name: "小牌壮胆",
      price: 7,
      effect: "暗涌 ≤5 时，红倍率 +暗涌点数",
      description: "使用红眼赌注翻出的暗涌牌点数不高于 5 时，本手红倍率增加该暗涌牌的点数。",
      terms: [
        ["暗涌牌", "使用红眼赌注后额外翻开的牌；牌面点数会增加上头值，不参与牌型和筹码计算。"],
        ["红倍率", "进入红眼后获得的额外倍率。"]
      ],
      stars: "★★◇◇◇",
      rarity: "rare-orange",
      portrait: "reaper",
      rules: { maxSurgeForMultiplier: 5 },
      jokerId: RED_EYE_GHOST_IDS.smallCardCourage
    },
    {
      id: "rottenLifeInsurance",
      name: "烂命保险",
      price: 9,
      effect: "红眼爆牌时设为 120，随后摧毁",
      description: "红眼状态下，若本次上头值增加会导致爆牌，则改为将上头值设为 120，并摧毁本牌；本关不能再使用红眼赌注。",
      terms: [
        ["爆牌", "上头值达到 160，当前赌局立即失败。"]
      ],
      stars: "★★★★◇",
      rarity: "rare-blue",
      portrait: "dealer",
      rules: { resetTilt: 120, destroyOnTrigger: true, blockBetsOnTrigger: true },
      jokerId: RED_EYE_GHOST_IDS.rottenLifeInsurance
    },
    {
      id: "withdrawalRebound",
      name: "戒断反弹",
      price: 10,
      effect: "退红眼叠戒断；下次赌注爆发",
      description: "每次退出红眼获得 1 层戒断。下次进入红眼时，戒断转为待爆发层数，使第一次红眼赌注获得额外倍率。",
      terms: [
        ["戒断", "退出红眼时获得的永久层数。"],
        ["待爆发", "再次进入红眼后，留给下一次红眼赌注使用的戒断层数。"]
      ],
      stars: "★★★★◇",
      rarity: "rare-purple",
      portrait: "debtor",
      rules: { stacksPerRedEyeExit: 1, multiplierPerStack: 1.3 },
      jokerId: RED_EYE_GHOST_IDS.withdrawalRebound
    }
  ];
  const RED_EYE_BET_RULES = Object.fromEntries(Object.values(RED_EYE_BETS).map((bet) => [bet.id, bet.rules]));
  const GHOST_RULES = Object.fromEntries(GHOSTS.map((ghost) => [ghost.jokerId, ghost.rules]));

  const SHOP_PACKS = [
    {
      id: "calmingToken",
      price: 5,
      name: "冷手筹码",
      description: "立即降低 25 点上头值。",
      tone: "blue",
      relief: 25
    },
    {
      id: "abyssPack",
      price: 5,
      name: "深渊补给包",
      description: "包含 5 张牌，至少 1 张稀有或更高。",
      tone: "black"
    },
    {
      id: "redEyePack",
      price: 6,
      name: "红眼卡包",
      description: "包含 5 张牌，更容易出现高风险高收益牌。",
      tone: "red"
    }
  ];

  function ghostEffect(ghost, state, redEyeMultiplier = 1.5) {
    if (ghost.id === "bloodshotGlasses") {
      return `血丝 ${state.bloodshotStacks} 层；红眼倍率 ×${(redEyeMultiplier + state.bloodshotStacks * ghost.rules.redEyeMultiplierPerStack).toFixed(1)}`;
    }
    if (ghost.id === "withdrawalRebound") {
      return state.pendingWithdrawalBonusStacks > 0
        ? `待爆发 ${state.pendingWithdrawalBonusStacks} 层戒断`
        : `戒断 ${state.withdrawalStacks} 层`;
    }
    return ghost.effect;
  }

  function ghostDescription(ghost, state, redEyeMultiplier = 1.5) {
    if (ghost.id === "bloodshotGlasses") {
      return `${ghost.description} 当前血丝 ${state.bloodshotStacks} 层，红眼基础倍率 ×${(redEyeMultiplier + state.bloodshotStacks * ghost.rules.redEyeMultiplierPerStack).toFixed(1)}。`;
    }
    if (ghost.id === "withdrawalRebound") {
      return state.pendingWithdrawalBonusStacks > 0
        ? `当前有 ${state.pendingWithdrawalBonusStacks} 层待爆发戒断。下一次红眼赌注会获得额外倍率，随后清空待爆发层数。`
        : `${ghost.description} 当前戒断 ${state.withdrawalStacks} 层。`;
    }
    return ghost.description;
  }

  function ghostRarityLabel(ghost) {
    if (ghost.rarity === "rare-purple") return "诡异";
    if (ghost.rarity === "rare-blue") return "稀有";
    if (ghost.rarity === "rare-orange") return "罕见";
    return "普通";
  }

  const api = {
    RED_EYE_BETS,
    RED_EYE_BET_RULES,
    RED_EYE_GHOST_IDS,
    GHOSTS,
    GHOST_RULES,
    SHOP_PACKS,
    ghostEffect,
    ghostDescription,
    ghostRarityLabel
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.GameContent = api;
})(typeof window !== "undefined" ? window : globalThis);
