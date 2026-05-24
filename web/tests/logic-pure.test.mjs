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
