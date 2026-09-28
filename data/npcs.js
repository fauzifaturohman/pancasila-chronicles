'use strict';

const NPC_DATA = [
  {
    id: 'budi', name: 'Pak Budi',
    faction: 'jawa', region: 'jawa',
    x: 720, y: 400, dir: 'down',
    palette: { shirt:'#c94f4f', pants:'#3a2a1a', hair:'#1a1a1a' },
    dialog: [
      'Selamat datang di Desa Bhinneka, pemuda!',
      'Kau tahu tentang WAWASAN NUSANTARA?',
      'Wawasan Nusantara adalah cara pandang bangsa Indonesia tentang diri dan tanah airnya.',
      'Sebagai negara kepulauan yang majemuk, kita harus mengutamakan PERSATUAN.',
      'Ambil ini — Keris Pusaka. Simbol persatuan dari Sabang sampai Merauke.',
    ],
    gift: { id:'keris', name:'Keris Pusaka', icon:'🗡️' },
    reactions: [
      { priority:50, when:{ title:['Pengkhianat Bangsa'] },
        dialog:['Kau telah mengkhianati nilai leluhur desa ini.','Jangan salahkan aku bila pintuku tertutup untukmu.'], refuse:true },
      { priority:20, when:{ pillars:{ persatuan:{min:75}, kerakyatan:{min:70} } },
        dialog:['Ah, pemuda teladan! Kau pantas memimpin musyawarah.','Terimalah ini — Lencana Persatuan.'],
        gift:{ id:'lencana_persatuan', name:'Lencana Persatuan', icon:'🤝' } },
    ],
  },
  {
    id: 'sari', name: 'Ibu Sari',
    faction: 'jawa', region: 'jawa',
    x: 400, y: 700, dir: 'down',
    palette: { shirt:'#e0a24f', pants:'#6a3a2a', hair:'#2a1a0a' },
    dialog: [
      'Hai, anak muda. Aku Ibu Sari, penjual roti desa.',
      'Di desa ini kami menjunjung tinggi NORMA.',
      'Setiap perbuatan baik akan kembali padamu.',
      'Ambil roti ini — dari hati, bukan dari dagang.',
    ],
    gift: { id:'roti', name:'Roti Bakar', icon:'🍞' },
    reactions: [
      { priority:50, when:{ title:['Pengkhianat Bangsa','Warga Nakal'] },
        dialog:['Maaf, aku tidak melayani orang sepertimu.'], refuse:true },
    ],
  },
  {
    id: 'rahmat', name: 'Pak Rahmat',
    faction: 'jawa', region: 'jawa',
    x: 240, y: 240, dir: 'down',
    palette: { shirt:'#e8e8e8', pants:'#3a3a4a', hair:'#a0a0a0' },
    unlockedBy: { karma: { ketuhanan: { min: 65 } } },
    dialog: [
      'Salam damai, pemuda.',
      'Ketuhanan bukan hanya ritual — tapi tentang TOLERANSI.',
      'Pintu rumah ibadah kami selalu terbuka untuk kebaikan.',
    ],
    gift: { id:'kitab_doa', name:'Kitab Doa Bersama', icon:'📖' },
    reactions: [],
  },
  {
    id: 'pengemis', name: 'Pengemis Tua',
    faction: null, region: 'jawa',
    x: 620, y: 900, dir: 'down',
    palette: { shirt:'#5a4a3a', pants:'#3a2a1a', hair:'#888888' },
    dialog: ['Tuan muda... berilah sedikit untukku yang tua ini...'],
    gift: null,
    reactions: [
      { priority:100, when:{ pillar:'kemanusiaan', min:75 },
        dialog:['Terima kasih Tuan! Engkau sungguh mulia!','Semoga kau panjang umur.'],
        gift:{ id:'berkat_tua', name:'Berkat Pengemis Tua', icon:'✨' } },
      { priority:50, when:{ pillar:'kemanusiaan', max:30 },
        dialog:['Hati yang dingin tidak akan bahagia, Tuan.'], refuse:true },
    ],
  },
  {
    id: 'datuk_raja', name: 'Datuk Raja',
    faction: 'sumatera', region: 'sumatera',
    x: 400, y: 400, dir: 'down',
    palette: { shirt:'#8a2020', pants:'#3a2a1a', hair:'#1a1a1a' },
    unlockedBy: { faction: { sumatera: { min: 25 } } },
    dialog: ['Horas! Aku Datuk Raja dari tanah Sumatera.','Rempah kami adalah jiwa perdagangan Nusantara.'],
    gift: { id:'kain_ulos', name:'Kain Ulos', icon:'🧣' },
    reactions: [],
  },
  {
    id: 'kepala_asmat', name: 'Kepala Suku Asmat',
    faction: 'papua', region: 'papua',
    x: 400, y: 500, dir: 'down',
    palette: { shirt:'#5a3a6a', pants:'#3a2a1a', hair:'#1a1a1a' },
    unlockedBy: { faction: { papua: { min: 25 } } },
    dialog: ['Mansren... salam hormat dari tanah Papua.','Kau datang sebagai saudara, atau perampas?'],
    gift: { id:'noken_sakral', name:'Noken Sakral', icon:'👝' },
    reactions: [],
  },
  // NPC Spouse placeholder — di-generate oleh FamilySystem
  // NPC Child placeholder — di-generate oleh FamilySystem
];
