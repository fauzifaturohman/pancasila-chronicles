'use strict';

const LB_WEIGHTS = { karma:1.0, faction:0.8, quest:2.0, family:1.5, explorer:1.2, achiever:3.0, helper:1.5 };
const LB_BADGES = {
  first_quest:    { id:'first_quest',    name:'Langkah Pertama',   icon:'🌱' },
  karma_master:   { id:'karma_master',   name:'Karma Sempurna',    icon:'✨' },
  bhineka:        { id:'bhineka',        name:'Bhinneka Tunggal Ika', icon:'🇮🇩' },
  family_first:   { id:'family_first',   name:'Kepala Keluarga',   icon:'👨‍👩‍👧' },
  explorer_all:   { id:'explorer_all',   name:'Penjelajah Sejati', icon:'🗺️' },
  philanthropist: { id:'philanthropist', name:'Dermawan',          icon:'💝' },
  pancasila:      { id:'pancasila',      name:'Pancasilais Sejati',icon:'🏆' },
};

class ScoreSystem {
  constructor(game) {
    this.game = game;
    this.badges = new Set();
    this.stats = {
      questsCompleted:0, regionsVisited:new Set(['jawa']),
      totalTravels:0, nightTravels:0, npcsHelped:0, donationsGiven:0,
      uniqueDialogsRead:0, childrenMilestones:0, questsByFaction:{},
    };
    this._seenDialogs = new Set();
    this.lastComputedScore = 0;
  }
  computeBreakdown() {
    const g = this.game;
    const karmaAvg = g.karma.overall;
    const karmaScore = karmaAvg * LB_WEIGHTS.karma;
    const fVals = Object.values(g.faction.reputation);
    const fTotal = fVals.reduce((a,b) => a + Math.max(0, b), 0);
    const factionScore = (fTotal / 7) * LB_WEIGHTS.faction;
    const questCount = g.quests.getCompleted().length;
    const questScore = questCount * 10 * LB_WEIGHTS.quest;
    let famScore = 0;
    if (g.family.spouse) famScore += g.family.spouse.love + g.family.spouse.happiness;
    for (const c of g.family.children) famScore += c.health + c.happiness + c.exp;
    famScore *= LB_WEIGHTS.family;
    const explorerScore = (this.stats.regionsVisited.size * 50 + this.stats.totalTravels * 10) * LB_WEIGHTS.explorer;
    const badgeCount = this.badges.size;
    const trophyCount = g.housing?.trophies.length || 0;
    const achieverScore = (badgeCount * 100 + trophyCount * 30) * LB_WEIGHTS.achiever;
    const helperScore = this.stats.npcsHelped * 15 * LB_WEIGHTS.helper;
    const total = Math.round(karmaScore + factionScore + questScore + famScore + explorerScore + achieverScore + helperScore);
    this.lastComputedScore = total;
    return {
      karma: Math.round(karmaScore), faction: Math.round(factionScore),
      quest: Math.round(questScore), family: Math.round(famScore),
      explorer: Math.round(explorerScore), achiever: Math.round(achieverScore),
      helper: Math.round(helperScore), total,
    };
  }
  checkBadges() {
    const g = this.game;
    const unlocked = [];
    if (!this.badges.has('first_quest') && g.quests.getCompleted().length >= 1) this._unlock('first_quest', unlocked);
    if (!this.badges.has('karma_master') && Object.values(g.karma.pillars).every(v => v >= 90)) this._unlock('karma_master', unlocked);
    const allies = Object.keys(FACTIONS).filter(fid => fid !== 'asing' && g.faction.getTier(fid).key === 'ally').length;
    if (!this.badges.has('bhineka') && allies >= 6) this._unlock('bhineka', unlocked);
    if (!this.badges.has('family_first') && g.family.children.length >= 1) this._unlock('family_first', unlocked);
    if (!this.badges.has('explorer_all') && this.stats.regionsVisited.size >= 7) this._unlock('explorer_all', unlocked);
    if (!this.badges.has('philanthropist') && this.stats.donationsGiven >= 10000) this._unlock('philanthropist', unlocked);
    if (!this.badges.has('pancasila') && g.karma.title.title === 'Pancasilais Sejati') this._unlock('pancasila', unlocked);
    return unlocked;
  }
  _unlock(id, list) {
    this.badges.add(id);
    const b = LB_BADGES[id];
    if (b) {
      list.push(b);
      if (this.game._showLbToast) setTimeout(() => this.game._showLbToast(b), 400);
    }
  }
  onQuestComplete(q) {
    this.stats.questsCompleted++;
    if (q.def.faction) this.stats.questsByFaction[q.def.faction] = (this.stats.questsByFaction[q.def.faction] || 0) + 1;
    this.checkBadges();
  }
  onRegionVisit(id) { this.stats.regionsVisited.add(id); this.checkBadges(); }
  onTravel(m, night) { this.stats.totalTravels++; if (night) this.stats.nightTravels++; this.checkBadges(); }
  onNPCGift(id) { this.stats.npcsHelped++; }
  onDonation(amt) { this.stats.donationsGiven += amt; this.checkBadges(); }
  onUniqueDialog(id) {
    if (!this._seenDialogs.has(id)) {
      this._seenDialogs.add(id);
      this.stats.uniqueDialogsRead++;
      this.checkBadges();
    }
  }
  serialize() {
    return {
      badges: [...this.badges],
      stats: { ...this.stats, regionsVisited: [...this.stats.regionsVisited], questsByFaction: { ...this.stats.questsByFaction } },
      seenDialogs: [...this._seenDialogs],
    };
  }
  load(d) {
    if (!d) return;
    this.badges = new Set(d.badges || []);
    if (d.stats) {
      const s = d.stats;
      this.stats.questsCompleted = s.questsCompleted || 0;
      this.stats.regionsVisited = new Set(s.regionsVisited || ['jawa']);
      this.stats.totalTravels = s.totalTravels || 0;
      this.stats.nightTravels = s.nightTravels || 0;
      this.stats.npcsHelped = s.npcsHelped || 0;
      this.stats.donationsGiven = s.donationsGiven || 0;
      this.stats.uniqueDialogsRead = s.uniqueDialogsRead || 0;
      this.stats.questsByFaction = s.questsByFaction || {};
    }
    this._seenDialogs = new Set(d.seenDialogs || []);
  }
}
