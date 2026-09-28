'use strict';

const MARRIAGE_CANDIDATES = {
  sari:      { id:'sari',      name:'Sari',    faction:'jawa',     region:'jawa',     mapId:'village',  x:420, y:720, dir:'down',
    palette:{ shirt:'#e0a24f', pants:'#6a3a2a', hair:'#2a1a0a' }, icon:'👩‍🦱', color:'#e0a24f',
    trait:'Penyayang', traitDesc:'+2 kemanusiaan setiap quality time',
    bio:'Pedagang roti yang lembut hati.',
    requirement:{ money:1000, karma:{ kemanusiaan:{min:60} }, faction:{ jawa:{min:40} }, house:['house_medium','house_large'] },
    courtshipQuest:'q_lamaran_sari' },
  dewi_bali: { id:'dewi_bali', name:'Dewi',    faction:'bali',     region:'bali',     mapId:'bali',     x:400, y:500, dir:'down',
    palette:{ shirt:'#d97a4a', pants:'#8a3a2a', hair:'#1a1a1a' }, icon:'👩‍🎨', color:'#d97a4a',
    trait:'Spiritual', traitDesc:'+2 ketuhanan setiap doa bersama',
    bio:'Penari & pemahat ukiran Bali.',
    requirement:{ money:1500, karma:{ ketuhanan:{min:65}, kemanusiaan:{min:55} }, faction:{ bali:{min:40} }, house:['house_medium','house_large'] },
    courtshipQuest:'q_lamaran_dewi_bali' },
  fatimah:   { id:'fatimah',   name:'Fatimah', faction:'sumatera', region:'sumatera', mapId:'sumatera', x:400, y:500, dir:'down',
    palette:{ shirt:'#c94f4f', pants:'#3a2a1a', hair:'#1a1a1a' }, icon:'👩‍💼', color:'#c94f4f',
    trait:'Bijaksana', traitDesc:'+2 keadilan setiap musyawarah',
    bio:'Anak Datuk Raja. Cerdas & adil.',
    requirement:{ money:1200, karma:{ keadilan:{min:60} }, faction:{ sumatera:{min:50} }, house:['house_medium','house_large'] },
    courtshipQuest:'q_lamaran_fatimah' },
  ayu_papua: { id:'ayu_papua', name:'Ayu',     faction:'papua',    region:'papua',    mapId:'papua',    x:400, y:500, dir:'down',
    palette:{ shirt:'#8a4f9a', pants:'#3a2a4a', hair:'#1a1a1a' }, icon:'👩‍🌾', color:'#8a4f9a',
    trait:'Empatik', traitDesc:'+3 kemanusiaan setiap merawat anak',
    bio:'Putri Kepala Suku Asmat.',
    requirement:{ money:1000, karma:{ kemanusiaan:{min:70}, persatuan:{min:60} }, faction:{ papua:{min:45} }, house:['house_medium','house_large'] },
    courtshipQuest:'q_lamaran_ayu_papua' },
  kartika:   { id:'kartika',   name:'Kartika', faction:'sulawesi', region:'sulawesi', mapId:'sulawesi', x:500, y:600, dir:'down',
    palette:{ shirt:'#4a7ca5', pants:'#2a3a4a', hair:'#1a1a2a' }, icon:'👩‍✈️', color:'#4a7ca5',
    trait:'Petualang', traitDesc:'+10% travel speed',
    bio:'Putri Sultan Bira. Pelaut pemberani.',
    requirement:{ money:1300, karma:{ persatuan:{min:65} }, faction:{ sulawesi:{min:50} }, house:['house_medium','house_large'] },
    courtshipQuest:'q_lamaran_kartika' },
};

const CHILD_STAGES = [
  { id:'baby',  name:'Bayi',   minAge:0,   maxAge:30,  icon:'👶', desc:'Butuh perhatian penuh.' },
  { id:'child', name:'Anak',   minAge:30,  maxAge:90,  icon:'🧒', desc:'Mulai belajar Pancasila.' },
  { id:'teen',  name:'Remaja', minAge:90,  maxAge:180, icon:'👦', desc:'Bisa membantu pekerjaan.' },
  { id:'adult', name:'Dewasa', minAge:180, maxAge:999, icon:'🧑', desc:'Bisa mandiri.' },
];

const CHILD_NAME_POOL = {
  laki:     ['Bima','Arjuna','Sultan','Raka','Yudha','Fajar','Damar'],
  perempuan:['Sekar','Melati','Anisa','Kartini','Dewi','Laras','Ayu'],
};

const FAMILY_EVENTS = [
  { id:'pagi_bersama', timeRange:[6,9], chance:0.15, conditions:{ hasSpouse:true },
    text:'☀️ Pasanganmu menyiapkan sarapan.',
    effect:{ stamina:+10, love:+5, karma:{ kemanusiaan:+2 } } },
  { id:'anak_bertanya', timeRange:[10,16], chance:0.20, conditions:{ hasChild:true, childStage:['child','teen'] },
    text:'❓ Anakmu bertanya: "Ayah, apa itu Pancasila?"',
    choices:[
      { text:'📖 Jelaskan dengan sabar', karma:{ kemanusiaan:+5, kerakyatan:+3 }, childExp:+10 },
      { text:'🚫 Bilang "nanti saja"',    karma:{ kemanusiaan:-3 }, mood:-5 },
    ] },
  { id:'anak_sakit', timeRange:[22,6], chance:0.10, conditions:{ hasChild:true, childHealth:{ max:50 } },
    text:'🤒 Anakmu demam tinggi di tengah malam.',
    choices:[
      { text:'💊 Cari tabib desa', cost:{ money:50 }, karma:{ kemanusiaan:+8 }, childHealth:+30 },
      { text:'🛌 Obati sendiri',    karma:{ kemanusiaan:+4 }, childHealth:+15 },
      { text:'😴 Biarkan tidur',    karma:{ kemanusiaan:-10 }, childHealth:-10 },
    ] },
];

const FAMILY_DIALOGUES = {
  spouse_morning:  ['Selamat pagi, sayang.','Aku siapkan sarapan untukmu.','Semoga harimu menyenangkan.'],
  spouse_noon:     ['Sudah makan siang?','Aku bangga padamu.','Jangan lupa istirahat.'],
  spouse_evening:  ['Selamat malam, sayang.','Bagaimana harimu?','Mari kita habiskan waktu bersama.'],
  spouse_high_kemanusiaan: ['Aku bangga padamu.','Kau teladan bagi keluarga ini.'],
  spouse_low_kemanusiaan:  ['Aku khawatir dengan sikapmu...','Kau berubah. Aku rindu kau yang dulu.'],
  child_baby:  ['Waaah... waaah...','(Bayi menatapmu dengan mata polos.)'],
  child_child: ['Ayah! Aku bisa menyebutkan sila Pancasila!','Ayah, kenapa kita beda suku tapi tetap keluarga?'],
  child_teen:  ['Ayah, aku ingin ikut musyawarah desa.','Ayah, aku belajar Bhinneka Tunggal Ika!'],
  child_adult: ['Ayah, aku sudah dewasa.','Terima kasih untuk semuanya.'],
};

const FAMILY_GIFTS = {
  bunga_rose:  { id:'bunga_rose',  name:'Bunga Mawar',   icon:'🌹', price:50,  target:'spouse', love:+10 },
  perhiasan:   { id:'perhiasan',   name:'Perhiasan',     icon:'💍', price:400, target:'spouse', love:+25 },
  surat_cinta: { id:'surat_cinta', name:'Surat Cinta',   icon:'💌', price:10,  target:'spouse', love:+20 },
  mainan_kayu: { id:'mainan_kayu', name:'Mainan Kayu',   icon:'🪀', price:80,  target:'child',  happiness:+15 },
  buku_cerita: { id:'buku_cerita', name:'Buku Cerita',   icon:'📚', price:120, target:'child',  happiness:+20, childExp:+5 },
};