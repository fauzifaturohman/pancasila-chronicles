'use strict';

const QUEST_DB = [
  {
    id: 'q_wawasan_nusantara', type: 'main',
    title: 'Wawasan Nusantara', giver: 'budi', autoStart: true,
    desc: 'Pak Budi ingin mengenalkanmu makna Wawasan Nusantara.',
    prereq: {},
    objectives: [
      { id:'o1', type:'talk',   target:'budi',      count:1, desc:'Dengarkan Pak Budi' },
      { id:'o2', type:'choice', target:'tamu_suku', count:1, desc:'Putuskan sikap pada tamu suku' },
    ],
    rewards: {
      money: 150,
      karma: { persatuan:+10, kemanusiaan:+5 },
      faction: { jawa:+8, sumatera:+4, papua:+4, bali:+3 },
      items: [{ id:'peta_nusantara', name:'Peta Nusantara', icon:'🗺️', qty:1 }],
    },
    onComplete: 'unlockQuest:q_musyawarah_desa',
  },
  {
    id: 'q_roti_untuk_semua', type: 'side',
    title: 'Roti untuk Semua', giver: 'sari',
    desc: 'Ibu Sari butuh bantuan mengantar roti ke warga sakit.',
    prereq: { karma: { kemanusiaan: { min: 45 } } },
    objectives: [
      { id:'o1', type:'talk',    target:'sari', count:1, desc:'Terima tugas Ibu Sari' },
      { id:'o2', type:'deliver', target:'budi', item:'roti', count:1, desc:'Antar roti ke Pak Budi' },
    ],
    rewards: {
      money: 75,
      karma: { kemanusiaan:+12, keadilan:+3 },
      faction: { jawa:+5 },
    },
  },
  {
    id: 'q_musyawarah_desa', type: 'main',
    title: 'Musyawarah Desa', giver: 'budi',
    desc: 'Hadiri musyawarah desa untuk menentukan dana.',
    prereq: { quests: ['q_wawasan_nusantara'] },
    objectives: [
      { id:'o1', type:'visit',  target:'balai_desa', count:1, desc:'Datang ke Balai Desa' },
      { id:'o2', type:'choice', target:'dana_desa',  count:1, desc:'Pilih penggunaan dana' },
    ],
    rewards: {
      money: 250,
      karma: { kerakyatan:+12, keadilan:+8 },
      faction: { jawa:+10 },
    },
  },
  // Quest untuk lamaran (5 kandidat)
  ...[
    ['sari','Sari','jawa'],
    ['dewi_bali','Dewi','bali'],
    ['fatimah','Fatimah','sumatera'],
    ['ayu_papua','Ayu','papua'],
    ['kartika','Kartika','sulawesi'],
  ].map(([cid, cname, cfac]) => ({
    id: `q_lamaran_${cid}`,
    type: 'side',
    title: `Lamaran ${cname}`,
    giver: cid,
    desc: `Buktikan keseriusanmu untuk melamar ${cname}.`,
    prereq: {},
    objectives: [
      { id:'o1', type:'talk',    target:cid, count:1, desc:`Bicara dengan ${cname}` },
      { id:'o2', type:'choice',  target:`proposal_${cid}`, count:1, desc:`Lamar ${cname}` },
    ],
    rewards: {
      karma: { kemanusiaan:+5, persatuan:+5 },
      faction: { [cfac]: +15 },
      onCompleteAction: 'family:completeMarriage',
    },
  })),
];
