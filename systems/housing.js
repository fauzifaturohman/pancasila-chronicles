'use strict';

class HousingSystem {
  constructor(game) {
    this.game = game;
    this.ownedTier = null;
    this.mapId = null;
    this.storage = [];
    this.storageCapacity = 0;
    this.furniture = {};
    this.trophies = [];
  }
  canBuy(tierId) {
    const tier = HOUSING_TIERS.find(t => t.id === tierId);
    if (!tier) return { ok:false, reason:'Tier tidak dikenal.' };
    if (this.ownedTier) {
      const ci = HOUSING_TIERS.findIndex(t => t.id === this.ownedTier);
      const ti = HOUSING_TIERS.findIndex(t => t.id === tierId);
      if (ti <= ci) return { ok:false, reason:'Sudah punya rumah ini atau lebih baik.' };
    }
    if (this.game.player.money < tier.price) return { ok:false, reason:`Butuh ${tier.price} 🪙.` };
    if (tier.unlock) {
      if (tier.unlock.faction) for (const [fid,c] of Object.entries(tier.unlock.faction)) {
        if (this.game.faction.get(fid) < (c.min||0)) return { ok:false, reason:`Butuh ${FACTIONS[fid].name} min ${c.min}.` };
      }
      if (tier.unlock.quests) {
        const ok = tier.unlock.quests.every(qid => {
          const q = this.game.quests.quests[qid];
          return q && (q.status === 'complete' || q.status === 'turnedIn');
        });
        if (!ok) return { ok:false, reason:'Selesaikan quest prasyarat.' };
      }
    }
    return { ok:true, tier };
  }
  buy(tierId) {
    const chk = this.canBuy(tierId);
    if (!chk.ok) { this.game.showToast('❌ ' + chk.reason); return false; }
    const tier = chk.tier;
    this.game.player.money -= tier.price;
    if (this.ownedTier) {
      const old = HOUSING_TIERS.find(t => t.id === this.ownedTier);
      const refund = Math.floor(old.price * 0.4);
      this.game.player.money += refund;
      this.game.showToast(`💰 Refund: +${refund} 🪙`);
    }
    this.ownedTier = tierId;
    this.mapId = tierId;
    this.storageCapacity = tier.storageSlots;
    this.game._registerPlayerHouseInterior(tierId);
    this.game._refreshPlayerHousePortal();
    this.game.showToast(`🏠 ${tier.name} dimiliki!`);
    this.game._showNarrativeToast(`🏠 ${tier.name}\n${tier.desc}`);
    return true;
  }
  sleep() {
    const tier = HOUSING_TIERS.find(t => t.id === this.ownedTier);
    if (!tier) {
      const cost = 30;
      if (this.game.player.money < cost) { this.game.showToast(`💰 Butuh ${cost} 🪙`); return; }
      this.game.player.money -= cost;
      this.game.player.stamina = Math.min(100, this.game.player.stamina + 40);
      this.game.time.day += 1;
      this.game.time.totalMinutes = 360;
      this.game.save.autosave();
      this.game._showNarrativeToast(`😴 Menginap di penginapan...\nHari ${this.game.time.day}!`);
      return;
    }
    const rec = Math.floor(this.game.player.stamina * (tier.sleepRecovery / 100));
    this.game.player.stamina = Math.min(100, this.game.player.stamina + (100 - this.game.player.stamina));
    this.game.time.day += 1;
    this.game.time.totalMinutes = 360;
    this.game.save.autosave();
    this.game._showNarrativeToast(`😴 Tidur di ${tier.name}...\nHari ${this.game.time.day} dimulai!\nStamina pulih!`);
    this.game._checkNPCUnlocks();
  }
  deposit(idx, qty = 1) {
    const inv = this.game.inventory;
    const it = inv.items[idx];
    if (!it) return false;
    if (this.storage.length >= this.storageCapacity && !this.storage.find(i => i.id === it.id)) {
      this.game.showToast('📦 Lemari penuh!'); return false;
    }
    const take = Math.min(qty, it.qty);
    it.qty -= take;
    if (it.qty <= 0) inv.items.splice(idx, 1);
    const ex = this.storage.find(i => i.id === it.id);
    if (ex) ex.qty += take;
    else this.storage.push({ id: it.id, name: it.name, icon: it.icon, qty: take });
    this.game.showToast(`📦 ${it.name} x${take} disimpan.`);
    return true;
  }
  withdraw(idx, qty = 1) {
    const it = this.storage[idx];
    if (!it) return false;
    const take = Math.min(qty, it.qty);
    it.qty -= take;
    if (it.qty <= 0) this.storage.splice(idx, 1);
    this.game.inventory.add({ id: it.id, name: it.name, icon: it.icon }, take);
    this.game.showToast(`🎒 ${it.name} x${take} diambil.`);
    return true;
  }
  placeFurniture(slotId, itemId) {
    const item = FURNITURE_ITEMS[itemId];
    if (!item) return false;
    if (this.game.player.money < item.price) { this.game.showToast(`💰 Butuh ${item.price} 🪙`); return false; }
    this.game.player.money -= item.price;
    this.furniture[slotId] = { itemId: item.id, name: item.name, icon: item.icon };
    this.game.showToast(`✨ ${item.name} dipajang!`);
    return true;
  }
  addTrophy(id, name, icon) {
    if (this.trophies.find(t => t.id === id)) return;
    this.trophies.push({ id, name, icon, date: Date.now() });
  }
  serialize() {
    return {
      ownedTier: this.ownedTier, mapId: this.mapId,
      storage: this.storage.map(i => ({ ...i })),
      storageCapacity: this.storageCapacity,
      furniture: { ...this.furniture },
      trophies: this.trophies.slice(),
    };
  }
  load(d) {
    if (!d) return;
    this.ownedTier = d.ownedTier || null;
    this.mapId = d.mapId || null;
    this.storage = (d.storage || []).map(i => ({ ...i }));
    this.storageCapacity = d.storageCapacity || 0;
    this.furniture = { ...(d.furniture || {}) };
    this.trophies = (d.trophies || []).slice();
    if (this.ownedTier) {
      this.game._registerPlayerHouseInterior(this.ownedTier);
      this.game._refreshPlayerHousePortal();
    }
  }
}
