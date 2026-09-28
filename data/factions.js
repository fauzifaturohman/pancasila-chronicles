'use strict';

const FACTIONS = {
  jawa:       { id:'jawa',       name:'Suku Jawa',      region:'Pulau Jawa',    icon:'🌾', color:'#c9a24a', desc:'Penjaga tradisi Nusantara.' },
  sumatera:   { id:'sumatera',   name:'Suku Sumatera',  region:'Pulau Sumatera',icon:'🌶️', color:'#c94f4f', desc:'Pedagang jalur Selat Malaka.' },
  kalimantan: { id:'kalimantan', name:'Suku Dayak',     region:'Kalimantan',    icon:'🌳', color:'#3a8a5a', desc:'Penjaga hutan Kalimantan.' },
  sulawesi:   { id:'sulawesi',   name:'Suku Bugis',     region:'Sulawesi',      icon:'⛵', color:'#4a7ca5', desc:'Pelaut & penjelajah.' },
  bali:       { id:'bali',       name:'Suku Bali',      region:'Pulau Bali',    icon:'🛕', color:'#d97a4a', desc:'Seniman & spiritualitas.' },
  papua:      { id:'papua',      name:'Suku Papua',     region:'Papua',         icon:'🪶', color:'#8a4f9a', desc:'Penjaga alam timur.' },
  asing:      { id:'asing',      name:'Kongsi Asing',   region:'Luar Nusantara',icon:'🌐', color:'#88a0c0', desc:'Pengaruh globalisasi.' },
};

const FACTION_RELATIONS = {
  jawa:       { sumatera: 0,  kalimantan: +3, sulawesi: +2, bali: +8, papua: -4, asing: -5 },
  sumatera:   { kalimantan: +2, sulawesi: +4, bali: +1, papua: -2, asing: +3 },
  kalimantan: { sulawesi: +3, bali: +2, papua: +5, asing: -6 },
  sulawesi:   { bali: +3, papua: +4, asing: +2 },
  bali:       { papua: +1, asing: -3 },
  papua:      { asing: -8 },
  asing:      {},
};

const FACTION_TIERS = [
  { key:'ally',       min:  60, label:'Sekutu',     icon:'⭐', color:'#ffd966' },
  { key:'friend',     min:  25, label:'Kawan',      icon:'⭐', color:'#88d060' },
  { key:'polite',     min:   5, label:'Sopan',      icon:'⭐', color:'#a0d080' },
  { key:'neutral',    min:  -5, label:'Netral',     icon:'⚪', color:'#a0a8b8' },
  { key:'suspicious', min: -25, label:'Dicurigai',  icon:'⚠️', color:'#e0a060' },
  { key:'hostile',    min: -60, label:'Bermusuhan', icon:'⛔', color:'#e06060' },
  { key:'enemy',      min: -999,label:'Musuh',      icon:'💀', color:'#c02020' },
];

const FACTION_PERKS = {
  jawa:       { ally: { quest:'q_warisan_batik', item:'keris_emas', npc:'kiai_seno' } },
  sumatera:   { ally: { quest:'q_jalur_rempah',  item:'ulos_agung', npc:'datuk_raja' } },
  kalimantan: { ally: { quest:'q_penjaga_hutan', item:'mandau_pusaka' } },
  sulawesi:   { ally: { quest:'q_armada_pinisi', item:'badik_bugis' } },
  bali:       { ally: { quest:'q_pura_suci',     item:'keris_bali' } },
  papua:      { ally: { quest:'q_roh_leluhur',   item:'mahkota_cendrawasih' } },
  asing:      { ally: { quest:'q_kontrak_global',item:'mesin_uap_kecil' } },
};

function factionPriceMultiplier(tierKey) {
  return { ally:0.75, friend:0.85, polite:0.95, neutral:1.0,
           suspicious:1.20, hostile:1.50, enemy:999 }[tierKey] || 1.0;
}
