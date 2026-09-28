'use strict';

const KARMA_PILLARS = {
  ketuhanan:   { name: 'Ketuhanan',   sila: 1, icon: '🕊️', color: '#f0d060', desc: 'Toleransi & spiritualitas' },
  kemanusiaan: { name: 'Kemanusiaan', sila: 2, icon: '❤️', color: '#e06060', desc: 'Empati & tolong-menolong' },
  persatuan:   { name: 'Persatuan',   sila: 3, icon: '🤝', color: '#60d0a0', desc: 'Kerukunan & persaudaraan' },
  kerakyatan:  { name: 'Kerakyatan',  sila: 4, icon: '🗳️', color: '#6090e0', desc: 'Musyawarah & demokrasi' },
  keadilan:    { name: 'Keadilan',    sila: 5, icon: '⚖️', color: '#c060d0', desc: 'Adil & merata' },
};

const KARMA_TITLES = [
  { min: 85, title: 'Pancasilais Sejati', color: '#ffd966', icon: '🏆' },
  { min: 70, title: 'Warga Teladan',      color: '#88d060', icon: '⭐' },
  { min: 55, title: 'Warga Baik',         color: '#60d0a0', icon: '🌱' },
  { min: 45, title: 'Warga Biasa',        color: '#a0a0a0', icon: '👤' },
  { min: 30, title: 'Warga Nakal',        color: '#e0a060', icon: '⚠️' },
  { min: 0,  title: 'Pengkhianat Bangsa', color: '#e06060', icon: '💀' },
];
