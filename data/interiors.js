'use strict';

// Extend TILE_DEFS dengan tile interior
Object.assign(TILE_DEFS, {
  'F': { id:'floor',  solid:false, color:'#c9a878', detail:'floor'  },
  'B': { id:'bed',    solid:true,  color:'#8a3a3a', detail:'bed'    },
  'C': { id:'chest',  solid:true,  color:'#5a3a1a', detail:'chest'  },
  'T': { id:'table',  solid:true,  color:'#6a4a2a', detail:'table'  },
  'M': { id:'mirror', solid:true,  color:'#a0d0e0', detail:'mirror' },
  'r': { id:'rug',    solid:false, color:'#8a3a4a', detail:'rug'    },
  'w': { id:'window', solid:true,  color:'#4a7ca5', detail:'window' },
  'x': { id:'slot',   solid:false, color:'#c9a878', detail:'slot'   },
});

const INTERIOR_TEMPLATES = {
  house_small: {
    id:'house_small', name:'Gubuk Sederhana',
    rows: [
      "WWWWWWWWWWWWWWW",
      "WwFFFFFFFFFwFwW",
      "WFFFFFFFFFFFFFW",
      "WFFBBFFFFFFCCFW",
      "WFFBBFFFFFFCCFW",
      "WFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFW",
      "WFFFFFrrrFFFFFW",
      "WFFFFFrrrFFFFFW",
      "WFFFFFFDFFFFFFW",
      "WWWWWWWWWWWWWWW",
    ],
    portals: [{ from:{x:7,y:9}, to:'village', spawn:{x:460,y:400} }],
    interactables: [
      { type:'sleep',   x:168, y:180, label:'Tidur',  icon:'🛏️' },
      { type:'storage', x:504, y:180, label:'Lemari', icon:'📦' },
      { type:'mirror',  x:168, y:60,  label:'Cermin', icon:'🪞' },
    ],
    furnitureSlots: [
      { id:'slot1', x:240, y:360 },
      { id:'slot2', x:320, y:360 },
      { id:'slot3', x:400, y:360 },
    ],
  },
  house_medium: {
    id:'house_medium', name:'Rumah Kayu',
    rows: [
      "WWWWWWWWWWWWWWWWW",
      "WwFFFFFFFFFFFFFwW",
      "WFFFFFFFFFFFFFFFW",
      "WFFFBBFFFFFFFFCCW",
      "WFFFBBFFFFFFFFCCW",
      "WFFFFFFFFFFFFFFFW",
      "WFFFTTFFFFFFFFFFW",
      "WFFFTTFFFFFFFFFFW",
      "WFFFFFFFFxFFxFFFW",
      "WFFFFFrrrrFFFFFWW",
      "WFFFFFrrrrFFFFFWW",
      "WFFFFFFFDFFFFFFFW",
      "WWWWWWWWWWWWWWWWW",
    ],
    portals: [{ from:{x:8,y:11}, to:'village', spawn:{x:460,y:400} }],
    interactables: [
      { type:'sleep',   x:216, y:180, label:'Tidur',       icon:'🛏️' },
      { type:'storage', x:552, y:180, label:'Lemari Besar', icon:'📦' },
      { type:'craft',   x:216, y:336, label:'Meja Kerja',  icon:'🔨' },
    ],
    furnitureSlots: [
      { id:'slot1', x:240, y:480 }, { id:'slot2', x:320, y:480 },
      { id:'slot3', x:400, y:480 }, { id:'slot4', x:480, y:480 },
    ],
  },
  house_large: {
    id:'house_large', name:'Rumah Batu',
    rows: [
      "WWWWWWWWWWWWWWWWWWW",
      "WwFFFFFFFFFFFFFFFwW",
      "WFFFFFFFFFFFFFFFFFW",
      "WFFFBBFFFFFFFFFCCFW",
      "WFFFBBFFFFFFFFFCCFW",
      "WFFFFFFFFFFFFFFFFFW",
      "WFFFTTFFFFFFFFFFFWW",
      "WFFFTTFFFFFFFFFFFWW",
      "WFFFFFFFFxFFxFFxFFW",
      "WFFFFFFFFFFFFFFFFFW",
      "WFFFFrrrrFFFFrrrrFW",
      "WFFFFrrrrFFFFrrrrFW",
      "WFFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFDFFFFFFFFW",
      "WWWWWWWWWWWWWWWWWWW",
    ],
    portals: [{ from:{x:9,y:13}, to:'village', spawn:{x:460,y:400} }],
    interactables: [
      { type:'sleep',   x:216, y:180, label:'Kasur Istana', icon:'🛏️' },
      { type:'storage', x:600, y:180, label:'Lemari Antik', icon:'📦' },
      { type:'craft',   x:216, y:336, label:'Meja Pengrajin', icon:'🔨' },
      { type:'trophy',  x:600, y:336, label:'Rak Trofi', icon:'🏆' },
    ],
    furnitureSlots: [
      { id:'slot1', x:240, y:480 }, { id:'slot2', x:320, y:480 },
      { id:'slot3', x:400, y:480 }, { id:'slot4', x:480, y:480 },
      { id:'slot5', x:560, y:480 }, { id:'slot6', x:640, y:480 },
    ],
  },
  toko_sari: {
    id:'toko_sari', name:'Toko Roti Sari',
    rows: [
      "WWWWWWWWWWWWW",
      "WwFFFFFFFFFwW",
      "WFFFFFFFFFFFW",
      "WFFTTTFFFFFFW",
      "WFFTTTFFFFFFW",
      "WFFFFFFFFFFFW",
      "WFFFFFFFFFFFW",
      "WFFFFFFFFDFFW",
      "WWWWWWWWWWWWW",
    ],
    portals: [{ from:{x:9,y:7}, to:'village', spawn:{x:400,y:730} }],
    interactables: [{ type:'shop', x:216, y:168, label:'Belanja', icon:'🛒', npcId:'sari' }],
  },
  balai_desa: {
    id:'balai_desa', name:'Balai Desa',
    rows: [
      "WWWWWWWWWWWWWWWWW",
      "WwFFFFFFFFFFFFFwW",
      "WFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFW",
      "WFFTTTTTTTTTTTFFW",
      "WFFTTTTTTTTTTTFFW",
      "WFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFW",
      "WFFFFFFFFDFFFFFFW",
      "WWWWWWWWWWWWWWWWW",
    ],
    portals: [{ from:{x:9,y:8}, to:'village', spawn:{x:720,y:460} }],
    interactables: [{ type:'musyawarah', x:408, y:240, label:'Musyawarah', icon:'🗳️' }],
  },
};

const INTERIOR_REGISTRY = { ...INTERIOR_TEMPLATES };

const HOUSING_TIERS = [
  { id:'house_small',  name:'Gubuk Sederhana', icon:'🏚️', price:500,  storageSlots:20,  sleepRecovery:60,  furnitureSlots:3,
    desc:'Rumah pertama. Cukup untuk istirahat.',
    unlock:{ faction:{ jawa:{ min:10 } } } },
  { id:'house_medium', name:'Rumah Kayu',      icon:'🏡', price:2500, storageSlots:60,  sleepRecovery:80,  furnitureSlots:4,
    desc:'Rumah lebih luas dengan meja kerja.',
    unlock:{ faction:{ jawa:{ min:40 } }, quests:['q_wawasan_nusantara'] } },
  { id:'house_large',  name:'Rumah Batu',      icon:'🏛️', price:8000, storageSlots:120, sleepRecovery:100, furnitureSlots:6,
    desc:'Rumah megah. Simbol kejayaan.',
    unlock:{ faction:{ jawa:{ min:70 } } } },
];

const FURNITURE_ITEMS = {
  lampu_minyak:  { id:'lampu_minyak',  name:'Lampu Minyak',  icon:'🪔', price:50  },
  vas_bunga:     { id:'vas_bunga',     name:'Vas Bunga',     icon:'🌺', price:80  },
  kursi_rotan:   { id:'kursi_rotan',   name:'Kursi Rotan',   icon:'🪑', price:120 },
  meja_kayu:     { id:'meja_kayu',     name:'Meja Kayu',     icon:'🪵', price:150 },
  patung_garuda: { id:'patung_garuda', name:'Patung Garuda', icon:'🦅', price:400 },
  keris_pajang:  { id:'keris_pajang',  name:'Keris Pajang',  icon:'🗡️', price:350 },
};
