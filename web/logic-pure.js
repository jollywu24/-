export const SEQUENCES = {
  single: { name: "单缸点火", base: 30, mult: 1, limit: 0 },
  pair: { name: "双轨并联", base: 180, mult: 1.25, limit: 0 },
  trinity: { name: "三位一体", base: 420, mult: 1.8, limit: 0 },
  oscillation: { name: "交流震荡", base: 520, mult: 3.2, limit: 0 },
  asymmetric: { name: "非对称负载", base: 850, mult: 2.4, limit: 20 },
  pure: { name: "纯净回路", base: 1200, mult: 10, limit: 0 }
};

export function evaluateIgnitionSequence(slots, slotCount = 5) {
  const phases = slots.map((module) => module ? module.phase : null);
  const placed = phases.filter(Boolean);
  if (!placed.length) return SEQUENCES.single;
  const groups = [];
  let index = 0;
  while (index < phases.length) {
    if (!phases[index]) { index += 1; continue; }
    const phase = phases[index];
    let length = 1;
    while (phases[index + length] === phase) length += 1;
    groups.push({ phase, length });
    index += length;
  }
  const exactFive = placed.length === slotCount && phases.every(Boolean);
  if (exactFive && placed.every((phase) => phase === placed[0])) return SEQUENCES.pure;
  const groupLengths = groups.map((group) => group.length).sort((a, b) => a - b).join(",");
  if (exactFive && groups.length === 2 && groupLengths === "2,3" && groups[0].phase !== groups[1].phase) return SEQUENCES.asymmetric;
  for (let start = 0; start <= phases.length - 4; start += 1) {
    const window = phases.slice(start, start + 4);
    if (window.every(Boolean) && new Set(window).size === 4) return SEQUENCES.oscillation;
  }
  if (groups.some((group) => group.length >= 3)) return SEQUENCES.trinity;
  if (groups.some((group) => group.length >= 2)) return SEQUENCES.pair;
  return SEQUENCES.single;
}

export function simulatePreview({slots, state, baseProfit, resolveModule}) {
  const run = {
    base: baseProfit,
    multiplier: 1,
    pressure: state.pressure + state.baseDebt,
    explosionLimit: 100,
    nextDebt: 0,
    fuses: 0,
    insurance: false,
    risk: 0,
    redlineTrips: 0,
  };
  const sequence = evaluateIgnitionSequence(slots);
  run.base += sequence.base;
  run.multiplier *= sequence.mult;
  run.explosionLimit += sequence.limit;
  let blown = false;
  const currentRunProfit = () => Math.max(0, Math.round(run.base * run.multiplier));
  for (const module of slots) {
    if (!module) continue;
    const beforePressure = run.pressure;
    resolveModule(module, run);
    if (beforePressure < 80 && run.pressure >= 80) run.redlineTrips += 1;
    if (run.pressure > run.explosionLimit) {
      if (run.fuses > 0) {
        run.fuses -= 1; run.pressure = Math.max(0, run.explosionLimit - 6);
      } else if (run.insurance) {
        run.insurance = false; run.pressure = Math.max(0, run.explosionLimit - 4);
      } else {
        blown = true;
      }
    }
  }
  const risk = Math.max(0, Math.min(100, (run.pressure / run.explosionLimit) * 100 + run.risk - (run.fuses * 18) - (run.insurance ? 10 : 0)));
  let riskText = "低";
  if (blown) riskText = "爆炸";
  else if (risk >= 90) riskText = "濒死";
  else if (risk >= 70) riskText = "高";
  else if (risk >= 45) riskText = "中";
  return { profit: currentRunProfit(), pressure: run.pressure, multiplier: run.multiplier, limit: run.explosionLimit, sequence, riskText };
}
