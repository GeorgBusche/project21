const STEP = 0.25;

// Viertel-Beat-Raster fuer die Auswahl; Hindernisse selbst bleiben unveraendert.
export function planStage1(
  segments,
  duration,
  { speed, spawn, player, fastAt, random = Math.random }
) {
  const measured = segments.map((def) => {
    const elements = def.build();
    const crossing = (o, width) => {
      const fast = o.fastMul > 1 ? o.fastMul : 1;
      const trigger = fast > 1 ? fastAt : o.x;
      return (
        (Math.max(0, o.x - trigger) + (Math.min(o.x, trigger) + width - player) / fast) / speed
      );
    };
    return {
      def,
      first: Math.min(...elements.map((o) => crossing(o, 0))),
      last: Math.max(...elements.map((o) => crossing(o, o.w))),
      gate: elements.find((o) => o.kind === 'gate'),
      recovery: def.id.includes('GRAVITY') ? 1.5 : [1.4, 1.15, 1][def.tier]
    };
  });
  const final = measured.find((s) => s.gate);
  if (!final) throw new Error('Stage 1 requires a final gate segment');
  const finalStart = duration - 0.2 - (final.gate.x + final.gate.w / 2 - player) / speed;
  const firstEncounter = 0.5 + (spawn - player) / speed;
  const finalEncounter = finalStart + final.first;
  const budget = Math.floor((finalEncounter - firstEncounter) / STEP);
  const selectionBudget = duration > 59 ? 160 : budget;
  const shuffled = measured.filter((s) => s !== final);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const candidates = shuffled.sort((a, b) => a.def.tier - b.def.tier);
  let choices = new Map([['0:0:0:0', { cost: 0, counts: [0, 0, 0], route: [] }]]);
  for (const segment of candidates) {
    const cost = Math.ceil((segment.last - segment.first + segment.recovery) / STEP);
    const next = new Map(choices);
    for (const choice of choices.values()) {
      const total = choice.cost + cost;
      if (total > selectionBudget) continue;
      const counts = [...choice.counts];
      counts[segment.def.tier]++;
      if (counts.some((count, tier) => count > [3, 4, 4][tier])) continue;
      const key = `${total}:${counts.join(':')}`;
      if (!next.has(key))
        next.set(key, {
          cost: total,
          counts,
          route: [...choice.route, { ...segment, cost: cost * STEP }]
        });
    }
    choices = next;
  }
  const best = [...choices.values()]
    .filter((s) => s.counts.every((n) => n >= 2))
    .sort((a, b) => b.cost - a.cost || a.route.length - b.route.length)[0];
  if (!best) throw new Error('Stage 1 soundtrack window is too short for all difficulty tiers');
  let route = best.route;
  let used = best.cost;
  if (budget > selectionBudget) {
    const remaining = budget - used;
    const fills = Array(remaining + 1).fill(null);
    fills[0] = { route: [], penalty: 0 };
    for (let cost = 0; cost <= remaining; cost++) {
      if (!fills[cost]) continue;
      for (const segment of candidates) {
        const length = Math.ceil((segment.last - segment.first + segment.recovery) / STEP);
        const next = cost + length;
        if (next > remaining) continue;
        const additions = [...fills[cost].route, { ...segment, cost: length * STEP }];
        const counts = new Map();
        for (const item of [...route, ...additions])
          counts.set(item.def.id, (counts.get(item.def.id) || 0) + 1);
        const penalty = [...counts.values()].reduce((sum, n) => sum + n * n, 0);
        if (!fills[next] || penalty < fills[next].penalty)
          fills[next] = { route: additions, penalty };
      }
    }
    const extra = fills.findLastIndex(Boolean);
    used += extra;
    const all = [...route, ...fills[extra].route];
    route = [];
    for (const tier of [0, 1, 2]) {
      const groups = candidates
        .filter((s) => s.def.tier === tier)
        .map((s) => ({
          segment: s,
          items: all.filter((item) => item.def.id === s.def.id)
        }));
      while (groups.some((group) => group.items.length)) {
        const next = groups
          .filter((group) => group.items.length && group.segment.def.id !== route.at(-1)?.def.id)
          .sort((a, b) => b.items.length - a.items.length)[0];
        if (!next) throw new Error('Stage 1 cannot separate repeated tasks safely');
        route.push(next.items.pop());
      }
    }
  }
  const slack = finalEncounter - firstEncounter - used * STEP;
  if (slack > 0.5) throw new Error('Stage 1 plan leaves an unfilled soundtrack window');
  let encounter = firstEncounter;
  const plan = route.map((segment) => {
    const start = encounter - segment.first;
    const entry = {
      ...segment.def,
      start,
      firstAt: start + segment.first,
      lastAt: start + segment.last
    };
    encounter += segment.cost + slack / route.length;
    return entry;
  });
  plan.push({
    ...final.def,
    start: finalStart,
    firstAt: finalStart + final.first,
    lastAt: finalStart + final.last
  });
  return plan;
}
