'use strict';

const ENEMY_DB = {
  perampok_jalan: {
    id:'perampok_jalan', name:'Perampok Jalanan', type:'human',
    icon:'🗡️', color:'#8a4a4a', level:1,
    hp:40, mp:10, atk:8, def:4, spd:6, willpower:30,
    exp:15, money:25,
    dialog:[
      { text:'Kau... jangan mendekat!', success:40 },
      { text:'Aku hanya butuh makan untuk keluargaku.', success:60, karma:{ kemanusiaan:+5 } },
      { text:'Baiklah... aku menyerah.', success:100 },
    ],
  },
  provokator: {
    id:'provokator', name:'Provokator', type:'human',
    icon:'🕵️', color:'#6a3a6a', level:3,
    hp:60, mp:20, atk:12, def:6, spd:10, willpower:80,
    exp:30, money:50, abilities:['hasut','adu_domba'],
    dialog:[
      { text:'Kalian tidak mungkin bersatu!', success:20 },
      { text:'Bhinneka Tunggal Ika hanyalah slogan!', success:40 },
      { text:'...Buktikan padaku.', success:80 },
      { text:'Aku menyerah. Mungkin kau benar.', success:100, karma:{ persatuan:+10, kerakyatan:+5 } },
    ],
  },
  penjajah_asing: {
    id:'penjajah_asing', name:'Tentara Kongsi', type:'human',
    icon:'⚔️', color:'#4a4a6a', level:5,
    hp:100, mp:30, atk:18, def:12, spd:8, willpower:150,
    exp:80, money:150, abilities:['tembak'],
    dialog:[
      { text:'Kongsi kami punya hak di tanah ini!', success:30 },
      { text:'Kami hanya menjalankan perintah.', success:50 },
      { text:'Perintahku tidak jelas lagi... aku mundur.', success:100,
        karma:{ persatuan:+15, keadilan:+10 }, faction:{ asing:-20 } },
    ],
  },
  roh_hutan: {
    id:'roh_hutan', name:'Roh Penjaga Hutan', type:'mystical',
    icon:'👻', color:'#3a6a4a', level:4,
    hp:80, mp:50, atk:10, def:14, spd:12, willpower:60,
    exp:50, money:0, undefeatable:true,
    dialog:[
      { text:'Siapa yang berani masuk ke hutan kami?', success:20 },
      { text:'Hormatilah leluhur kami.', success:100,
        karma:{ ketuhanan:+8 }, faction:{ kalimantan:+5, papua:+5 } },
    ],
  },
};

const SKILL_DB = {
  doa_bersama:      { id:'doa_bersama',      name:'Doa Bersama',       pillar:'ketuhanan',   cost:15, target:'all_allies', type:'heal',   power:30, icon:'🙏', unlockKarma:50 },
  berkat:           { id:'berkat',           name:'Berkat Leluhur',    pillar:'ketuhanan',   cost:25, target:'single_ally',type:'buff',   effect:{ def:+50, duration:3 }, icon:'✨', unlockKarma:65 },
  tepuk_punggung:   { id:'tepuk_punggung',   name:'Tepuk Punggung',    pillar:'kemanusiaan', cost:10, target:'single_ally',type:'buff',   effect:{ atk:+30, duration:3 }, icon:'🤗', unlockKarma:50 },
  semangat_kawan:   { id:'semangat_kawan',   name:'Semangat Kawan',    pillar:'kemanusiaan', cost:30, target:'single_ally',type:'revive', power:40, icon:'💞', unlockKarma:70 },
  serangan_bhinneka:{ id:'serangan_bhinneka',name:'Serangan Bhinneka', pillar:'persatuan',   cost:20, target:'all_enemies',type:'damage', power:25, icon:'🤝', unlockKarma:55 },
  unite_attack:     { id:'unite_attack',     name:'Gotong Royong',     pillar:'persatuan',   cost:40, target:'single_enemy',type:'combo', power:80, requiresPartySize:2, icon:'💥', unlockKarma:75 },
  komando:          { id:'komando',          name:'Komando Rakyat',    pillar:'kerakyatan',  cost:15, target:'single_ally',type:'haste',  effect:{ spd:+50, duration:2 }, icon:'📣', unlockKarma:50 },
  musyawarah:       { id:'musyawarah',       name:'Musyawarah Darurat',pillar:'kerakyatan',  cost:25, target:'self',       type:'command', icon:'🗳️', unlockKarma:65 },
  tebasan_adil:     { id:'tebasan_adil',     name:'Tebasan Adil',      pillar:'keadilan',    cost:12, target:'single_enemy',type:'damage', power:35, icon:'⚖️', unlockKarma:50 },
  hukuman_setimpal: { id:'hukuman_setimpal', name:'Hukuman Setimpal',  pillar:'keadilan',    cost:30, target:'single_enemy',type:'damage', power:50, icon:'🔥', unlockKarma:70 },
  bujuk:            { id:'bujuk',            name:'Bujuk',             pillar:'kemanusiaan', cost:5,  target:'single_enemy',type:'persuade', willpowerDamage:15, icon:'💬', unlockKarma:0 },
  diplomasi:        { id:'diplomasi',        name:'Diplomasi',         pillar:'kerakyatan',  cost:15, target:'single_enemy',type:'persuade', willpowerDamage:30, icon:'🕊️', unlockKarma:60 },
};

const FORMATIONS = {
  barisan:      { id:'barisan',      name:'Barisan',      icon:'⬛', desc:'Seimbang.', modifiers:{ atk:1.0, def:1.0, spd:1.0 } },
  lingkaran:    { id:'lingkaran',    name:'Lingkaran',    icon:'⭕', desc:'+30% DEF.', modifiers:{ atk:0.9, def:1.3, spd:1.0 } },
  segitiga:     { id:'segitiga',     name:'Segitiga',     icon:'🔺', desc:'+20% ATK.', modifiers:{ atk:1.2, def:0.9, spd:1.0 } },
  sayap:        { id:'sayap',        name:'Sayap',        icon:'🦅', desc:'+20% SPD.', modifiers:{ atk:1.0, def:1.0, spd:1.2 } },
  gotong_royong:{ id:'gotong_royong',name:'Gotong Royong',icon:'🤝', desc:'Butuh 4+.', modifiers:{ atk:1.15, def:1.15, spd:1.15 }, requiresPartySize:4 },
};

const BATTLE_BACKGROUNDS = {
  jawa:      { color1:'#4a7c3f', color2:'#2a5a2a' },
  sumatera:  { color1:'#7a5a3f', color2:'#4a3a2a' },
  kalimantan:{ color1:'#2a5a3a', color2:'#1a3a2a' },
  sulawesi:  { color1:'#3a6a8a', color2:'#1a3a5a' },
  bali:      { color1:'#8a5a4a', color2:'#5a3a2a' },
  papua:     { color1:'#5a3a5a', color2:'#3a1a3a' },
  asing:     { color1:'#3a3a5a', color2:'#1a1a2a' },
};

const ENCOUNTER_ZONES = {
  jawa:       { rate:0.02, enemies:[{id:'perampok_jalan',weight:80},{id:'provokator',weight:20}], levelRange:[1,3] },
  sumatera:   { rate:0.03, enemies:[{id:'perampok_jalan',weight:60},{id:'provokator',weight:30},{id:'penjajah_asing',weight:10}], levelRange:[2,5] },
  papua:      { rate:0.04, enemies:[{id:'roh_hutan',weight:50},{id:'provokator',weight:30},{id:'penjajah_asing',weight:20}], levelRange:[4,7] },
  asing:      { rate:0.05, enemies:[{id:'penjajah_asing',weight:80},{id:'provokator',weight:20}], levelRange:[5,8] },
  kalimantan: { rate:0.03, enemies:[{id:'roh_hutan',weight:60},{id:'perampok_jalan',weight:40}], levelRange:[3,6] },
  sulawesi:   { rate:0.03, enemies:[{id:'perampok_jalan',weight:50},{id:'penjajah_asing',weight:50}], levelRange:[3,6] },
  bali:       { rate:0.02, enemies:[{id:'perampok_jalan',weight:70},{id:'roh_hutan',weight:30}], levelRange:[3,5] },
};