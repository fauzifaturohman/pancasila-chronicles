'use strict';

class QuestSystem {
  constructor(karma) {
    this.karma = karma;
    this.quests = {};
    this.onQuestStart = null;
    this.onQuestComplete = null;
  }
  init(db) {
    for (const def of db) {
      this.quests[def.id] = {
        def, status: 'locked',
        objectives: def.objectives.map(o => ({ ...o, progress: 0, done: false })),
        startedAt: null, completedAt: null,
      };
    }
    this.refreshAvailability();
    for (const def of db) if (def.autoStart) this.start(def.id);
  }
  refreshAvailability() {
    for (const q of Object.values(this.quests)) {
      if (q.status !== 'locked') continue;
      const p = q.def.prereq || {};
      if (!this.karma.meets(p)) continue;
      if (p.quests) {
        const ok = p.quests.every(id => {
          const r = this.quests[id];
          return r && (r.status === 'complete' || r.status === 'turnedIn');
        });
        if (!ok) continue;
      }
      q.status = 'available';
    }
  }
  start(id) {
    const q = this.quests[id];
    if (!q) return false;
    if (q.status !== 'available' && q.status !== 'locked') return false;
    q.status = 'active';
    q.startedAt = Date.now();
    if (this.onQuestStart) this.onQuestStart(q);
    return true;
  }
  _progress(type, target, amount = 1) {
    for (const q of Object.values(this.quests)) {
      if (q.status !== 'active') continue;
      for (const obj of q.objectives) {
        if (obj.done) continue;
        if (obj.type !== type || obj.target !== target) continue;
        obj.progress = Math.min(obj.count, obj.progress + amount);
        if (obj.progress >= obj.count) obj.done = true;
      }
      if (q.objectives.every(o => o.done)) this.complete(q.def.id);
    }
  }
  onNPCTalk(npcId) { this._progress('talk', npcId); this._progress('deliver', npcId); }
  onItemGained(itemId, qty = 1) { this._progress('collect', itemId, qty); }
  onChoiceMade(choiceId) { this._progress('choice', choiceId); }
  onLocationVisited(zoneId) { this._progress('visit', zoneId); }
  onItemDelivered(itemId, npcId) {
    for (const q of Object.values(this.quests)) {
      if (q.status !== 'active') continue;
      for (const obj of q.objectives) {
        if (obj.done) continue;
        if (obj.type !== 'deliver' || obj.target !== npcId || obj.item !== itemId) continue;
        obj.progress = Math.min(obj.count, obj.progress + 1);
        if (obj.progress >= obj.count) obj.done = true;
      }
      if (q.objectives.every(o => o.done)) this.complete(q.def.id);
    }
  }
  complete(id) {
    const q = this.quests[id];
    if (!q || q.status === 'complete' || q.status === 'turnedIn') return;
    q.status = 'complete';
    q.completedAt = Date.now();
    if (this.onQuestComplete) this.onQuestComplete(q);
    this.refreshAvailability();
  }
  getActive() { return Object.values(this.quests).filter(q => q.status === 'active'); }
  getCompleted() { return Object.values(this.quests).filter(q => q.status === 'complete' || q.status === 'turnedIn'); }
  getAvailable() { return Object.values(this.quests).filter(q => q.status === 'available'); }
}
