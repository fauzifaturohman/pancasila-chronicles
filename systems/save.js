'use strict';

const SAVE_VERSION = 1;
const SAVE_KEY_PREFIX = 'pancasila_save_';
const SLOT_COUNT = 3;
const AUTOSAVE_SLOT = 'auto';

class SaveSystem {
  constructor(game) { this.game = game; this.playtime = 0; }
  update(dt) { this.playtime += dt; }

  serialize() {
    const g = this.game;
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      playtime: Math.floor(this.playtime),
      meta: {
        day: g.time.day, time: g.time.string,
        title: g.karma.title.title, titleIcon: g.karma.title.icon,
        money: g.player.money, mapId: g.mapManager.current,
        region: g.mapManager.currentRegion,
        overall: Math.round(g.karma.overall),
      },
      player: {
        x: g.player.x, y: g.player.y, dir: g.player.dir,
        money: g.player.money, stamina: g.player.stamina,
        outfit: g.player.outfit || 'default',
      },
      karma: g.karma.serialize(),
      faction: g.faction.serialize(),
      quests: this._serQuests(g.quests),
      inventory: g.inventory.items.map(i => ({ ...i })),
      time: { totalMinutes: g.time.totalMinutes, day: g.time.day },
      npcs: this._serNPCs(g.npcs),
      housing: g.housing.serialize(),
      family: g.family.serialize(),
      score: g.score.serialize(),
      party: g.party.serialize(),
      flags: { ...(g.flags || {}) },
      mapId: g.mapManager.current,
      region: g.mapManager.currentRegion,
    };
  }
  _serQuests(qs) {
    const out = {};
    for (const [id, q] of Object.entries(qs.quests)) {
      out[id] = {
        status: q.status, startedAt: q.startedAt, completedAt: q.completedAt,
        objectives: q.objectives.map(o => ({ progress: o.progress, done: o.done })),
      };
    }
    return out;
  }
  _serNPCs(npcs) {
    const out = {};
    for (const n of npcs) {
      if (n.isSpouse || n.isChild) continue;
      out[n.id] = { giftGiven: !!n.giftGiven, met: !!n.met, friendship: n.friendship || 0 };
    }
    return out;
  }
  deserialize(data) {
    if (!data || data.version !== SAVE_VERSION) return false;
    const g = this.game;
    if (data.player) Object.assign(g.player, {
      x: data.player.x, y: data.player.y, dir: data.player.dir || 'down',
      money: data.player.money ?? 0, stamina: data.player.stamina ?? 100,
      outfit: data.player.outfit || 'default',
    });
    if (data.karma) g.karma.load(data.karma);
    if (data.faction) g.faction.load(data.faction);
    if (data.time) { g.time.totalMinutes = data.time.totalMinutes; g.time.day = data.time.day; }
    if (data.inventory) g.inventory.items = data.inventory.map(i => ({ ...i }));
    if (data.quests) this._applyQuests(g.quests, data.quests);
    if (data.npcs) this._applyNPCs(g.npcs, data.npcs);
    if (data.housing) g.housing.load(data.housing);
    if (data.family) g.family.load(data.family);
    if (data.score) g.score.load(data.score);
    if (data.party) g.party.load(data.party);
    if (data.mapId) {
      g.mapManager.current = data.mapId;
      g.mapManager.currentRegion = data.region || 'jawa';
      g.map = g.mapManager.getMap(data.mapId);
      g._refreshNPCVisibility();
    }
    g.flags = { ...(data.flags || {}) };
    this.playtime = data.playtime || 0;
    if (g._refreshKarmaUI) g._refreshKarmaUI();
    return true;
  }
  _applyQuests(qs, saved) {
    for (const [id, s] of Object.entries(saved)) {
      const q = qs.quests[id];
      if (!q) continue;
      q.status = s.status;
      q.startedAt = s.startedAt;
      q.completedAt = s.completedAt;
      for (let i = 0; i < q.objectives.length && i < s.objectives.length; i++) {
        q.objectives[i].progress = s.objectives[i].progress;
        q.objectives[i].done = s.objectives[i].done;
      }
    }
    qs.refreshAvailability();
  }
  _applyNPCs(npcs, saved) {
    for (const n of npcs) {
      const s = saved[n.id];
      if (!s) continue;
      n.giftGiven = !!s.giftGiven;
      n.met = !!s.met;
      n.friendship = s.friendship || 0;
    }
  }
  _key(slot) { return SAVE_KEY_PREFIX + slot; }
  save(slot = 1) {
    try {
      localStorage.setItem(this._key(slot), JSON.stringify(this.serialize()));
      return true;
    } catch (e) { console.error('[Save]', e); return false; }
  }
  load(slot = 1) {
    const raw = localStorage.getItem(this._key(slot));
    if (!raw) return false;
    try { return this.deserialize(JSON.parse(raw)); }
    catch (e) { console.error('[Load]', e); return false; }
  }
  delete(slot) { localStorage.removeItem(this._key(slot)); }
  getSlotInfo(slot) {
    const raw = localStorage.getItem(this._key(slot));
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      return { slot, version:d.version, timestamp:d.timestamp, playtime:d.playtime, meta:d.meta };
    } catch { return null; }
  }
  getAllSlots() {
    const out = [];
    for (let i = 1; i <= SLOT_COUNT; i++) out.push(this.getSlotInfo(i));
    return out;
  }
  autosave() { this.save(AUTOSAVE_SLOT); }
}

function formatPlaytime(sec) {
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function formatSaveDate(ms) {
  const d = new Date(ms);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
