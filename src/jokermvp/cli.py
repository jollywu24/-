from __future__ import annotations

import argparse
import random

from .game import RunState, deal_hand, score_play, shop_offer


def pick_cards(hand):
    print("\n你的手牌:")
    for i, c in enumerate(hand, 1):
        print(f"  {i}. {c}")
    raw = input("选择5张牌（例如: 1 2 3 4 5）: ").strip()
    idx = [int(x) - 1 for x in raw.split()[:5]]
    if len(idx) != 5 or any(i < 0 or i >= len(hand) for i in idx):
        raise ValueError("输入无效，必须是5个合法编号")
    return [hand[i] for i in idx]


def shop_phase(state: RunState):
    print(f"\n商店阶段，金币: ${state.money}")
    offers = shop_offer(state.rng)
    for i, j in enumerate(offers, 1):
        print(f"  {i}. {j.name} (+{j.chips_bonus} chips, +{j.mult_bonus} mult, pair+{j.pair_mult_bonus} mult) 价格:$4")
    choice = input("输入购买编号(1-3)或0跳过: ").strip()
    if choice in {"1", "2", "3"} and state.money >= 4:
        state.jokers.append(offers[int(choice) - 1])
        state.money -= 4
        print(f"已购买 {offers[int(choice)-1].name}")


def run(seed: int | None = None):
    rng = random.Random(seed)
    state = RunState(rng=rng)
    print("=== Joker-like MVP Demo ===")

    for _ in range(3):
        print(f"\n--- Ante {state.ante} --- 目标分: {state.target()} 当前总分: {state.score}")
        if state.jokers:
            print("已装备Joker:", ", ".join(j.name for j in state.jokers))
        hand = deal_hand(rng)
        try:
            chosen = pick_cards(hand)
        except Exception as e:
            print(e)
            return

        hand_type, chips, mult, gain = score_play(chosen, state.jokers)
        state.score += gain
        state.money += 3
        print(f"牌型: {hand_type} | chips={chips} mult={mult} => +{gain} 分")

        if state.score < state.target():
            print("未达到目标，游戏失败。")
            return

        print("过关! 奖励 +$2")
        state.money += 2
        shop_phase(state)
        state.ante += 1

    print(f"\n恭喜通关！最终分数: {state.score}, 剩余金币: ${state.money}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()
    run(args.seed)


if __name__ == "__main__":
    main()
