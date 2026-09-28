/* ============================================================
   NET MANAGER — Firebase Multiplayer (modular import)
   ============================================================ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getDatabase, ref, set, get, push, remove, update, query,
  orderByChild, limitToLast, startAfter, onValue, onDisconnect, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

export class NetManager {
  constructor(game) {
    this.game = game;
    this.app = null; this.auth = null; this.db = null; this.uid = null;
    this.roomId = null; this.roomRef = null; this.playersRef = null; this.chatRef = null;
    this.remotePlayers = new Map();
    this.connected = false;
    this.ready = false;
    this._lastPosSend = 0;
    this._posInterval = 50;
    this._listeners = [];
    this._lastChatTimestamp = 0;
    this.onPlayerJoin = null; this.onPlayerLeave = null;
    this.onChat = null; this.onStatus = null;
  }
  async init() {
    if (!window.FIREBASE_ENABLED) { this._status('error', 'Firebase belum dikonfigurasi'); return false; }
    try {
      this._status('connecting', 'Menghubungkan...');
      this.app = initializeApp(window.FIREBASE_CONFIG);
      this.auth = getAuth(this.app);
      this.db = getDatabase(this.app);
      await new Promise((resolve, reject) => {
        const unsub = onAuthStateChanged(this.auth, (u) => {
          if (u) { this.uid = u.uid; unsub(); resolve(); }
          else signInAnonymously(this.auth).catch(reject);
        });
      });
      this.ready = true;
      this._status('ready', 'Siap terhubung');
      return true;
    } catch (e) {
      console.error('[Net] Init error:', e);
      this._status('error', 'Gagal: ' + e.message);
      return false;
    }
  }
  _genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }
  async createRoom() {
    if (!this.ready) { this.game.showToast('⚠️ Multiplayer belum siap.'); return null; }
    const code = this._genCode();
    await set(ref(this.db, `rooms/${code}/meta`), {
      createdBy: this.uid, createdAt: serverTimestamp(), version: '1.0',
    });
    await this.joinRoom(code);
    return code;
  }
  async joinRoom(code) {
    if (!this.ready) return false;
    code = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(code)) { this.game.showToast('❌ Kode invalid.'); return false; }
    const snap = await get(ref(this.db, `rooms/${code}`));
    if (!snap.exists()) { this.game.showToast(`❌ Room "${code}" tidak ditemukan.`); return false; }
    this.roomId = code;
    this.playersRef = ref(this.db, `rooms/${code}/players`);
    this.chatRef = ref(this.db, `rooms/${code}/chat`);
    await this._setupPresence();
    this._listenPlayers();
    this._listenChat();
    this._listenConnection();
    this.connected = true;
    this.game.showToast(`✅ Terhubung ke room ${code}`);
    this._status('connected', `Room: ${code}`);
    return true;
  }
  async leaveRoom() {
    if (!this.connected) return;
    try {
      await remove(ref(this.db, `rooms/${this.roomId}/players/${this.uid}`));
      for (const { ref:r, cb } of this._listeners) onValue ? null : null;
      this._listeners = [];
      this.remotePlayers.clear();
      this.roomId = null;
      this.connected = false;
      this._status('disconnected', 'Keluar room');
    } catch (e) { console.error(e); }
  }
  async _setupPresence() {
    const myRef = ref(this.db, `rooms/${this.roomId}/players/${this.uid}`);
    await set(myRef, {
      name: this.game.player.name || 'Pemuda',
      x: Math.floor(this.game.player.x),
      y: Math.floor(this.game.player.y),
      dir: this.game.player.dir || 'down',
      outfit: this.game.player.outfit || 'default',
      title: this.game.karma.title.title,
      mapId: this.game.mapManager.current,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    });
    onDisconnect(myRef).remove();
  }
  _listenPlayers() {
    const cb = (snap) => {
      const data = snap.val() || {};
      const cur = new Set();
      for (const [uid, p] of Object.entries(data)) {
        cur.add(uid);
        if (uid === this.uid) continue;
        if (!this.remotePlayers.has(uid)) {
          this.remotePlayers.set(uid, {
            x:p.x, y:p.y, targetX:p.x, targetY:p.y, dir:p.dir,
            name:p.name, outfit:p.outfit, title:p.title, mapId:p.mapId, lastSeen: Date.now(),
          });
          this.game.showToast(`👤 ${p.name} bergabung!`);
        } else {
          const rp = this.remotePlayers.get(uid);
          rp.targetX = p.x; rp.targetY = p.y;
          rp.dir = p.dir; rp.name = p.name; rp.outfit = p.outfit;
          rp.title = p.title; rp.mapId = p.mapId; rp.lastSeen = Date.now();
        }
      }
      for (const uid of [...this.remotePlayers.keys()]) {
        if (!cur.has(uid)) {
          const d = this.remotePlayers.get(uid);
          this.remotePlayers.delete(uid);
          this.game.showToast(`👋 ${d.name} keluar`);
        }
      }
    };
    onValue(this.playersRef, cb);
    this._listeners.push({ ref: this.playersRef, cb });
  }
  _listenChat() {
    const cb = (snap) => {
      const data = snap.val() || {};
      for (const [mid, m] of Object.entries(data)) {
        if (!m.time || m.time <= this._lastChatTimestamp) continue;
        this._lastChatTimestamp = Math.max(this._lastChatTimestamp, m.time);
        if (m.uid === this.uid) continue;
        if (this.onChat) this.onChat(m.uid, m.name, m.text, m.time);
      }
    };
    onValue(this.chatRef, cb);
    this._listeners.push({ ref: this.chatRef, cb });
  }
  _listenConnection() {
    const cb = (snap) => {
      const on = snap.val();
      if (on && this.roomId && this.uid) {
        onDisconnect(ref(this.db, `rooms/${this.roomId}/players/${this.uid}`)).remove();
        this._status('online', '🟢 Online');
      } else this._status('offline', '🔴 Offline');
    };
    onValue(ref(this.db, '.info/connected'), cb);
  }
  broadcastPosition() {
    if (!this.connected || !this.playersRef) return;
    const now = performance.now();
    if (now - this._lastPosSend < this._posInterval) return;
    this._lastPosSend = now;
    const p = this.game.player;
    update(ref(this.db, `rooms/${this.roomId}/players/${this.uid}`), {
      x: Math.floor(p.x), y: Math.floor(p.y), dir: p.dir,
      outfit: p.outfit || 'default', title: this.game.karma.title.title,
      mapId: this.game.mapManager.current, lastSeen: serverTimestamp(),
    }).catch(() => {});
  }
  async sendChat(text) {
    if (!this.connected) return false;
    text = String(text).slice(0, 200).trim();
    if (!text) return false;
    const msgRef = push(this.chatRef);
    await set(msgRef, { uid: this.uid, name: this.game.player.name || 'Pemuda', text, time: Date.now() });
    return true;
  }
  update(dt) {
    if (!this.connected) return;
    const curMap = this.game.mapManager.current;
    for (const [uid, rp] of this.remotePlayers) {
      if (rp.mapId !== curMap) continue;
      const lf = Math.min(1, dt * 8);
      rp.x += (rp.targetX - rp.x) * lf;
      rp.y += (rp.targetY - rp.y) * lf;
      if (Date.now() - rp.lastSeen > 10000) this.remotePlayers.delete(uid);
    }
  }
  render(ctx, camX, camY) {
    if (!this.connected) return;
    const curMap = this.game.mapManager.current;
    for (const [uid, rp] of this.remotePlayers) {
      if (rp.mapId !== curMap) continue;
      const sx = Math.floor(rp.x - camX), sy = Math.floor(rp.y - camY);
      if (sx < -80 || sx > 1040) continue;
      if (sy < -100 || sy > 740) continue;
      const fake = {
        dir: rp.dir, moving: false, animTime: performance.now() / 1000,
        palette: { skin:'#f5c99b', hair:'#3a2a1a',
          shirt: rp.outfit === 'default' ? '#88a0c0' : '#c9a24a',
          pants:'#2a3a6a' },
      };
      drawCharacter(ctx, sx, sy, fake);
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const w = ctx.measureText(rp.name).width;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(sx - w/2 - 4, sy - 88, w + 8, 12);
      ctx.fillStyle = '#88d0ff';
      ctx.fillText(rp.name, sx, sy - 79);
      ctx.fillStyle = '#88d060';
      ctx.beginPath(); ctx.arc(sx + 12, sy - 84, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  _status(s, m) { if (this.onStatus) this.onStatus(s, m); }
  get playerCount() { return this.remotePlayers.size + (this.connected ? 1 : 0); }
}