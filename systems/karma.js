'use strict';

class KarmaSystem {
  constructor() {
    this.pillars = { ketuhanan:50, kemanusiaan:50, persatuan:50, kerakyatan:50, keadilan:50 };
    this.history = [];
    this.totalChoices = 0;
  }
  apply(delta, source = '') {
    if (!delta) return {};
    const applied = {};
    for (const [p, v] of Object.entries(delta)) {
      if (!(p in this.pillars)) continue;
      const before = this.pillars[p];
      this.pillars[p] = Math.max(0, Math.min(100, before + v));
      applied[p] = this.pillars[p] - before;
    }
    this.totalChoices++;
    this.history.unshift({ delta: applied, source, time: Date.now() });
    if (this.history.length > 8) this.history.length = 8;
    return applied;
  }
  meets(req) {
    if (!req?.karma) return true;
    for (const [p, c] of Object.entries(req.karma)) {
      const v = this.pillars[p] ?? 0;
      if (c.min !== undefined && v < c.min) return false;
      if (c.max !== undefined && v > c.max) return false;
    }
    return true;
  }
  get overall() {
    const vals = Object.values(this.pillars);
    return vals.reduce((a,b)=>a+b,0) / vals.length;
  }
  get title() {
    const avg = this.overall;
    for (const t of KARMA_TITLES) if (avg >= t.min) return t;
    return KARMA_TITLES[KARMA_TITLES.length-1];
  }
  get dominantPillar() {
    let best = null, bv = -1;
    for (const [k,v] of Object.entries(this.pillars)) if (v > bv) { bv = v; best = k; }
    return best;
  }
  get weakestPillar() {
    let w = null, wv = 999;
    for (const [k,v] of Object.entries(this.pillars)) if (v < wv) { wv = v; w = k; }
    return w;
  }
  serialize() { return { pillars:{...this.pillars}, totalChoices: this.totalChoices }; }
  load(d) { if (d?.pillars) Object.assign(this.pillars, d.pillars); if (d?.totalChoices) this.totalChoices = d.totalChoices; }
}
