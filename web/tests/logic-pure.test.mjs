import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateIgnitionSequence, simulatePreview } from '../logic-pure.js';

test('evaluateIgnitionSequence returns pure for all same phases', () => {
  const slots = Array.from({length: 5}, () => ({phase: 'kinetic'}));
  assert.equal(evaluateIgnitionSequence(slots).name, '纯净回路');
});

test('evaluateIgnitionSequence returns oscillation for four unique contiguous phases', () => {
  const slots = [{phase:'kinetic'},{phase:'pulse'},{phase:'thermal'},{phase:'toxic'},null];
  assert.equal(evaluateIgnitionSequence(slots).name, '交流震荡');
});

test('simulatePreview marks blown risk when pressure exceeds limit', () => {
  const slots=[{phase:'kinetic'},{phase:'pulse'}];
  const out = simulatePreview({
    slots,
    state:{pressure:95, baseDebt:0},
    baseProfit:100,
    resolveModule:(_m,run)=>{run.pressure += 10;}
  });
  assert.equal(out.riskText, '爆炸');
});
