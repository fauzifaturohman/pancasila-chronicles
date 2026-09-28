'use strict';

class KarmaGatedNPC extends Entity {
  constructor(data) {
    super(data.x, data.y, { name: data.name, palette: data.palette });
    this.id = data.id;
    this.faction = data.faction;
    this.region = data.region || 'jawa';
    this.mapId = data.mapId || null;
    this.dialog = data.dialog || [];
    this.gift = data.gift || null;
    this.reactions = data.reactions || [];
    this.unlockedBy = data.unlockedBy || null;
    this.giftGiven = false;
    this.met = false;
    this.friendship = 0;
    this.hidden = false;
    this.dir = data.dir || 'down';
    this.role = data.role || 'warga';
    this.isSpouse = false;
    this.isChild = false;
    this.childRef = null;
  }
  isVisible(karma, faction) {
    if (!this.unlockedBy) return true;
    const okK = !this.unlockedBy.karma || karma.meets(this.unlockedBy);
    const okF = !this.unlockedBy.faction || faction.meets(this.unlockedBy);
    return okK && okF;
  }
  resolveReaction(karma, faction) {
    const sorted = [...this.reactions].sort((a,b) => (b.priority||0) - (a.priority||0));
    for (const r of sorted) {
      if (!r.refuse) continue;
      if (this._match(r.when, karma, faction)) return { dialog:r.dialog, gift:r.gift??null, refuse:true, source:r };
    }
    for (const r of sorted) {
      if (r.refuse) continue;
      if (this._match(r.when, karma, faction)) return { dialog:r.dialog, gift:r.gift??this.gift, refuse:false, source:r };
    }
    return { dialog:this.dialog, gift:this.gift, refuse:false, source:null };
  }
  _match(when, karma, faction) {
    if (!when) return true;
    if (when.title && !when.title.includes(karma.title.title)) return false;
    if (when.pillar) {
      const v = karma.pillars[when.pillar] ?? 0;
      if (when.min !== undefined && v < when.min) return false;
      if (when.max !== undefined && v > when.max) return false;
    }
    if (when.pillars) for (const [k,c] of Object.entries(when.pillars)) {
      const v = karma.pillars[k] ?? 0;
      if (c.min !== undefined && v < c.min) return false;
      if (c.max !== undefined && v > c.max) return false;
    }
    if (when.dominant && karma.dominantPillar !== when.dominant) return false;
    if (when.weakest && karma.weakestPillar !== when.weakest) return false;
    if (when.overallMin !== undefined && karma.overall < when.overallMin) return false;
    if (when.overallMax !== undefined && karma.overall > when.overallMax) return false;
    if (when.faction && faction) for (const [id,c] of Object.entries(when.faction)) {
      const v = faction.get(id);
      const tier = faction.getTier(id).key;
      if (c.min !== undefined && v < c.min) return false;
      if (c.max !== undefined && v > c.max) return false;
      if (c.tier && tier !== c.tier) return false;
    }
    return true;
  }
}
