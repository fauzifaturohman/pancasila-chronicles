'use strict';

class CombatSystem {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.phase = 'idle';
    this.allies = [];
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.currentActor = null;
    this.animationTime = 0;
    this.bgRegion = 'jawa';
    this.rewards = { exp:0, money:0, items:[] };
    this.uiPhase = 'main-menu';
    this.isCoop = false;
    this.remoteActionsQueue = [];
  }
  startEncounter(enemyIds, opts = {}) {
    if (this.active) return false;
    this.active = true;
    this.phase = 'setup';
    this.allies = this.game.party.members.map(m => this._clone(m));
    this.enemies = enemyIds.map((id, i) => this._buildEnemy(id, i)).filter(Boolean);
    if (this.enemies.length === 0) { this.active = false; return false; }
    this.isCoop = !!opts.coop;
    this.bgRegion = this.game.mapManager.currentRegion;
    this._computeTurnOrder();
    this.game.showToast(`⚔️ ${this.enemies.length} musuh muncul!`);
    return true;
  }
  _clone(m) {
    return { ...m, hp: m.maxHp || m.hp || 100, mp: m.maxMp || m.mp || 50, buffs: [], status: 'active' };
  }
  _buildEnemy(id, i) {
    const db = ENEMY_DB[id];
    if (!db) return null;
    const scale = 1 + Math.random() * 0.3 - 0.15;
    return {
      ...db, uid: `enemy_${i}_${id}`,
      hp: Math.floor(db.hp * scale), maxHp: Math.floor(db.hp * scale),
      mp: db.mp, maxMp: db.mp, currentDialogStep: 0, buffs: [], status: 'active',
    };
  }
  _computeTurnOrder() {
    this.turnOrder = [];
    for (const a of this.allies) if (a.status === 'active') this.turnOrder.push({ side:'ally', ref:a, spd:a.spd });
    for (const e of this.enemies) if (e.status === 'active') this.turnOrder.push({ side:'enemy', ref:e, spd:e.spd });
    this.turnOrder.sort((a,b) => b.spd - a.spd);
    this.currentTurn = 0;
    this._advance();
  }
  _advance() {
    while (this.currentTurn < this.turnOrder.length) {
      const e = this.turnOrder[this.currentTurn];
      if (e.ref.status === 'active' && e.ref.hp > 0) {
        this.currentActor = e;
        this.phase = e.side === 'ally' ? 'player-turn' : 'enemy-turn';
        this.uiPhase = 'main-menu';
        if (this.phase === 'enemy-turn') this._runEnemyTurn();
        return;
      }
      this.currentTurn++;
    }
    this._tickBuffs();
    this._computeTurnOrder();
  }
  _tickBuffs() {
    for (const a of [...this.allies, ...this.enemies]) {
      a.buffs = (a.buffs || []).filter(b => { b.duration--; return b.duration > 0; });
    }
  }
  selectAction(type, p = {}) {
    if (this.phase !== 'player-turn') return;
    const a = this.currentActor.ref;
    if (type === 'attack') this._attack(a, p.target);
    else if (type === 'skill') this._skill(a, p.skill, p.target);
    else if (type === 'defend') this._defend(a);
    else if (type === 'talk') this._talk(a, p.target);
    else if (type === 'flee') this._flee(a);
  }
  _attack(a, t) {
    if (!t || t.status !== 'active') t = this._randEnemy();
    if (!t) return;
    const dmg = Math.max(1, a.atk + Math.floor(Math.random() * 5) - t.def / 2);
    t.hp = Math.max(0, t.hp - dmg);
    this.game.showToast(`⚔️ ${a.name} → ${Math.round(dmg)} ke ${t.name}`);
    if (t.hp <= 0) { t.status = 'downed'; this.game.showToast(`💀 ${t.name} tumbang!`); }
    this._end();
  }
  _skill(a, s, t) {
    if (!s || a.mp < s.cost) { this.game.showToast('❌ MP tidak cukup.'); return; }
    a.mp -= s.cost;
    if (s.type === 'damage') {
      const targets = s.target === 'all_enemies' ? this.enemies.filter(e => e.status === 'active') : [t || this._randEnemy()];
      for (const tgt of targets) {
        if (!tgt) continue;
        const d = Math.max(1, Math.floor(s.power * (1 + a.atk / 50)));
        tgt.hp = Math.max(0, tgt.hp - d);
        this.game.showToast(`✨ ${s.icon} ${s.name}: ${d} → ${tgt.name}`);
        if (tgt.hp <= 0) tgt.status = 'downed';
      }
      if (s.karma) this._karma(s.karma);
    } else if (s.type === 'heal') {
      const targets = s.target === 'all_allies' ? this.allies.filter(x => x.status === 'active') : [t];
      for (const tgt of targets) {
        if (!tgt) continue;
        const h = Math.floor(s.power * (1 + a.level / 20));
        tgt.hp = Math.min(tgt.maxHp, tgt.hp + h);
        this.game.showToast(`💚 ${s.icon} +${h} HP ${tgt.name}`);
      }
    } else if (s.type === 'persuade') {
      const tgt = t || this._randEnemy();
      if (!tgt || !tgt.willpower) { this.game.showToast('❌ Tidak bisa dibujuk.'); this._end(); return; }
      const d = s.willpowerDamage + Math.floor(a.level / 2);
      tgt.willpower = Math.max(0, tgt.willpower - d);
      this.game.showToast(`💬 Willpower -${d} (${tgt.willpower})`);
      if (tgt.willpower <= 0) {
        tgt.status = 'persuaded';
        this.game.showToast(`🕊️ ${tgt.name} menyerah!`);
        this._checkEnd();
      }
    } else if (s.type === 'buff' && t) {
      t.buffs.push({ name: s.name, effect: s.effect, duration: s.effect.duration || 3 });
    } else if (s.type === 'revive') {
      const downed = this.allies.find(a => a.status === 'downed');
      if (!downed) { this.game.showToast('Tidak ada ally downed.'); this._end(); return; }
      downed.status = 'active';
      downed.hp = Math.floor(downed.maxHp * (s.power / 100));
      this.game.showToast(`💞 ${downed.name} bangkit!`);
    } else if (s.type === 'combo') {
      if (this.allies.length < 2) { this.game.showToast('❌ Butuh 2+ party.'); this._end(); return; }
      const tgt = t || this._randEnemy();
      if (!tgt) { this._end(); return; }
      const d = s.power + a.atk * 2;
      tgt.hp = Math.max(0, tgt.hp - d);
      this.game.showToast(`💥 GOTONG ROYONG! ${d}`);
      if (tgt.hp <= 0) tgt.status = 'downed';
      this._karma({ persatuan: +3 });
    }
    this._end();
  }
  _defend(a) {
    a.buffs.push({ name: 'Bertahan', effect: { def:+100 }, duration: 1 });
    this.game.showToast(`🛡️ ${a.name} bertahan.`);
    this._end();
  }
  _talk(a, t) {
    if (!t?.dialog) return;
    const step = t.currentDialogStep || 0;
    const d = t.dialog[step];
    if (!d) { this._attack(a, t); return; }
    this.game.dialog.start(t.name, [{
      text: d.text, choices: [
        { text:'🗣️ Bujuk', action:'combat:persuade', next:-1 },
        { text:'⚔️ Serang', action:'combat:attack', next:-1 },
      ],
    }], {
      onChoice: (ch) => {
        if (ch.action === 'combat:persuade') {
          if (Math.random() * 100 < d.success) {
            t.currentDialogStep = step + 1;
            t.willpower = Math.max(0, (t.willpower || 0) - 30);
            this.game.showToast(`✅ Berhasil! Willpower -30`);
            if (t.willpower <= 0 || step >= t.dialog.length - 1) {
              t.status = 'persuaded';
              this.game.showToast(`🕊️ ${t.name} menyerah!`);
              if (d.karma) this._karma(d.karma);
              if (d.faction) for (const [fid, v] of Object.entries(d.faction)) this.game.faction.apply(fid, v, 'Combat');
              this._checkEnd();
            }
          } else this.game.showToast(`❌ Bujukan gagal.`);
          this._end();
        } else this._attack(a, t);
      },
    });
  }
  _flee(a) {
    if (Math.random() < 0.5 + a.spd / 100) {
      this.phase = 'fled';
      this.game.showToast('🏃 Berhasil kabur!');
      setTimeout(() => this.endBattle('fled'), 800);
    } else {
      this.game.showToast('❌ Gagal kabur!');
      this._end();
    }
  }
  _runEnemyTurn() {
    const a = this.currentActor.ref;
    if (!a || a.status !== 'active') { this._end(); return; }
    setTimeout(() => {
      const alive = this.allies.filter(x => x.status === 'active');
      if (alive.length === 0) { this._checkEnd(); return; }
      const t = alive[Math.floor(Math.random() * alive.length)];
      const dmg = Math.max(1, a.atk - t.def / 2);
      t.hp = Math.max(0, t.hp - dmg);
      if (t.hp <= 0) t.status = 'downed';
      this.game.showToast(`⚔️ ${a.name} → ${Math.round(dmg)} ke ${t.name}`);
      this._end();
    }, 700);
  }
  _end() {
    this.currentTurn++;
    this._checkEnd();
    if (this.phase === 'victory' || this.phase === 'defeat' || this.phase === 'fled') return;
    this._advance();
  }
  _checkEnd() {
    if (!this.enemies.filter(e => e.status === 'active').length) { this._onVictory(); return; }
    if (!this.allies.filter(a => a.status === 'active').length) { this._onDefeat(); }
  }
  _onVictory() {
    this.phase = 'victory';
    this.game.showToast('🏆 KEMENANGAN!');
    for (const e of this.enemies) {
      this.rewards.exp += e.exp || 0;
      this.rewards.money += e.money || 0;
    }
    this.game.player.money += this.rewards.money;
    setTimeout(() => this.endBattle('victory'), 2000);
  }
  _onDefeat() {
    this.phase = 'defeat';
    this.game.showToast('💀 KALAH...');
    setTimeout(() => this.endBattle('defeat'), 2500);
  }
  endBattle(result) {
    this.active = false;
    this.phase = 'idle';
    this.allies = [];
    this.enemies = [];
    if (result === 'defeat') {
      for (const m of this.game.party.members) { m.hp = m.maxHp; m.mp = m.maxMp; }
      this.game.mapManager.switchTo('village', 480, 480, this.game.player, this.game);
    }
    this.rewards = { exp:0, money:0, items:[] };
  }
  _karma(k) {
    const ap = this.game.karma.apply(k, 'Combat');
    this.game._showKarmaToast(ap);
  }
  _randEnemy() {
    const a = this.enemies.filter(e => e.status === 'active');
    return a[Math.floor(Math.random() * a.length)];
  }
  update(dt) { if (this.active) this.animationTime += dt; }
  handleInput(input) {
    if (!this.active || this.phase !== 'player-turn') return;
    const a = this.currentActor.ref;
    if (this.uiPhase === 'main-menu') {
      if (input.wasPressed('1')) this.selectAction('attack', { target: this._randEnemy() });
      if (input.wasPressed('2')) this.uiPhase = 'skill-menu';
      if (input.wasPressed('3')) this.selectAction('talk', { target: this._randEnemy() });
      if (input.wasPressed('4')) this.selectAction('defend');
      if (input.wasPressed('5')) this.selectAction('flee');
    } else if (this.uiPhase === 'skill-menu') {
      if (input.wasPressed('escape')) { this.uiPhase = 'main-menu'; return; }
      const skills = a.skills || [];
      for (let i = 0; i < Math.min(6, skills.length); i++) {
        if (input.wasPressed(String(i + 1))) {
          this.selectAction('skill', {
            skill: skills[i],
            target: skills[i].target?.includes('enemy') ? this._randEnemy() : null,
          });
          this.uiPhase = 'main-menu';
          break;
        }
      }
    }
  }
  render(ctx) {
    if (!this.active) return;
    const W = CONFIG.VIEW_W, H = CONFIG.VIEW_H;
    const bg = BATTLE_BACKGROUNDS[this.bgRegion] || BATTLE_BACKGROUNDS.jawa;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, bg.color1);
    g.addColorStop(1, bg.color2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    this._renderRow(ctx, this.allies, 120, H * 0.6, 'ally');
    this._renderRow(ctx, this.enemies, W - 340, H * 0.55, 'enemy');

    if (this.phase === 'player-turn') this._renderMenu(ctx);
    else if (this.phase === 'enemy-turn') {
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e06060';
      ctx.fillText(`${this.currentActor.ref.name}...`, W/2, H - 40);
    } else if (this.phase === 'victory') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd966';
      ctx.fillText('🏆 VICTORY!', W/2, H/2);
    } else if (this.phase === 'defeat') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '24px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e06060';
      ctx.fillText('💀 DEFEAT', W/2, H/2);
    }
  }
  _renderRow(ctx, list, bx, by, side) {
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const x = bx + i * 90;
      const y = by + (i % 2) * 15;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(x + 24, y + 64, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
      if (f.status === 'downed') ctx.globalAlpha = 0.35;
      const fake = {
        dir: side === 'ally' ? 'right' : 'left',
        moving: false, animTime: this.animationTime,
        palette: f.palette || {
          skin:'#f5c99b', hair:'#3a2a1a',
          shirt: side === 'ally' ? '#3a6ad9' : '#8a3a3a',
          pants:'#2a3a6a',
        },
      };
      drawCharacter(ctx, x + 24, y + 64, fake);
      ctx.globalAlpha = 1;
      // Name + HP
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(f.name.slice(0, 12), x + 24, y + 78);
      const pct = Math.max(0, f.hp / f.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 11, y + 84, 70, 5);
      ctx.fillStyle = pct > 0.5 ? '#88d060' : pct > 0.2 ? '#e0a060' : '#e06060';
      ctx.fillRect(x - 11, y + 84, 70 * pct, 5);
    }
  }
  _renderMenu(ctx) {
    const W = CONFIG.VIEW_W, H = CONFIG.VIEW_H;
    const a = this.currentActor.ref;
    const mx = 20, my = H - 180, mw = 260, mh = 160;
    ctx.fillStyle = 'rgba(10,15,40,0.94)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#c9a24a';
    ctx.lineWidth = 3;
    ctx.strokeRect(mx, my, mw, mh);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd966';
    ctx.fillText(a.name.slice(0, 16), mx + 12, my + 20);
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#8899bb';
    ctx.fillText(`HP ${a.hp}/${a.maxHp}  MP ${a.mp}/${a.maxMp}`, mx + 12, my + 36);
    if (this.uiPhase === 'main-menu') {
      const acts = [
        ['1','⚔️ Serang'],['2','✨ Skill'],['3','💬 Bicara'],
        ['4','🛡️ Bertahan'],['5','🏃 Kabur'],
      ];
      ctx.font = '8px "Press Start 2P", monospace';
      for (let i = 0; i < acts.length; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        ctx.fillStyle = '#c0c8d8';
        ctx.fillText(`[${acts[i][0]}] ${acts[i][1]}`, mx + 14 + col * 120, my + 58 + row * 26);
      }
    } else if (this.uiPhase === 'skill-menu') {
      const skills = a.skills || [];
      ctx.fillStyle = '#ffd966';
      ctx.fillText('Pilih skill:', mx + 12, my + 54);
      ctx.font = '7px "Press Start 2P", monospace';
      for (let i = 0; i < Math.min(5, skills.length); i++) {
        ctx.fillStyle = a.mp >= skills[i].cost ? '#c0c8d8' : '#667';
        ctx.fillText(`[${i+1}] ${skills[i].icon} ${skills[i].name} (${skills[i].cost}MP)`, mx + 14, my + 72 + i * 16);
      }
    }
  }
}
