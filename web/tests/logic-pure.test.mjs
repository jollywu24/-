import test from 'node:test';
import assert from 'node:assert/strict';
import pkg from '../logic-pure.js';

const { evaluateIgnitionSequence, simulatePreview } = pkg;

test('evaluateIgnitionSequence returns pure for all same phases', () => {
  const slots = Array.from({ length: 5 }, () => ({ phase: 'kinetic' }));
  assert.equal(evaluateIgnitionSequence(slots).name, '纯净回路');
});

test('evaluateIgnitionSequence returns oscillation for four unique contiguous phases', () => {
  const slots = [{ phase: 'kinetic' }, { phase: 'pulse' }, { phase: 'thermal' }, { phase: 'toxic' }, null];
  assert.equal(evaluateIgnitionSequence(slots).name, '交流震荡');
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
