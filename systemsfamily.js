'use strict';

class FamilySystem {
  constructor(game) {
    this.game = game;
    this.status = 'single';
    this.spouse = null;
    this.children = [];
    this.events = { lastTriggered: {} };
    this.homeStatus = { cleanliness:100, food:100, love:100 };
    this._customConditions = {
      married: () => this.status === 'married',
      canPropose: (npc) => this.canPropose(npc.id).ok,
    };
  }
  canPropose(cid) {
    const c = MARRIAGE_CANDIDATES[cid];
    if (!c) return { ok:false, reason:'Kandidat tidak dikenal.' };
    if (this.status !== 'single') return { ok:false, reason:'Sudah menikah.' };
    const req = c.requirement;
    if (this.game.player.money < req.money) return { ok:false, reason:`Butuh ${req.money} 🪙.` };
    if (req.karma) for (const [p,cond] of Object.entries(req.karma)) {
      if (this.game.karma.pillars[p] < cond.min) return { ok:false, reason:`Butuh karma ${KARMA_PILLARS[p].name} min ${cond.min}.` };
    }
    if (req.faction) for (const [fid,cond] of Object.entries(req.faction)) {
      if (this.game.faction.get(fid) < cond.min) return { ok:false, reason:`Butuh ${FACTIONS[fid].name} min ${cond.min}.` };
    }
    if (req.house && !req.house.includes(this.game.housing.ownedTier)) return { ok:false, reason:`Butuh rumah ${req.house.join(' atau ')}.` };
    return { ok:true, candidate:c };
  }
  startCourtship(cid) {
    const chk = this.canPropose(cid);
    if (!chk.ok) { this.game.showToast('❌ ' + chk.reason); return false; }
    const c = chk.candidate;
    this.status = 'courting';
    this.spouse = {
      candidateId: c.id, name: c.name, faction: c.faction,
      palette: c.palette, trait: c.trait, icon: c.icon, color: c.color,
      love: 30, happiness: 50, marriedAt: null, marriedDay: null,
    };
    this.game._showNarrativeToast(`💐 Kau mulai mendekati ${c.name}...\nSelesaikan quest untuk menikah.`);
    this.game.quests.start(c.courtshipQuest);
    return true;
  }
  completeMarriage() {
    if (this.status !== 'courting' || !this.spouse) return false;
    this.status = 'married';
    this.spouse.marriedAt = Date.now();
    this.spouse.marriedDay = this.game.time.day;
    this.spouse.love = Math.min(100, this.spouse.love + 30);
    this.spouse.happiness = Math.min(100, this.spouse.happiness + 20);
    this._applyTrait();
    this._spawnSpouseNPC();
    this.game.save.autosave();
    this.game._showNarrativeToast(`💒 Selamat! Kau menikah dengan ${this.spouse.name}!\nDia kini tinggal di rumahmu.`);
    return true;
  }
  _applyTrait() {
    const map = {
      'Penyayang': { karmaBonus:{ kemanusiaan:2 } },
      'Spiritual': { karmaBonus:{ ketuhanan:2 } },
      'Bijaksana': { karmaBonus:{ keadilan:2 } },
      'Empatik':   { karmaBonus:{ kemanusiaan:3 } },
      'Petualang': { travelSpeedBonus:0.10 },
    };
    this.spouse.traitEffect = map[this.spouse.trait] || {};
  }
  _spawnSpouseNPC() {
    const hid = this.game.housing.ownedTier;
    if (!hid) return;
    this.game.npcs = this.game.npcs.filter(n => n.id !== '__spouse__');
    const npc = new KarmaGatedNPC({
      id: '__spouse__', name: this.spouse.name, mapId: hid, faction: this.spouse.faction,
      x: 320, y: 240, dir: 'down', palette: this.spouse.palette, dialog: [], reactions: [],
    });
    npc.isSpouse = true;
    this.game.npcs.push(npc);
  }
  updateDaily(day) {
    if (this.status === 'married' && this.children.length === 0) {
      const dm = day - (this.spouse.marriedDay || day);
      if (dm >= 30) this._birthChild();
    }
    for (const c of this.children) {
      c.age = day - c.birthDay;
      this._updateChildStage(c);
      c.health = Math.max(0, c.health - 1);
      c.happiness = Math.max(0, c.happiness - 2);
    }
    this.homeStatus.cleanliness = Math.max(0, this.homeStatus.cleanliness - 3);
    this.homeStatus.food = Math.max(0, this.homeStatus.food - 4);
    this.homeStatus.love = Math.max(0, this.homeStatus.love - 2);
    if (this.spouse) {
      this.spouse.love = Math.max(0, this.spouse.love - 2);
      this.spouse.happiness = Math.max(0, this.spouse.happiness - 1);
    }
  }
  _birthChild() {
    const gender = Math.random() < 0.5 ? 'laki' : 'perempuan';
    const pool = CHILD_NAME_POOL[gender];
    const name = pool[Math.floor(Math.random() * pool.length)];
    const child = {
      id: '__child_' + Date.now() + '__', name, gender,
      birthDay: this.game.time.day, age: 0,
      health: 80, happiness: 80, exp: 0, stage: 'baby',
    };
    this.children.push(child);
    this._spawnChildNPC(child);
    this.game.save.autosave();
    this.game._showNarrativeToast(`👶 Selamat! ${this.spouse.name} melahirkan anak ${gender === 'laki' ? 'laki-laki' : 'perempuan'}!\nNamanya: ${name}.`);
  }
  _updateChildStage(child) {
    const ns = CHILD_STAGES.find(s => child.age >= s.minAge && child.age < s.maxAge) || CHILD_STAGES[CHILD_STAGES.length-1];
    if (child.stage !== ns.id) {
      child.stage = ns.id;
      this.game._showNarrativeToast(`${ns.icon} ${child.name} kini ${ns.name}!\n${ns.desc}`);
    }
  }
  _spawnChildNPC(child) {
    const hid = this.game.housing.ownedTier;
    if (!hid) return;
    this.game.npcs = this.game.npcs.filter(n => n.id !== child.id);
    const npc = new KarmaGatedNPC({
      id: child.id, name: child.name, mapId: hid, faction: this.spouse?.faction || 'jawa',
      x: 400, y: 260, dir: 'down',
      palette: { shirt:'#e0a24f', pants:'#3a6ad9', hair:'#2a1a0a' },
      dialog: [], reactions: [],
    });
    npc.isChild = true;
    npc.childRef = child;
    this.game.npcs.push(npc);
  }
  getSpouseDialog() {
    if (!this.spouse) return ['...'];
    const h = this.game.time.hour;
    let pool;
    if (h >= 6 && h < 12) pool = FAMILY_DIALOGUES.spouse_morning;
    else if (h >= 12 && h < 18) pool = FAMILY_DIALOGUES.spouse_noon;
    else pool = FAMILY_DIALOGUES.spouse_evening;
    if (this.game.karma.pillars.kemanusiaan >= 75) pool = [...pool, ...FAMILY_DIALOGUES.spouse_high_kemanusiaan];
    else if (this.game.karma.pillars.kemanusiaan <= 35) pool = [...pool, ...FAMILY_DIALOGUES.spouse_low_kemanusiaan];
    return [
      pool[Math.floor(Math.random() * pool.length)],
      { text: 'Apa yang ingin kau lakukan?', choices: [
        { text: '💬 Ngobrol',       action:'family:chat',    next:-1 },
        { text: '🎁 Beri hadiah',   action:'family:gift',    next:-1 },
        { text: '🍽️ Makan bersama', action:'family:eat',     next:-1 },
        { text: '❤️ Quality time',  action:'family:quality', next:-1 },
      ]},
    ];
  }
  getChildDialog(child) {
    const pool = FAMILY_DIALOGUES['child_' + child.stage] || ['...'];
    return [
      pool[Math.floor(Math.random() * pool.length)],
      { text: 'Apa yang ingin kau lakukan?', choices: [
        { text: '💬 Ngobrol',           action:'child:chat',  next:-1 },
        { text: '🎁 Beri hadiah',       action:'child:gift',  next:-1 },
        { text: '🎮 Bermain bersama',   action:'child:play',  next:-1 },
        { text: '📖 Ajarkan Pancasila', action:'child:teach', next:-1 },
      ]},
    ];
  }
  handleAction(actionId, target) {
    const [cat, verb] = actionId.split(':');
    if (cat === 'family') return this._spouseAction(verb);
    if (cat === 'child') return this._childAction(verb, target);
    return false;
  }
  _spouseAction(v) {
    const bonus = this.spouse.traitEffect?.karmaBonus || {};
    if (v === 'chat') {
      this.spouse.love = Math.min(100, this.spouse.love + 8);
      this.game.karma.apply({ kemanusiaan:3, ...bonus }, `Ngobrol dengan ${this.spouse.name}`);
      this.game.showToast(`💬 +8 love`);
      return true;
    }
    if (v === 'gift') { this._openGiftDialog('spouse'); return true; }
    if (v === 'eat') {
      if (this.game.player.money < 20) { this.game.showToast('💰 Butuh 20 🪙'); return false; }
      this.game.player.money -= 20;
      this.game.player.stamina = Math.min(100, this.game.player.stamina + 20);
      this.spouse.love = Math.min(100, this.spouse.love + 12);
      this.homeStatus.food = Math.min(100, this.homeStatus.food + 20);
      this.game.karma.apply({ kemanusiaan:4, ...bonus }, `Makan bersama`);
      this.game.showToast(`🍽️ Stamina +20`);
      return true;
    }
    if (v === 'quality') {
      this.spouse.love = Math.min(100, this.spouse.love + 20);
      this.spouse.happiness = Math.min(100, this.spouse.happiness + 15);
      this.homeStatus.love = Math.min(100, this.homeStatus.love + 25);
      this.game.karma.apply({ kemanusiaan:6, persatuan:2, ...bonus }, `Quality time`);
      this.game.showToast(`❤️ +20 love`);
      return true;
    }
    return false;
  }
  _childAction(v, child) {
    if (!child) return false;
    const stage = child.stage;
    if (v === 'chat') {
      child.happiness = Math.min(100, child.happiness + 8);
      this.game.karma.apply({ kemanusiaan:3 }, `Ngobrol dengan ${child.name}`);
      this.game.showToast(`💬 ${child.name} tersenyum.`);
      return true;
    }
    if (v === 'gift') { this._openGiftDialog('child', child); return true; }
    if (v === 'play') {
      if (stage === 'baby') { this.game.showToast(`👶 ${child.name} terlalu kecil.`); return false; }
      child.happiness = Math.min(100, child.happiness + 20);
      child.health = Math.min(100, child.health + 5);
      child.exp += 3;
      this.game.player.stamina = Math.max(0, this.game.player.stamina - 5);
      this.game.karma.apply({ kemanusiaan:5, kerakyatan:2 }, `Bermain dengan ${child.name}`);
      this.game.showToast(`🎮 ${child.name} tertawa!`);
      return true;
    }
    if (v === 'teach') {
      if (stage === 'baby') { this.game.showToast(`👶 ${child.name} belum bisa belajar.`); return false; }
      const gain = stage === 'child' ? 15 : stage === 'teen' ? 20 : 10;
      child.exp += gain;
      child.happiness = Math.min(100, child.happiness + 10);
      this.game.karma.apply({ kemanusiaan:4, kerakyatan:4, keadilan:3 }, `Mengajari ${child.name} Pancasila`);
      this.game.showToast(`📖 +${gain} exp`);
      if (child.exp >= 50 && !child.milestone_pancasila) {
        child.milestone_pancasila = true;
        this.game.housing.addTrophy(`trophy_${child.id}`, `${child.name} Hafal Pancasila`, '🏅');
        this.game._showNarrativeToast(`🏅 ${child.name} hafal Pancasila!\nTrofi ditambahkan.`);
      }
      return true;
    }
    return false;
  }
  _openGiftDialog(target, childRef = null) {
    const gifts = Object.values(FAMILY_GIFTS).filter(g => g.target === target);
    const choices = gifts.map(g => ({ text:`${g.icon} ${g.name} (${g.price}🪙)`, action:`family-gift:${g.id}`, next:-1 }));
    this.game.dialog.start('Hadiah', [{ text:'Pilih hadiah:', choices }], {
      onChoice: (c) => {
        const gid = c.action.split(':')[1];
        this._giveGift(gid, target, childRef);
      }
    });
  }
  _giveGift(gid, target, childRef) {
    const gift = FAMILY_GIFTS[gid];
    if (!gift) return;
    if (this.game.player.money < gift.price) { this.game.showToast(`💰 Butuh ${gift.price} 🪙`); return; }
    this.game.player.money -= gift.price;
    if (target === 'spouse' && this.spouse) {
      this.spouse.love = Math.min(100, this.spouse.love + (gift.love || 0));
      this.game.karma.apply({ kemanusiaan:3 }, `Beri hadiah`);
      this.game.showToast(`${gift.icon} +${gift.love} love`);
    } else if (target === 'child' && childRef) {
      childRef.happiness = Math.min(100, childRef.happiness + (gift.happiness || 0));
      childRef.exp += gift.childExp || 0;
      this.game.karma.apply({ kemanusiaan:2 }, `Beri hadiah`);
      this.game.showToast(`${gift.icon} ${childRef.name} senang!`);
    }
  }
  checkRandomEvent() {
    if (this.status !== 'married') return null;
    const day = this.game.time.day, h = this.game.time.hour;
    for (const ev of FAMILY_EVENTS) {
      if (this.events.lastTriggered[ev.id] === day) continue;
      const [s, e] = ev.timeRange;
      const inRange = s <= e ? (h >= s && h < e) : (h >= s || h < e);
      if (!inRange) continue;
      if (!this._checkCond(ev.conditions)) continue;
      if (ev.chance < 1 && Math.random() > ev.chance) continue;
      this.events.lastTriggered[ev.id] = day;
      return ev;
    }
    return null;
  }
  _checkCond(c) {
    if (!c) return true;
    if (c.hasSpouse && !this.spouse) return false;
    if (c.hasChild && this.children.length === 0) return false;
    if (c.childStage && !this.children.some(ch => c.childStage.includes(ch.stage))) return false;
    if (c.love && this.spouse) {
      if (c.love.max !== undefined && this.spouse.love > c.love.max) return false;
      if (c.love.min !== undefined && this.spouse.love < c.love.min) return false;
    }
    if (c.childHealth && !this.children.some(ch => ch.health <= c.childHealth.max)) return false;
    return true;
  }
  triggerEvent(ev) {
    this.game._showNarrativeToast(ev.text);
    if (ev.effect) {
      const e = ev.effect;
      if (e.stamina) this.game.player.stamina = Math.min(100, this.game.player.stamina + e.stamina);
      if (e.money) this.game.player.money += e.money;
      if (e.love && this.spouse) this.spouse.love = Math.min(100, this.spouse.love + e.love);
      if (e.karma) this.game.karma.apply(e.karma, `Family: ${ev.id}`);
    }
    if (ev.choices) {
      setTimeout(() => {
        this.game.dialog.start('Keluarga', [{
          text: ev.text, choices: ev.choices.map(c => ({ text:c.text, karma:c.karma, action:`family-event:${ev.id}`, next:-1 })),
        }], { onChoice: (c) => this._handleEventChoice(ev, c) });
      }, 800);
    }
  }
  _handleEventChoice(ev, choice) {
    const orig = ev.choices.find(c => c.text === choice.text);
    if (!orig) return;
    if (orig.cost?.money) {
      if (this.game.player.money < orig.cost.money) { this.game.showToast(`💰 Butuh ${orig.cost.money} 🪙`); return; }
      this.game.player.money -= orig.cost.money;
    }
    if (orig.karma) {
      const ap = this.game.karma.apply(orig.karma, `Event: ${ev.id}`);
      this.game._showKarmaToast(ap);
    }
    if (orig.love && this.spouse) this.spouse.love = Math.max(0, Math.min(100, this.spouse.love + orig.love));
    if (orig.childHealth !== undefined && this.children.length) {
      this.children[0].health = Math.max(0, Math.min(100, this.children[0].health + orig.childHealth));
    }
    if (orig.childExp && this.children.length) this.children[0].exp += orig.childExp;
    if (orig.mood && this.spouse) this.spouse.happiness = Math.max(0, this.spouse.happiness + orig.mood);
  }
  serialize() {
    return {
      status: this.status,
      spouse: this.spouse ? { ...this.spouse } : null,
      children: this.children.map(c => ({ ...c })),
      homeStatus: { ...this.homeStatus },
      events: { lastTriggered: { ...this.events.lastTriggered } },
    };
  }
  load(d) {
    if (!d) return;
    this.status = d.status || 'single';
    this.spouse = d.spouse ? { ...d.spouse } : null;
    this.children = (d.children || []).map(c => ({ ...c }));
    this.homeStatus = { ...(d.homeStatus || { love:100, food:100, cleanliness:100 }) };
    this.events = { lastTriggered: { ...((d.events?.lastTriggered) || {}) } };
    if (this.spouse) this._spawnSpouseNPC();
    for (const c of this.children) this._spawnChildNPC(c);
  }
}