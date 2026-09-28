'use strict';

class TravelSystem {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.mode = 'select';
    this.selectedRegion = null;
    this.selectedMode = 'ship';
    this.progress = 0;
    this.duration = 3.0;
    this.route = null;
    this.encounterShown = false;
  }
  getAvailableDestinations(from) {
    const out = [], seen = new Set();
    for (const r of TRAVEL_ROUTES) {
      let other = null;
      if (r.from === from) other = r.to;
      else if (r.to === from) other = r.from;
      else continue;
      if (seen.has(other)) continue;
      seen.add(other);
      out.push({ region: REGIONS[other], route: r.from === from ? r : { ...r, from, to: other } });
    }
    return out;
  }
  checkAccess(rid, game) {
    const r = REGIONS[rid];
    if (!r) return { ok:false, reason:'Region tidak dikenal.' };
    if (game.faction.isBannedFrom(r.faction)) return { ok:false, reason:`Kau dibanned dari ${r.name}.` };
    return { ok:true };
  }
  checkModeAvailable(mid, game) {
    const m = TRANSPORT_MODES[mid];
    if (!m) return { ok:false, reason:'Mode tidak dikenal.' };
    if (m.unlock) {
      if (m.unlock.money && game.player.money < m.unlock.money)
        return { ok:false, reason:`Butuh ${m.unlock.money} 🪙 untuk buka ${m.name}.` };
      if (m.unlock.quests) {
        const ok = m.unlock.quests.every(qid => {
          const q = game.quests.quests[qid];
          return q && (q.status === 'complete' || q.status === 'turnedIn');
        });
        if (!ok) return { ok:false, reason:'Selesaikan quest prasyarat dulu.' };
      }
      if (m.unlock.faction) for (const [fid, c] of Object.entries(m.unlock.faction)) {
        if (game.faction.get(fid) < (c.min || 0))
          return { ok:false, reason:`Butuh ${FACTIONS[fid].name} minimal ${c.min}.` };
      }
    }
    return { ok:true };
  }
  startTravel(dest, mid = 'ship') {
    const g = this.game;
    const acc = this.checkAccess(dest, g);
    if (!acc.ok) { g.showToast('⛔ ' + acc.reason); return false; }
    const mOk = this.checkModeAvailable(mid, g);
    if (!mOk.ok) { g.showToast('⚠️ ' + mOk.reason); return false; }
    const from = g.mapManager.currentRegion;
    const route = TRAVEL_ROUTES.find(r =>
      (r.from === from && r.to === dest) || (r.to === from && r.from === dest)
    ) || { cost:{money:100,time:180,stamina:15}, duration:4.0, desc:'' };
    const cost = route.cost;
    if (cost.money && g.player.money < cost.money) { g.showToast(`💰 Butuh ${cost.money} 🪙`); return false; }
    if (cost.stamina && g.player.stamina < cost.stamina) { g.showToast(`😩 Butuh ${cost.stamina} stamina`); return false; }
    if (cost.money) g.player.money -= cost.money;
    if (cost.stamina) g.player.stamina -= cost.stamina;
    this.route = route;
    this.selectedRegion = dest;
    this.selectedMode = mid;
    this.active = true;
    this.progress = 0;
    this.duration = route.duration;
    this.encounterShown = false;
    g.closeAllPanels();
    g.showToast(`🚢 Berangkat ke ${REGIONS[dest].name}...`);
    return true;
  }
  update(dt, g) {
    if (!this.active) return;
    this.progress += dt / this.duration;
    if (this.progress >= 0.5 && !this.encounterShown) {
      this.encounterShown = true;
      this._encounter(g);
    }
    if (this.progress >= 1.0) { this.progress = 1.0; this._finish(g); }
  }
  _encounter(g) {
    const mode = this.selectedMode;
    const elig = TRAVEL_ENCOUNTERS.filter(e => !e.modes || e.modes.includes(mode));
    for (const enc of elig) {
      if (Math.random() < enc.chance) {
        const eff = enc.effect || {};
        if (eff.money) g.player.money = Math.max(0, g.player.money + eff.money);
        if (eff.stamina) g.player.stamina = Math.max(0, g.player.stamina + eff.stamina);
        if (eff.extraTime) g.time.totalMinutes += eff.extraTime;
        if (eff.karma) g.karma.apply(eff.karma, `Travel: ${enc.id}`);
        if (eff.items) eff.items.forEach(it => g.inventory.add(it));
        g._showNarrativeToast(enc.text);
        if (enc.choices?.length) {
          g.dialog.start('Perjalanan', [{
            text: enc.text, choices: enc.choices.map(c => ({
              text: c.text, karma: c.karma, faction: c.faction, next: -1,
            })),
          }], {
            onChoice: (ch) => {
              if (ch.karma) g.karma.apply(ch.karma, `Encounter`);
              if (ch.faction) for (const [fid,d] of Object.entries(ch.faction)) g.faction.apply(fid, d, 'Encounter');
            }
          });
        }
        return;
      }
    }
  }
  async _finish(g) {
    this.active = false;
    const r = REGIONS[this.selectedRegion];
    if (this.route?.cost?.time) {
      g.time.totalMinutes += this.route.cost.time;
      while (g.time.totalMinutes >= 1440) { g.time.totalMinutes -= 1440; g.time.day++; }
    }
    await g.mapManager.switchTo(r.mapId, r.spawn.x, r.spawn.y, g.player, g);
    g.score.onRegionVisit(r.id);
    g.score.onTravel(this.selectedMode, g.time.isNight);
    g.showToast(`📍 Selamat datang di ${r.name}!`);
    g._checkNPCUnlocks();
    this.route = null;
    this.selectedRegion = null;
  }
  render(ctx) {
    if (!this.active) return;
    const W = CONFIG.VIEW_W, H = CONFIG.VIEW_H;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(10,15,40,0.94)');
    grad.addColorStop(1, 'rgba(5,5,20,0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd966';
    ctx.fillText('PERJALANAN', W / 2, 80);
    const fromR = REGIONS[this.game.mapManager.currentRegion];
    const toR = REGIONS[this.selectedRegion];
    const cx1 = W * 0.25, cx2 = W * 0.75, cy = H * 0.45;
    for (const [x, r] of [[cx1, fromR], [cx2, toR]]) {
      ctx.fillStyle = r.bgColor;
      ctx.beginPath(); ctx.arc(x, cy, 55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '32px serif'; ctx.fillStyle = '#fff'; ctx.fillText(r.icon, x, cy + 12);
      ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#ffd966';
      ctx.fillText(r.name, x, cy + 80);
    }
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(201,162,74,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx1 + 55, cy); ctx.lineTo(cx2 - 55, cy); ctx.stroke();
    ctx.setLineDash([]);
    const mode = TRANSPORT_MODES[this.selectedMode];
    const mx = cx1 + 55 + (cx2 - cx1 - 110) * this.progress;
    ctx.font = '24px serif'; ctx.fillStyle = '#fff';
    ctx.fillText(mode.icon, mx, cy + 8 + Math.sin(this.progress * 20) * 3);
    const barW = 400, barH = 10, barX = (W - barW) / 2, barY = H - 130;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ffd966';
    ctx.fillRect(barX + 2, barY + 2, (barW - 4) * this.progress, barH - 4);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`${Math.floor(this.progress * 100)}%`, W / 2, barY + barH + 18);
  }
}
