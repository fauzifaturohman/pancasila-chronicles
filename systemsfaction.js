'use strict';

class FactionSystem {
  constructor(karma) {
    this.karma = karma;
    this.reputation = {};
    for (const id of Object.keys(FACTIONS)) this.reputation[id] = 0;
    this._lastTier = {};
    for (const id of Object.keys(FACTIONS)) this._lastTier[id] = this.getTier(id).key;
    this.unlockedPerks = new Set();
    this.history = [];
    this.onTierChange = null;
    this.onPerkUnlocked = null;
    this.onReputationChange = null;
  }
  apply(fid, delta, source = '', opts = {}) {
    if (!(fid in this.reputation)) return 0;
    const prop = opts.propagate !== false;
    const before = this.reputation[fid];
    let applied = delta;
    if (delta > 0 && this.karma.pillars.persatuan >= 80) applied *= 1.2;
    else if (delta > 0 && this.karma.pillars.persatuan <= 20) applied *= 0.7;
    this.reputation[fid] = Math.max(-100, Math.min(100, before + applied));
    const actual = this.reputation[fid] - before;

    if (prop && actual !== 0) {
      const rel = FACTION_RELATIONS[fid] || {};
      for (const [oid, w] of Object.entries(rel)) {
        if (!(oid in this.reputation)) continue;
        const spill = (actual / 10) * w;
        if (Math.abs(spill) < 0.1) continue;
        const ob = this.reputation[oid];
        this.reputation[oid] = Math.max(-100, Math.min(100, ob + spill));
        this._checkTier(oid);
      }
    }
    this.history.unshift({ fid, delta: actual, source, time: Date.now() });
    if (this.history.length > 12) this.history.length = 12;
    if (this.onReputationChange) this.onReputationChange(fid, actual, source);
    this._checkTier(fid);
    return actual;
  }
  get(fid) { return this.reputation[fid] ?? 0; }
  getTier(fid) {
    const v = this.get(fid);
    for (const t of FACTION_TIERS) if (v >= t.min) return t;
    return FACTION_TIERS[FACTION_TIERS.length-1];
  }
  meets(req) {
    if (!req?.faction) return true;
    for (const [fid, c] of Object.entries(req.faction)) {
      const v = this.get(fid);
      if (c.min !== undefined && v < c.min) return false;
      if (c.max !== undefined && v > c.max) return false;
      if (c.tier && this.getTier(fid).key !== c.tier) return false;
    }
    return true;
  }
  get dominantFaction() {
    let best = null, bv = -Infinity;
    for (const [id,v] of Object.entries(this.reputation)) if (v > bv) { bv = v; best = id; }
    return best;
  }
  priceMultiplier(fid) { return factionPriceMultiplier(this.getTier(fid).key); }
  get alliedFactions() {
    return Object.keys(this.reputation).filter(id => {
      const t = this.getTier(id).key;
      return t === 'friend' || t === 'ally';
    });
  }
  isBannedFrom(fid) { return this.getTier(fid).key === 'enemy'; }
  _checkTier(fid) {
    const oldT = this._lastTier[fid];
    const newT = this.getTier(fid).key;
    if (oldT === newT) return;
    this._lastTier[fid] = newT;
    if (this.onTierChange) this.onTierChange(fid, oldT, newT);
    const perkSet = FACTION_PERKS[fid];
    if (perkSet?.[newT]) {
      const key = `${fid}:${newT}`;
      if (!this.unlockedPerks.has(key)) {
        this.unlockedPerks.add(key);
        if (this.onPerkUnlocked) this.onPerkUnlocked(fid, newT, perkSet[newT]);
      }
    }
  }
  serialize() {
    return { reputation:{...this.reputation}, unlockedPerks:[...this.unlockedPerks], history:this.history.slice(0,6) };
  }
  load(d) {
    if (!d) return;
    if (d.reputation) for (const [id,v] of Object.entries(d.reputation)) if (id in this.reputation) this.reputation[id] = v;
    if (d.unlockedPerks) this.unlockedPerks = new Set(d.unlockedPerks);
    if (d.history) this.history = d.history;
    for (const id of Object.keys(this.reputation)) this._lastTier[id] = this.getTier(id).key;
  }
}