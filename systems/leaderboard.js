'use strict';

const LB_CATEGORIES = {
  total:    { id:'total',    name:'Pancasilais Sejati',       icon:'🏆', color:'#ffd966' },
  karma:    { id:'karma',    name:'Cermin Batin',             icon:'⚖️', color:'#88d060' },
  faction:  { id:'faction',  name:'Juru Damai Nusantara',     icon:'🤝', color:'#4a7ca5' },
  quest:    { id:'quest',    name:'Pengabdi Misi',            icon:'📜', color:'#e0a24f' },
  family:   { id:'family',   name:'Kepala Keluarga',          icon:'👨‍👩‍👧', color:'#e06080' },
  explorer: { id:'explorer', name:'Penjelajah Nusantara',     icon:'🧭', color:'#8a4f9a' },
  achiever: { id:'achiever', name:'Kolektor Prestasi',        icon:'🏅', color:'#c9a24a' },
};

const LB_TIERS = [
  { key:'legend',   name:'Legenda Nusantara', icon:'👑', color:'#ff4d6d', percentile:1 },
  { key:'diamond',  name:'Berlian',           icon:'💎', color:'#88d0ff', percentile:5 },
  { key:'platinum', name:'Platinum',          icon:'🔷', color:'#a0e8d0', percentile:15 },
  { key:'gold',     name:'Emas',              icon:'🥇', color:'#ffd966', percentile:30 },
  { key:'silver',   name:'Perak',             icon:'🥈', color:'#c0c8d0', percentile:50 },
  { key:'bronze',   name:'Perunggu',          icon:'🥉', color:'#c98f4a', percentile:70 },
  { key:'member',   name:'Warga Nusantara',   icon:'⭐', color:'#8899bb', percentile:100 },
];

const LB_SEASON = { durationDays: 30, cacheTTL: 60000,
  seasonNames: ['Kartini','Diponegoro','Soekarno','Hatta','Sjahrir','Habibie','Gus Dur','Ki Hajar'] };

const LB_DEMO_ENTRIES = [
  { uid:'demo1',  name:'Budi Santoso',   score:8420, title:'Pancasilais Sejati', avatar:'👨' },
  { uid:'demo2',  name:'Siti Rahayu',    score:7890, title:'Warga Teladan',      avatar:'👩' },
  { uid:'demo3',  name:'Agus Wijaya',    score:7215, title:'Warga Teladan',      avatar:'🧑' },
  { uid:'demo4',  name:'Dewi Lestari',   score:6800, title:'Warga Baik',         avatar:'👧' },
  { uid:'demo5',  name:'Rizky Pratama',  score:6450, title:'Warga Baik',         avatar:'🧑‍🦱' },
  { uid:'demo6',  name:'Ayu Mandasari',  score:5990, title:'Warga Baik',         avatar:'👩‍🦱' },
  { uid:'demo7',  name:'Hendra Gunawan', score:5620, title:'Warga Biasa',        avatar:'👨‍🦰' },
  { uid:'demo8',  name:'Rina Marlina',   score:5310, title:'Warga Biasa',        avatar:'👩‍🦰' },
  { uid:'demo9',  name:'Fajar Nugroho',  score:4980, title:'Warga Biasa',        avatar:'🧔' },
  { uid:'demo10', name:'Maya Anggraini', score:4650, title:'Warga Biasa',        avatar:'👩‍🦳' },
];

class LeaderboardSystem {
  constructor(game) {
    this.game = game;
    this.db = null;
    this.uid = null;
    this.connected = false;
    this.cache = { global:{ data:null, time:0 }, byRegion:{}, byFaction:{} };
    this.seasonId = { id:'season_1', num:1, name:'Kartini', startDay:1, endDay:30 };
    this.currentCategory = 'total';
    this.currentScope = 'global';
    this.currentFilterValue = null;
    this._lastSubmit = 0;
    this._submitInterval = 30000;
  }
  initFromNet() {
    const net = this.game.net;
    if (!net?.ready) return false;
    this.db = net.db;
    this.uid = net.uid;
    this.connected = true;
    this.seasonId = this._computeSeason();
    return true;
  }
  _computeSeason() {
    const day = this.game.time.day;
    const n = Math.floor((day - 1) / LB_SEASON.durationDays) + 1;
    const idx = (n - 1) % LB_SEASON.seasonNames.length;
    return { id:`season_${n}`, num:n, name:LB_SEASON.seasonNames[idx],
             startDay:(n-1)*LB_SEASON.durationDays + 1, endDay:n*LB_SEASON.durationDays };
  }
  async submitScore(force = false) {
    if (!this.connected) return false;
    const now = Date.now();
    if (!force && now - this._lastSubmit < this._submitInterval) return false;
    this._lastSubmit = now;
    const bd = this.game.score.computeBreakdown();
    const p = this.game.player;
    const entry = {
      uid: this.uid, name: p.name || 'Pemuda Nusantara', avatar: p.avatar || '👤',
      title: this.game.karma.title.title, titleIcon: this.game.karma.title.icon,
      region: this.game.mapManager.currentRegion,
      faction: this.game.faction.dominantFaction || 'jawa',
      breakdown: { karma:bd.karma, faction:bd.faction, quest:bd.quest, family:bd.family, explorer:bd.explorer, achiever:bd.achiever, helper:bd.helper },
      score: bd.total,
      badges: [...this.game.score.badges],
      updatedAt: Date.now(),
    };
    try {
      const sid = this.seasonId.id;
      const paths = [
        `leaderboard/seasons/${sid}/global/${this.uid}`,
        `leaderboard/seasons/${sid}/region_${entry.region}/${this.uid}`,
        `leaderboard/seasons/${sid}/faction_${entry.faction}/${this.uid}`,
      ];
      for (const path of paths) {
        await window.__FB__.set(window.__FB__.ref(this.db, path), entry);
      }
      this.cache.global.time = 0;
      return true;
    } catch (e) { console.warn('[LB] Submit gagal:', e); return false; }
  }
  async fetchTop(scope = 'global', limit = 10, fv = null) {
    const cached = scope === 'global' ? this.cache.global : (scope === 'region' ? this.cache.byRegion[fv] : this.cache.byFaction[fv]);
    if (cached?.data && Date.now() - cached.time < LB_SEASON.cacheTTL) return cached.data.slice(0, limit);
    if (!this.connected) return LB_DEMO_ENTRIES.slice(0, limit);
    try {
      const FB = window.__FB__;
      const sid = this.seasonId.id;
      const path = scope === 'global' ? `leaderboard/seasons/${sid}/global`
        : scope === 'region' ? `leaderboard/seasons/${sid}/region_${fv}`
        : `leaderboard/seasons/${sid}/faction_${fv}`;
      const lbRef = FB.query(FB.ref(this.db, path), FB.orderByChild('score'), FB.limitToLast(limit * 2));
      const snap = await FB.get(lbRef);
      if (!snap.exists()) return [];
      const arr = [];
      snap.forEach(child => arr.push({ uid: child.key, ...child.val() }));
      arr.sort((a,b) => b.score - a.score);
      const entry = { data: arr, time: Date.now() };
      if (scope === 'global') this.cache.global = entry;
      else if (scope === 'region') this.cache.byRegion[fv] = entry;
      else this.cache.byFaction[fv] = entry;
      return arr.slice(0, limit);
    } catch (e) { console.warn('[LB] Fetch gagal:', e); return LB_DEMO_ENTRIES.slice(0, limit); }
  }
  async fetchMyRank(scope = 'global', fv = null) {
    if (!this.connected) return null;
    try {
      const FB = window.__FB__;
      const sid = this.seasonId.id;
      const path = scope === 'global' ? `leaderboard/seasons/${sid}/global`
        : scope === 'region' ? `leaderboard/seasons/${sid}/region_${fv}`
        : `leaderboard/seasons/${sid}/faction_${fv}`;
      const mySnap = await FB.get(FB.ref(this.db, `${path}/${this.uid}`));
      if (!mySnap.exists()) return null;
      const data = mySnap.val();
      const aboveSnap = await FB.get(FB.query(FB.ref(this.db, path), FB.orderByChild('score'), FB.startAfter(data.score)));
      let rank = 1;
      if (aboveSnap.exists()) aboveSnap.forEach(() => rank++);
      return { rank, score: data.score, entry: data };
    } catch (e) { return null; }
  }
  async fetchNearby(scope = 'global', fv = null, range = 3) {
    const myRank = await this.fetchMyRank(scope, fv);
    if (!myRank) return [];
    const start = Math.max(1, myRank.rank - range);
    const end = myRank.rank + range;
    const all = await this.fetchTop(scope, Math.min(end, 100), fv);
    return all.slice(start - 1, end);
  }
  getTierForRank(rank, total) {
    if (!total) return LB_TIERS[LB_TIERS.length-1];
    const pct = (rank / total) * 100;
    for (const t of LB_TIERS) if (pct <= t.percentile) return t;
    return LB_TIERS[LB_TIERS.length-1];
  }
  serialize() { return { seasonNum: this.seasonId?.num || 1 }; }
}
