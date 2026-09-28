'use strict';

class PartySystem {
  constructor(game) {
    this.game = game;
    this.members = [];
    this.maxSize = 4;
    this.formation = 'barisan';
    this.recruitedCompanions = [];
    this.availableCompanions = [
      { id:'sari',      name:'Sari',    faction:'jawa',     role:'healer',  karmaReq:60 },
      { id:'fatimah',   name:'Fatimah', faction:'sumatera', role:'warrior', karmaReq:60 },
      { id:'dewi_bali', name:'Dewi',    faction:'bali',     role:'mage',    karmaReq:65 },
      { id:'ayu_papua', name:'Ayu',     faction:'papua',    role:'support', karmaReq:70 },
      { id:'kartika',   name:'Kartika', faction:'sulawesi', role:'archer',  karmaReq:65 },
    ];
    this.refresh();
  }
  refresh() {
    this.members = [this._makePlayer()];
    if (this.game.family?.spouse) this.members.push(this._makeSpouse());
    for (const c of this.game.family?.children || []) if (c.stage === 'adult') this.members.push(this._makeChild(c));
    for (const c of this.recruitedCompanions) this.members.push(c);
  }
  _makePlayer() {
    const p = this.game.player, k = this.game.karma;
    return {
      id:'__player__', uid:this.game.net?.uid || null,
      name: p.name || 'Pemuda Nusantara', isPlayer:true,
      faction: this.game.faction.dominantFaction || 'jawa',
      level: Math.max(1, Math.floor(this.game.score.lastComputedScore / 500) + 1),
      hp:100, maxHp:100, mp:50, maxMp:50,
      atk: 15 + Math.floor(k.pillars.keadilan / 5),
      def: 10 + Math.floor(k.pillars.ketuhanan / 5),
      spd: 10 + Math.floor(k.pillars.kerakyatan / 5),
      skills: this._getPlayerSkills(),
      palette: p.palette, status:'active', buffs:[], avatar:'🧑', color:'#3a6ad9',
    };
  }
  _makeSpouse() {
    const s = this.game.family.spouse;
    return {
      id:'__spouse__', name:s.name, isSpouse:true, faction:s.faction,
      level:3, hp:80, maxHp:80, mp:40, maxMp:40, atk:12, def:12, spd:10,
      skills:[SKILL_DB.doa_bersama, SKILL_DB.tepuk_punggung],
      palette:s.palette, status:'active', buffs:[], avatar:'👩', color:s.color,
    };
  }
  _makeChild(c) {
    return {
      id:c.id, name:c.name, isChild:true, faction:'jawa',
      level: Math.max(1, Math.floor(c.age / 30)),
      hp:60, maxHp:60, mp:30, maxMp:30, atk:10, def:8, spd:12,
      skills:[SKILL_DB.bujuk],
      palette:{ shirt:'#e0a24f', pants:'#3a6ad9', hair:'#2a1a0a' },
      status:'active', buffs:[], avatar:'🧒', color:'#88d060',
    };
  }
  _getPlayerSkills() {
    const skills = [SKILL_DB.bujuk];
    for (const s of Object.values(SKILL_DB)) {
      if (!s.unlockKarma) continue;
      if ((this.game.karma.pillars[s.pillar] || 0) >= s.unlockKarma) skills.push(s);
    }
    return skills;
  }
  recruit(cid) {
    const c = this.availableCompanions.find(x => x.id === cid);
    if (!c) return { ok:false, reason:'Companion tidak dikenal.' };
    const dom = Math.max(...Object.values(this.game.karma.pillars));
    if (dom < c.karmaReq) return { ok:false, reason:`Butuh karma minimal ${c.karmaReq}.` };
    if (this.recruitedCompanions.find(x => x.id === cid)) return { ok:false, reason:'Sudah direkrut.' };
    if (this.members.length >= this.maxSize) return { ok:false, reason:`Party penuh (max ${this.maxSize}).` };
    const m = this._buildCompanion(c);
    this.recruitedCompanions.push(m);
    this.refresh();
    this.game.showToast(`✨ ${c.name} bergabung!`);
    return { ok:true };
  }
  _buildCompanion(c) {
    const stats = {
      healer: { hp:70, mp:60, atk:8, def:10, spd:10 },
      warrior:{ hp:110, mp:30, atk:18, def:12, spd:8 },
      mage:   { hp:60, mp:80, atk:12, def:8, spd:12 },
      support:{ hp:75, mp:55, atk:10, def:10, spd:10 },
      archer: { hp:80, mp:40, atk:16, def:9, spd:14 },
    }[c.role] || { hp:80, mp:40, atk:14, def:10, spd:10 };
    const skills = {
      healer: [SKILL_DB.doa_bersama, SKILL_DB.berkat],
      warrior:[SKILL_DB.tebasan_adil, SKILL_DB.hukuman_setimpal],
      mage:   [SKILL_DB.serangan_bhinneka, SKILL_DB.doa_bersama],
      support:[SKILL_DB.tepuk_punggung, SKILL_DB.semangat_kawan],
      archer: [SKILL_DB.tebasan_adil, SKILL_DB.komando],
    }[c.role] || [];
    return {
      id:c.id, name:c.name, faction:c.faction, isCompanion:true, role:c.role,
      level:3, ...stats, maxHp:stats.hp, maxMp:stats.mp, skills,
      palette:{ shirt:'#88a0c0', pants:'#3a4a5a', hair:'#2a1a0a' },
      status:'active', buffs:[], avatar:'🧑‍🤝‍🧑', color:'#c9a24a',
    };
  }
  serialize() {
    return {
      recruited: this.recruitedCompanions.map(c => ({ id:c.id, faction:c.faction, role:c.role })),
      formation: this.formation, maxSize: this.maxSize,
    };
  }
  load(d) {
    if (!d) return;
    this.recruitedCompanions = [];
    for (const c of (d.recruited || [])) {
      const av = this.availableCompanions.find(x => x.id === c.id);
      if (av) this.recruitedCompanions.push(this._buildCompanion(av));
    }
    this.formation = d.formation || 'barisan';
    this.maxSize = d.maxSize || 4;
    this.refresh();
  }
}
