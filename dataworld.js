'use strict';

const REGIONS = {
  jawa:       { id:'jawa',       name:'Desa Bhinneka',    subtitle:'Pulau Jawa',   faction:'jawa',       mapId:'village',    spawn:{x:480,y:480},  bgColor:'#4a7c3f', icon:'🌾' },
  sumatera:   { id:'sumatera',   name:'Kampung Deli',     subtitle:'Sumatera',     faction:'sumatera',   mapId:'sumatera',   spawn:{x:300,y:400},  bgColor:'#7a5a3f', icon:'🌶️' },
  kalimantan: { id:'kalimantan', name:'Rumah Panjang',    subtitle:'Kalimantan',   faction:'kalimantan', mapId:'kalimantan', spawn:{x:400,y:500},  bgColor:'#2a5a3a', icon:'🌳' },
  sulawesi:   { id:'sulawesi',   name:'Pelabuhan Bira',   subtitle:'Sulawesi',     faction:'sulawesi',   mapId:'sulawesi',   spawn:{x:500,y:600},  bgColor:'#3a6a8a', icon:'⛵' },
  bali:       { id:'bali',       name:'Pura Desa',        subtitle:'Pulau Bali',   faction:'bali',       mapId:'bali',       spawn:{x:350,y:450},  bgColor:'#8a5a4a', icon:'🛕' },
  papua:      { id:'papua',      name:'Honai Leluhur',    subtitle:'Papua',        faction:'papua',      mapId:'papua',      spawn:{x:400,y:500},  bgColor:'#5a3a5a', icon:'🪶' },
  asing:      { id:'asing',      name:'Bandar Internasional', subtitle:'Luar Nusantara', faction:'asing',  mapId:'asing',      spawn:{x:400,y:500},  bgColor:'#3a3a5a', icon:'🌐' },
};

const TRAVEL_NODES = {
  jawa:       [{ id:'pelabuhan_bhinneka', type:'harbor', x:1400, y:400, name:'Pelabuhan Bhinneka' }],
  sumatera:   [{ id:'pelabuhan_deli',     type:'harbor', x:200,  y:300, name:'Dermaga Deli' }],
  kalimantan: [{ id:'sungai_kapuas',      type:'river',  x:500,  y:200, name:'Dermaga Kapuas' }],
  sulawesi:   [{ id:'pelabuhan_bira',     type:'harbor', x:600,  y:700, name:'Pelabuhan Bira' }],
  bali:       [{ id:'pelabuhan_bali',     type:'harbor', x:200,  y:600, name:'Pelabuhan Benoa' }],
  papua:      [{ id:'pelabuhan_biak',     type:'harbor', x:300,  y:700, name:'Pelabuhan Biak' }],
  asing:      [{ id:'bandar_hendrik',     type:'harbor', x:400,  y:300, name:'Bandar Internasional' }],
};

const TRAVEL_ROUTES = [
  { from:'jawa', to:'sumatera',   mode:'ship', cost:{money:50,  time:120, stamina:10}, duration:3.0, desc:'Menyeberangi Selat Sunda' },
  { from:'jawa', to:'bali',       mode:'ship', cost:{money:40,  time:90,  stamina:8},  duration:2.5, desc:'Menyeberangi Selat Bali' },
  { from:'jawa', to:'kalimantan', mode:'ship', cost:{money:70,  time:180, stamina:12}, duration:4.0, desc:'Mengarungi Laut Jawa' },
  { from:'jawa', to:'sulawesi',   mode:'ship', cost:{money:90,  time:240, stamina:15}, duration:5.0, desc:'Menyeberangi Selat Makassar' },
  { from:'jawa', to:'papua',      mode:'ship', cost:{money:150, time:360, stamina:20}, duration:7.0, desc:'Melintasi Laut Banda' },
  { from:'jawa', to:'asing',      mode:'ship', cost:{money:200, time:300, stamina:18}, duration:6.0, desc:'Mengarungi Samudera Hindia' },
];

const TRANSPORT_MODES = {
  walk:      { id:'walk',      name:'Jalan Kaki', icon:'🚶', speed:1.0, color:'#a0a8b8' },
  horse:     { id:'horse',     name:'Kuda',       icon:'🐎', speed:2.0, color:'#c9a24a', unlock:{ money:300, faction:{ sumatera:{ min:15 } } } },
  ship:      { id:'ship',      name:'Kapal Layar',icon:'⛵', speed:1.5, color:'#4a7ca5', unlock:{ money:500, quests:['q_wawasan_nusantara'] } },
  steamship: { id:'steamship', name:'Kapal Uap',  icon:'🚢', speed:3.0, color:'#88a0c0', unlock:{ money:2000, faction:{ asing:{ min:40 } } } },
  airplane:  { id:'airplane',  name:'Pesawat',    icon:'✈️', speed:8.0, color:'#e0e8f0', unlock:{ money:8000 } },
};

const TRAVEL_ENCOUNTERS = [
  { id:'badai',   chance:0.10, modes:['ship','steamship'], text:'🌊 Badai menerjang! Perjalanan tertunda.',
    effect:{ extraTime:60, stamina:-10, karma:{ kemanusiaan:+2 } } },
  { id:'perampok',chance:0.08, modes:['walk','horse'], text:'🗡️ Perampok menghadang!',
    choices:[
      { text:'💰 Serahkan uang',  karma:{ keadilan:-2 } },
      { text:'🤝 Ajak bicara',    karma:{ kemanusiaan:+6, keadilan:+3 } },
    ] },
  { id:'pedagang',chance:0.15, modes:['ship','steamship','walk'], text:'🛍️ Kau bertemu pedagang keliling!',
    effect:{ money:-50, items:[{ id:'oleh_oleh', name:'Oleh-oleh Nusantara', icon:'🎁', qty:1 }] } },
];