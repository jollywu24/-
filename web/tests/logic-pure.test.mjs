import test from 'node:test';
import assert from 'node:assert/strict';
import pkg from '../logic-pure.js';

const { evaluateIgnitionSequence, sequenceAtLevel, applySimpleJokers, applyRedHeatCore, createRunState, createRng, createStandardDeck, simulatePreview } = pkg;

function card(rank, phase = 'kinetic') {
  return { chips: rank, phase };
}

test('evaluateIgnitionSequence follows Balatro poker hand priority', () => {
  assert.equal(evaluateIgnitionSequence([card(2), card(3, 'pulse'), card(4, 'thermal'), card(5, 'toxic'), card(6)]).name, '顺子');
  assert.equal(evaluateIgnitionSequence([card(10), card(10, 'pulse'), card(3), card(4), card(5)]).name, '对子');
  assert.equal(evaluateIgnitionSequence([card(10), card(10, 'pulse'), card(3), card(3, 'toxic'), card(5)]).name, '两对');
  assert.equal(evaluateIgnitionSequence([card(10), card(10, 'pulse'), card(3), card(3, 'toxic'), null]).name, '两对');
  assert.equal(evaluateIgnitionSequence([card(10), card(10, 'pulse'), card(10, 'thermal'), card(4), card(5)]).name, '三条');
  assert.equal(evaluateIgnitionSequence([card(10), card(10, 'pulse'), card(10, 'thermal'), card(3), card(3, 'toxic')]).name, '葫芦');
  assert.equal(evaluateIgnitionSequence([card(10), card(10, 'pulse'), card(10, 'thermal'), card(10, 'toxic'), card(5)]).name, '四条');
});

test('evaluateIgnitionSequence detects flush and straight flush', () => {
  assert.equal(evaluateIgnitionSequence([card(2), card(4), card(7), card(9), card(13)]).name, '同花');
  assert.equal(evaluateIgnitionSequence([card(2), card(3), card(4), card(5), card(6)]).name, '同花顺');
  assert.equal(evaluateIgnitionSequence([card(14), card(2), card(3), card(4), card(5)]).name, '同花顺');
});

test('createStandardDeck builds a true 52 card deck from 2 through A', () => {
  const deck = createStandardDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((card) => card.deckId)).size, 52);
  assert.deepEqual([...new Set(deck.map((card) => card.rank))].sort((a, b) => a - b), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.equal(deck.filter((card) => card.rankLabel === 'A').length, 4);
});

test('createRng returns repeatable sequences for the same seed', () => {
  const first = createRng('balance-42');
  const second = createRng('balance-42');
  assert.deepEqual(
    Array.from({ length: 8 }, () => first()),
    Array.from({ length: 8 }, () => second())
  );
});

test('sequenceAtLevel scales poker hand rewards without changing level one', () => {
  const pair = pkg.SEQUENCES.pair;
  assert.deepEqual(sequenceAtLevel(pair, 1).base, pair.base);
  const leveled = sequenceAtLevel(pair, 3);
  assert.equal(leveled.level, 3);
  assert.equal(leveled.base, pair.base + pair.baseGrowth * 2);
  assert.equal(leveled.mult, pair.mult + pair.multGrowth * 2);
});

test('single 10-point base card previews as card chips plus high-card base', () => {
  const slots = [{ chips: 10, phase: 'pulse', trigger: 'ON_RESOLVE', preview: (run) => { run.base += 10; run.pressure += 1; } }];
  const out = simulatePreview({
    slots,
    state: { pressure: 0, baseDebt: 0 },
    baseProfit: 0,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.equal(out.sequence.name, '高牌');
  assert.equal(out.base, 15);
  assert.equal(out.profit, Math.round(out.base * out.multiplier));
});

test('simulatePreview marks blown risk when pressure exceeds limit', () => {
  const slots = [{ phase: 'kinetic', trigger: 'ON_RESOLVE', preview: (run) => { run.pressure += 10; } }, { phase: 'pulse', trigger: 'ON_RESOLVE', preview: (run) => { run.pressure += 10; } }];
  const out = simulatePreview({
    slots,
    state: { pressure: 95, baseDebt: 0 },
    baseProfit: 100,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.equal(out.riskText, '爆炸');
});

test('simulatePreview returns profit = round(base * multiplier)', () => {
  const slots = [{ phase: 'kinetic', trigger: 'ON_RESOLVE', preview: (run) => { run.base += 90; run.multiplier *= 2; } }];
  const out = simulatePreview({
    slots,
    state: { pressure: 0, baseDebt: 0 },
    baseProfit: 100,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.equal(out.profit, Math.round(out.base * out.multiplier));
});

test('simulatePreview exposes base/mult changes for mental math UI', () => {
  const slots = [{ phase: 'pulse', trigger: 'ON_RESOLVE', preview: (run) => { run.base += 50; } }];
  const out = simulatePreview({
    slots,
    state: { pressure: 10, baseDebt: 0 },
    baseProfit: 80,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.ok(out.base >= 80);
  assert.ok(out.multiplier >= 1);
  assert.equal(out.profit, Math.round(out.base * out.multiplier));
});

test('simulatePreview fuse branch prevents immediate blown state', () => {
  const slots = [
    { phase: 'pulse', trigger: 'ON_RESOLVE', preview: (run) => { run.fuses += 1; } },
    { phase: 'thermal', trigger: 'ON_RESOLVE', preview: (run) => { run.pressure = 130; } },
  ];
  const out = simulatePreview({
    slots,
    state: { pressure: 90, baseDebt: 0 },
    baseProfit: 100,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.notEqual(out.riskText, '爆炸');
});

test('simulatePreview keeps deterministic order effects (base then mult)', () => {
  const slots = [
    { phase: 'kinetic', trigger: 'ON_RESOLVE', preview: (run) => { run.base += 50; } },
    { phase: 'thermal', trigger: 'ON_RESOLVE', preview: (run) => { run.multiplier *= 2; } },
  ];
  const out = simulatePreview({
    slots,
    state: { pressure: 0, baseDebt: 0 },
    baseProfit: 100,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.equal(out.profit, Math.round(out.base * out.multiplier));
  assert.equal(out.base, 150 + out.sequence.base);
});

test('red heat converts current pressure into additive multiplier', () => {
  const run = createRunState({ pressure: 40, baseDebt: 0, redHeatStacks: 0 }, 100);
  applyRedHeatCore(run, { ownedJokers: ['thermal_crank'] });
  assert.equal(run.multiplier, 7);
});

test('shop jokers apply core Balatro-style bonuses before red heat', () => {
  const run = createRunState({ pressure: 20, baseDebt: 0, redHeatStacks: 0 }, 50);
  applySimpleJokers(run, ['chip_plus_30', 'mult_plus_2', 'safe_margin']);
  assert.equal(run.base, 80);
  assert.equal(run.multiplier, 3);
  assert.equal(run.explosionLimit, 110);
});

test('red heat doubles multiplier and grants permanent stack when entering redline', () => {
  const run = createRunState({ pressure: 70, baseDebt: 0, redHeatStacks: 0 }, 100);
  run.pressure = 80;
  let stacks = 0;
  const messages = applyRedHeatCore(run, {
    ownedJokers: ['thermal_crank', 'redline_protocol', 'red_heat_memory', 'echo_overload'],
    onPermanentStack: (amount) => { stacks += amount; },
  });
  assert.equal(stacks, 1);
  assert.equal(run.redHeatStacks, 1);
  assert.equal(run.redlineRepeatLast, true);
  assert.ok(run.multiplier > 20);
  assert.ok(messages.some((message) => message.includes('所有倍率 x2')));
});

test('red heat doubles base power once above pressure 90', () => {
  const run = createRunState({ pressure: 0, baseDebt: 0, redHeatStacks: 0 }, 100);
  run.pressure = 91;
  applyRedHeatCore(run, { ownedJokers: ['furnace_critical'] });
  assert.equal(run.base, 200);
  applyRedHeatCore(run, { ownedJokers: ['furnace_critical'] });
  assert.equal(run.base, 200);
});

test('simulatePreview repeats the last module after first redline entry', () => {
  const slots = [
    { phase: 'kinetic', trigger: 'ON_RESOLVE', preview: (run) => { run.pressure += 80; } },
    { phase: 'pulse', trigger: 'ON_RESOLVE', preview: (run) => { run.base += 10; } },
  ];
  const out = simulatePreview({
    slots,
    state: { pressure: 0, baseDebt: 0, redHeatStacks: 0, ownedJokers: ['echo_overload'] },
    baseProfit: 100,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.equal(out.base, 100 + out.sequence.base + 20);
});

test('simulatePreview applies boss blind negative rules', () => {
  const slots = [
    { rank: 14, phase: 'pulse', trigger: 'ON_RESOLVE', preview: (run) => { run.base += 14; run.pressure += 6; } },
  ];
  const out = simulatePreview({
    slots,
    state: {
      pressure: 0,
      baseDebt: 0,
      redHeatStacks: 0,
      bossRule: {
        applyModule(run, module) {
          if (module.rank >= 11) run.pressure += 4;
        },
      },
    },
    baseProfit: 0,
    resolveModuleFn: (m, run, options) => {
      if (options?.preview) m.preview(run);
    },
  });
  assert.equal(out.pressure, 10);
});
