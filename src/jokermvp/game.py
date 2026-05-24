from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import random
from collections import Counter
from typing import List


class Suit(str, Enum):
    SPADES = "♠"
    HEARTS = "♥"
    CLUBS = "♣"
    DIAMONDS = "♦"


RANKS = list(range(2, 15))
RANK_NAME = {11: "J", 12: "Q", 13: "K", 14: "A"}


@dataclass(frozen=True)
class Card:
    rank: int
    suit: Suit

    def __str__(self) -> str:
        return f"{RANK_NAME.get(self.rank, self.rank)}{self.suit.value}"


@dataclass
class Joker:
    name: str
    chips_bonus: int = 0
    mult_bonus: int = 0
    pair_mult_bonus: int = 0

    def apply(self, hand_type: str, chips: int, mult: int) -> tuple[int, int]:
        chips += self.chips_bonus
        mult += self.mult_bonus
        if hand_type == "Pair":
            mult += self.pair_mult_bonus
        return chips, mult


BASE = {
    "High Card": (5, 1),
    "Pair": (15, 2),
    "Two Pair": (25, 2),
    "Three of a Kind": (35, 3),
    "Straight": (40, 4),
    "Flush": (45, 4),
    "Full House": (60, 5),
    "Four of a Kind": (80, 7),
    "Straight Flush": (120, 10),
}


SHOP_POOL = [
    Joker("Lucky Cat", mult_bonus=1),
    Joker("Stone Mask", chips_bonus=10),
    Joker("Twin Lens", pair_mult_bonus=2),
    Joker("Gold Seal", chips_bonus=5, mult_bonus=1),
]


@dataclass
class RunState:
    rng: random.Random
    ante: int = 1
    score: int = 0
    money: int = 6
    jokers: List[Joker] = field(default_factory=list)

    def target(self) -> int:
        return 5 + (self.ante - 1) * 20


def build_deck() -> List[Card]:
    return [Card(rank, suit) for suit in Suit for rank in RANKS]


def deal_hand(rng: random.Random, size: int = 8) -> List[Card]:
    deck = build_deck()
    rng.shuffle(deck)
    return deck[:size]


def eval_hand(cards: List[Card]) -> str:
    ranks = sorted([c.rank for c in cards])
    rank_counts = Counter(ranks)
    counts = sorted(rank_counts.values(), reverse=True)
    flush = len({c.suit for c in cards}) == 1
    unique = sorted(set(ranks))
    straight = len(unique) == 5 and (unique[-1] - unique[0] == 4 or unique == [2, 3, 4, 5, 14])

    if straight and flush:
        return "Straight Flush"
    if counts[0] == 4:
        return "Four of a Kind"
    if counts == [3, 2]:
        return "Full House"
    if flush:
        return "Flush"
    if straight:
        return "Straight"
    if counts[0] == 3:
        return "Three of a Kind"
    if counts == [2, 2, 1]:
        return "Two Pair"
    if counts[0] == 2:
        return "Pair"
    return "High Card"


def score_play(chosen: List[Card], jokers: List[Joker]) -> tuple[str, int, int, int]:
    hand_type = eval_hand(chosen)
    chips, mult = BASE[hand_type]
    for j in jokers:
        chips, mult = j.apply(hand_type, chips, mult)
    score = chips * mult
    return hand_type, chips, mult, score


def shop_offer(rng: random.Random, count: int = 3) -> List[Joker]:
    return [rng.choice(SHOP_POOL) for _ in range(count)]
