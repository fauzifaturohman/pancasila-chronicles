/* ============================================================
   FIREBASE CONFIG — WAJIB DIISI UNTUK MULTIPLAYER
   ============================================================
   Cara dapatkan:
   1. Buka https://console.firebase.google.com
   2. Pilih project Anda → ⚙️ Project settings
   3. Scroll ke "Your apps" → Web app → Config
   4. Copy paste ke bawah ini.
   
   Kalau TIDAK diisi (biarkan placeholder), multiplayer akan
   disabled tapi game tetap bisa dimainkan offline.
   ============================================================ */
'use strict';

window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDWWMEJ7UY-y6VCINSaIWmF1auC4HqW_3E",
  authDomain:        "pancasila-chronicles.firebaseapp.com",
  databaseURL:       "https://pancasila-chronicles-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "pancasila-chronicles",
  storageBucket:     "pancasila-chronicles.firebasestorage.app",
  messagingSenderId: "683605286991",
  appId:             "1:683605286991:web:c3ea1729e7292976b68a3a",
};

// Cek apakah user sudah isi config dengan benar
window.FIREBASE_ENABLED = !window.FIREBASE_CONFIG.apiKey.includes('DUMMY');
