/* ============================================================
   PANCASILA CHRONICLES — Main Game Loop
   ============================================================ */
import { NetManager } from './multiplayer/net.js';

const CONFIG = {
  TILE: 48, VIEW_W: 960, VIEW_H: 640,
  PLAYER_SPEED: 180, TIME_SCALE: 0.6, INTERACT_RANGE: 75,
};
window.CONFIG = CONFIG;

// ============================================================
// INPUT
// ============================================================
class InputManager {
  constructor() {
    this.down = {}; this.pressed = {};
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.down[k]) this.pressed[k] = true;
      this.down[k] = true;
      if ([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.down[e.key.toLowerCase()] = false; });
  }
  isDown(...ks) { return ks.some(k => this.down[k]); }
  wasPressed(...ks) { return ks.some(k => this.pressed[k]); }
  endFrame() { this.pressed = {}; }
}

// ============================================================
// TIME
// ============================================================
class TimeSystem {
  constructor(h = 6, m = 0) { this.totalMinutes = h * 60 + m; this.day = 1; }
  update(dt) {
    this.totalMinutes += dt / CONFIG.TIME_SCALE;
    if (this.totalMinutes >= 1440) { this.totalMinutes -= 1440; this.day++; }
  }
  get hour() { return Math.floor(this.totalMinutes / 60); }
  get minute() { return Math.floor(this.totalMinutes % 60); }
  get string() { return `${String(this.hour).padStart(2,'0')}:${String(this.minute).padStart(2,'0')}`; }
  get nightAlpha() {
    const h = this.totalMinutes / 60;
    if (h >= 6 && h < 17) return 0;
    if (h >= 17 && h < 19) return ((h - 17) / 2) * 0.55;
    if (h >= 19 || h < 4) return 0.55;
    if (h >= 4 && h < 6) return (1 - (h - 4) / 2) * 0.55;
    return 0;
  }
  get isNight() { return this.hour >= 19 || this.hour < 5; }
}

// ============================================================
// ENTITY
// ============================================================
class Entity {
  constructor(x, y, o = {}) {
    this.x = x; this.y = y; this.dir = 'down';
    this.moving = false; this.animTime = 0;
    this.palette = Object.assign({ skin:'#f5c99b', hair:'#3a2a1a', shirt:'#3a6ad9', pants:'#2a3a6a' }, o.palette || {});
    this.name = o.name || 'Entity';
  }
  getHitbox(x = this.x, y = this.y) { return { x:x-12, y:y-14, w:24, h:14 }; }
  canMoveTo(map, x, y) {
    const hb = this.getHitbox(x, y);
    const t = CONFIG.TILE;
    const x1 = Math.floor(hb.x/t), y1 = Math.floor(hb.y/t);
    const x2 = Math.floor((hb.x + hb.w - 1)/t), y2 = Math.floor((hb.y + hb.h - 1)/t);
    for (let ty = y1; ty <= y2; ty++)
      for (let tx = x1; tx <= x2; tx++)
        if (map.isSolid(tx, ty)) return false;
    return true;
  }
  update(dt) { if (this.moving) this.animTime += dt; }
}

class Player extends Entity {
  constructor(x, y) {
    super(x, y, { name:'Pemuda Pancasila', palette:{ shirt:'#3a6ad9', pants:'#1f2a4a', hair:'#2a1a0a' } });
    this.money = 150; this.stamina = 100;
    this.outfit = 'default'; this.avatar = '🧑';
  }
  update(dt, input, map) {
    let dx = 0, dy = 0;
    if (input.isDown('w','arrowup')) dy--;
    if (input.isDown('s','arrowdown')) dy++;
    if (input.isDown('a','arrowleft')) dx--;
    if (input.isDown('d','arrowright')) dx++;
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
      else if (Math.abs(dy) > Math.abs(dx)) this.dir = dy > 0 ? 'down' : 'up';
      const len = Math.hypot(dx, dy);
      dx = (dx/len) * CONFIG.PLAYER_SPEED * dt;
      dy = (dy/len) * CONFIG.PLAYER_SPEED * dt;
      if (this.canMoveTo(map, this.x + dx, this.y)) this.x += dx;
      if (this.canMoveTo(map, this.x, this.y + dy)) this.y += dy;
    }
    super.update(dt);
  }
}

// ============================================================
// CAMERA
// ============================================================
class Camera {
  constructor(w, h) { this.x = 0; this.y = 0; this.w = w; this.h = h; }
  follow(t, map) {
    let cx = t.x - this.w / 2, cy = t.y - this.h / 2;
    cx = Math.max(0, Math.min(cx, map.pixelW - this.w));
    cy = Math.max(0, Math.min(cy, map.pixelH - this.h));
    this.x = cx; this.y = cy;
  }
}

// ============================================================
// INVENTORY
// ============================================================
class Inventory {
  constructor(o = {}) { this.items = []; this.onAdd = o.onAdd || null; }
  add(it, q = 1) {
    const e = this.items.find(i => i.id === it.id);
    if (e) e.qty += q; else this.items.push({ id:it.id, name:it.name, icon:it.icon, qty:q });
    if (this.onAdd) this.onAdd(it, q);
  }
}

// ============================================================
// RENDER HELPERS
// ============================================================
function drawCharacter(ctx, sx, sy, e) {
  const { dir, moving, animTime } = e;
  const { skin, hair, shirt, pants } = e.palette;
  const bob = moving ? Math.sin(animTime * 14) * 1.5 : 0;
  const sw = moving ? Math.sin(animTime * 14) * 4 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pants;
  ctx.fillRect(sx - 8, sy - 16 + (moving ? sw : 0), 7, 16);
  ctx.fillRect(sx + 1, sy - 16 + (moving ? -sw : 0), 7, 16);
  ctx.fillStyle = shirt;
  ctx.fillRect(sx - 11, sy - 40 + bob, 22, 25);
  ctx.fillRect(sx - 15, sy - 38 + bob, 5, 18);
  ctx.fillRect(sx + 10, sy - 38 + bob, 5, 18);
  ctx.fillStyle = skin;
  ctx.fillRect(sx - 10, sy - 58 + bob, 20, 20);
  ctx.fillStyle = hair;
  ctx.fillRect(sx - 11, sy - 60 + bob, 22, 9);
  if (dir !== 'up') {
    ctx.fillRect(sx - 11, sy - 56 + bob, 3, 8);
    ctx.fillRect(sx + 8, sy - 56 + bob, 3, 8);
  }
  ctx.fillStyle = '#1a1a2a';
  if (dir === 'down') {
    ctx.fillRect(sx - 6, sy - 48 + bob, 3, 3);
    ctx.fillRect(sx + 3, sy - 48 + bob, 3, 3);
  } else if (dir === 'left') ctx.fillRect(sx - 7, sy - 48 + bob, 3, 3);
  else if (dir === 'right') ctx.fillRect(sx + 4, sy - 48 + bob, 3, 3);
}

function drawTile(ctx, def, dx, dy, tx, ty) {
  ctx.fillStyle = def.color;
  ctx.fillRect(dx, dy, CONFIG.TILE, CONFIG.TILE);
  if (def.detail === 'tree') {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(dx + 20, dy + 32, 8, 16);
    ctx.fillStyle = '#1f4a1f';
    ctx.beginPath(); ctx.arc(dx + 24, dy + 24, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d5a27';
    ctx.beginPath(); ctx.arc(dx + 22, dy + 20, 16, 0, Math.PI * 2); ctx.fill();
  } else if (def.detail === 'wall') {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 3; i++) ctx.fillRect(dx, dy + i * 16 + 15, CONFIG.TILE, 2);
  } else if (def.detail === 'water') {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    const w = Math.sin((tx + ty) * 1.5) * 4;
    ctx.fillRect(dx + 8, dy + 12 + w, 14, 2);
  } else if (def.detail === 'door') {
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(dx + 6, dy + 6, CONFIG.TILE - 12, CONFIG.TILE - 12);
    ctx.fillStyle = '#ffd966';
    ctx.fillRect(dx + CONFIG.TILE - 16, dy + CONFIG.TILE / 2, 3, 3);
  }
}

// ============================================================
// GAME
// ============================================================
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.elMoney   = document.getElementById('hud-money');
    this.elTime    = document.getElementById('hud-time');
    this.elDay     = document.getElementById('hud-day');
    this.elStamina = document.getElementById('hud-stamina');
    this.elHint    = document.getElementById('hint');
    this.elInv     = document.getElementById('inventory');
    this.elInvList = document.getElementById('inventory-list');
    this.elToast   = document.getElementById('toast');

    this.input = new InputManager();
    this.time = new TimeSystem(6, 0);
    this.player = new Player(480, 480);
    this.camera = new Camera(CONFIG.VIEW_W, CONFIG.VIEW_H);

    this.karma = new KarmaSystem();
    this.faction = new FactionSystem(this.karma);
    this.quests = new QuestSystem(this.karma);
    this.inventory = new Inventory({ onAdd: (it, q) => this.quests.onItemGained(it.id, q) });
    this.save = new SaveSystem(this);
    this.score = new ScoreSystem(this);
    this.leaderboard = new LeaderboardSystem(this);
    this.party = new PartySystem(this);
    this.combat = new CombatSystem(this);
    this.flags = {};

    this.mapManager = new MapManager();
    this.mapManager.register('village', new TileMap(MAP_VILLAGE), 'jawa');
    for (const [id, mapId] of [['sumatera','sumatera'],['kalimantan','kalimantan'],['sulawesi','sulawesi'],['bali','bali'],['papua','papua'],['asing','asing']]) {
      if (MAP_REGISTRY[mapId]) this.mapManager.register(mapId, new TileMap(MAP_REGISTRY[mapId]), id);
    }

    this.map = this.mapManager.getMap('village');
    this.travel = new TravelSystem(this);
    this.portal = new PortalSystem(this);
    this.housing = new HousingSystem(this);
    this.family = new FamilySystem(this);

    this.npcs = NPC_DATA.map(d => new KarmaGatedNPC(d));

    // Register interior templates
    for (const [id, tpl] of Object.entries(INTERIOR_REGISTRY)) {
      this.mapManager.register(id, new TileMap(tpl.rows), 'jawa', { type:'interior', template:tpl });
      this.portal.register(id, tpl.portals || []);
    }
    this.portal.register('village', [
      { from:{x:5,y:4},  to:'toko_sari',  spawn:{x:432,y:336} },
      { from:{x:24,y:4}, to:'balai_desa', spawn:{x:432,y:384} },
    ]);

    this.dialog = new DialogSystem({
      dialog: document.getElementById('dialog'),
      name:   document.getElementById('dialog-name'),
      text:   document.getElementById('dialog-text'),
      choices:document.getElementById('dialog-choices'),
      hint:   document.getElementById('dialog-hint'),
    });

    this.elQuestLog = document.getElementById('questlog');
    this.elQuestBody = document.getElementById('questlog-body');
    this.elKarmaPanel = document.getElementById('karmapanel');
    this.elKarmaPillars = document.getElementById('karma-pillars');
    this.elKarmaTitle = document.getElementById('karma-title-text');
    this.elKarmaTitleIcon = document.getElementById('karma-title-icon');
    this.elKarmaHistory = document.getElementById('karma-history');
    this.elKarmaToast = document.getElementById('karma-toast');
    this.elHudKarma = document.getElementById('hud-karma-title');

    this.elFactionPanel = document.getElementById('factionpanel');
    this.elFactionList = document.getElementById('faction-list');
    this.elFactionDominant = document.getElementById('faction-dominant');
    this.elFactionMeta = document.getElementById('faction-meta');
    this.elFactionToast = document.getElementById('faction-toast');

    this.elNarrToast = document.getElementById('narrative-toast');
    this.elNarrText = document.getElementById('narrative-text');
    this.elFadeOverlay = document.getElementById('fade-overlay');

    this.elLbPanel = document.getElementById('lb-panel');
    this.elLbToast = document.getElementById('lb-toast');
    this.elLbToastContent = document.getElementById('lb-toast-content');

    this.elTravelMenu = document.getElementById('travelmenu');
    this.elTravelCurrent = document.getElementById('travel-current-region');
    this.elTravelDest = document.getElementById('travel-destinations');
    this.elTravelModes = document.getElementById('travel-modes');
    this.elTravelConfirm = document.getElementById('travel-confirm');
    this.elTravelHint = document.getElementById('travel-hint');
    this.elTravelHintText = document.getElementById('travel-hint-text');

    this.elSaveLoad = document.getElementById('saveload');
    this.elSlots = document.getElementById('slots');

    this.elMpPanel = document.getElementById('mp-panel');
    this.elHousingPanel = document.getElementById('housingpanel');
    this.elStoragePanel = document.getElementById('storagepanel');

    // Panel states
    this.questLogOpen = false; this.karmaOpen = false; this.factionPanelOpen = false;
    this.travelMenuOpen = false; this.savePanelOpen = false; this.mpPanelOpen = false;
    this.housingPanelOpen = false; this.storageOpen = false; this.inventoryOpen = false;
    this.lbPanelOpen = false; this.partyPanelOpen = false;
    this.selectedDest = null; this.selectedMode = 'ship';

    this.nightCanvas = document.createElement('canvas');
    this.nightCanvas.width = CONFIG.VIEW_W; this.nightCanvas.height = CONFIG.VIEW_H;
    this.nightCtx = this.nightCanvas.getContext('2d');

    this.net = null;
    this._lastDay = this.time.day;
    this._lastFamilyDay = this.time.day;
    this._encounterTimer = 0;
    this._lastAutoSubmit = 0;

    // Setup callbacks
    this.quests.onQuestStart = (q) => this.showToast(`📜 Misi Baru: ${q.def.title}`);
    this.quests.onQuestComplete = (q) => this._onQuestComplete(q);
    this.faction.onTierChange = (fid, o, n) => this._onFactionTierChange(fid, o, n);
    this.faction.onPerkUnlocked = (fid, t, p) => this._onFactionPerk(fid, t, p);
    this.faction.onReputationChange = (fid, d, s) => this._showFactionToast({ [fid]: d });

    this.quests.init(QUEST_DB);
    this._registerMarriageCandidates();
    this._refreshNPCVisibility();
    this._initMultiplayer();
    this._setupPanelsHandlers();

    this.lastTime = 0;
    this.toastTimer = null;
  }

  async _initMultiplayer() {
    this.net = new NetManager(this);
    this.net.onStatus = (s, m) => this._updateMpStatus(s, m);
    this.net.onChat = (uid, name, text) => this._mpAppendChat(name, text, false);
    const ok = await this.net.init();
    if (ok) this.leaderboard.initFromNet();
  }

  _registerMarriageCandidates() {
    for (const [id, c] of Object.entries(MARRIAGE_CANDIDATES)) {
      if (this.npcs.find(n => n.id === id)) continue;
      const npc = new KarmaGatedNPC({
        id: c.id, name: c.name, faction: c.faction, region: c.region, mapId: c.mapId,
        x: c.x, y: c.y, dir: c.dir, palette: c.palette, role: 'candidate',
        dialog: [c.bio, `Aku ${c.name} dari ${FACTIONS[c.faction].name}.`],
        reactions: [],
      });
      this.npcs.push(npc);
    }
  }

  async _setupPanelsHandlers() {
    // Travel menu
    document.getElementById('mp-create-btn')?.addEventListener('click', async () => {
      const code = await this.net.createRoom();
      if (code) this._onRoomJoined(code);
    });
    document.getElementById('mp-join-btn')?.addEventListener('click', async () => {
      const code = document.getElementById('mp-room-input').value.toUpperCase().trim();
      if (await this.net.joinRoom(code)) this._onRoomJoined(code);
    });
    document.getElementById('mp-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(this.net.roomId);
      this.showToast('📋 Kode dicopy!');
    });
    document.getElementById('mp-leave-btn')?.addEventListener('click', async () => {
      await this.net.leaveRoom();
      document.getElementById('mp-connected').classList.add('hidden');
      document.getElementById('mp-disconnected').classList.remove('hidden');
    });
    document.getElementById('mp-chat-send')?.addEventListener('click', () => {
      const inp = document.getElementById('mp-chat-input');
      if (inp.value) { this.net.sendChat(inp.value); this._mpAppendChat(this.player.name, inp.value, true); inp.value = ''; }
    });
    document.getElementById('mp-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('mp-chat-send').click(); }
      e.stopPropagation();
    });
  }

  _onRoomJoined(code) {
    document.getElementById('mp-disconnected').classList.add('hidden');
    document.getElementById('mp-connected').classList.remove('hidden');
    document.getElementById('mp-room-code').textContent = code;
    this._mpAppendChat('', `✅ Room ${code}`, false);
  }

  fadeOut(ms = 500) {
    return new Promise(r => {
      this.elFadeOverlay.style.transitionDuration = `${ms}ms`;
      this.elFadeOverlay.classList.add('active');
      setTimeout(r, ms);
    });
  }
  fadeIn(ms = 500) {
    return new Promise(r => {
      this.elFadeOverlay.style.transitionDuration = `${ms}ms`;
      this.elFadeOverlay.classList.remove('active');
      setTimeout(r, ms);
    });
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
    this.showToast('Selamat datang di Desa Bhinneka!');
  }

  loop(ts) {
    const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.save.update(dt);

    if (this.travel.active) { this.travel.update(dt, this); if (!this.dialog.active) return; }
    if (this.combat.active) { this.combat.handleInput(this.input); this.combat.update(dt); return; }
    if (this.dialog.active) {
      if (this.input.wasPressed('e',' ','enter')) this.dialog.advance();
      return;
    }
    if (!this.mapManager.transitionActive) this.portal.update(dt);

    // Toggle panels
    if (this.input.wasPressed('q')) this.toggleQuestLog();
    if (this.input.wasPressed('k')) this.toggleKarmaPanel();
    if (this.input.wasPressed('f') && !this.input.isDown('f5','f9')) this.toggleFactionPanel();
    if (this.input.wasPressed('t')) this.toggleTravelMenu();
    if (this.input.wasPressed('i')) this.toggleInventory();
    if (this.input.wasPressed('f8')) this.toggleSavePanel();
    if (this.input.wasPressed('m')) this.toggleMpPanel();
    if (this.input.wasPressed('h')) this.toggleHousingPanel();
    if (this.input.wasPressed('l')) this.toggleFamilyPanel();
    if (this.input.wasPressed('b')) this.toggleLeaderboard();
    if (this.input.wasPressed('p')) this.togglePartyPanel();

    if (this.input.wasPressed('f5')) { if (this.save.save('auto')) this.showToast('💾 Quick Save'); }
    if (this.input.wasPressed('f9')) { if (this.save.load('auto')) this.showToast('📂 Quick Load'); }

    if (this._anyPanelOpen()) {
      if (this.input.wasPressed('escape')) this.closeAllPanels();
      return;
    }

    // Time
    this.time.update(dt);

    // Player
    const cm = this.mapManager.getMap();
    this.player.update(dt, this.input, cm);
    for (const n of this.npcs) n.update(dt);

    // Interactables (interior)
    this.nearbyInteractable = null;
    if (this.mapManager.isInterior()) this._updateInteractables();

    // NPC interaction
    const nearby = this.getNearbyNPC();
    const travelNode = this.getNearbyTravelNode();
    if (travelNode) {
      this.elTravelHint.classList.remove('hidden');
      this.elTravelHintText.textContent = travelNode.type === 'harbor' ? 'berlayar' : 'bepergian';
      if (this.input.wasPressed('e')) this.toggleTravelMenu();
    } else this.elTravelHint.classList.add('hidden');

    if (nearby && !this.nearbyInteractable) {
      this.elHint.classList.remove('hidden');
      this.elHint.innerHTML = `Tekan <b>E</b> untuk bicara <b>${nearby.name}</b>`;
      if (this.input.wasPressed('e')) this.startDialog(nearby);
    } else if (!this.nearbyInteractable) this.elHint.classList.add('hidden');

    // Stamina
    this.player.stamina = Math.max(0, this.player.stamina - dt * 0.15);

    // Camera (outdoor only)
    if (!this.mapManager.isInterior()) this.camera.follow(this.player, cm);

    // HUD
    this.elMoney.textContent = this.player.money;
    this.elTime.textContent = this.time.string;
    this.elDay.textContent = `Hari ${this.time.day}`;
    this.elStamina.textContent = Math.floor(this.player.stamina);

    // Day change → autosave + family
    if (this.time.day !== this._lastDay) {
      this._lastDay = this.time.day;
      this.save.autosave();
      this._checkNPCUnlocks();
      this.family.updateDaily(this.time.day);
      this._lastFamilyDay = this.time.day;
    }

    // Random family events
    if (!this._nextFamEvent || this._nextFamEvent <= 0) {
      const ev = this.family.checkRandomEvent();
      if (ev) this.family.triggerEvent(ev);
      this._nextFamEvent = 60 + Math.random() * 60;
    } else this._nextFamEvent -= dt;

    // Random encounter
    if (this.player.moving && !this.mapManager.isInterior() && !this.travel.active) {
      this._encounterTimer += dt;
      if (this._encounterTimer > 2.0) {
        this._encounterTimer = 0;
        const zone = ENCOUNTER_ZONES[this.mapManager.currentRegion];
        if (zone && Math.random() < zone.rate) this._triggerRandomEncounter(zone);
      }
    }

    // Auto-submit score
    if (this.leaderboard.connected && performance.now() - this._lastAutoSubmit > 120000) {
      this._lastAutoSubmit = performance.now();
      this.leaderboard.submitScore();
    }

    // Net
    if (this.net) { this.net.update(dt); this.net.broadcastPosition(); }

    this._refreshKarmaUI();
  }

  _anyPanelOpen() {
    return this.questLogOpen || this.karmaOpen || this.factionPanelOpen || this.travelMenuOpen ||
      this.savePanelOpen || this.mpPanelOpen || this.housingPanelOpen || this.storageOpen ||
      this.inventoryOpen || this.lbPanelOpen || this.partyPanelOpen;
  }

  closeAllPanels() {
    this.questLogOpen = false; this.elQuestLog.classList.add('hidden');
    this.karmaOpen = false; this.elKarmaPanel.classList.add('hidden');
    this.factionPanelOpen = false; this.elFactionPanel.classList.add('hidden');
    this.travelMenuOpen = false; this.elTravelMenu.classList.add('hidden');
    this.savePanelOpen = false; this.elSaveLoad.classList.add('hidden');
    this.mpPanelOpen = false; this.elMpPanel.classList.add('hidden');
    this.housingPanelOpen = false; this.elHousingPanel.classList.add('hidden');
    this.storageOpen = false; this.elStoragePanel.classList.add('hidden');
    this.inventoryOpen = false; this.elInv.classList.add('hidden');
    this.lbPanelOpen = false; this.elLbPanel.classList.add('hidden');
    this.partyPanelOpen = false; document.getElementById('partypanel').classList.add('hidden');
  }

  getNearbyNPC() {
    let best = null, bd = CONFIG.INTERACT_RANGE;
    const curMap = this.mapManager.current;
    const curRegion = this.mapManager.currentRegion;
    for (const n of this.npcs) {
      if (n.hidden) continue;
      if (n.mapId) { if (n.mapId !== curMap) continue; }
      else if (n.region !== curRegion) continue;
      const d = Math.hypot(n.x - this.player.x, n.y - this.player.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  getNearbyTravelNode() {
    const nodes = TRAVEL_NODES[this.mapManager.currentRegion] || [];
    for (const n of nodes) {
      const d = Math.hypot(n.x - this.player.x, n.y - this.player.y);
      if (d < CONFIG.INTERACT_RANGE) return n;
    }
    return null;
  }

  _updateInteractables() {
    const tpl = this.mapManager.getTemplate();
    if (!tpl?.interactables) return;
    let best = null, bd = CONFIG.INTERACT_RANGE;
    for (const inter of tpl.interactables) {
      const d = Math.hypot(inter.x - this.player.x, inter.y - this.player.y);
      if (d < bd) { bd = d; best = inter; }
    }
    if (best) {
      this.nearbyInteractable = best;
      this.elHint.classList.remove('hidden');
      this.elHint.innerHTML = `Tekan <b>E</b> untuk <b>${best.label}</b> ${best.icon}`;
      if (this.input.wasPressed('e')) this._triggerInteractable(best);
    }
  }

  _triggerInteractable(inter) {
    if (inter.type === 'sleep') this.housing.sleep();
    else if (inter.type === 'storage') this.openStoragePanel();
    else if (inter.type === 'mirror') this.dialog.start('Cermin', ['Kau melihat bayanganmu.', 'Pakaian rapi mencerminkan jiwa yang rapi.']);
    else if (inter.type === 'trophy') {
      if (this.housing.trophies.length === 0) this.dialog.start('Rak Trofi', ['Masih kosong.']);
      else this.dialog.start('Rak Trofi', ['Pencapaianmu:', ...this.housing.trophies.slice(0, 5).map(t => `${t.icon} ${t.name}`)]);
    } else if (inter.type === 'musyawarah') {
      const q = this.quests.quests['q_musyawarah_desa'];
      if (q && q.status === 'active') this.quests.onLocationVisited('balai_desa');
      this.dialog.start('Balai Desa', ['Musyawarah desa.', 'Sila ke-4: Kerakyatan yang dipimpin oleh hikmat kebijaksanaan.']);
    } else if (inter.type === 'shop') this.showToast('🛒 Toko segera hadir!');
    else if (inter.type === 'craft') this.showToast('🔨 Crafting segera hadir!');
  }

  _triggerRandomEncounter(zone) {
    const count = 1 + Math.floor(Math.random() * 3);
    const ids = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.random() * 100;
      let cum = 0, picked = null;
      for (const e of zone.enemies) { cum += e.weight; if (roll < cum) { picked = e.id; break; } }
      if (picked) ids.push(picked);
    }
    this.combat.startEncounter(ids);
  }

  startDialog(npc) {
    this.quests.onNPCTalk(npc.id);
    npc.met = true;

    if (npc.isSpouse) {
      this.dialog.start(npc.name, this.family.getSpouseDialog(), {
        onChoice: (ch) => {
          if (ch.action) {
            const [cat] = ch.action.split(':');
            if (cat === 'family') this.family.handleAction(ch.action);
          }
        },
      });
      return;
    }
    if (npc.isChild) {
      this.dialog.start(npc.name, this.family.getChildDialog(npc.childRef), {
        onChoice: (ch) => { if (ch.action) this.family.handleAction(ch.action, npc.childRef); },
      });
      return;
    }

    // Kandidat pasangan
    if (npc.role === 'candidate') {
      const check = this.family.canPropose(npc.id);
      const nodes = [
        MARRIAGE_CANDIDATES[npc.id].bio,
        check.ok
          ? { text: `Lamar ${npc.name}?`, choices: [
              { text:'💐 Lamar', action:`propose:${npc.id}`, next:-1 },
              { text:'❌ Nanti', next:-1 },
            ]}
          : `Kau belum siap melamarku.`,
      ];
      this.dialog.start(npc.name, nodes, {
        onChoice: (ch) => {
          if (ch.action?.startsWith('propose:')) {
            const cid = ch.action.split(':')[1];
            this.family.startCourtship(cid);
          }
        },
      });
      return;
    }

    const res = npc.resolveReaction(this.karma, this.faction);
    if (res.refuse) { this.dialog.start(npc.name, res.dialog); return; }

    const handoff = this.quests.getAvailable().find(q => q.def.giver === npc.id);
    const nodes = handoff
      ? [{ text:`"${handoff.def.title}"\n${handoff.def.desc}\n\nTerima?`, choices:[
          { text:'✅ Terima', action:`accept:${handoff.def.id}`, next:-1 },
          { text:'❌ Nanti', next:-1 },
        ]}]
      : res.dialog;
    const isGift = !npc.giftGiven && res.gift;

    this.dialog.start(npc.name, nodes, {
      onChoice: (ch) => {
        if (ch.karma) {
          const ap = this.karma.apply(ch.karma, `Bicara: ${npc.name}`);
          this._showKarmaToast(ap);
        }
        if (ch.faction) for (const [fid, d] of Object.entries(ch.faction)) this.faction.apply(fid, d, `Pilihan`);
        if (ch.action) {
          if (ch.action.startsWith('accept:')) this.quests.start(ch.action.split(':')[1]);
          else this.quests.onChoiceMade(ch.action);
        }
        this._checkNPCUnlocks();
        this._refreshKarmaUI();
      },
      onComplete: () => {
        if (isGift) {
          this.inventory.add(res.gift);
          npc.giftGiven = true;
          this.showToast(`+ ${res.gift.icon} ${res.gift.name}`);
        }
      },
    });
  }

  _onQuestComplete(q) {
    const r = q.def.rewards || {};
    if (r.money) { this.player.money += r.money; this.showToast(`+ ${r.money} 🪙`); }
    if (r.items) r.items.forEach(it => this.inventory.add(it));
    if (r.karma) {
      const ap = this.karma.apply(r.karma, `Quest: ${q.def.title}`);
      setTimeout(() => this._showKarmaToast(ap), 800);
    }
    if (r.faction) {
      setTimeout(() => {
        for (const [fid, d] of Object.entries(r.faction)) this.faction.apply(fid, d, `Quest: ${q.def.title}`);
        this._checkNPCUnlocks();
      }, 600);
    }
    this.score.onQuestComplete(q);
    if (r.onCompleteAction) {
      if (r.onCompleteAction.startsWith('family:')) {
        const fn = r.onCompleteAction.split(':')[1];
        if (this.family[fn]) this.family[fn]();
      }
    }
    if (q.def.onComplete?.startsWith('unlockQuest:')) {
      const nq = q.def.onComplete.split(':')[1];
      setTimeout(() => this.quests.start(nq), 1500);
    }
  }

  _refreshNPCVisibility() {
    const curMap = this.mapManager.current;
    const curRegion = this.mapManager.currentRegion;
    for (const n of this.npcs) {
      if (n.mapId) { n.hidden = n.mapId !== curMap; continue; }
      if (n.region !== curRegion) { n.hidden = true; continue; }
      n.hidden = !n.isVisible(this.karma, this.faction);
    }
  }

  _checkNPCUnlocks() {
    for (const npc of this.npcs) {
      const wasHidden = npc.hidden;
      const nowHidden = (() => {
        if (npc.mapId) return npc.mapId !== this.mapManager.current;
        if (npc.region !== this.mapManager.currentRegion) return true;
        return !npc.isVisible(this.karma, this.faction);
      })();
      npc.hidden = nowHidden;
      if (wasHidden && !nowHidden && !npc.isSpouse && !npc.isChild) {
        this._showNarrativeToast(`✨ ${npc.name} muncul di dunia!`);
      }
    }
  }

  _registerPlayerHouseInterior(tierId) {
    const tpl = INTERIOR_TEMPLATES[tierId];
    if (!tpl) return;
    this.mapManager.register(tierId, new TileMap(tpl.rows), 'jawa', { type:'interior', template:tpl });
    this.portal.register(tierId, tpl.portals || []);
  }

  _refreshPlayerHousePortal() {
    const list = this.portal.portals['village'] || [];
    const filtered = list.filter(p => p.tag !== 'player_house');
    if (this.housing.ownedTier) {
      filtered.push({ tag:'player_house', from:{ x:5, y:5 }, to:this.housing.ownedTier, spawn:{ x:336, y:432 } });
    }
    this.portal.register('village', filtered);
  }

  // ============================================================
  // UI METHODS
  // ============================================================
  showToast(text) {
    this.elToast.textContent = text;
    this.elToast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.elToast.classList.remove('show'), 2200);
  }

  _showNarrativeToast(text) {
    this.elNarrText.textContent = text;
    this.elNarrToast.classList.remove('hidden');
    this.elNarrToast.classList.add('show');
    clearTimeout(this._narrTimer);
    this._narrTimer = setTimeout(() => {
      this.elNarrToast.classList.remove('show');
      setTimeout(() => this.elNarrToast.classList.add('hidden'), 500);
    }, 3200);
  }

  _showKarmaToast(applied) {
    if (!applied || !Object.keys(applied).length) return;
    const chips = Object.entries(applied)
      .filter(([_, v]) => v !== 0)
      .map(([k, v]) => {
        const icon = KARMA_PILLARS[k].icon;
        const cls = v > 0 ? 'up' : 'down';
        const sign = v > 0 ? '+' : '';
        return `<span class="chip ${cls}">${icon} ${sign}${Math.round(v)}</span>`;
      }).join('');
    this.elKarmaToast.innerHTML = chips;
    this.elKarmaToast.classList.add('show');
    clearTimeout(this._karmaToastTimer);
    this._karmaToastTimer = setTimeout(() => this.elKarmaToast.classList.remove('show'), 2200);
  }

  _showFactionToast(deltas) {
    const chips = Object.entries(deltas)
      .filter(([_, v]) => Math.abs(v) >= 0.5)
      .map(([fid, v]) => {
        const f = FACTIONS[fid];
        const cls = v > 0 ? 'up' : 'down';
        const sign = v > 0 ? '+' : '';
        return `<span class="fchip ${cls}">${f.icon} ${f.name} ${sign}${Math.round(v)}</span>`;
      }).join('');
    if (!chips) return;
    this.elFactionToast.innerHTML = chips;
    this.elFactionToast.classList.add('show');
    clearTimeout(this._factionToastTimer);
    this._factionToastTimer = setTimeout(() => this.elFactionToast.classList.remove('show'), 2600);
  }

  _showLbToast(badge) {
    this.elLbToastContent.innerHTML = `
      <span class="lb-toast-icon">${badge.icon}</span>
      <div class="lb-toast-title">Pencapaian</div>
      <div class="lb-toast-name">${badge.name}</div>
    `;
    this.elLbToast.classList.remove('hidden');
    this.elLbToast.classList.add('show');
    setTimeout(() => {
      this.elLbToast.classList.remove('show');
      setTimeout(() => this.elLbToast.classList.add('hidden'), 500);
    }, 3200);
  }

  _onFactionTierChange(fid, oT, nT) {
    const f = FACTIONS[fid];
    const tier = this.faction.getTier(fid);
    this._showNarrativeToast(`${f.icon} Reputasi dengan ${f.name} berubah!\nStatus: ${tier.icon} ${tier.label.toUpperCase()}`);
  }
  _onFactionPerk(fid, tierKey, perk) {
    const f = FACTIONS[fid];
    setTimeout(() => this._showNarrativeToast(`${f.icon} ${f.name}: Bonus baru!\n${perk.item ? `Item: ${perk.item}` : ''}`), 800);
  }

  _refreshKarmaUI() {
    const t = this.karma.title;
    this.elHudKarma.textContent = t.title;
    if (!this.karmaOpen) return;
    this.elKarmaTitleIcon.textContent = t.icon;
    this.elKarmaTitle.textContent = t.title;
    this.elKarmaTitle.style.color = t.color;
    this.elKarmaPillars.innerHTML = Object.entries(this.karma.pillars).map(([k, v]) => {
      const p = KARMA_PILLARS[k];
      return `<div class="karma-row">
        <div class="karma-row-header"><span class="karma-name">${p.icon} Sila ${p.sila} — ${p.name}</span><span class="karma-val">${Math.round(v)}</span></div>
        <div class="karma-bar"><div class="karma-bar-fill" style="width:${v}%; background:${p.color}"></div></div>
      </div>`;
    }).join('');
    this.elKarmaHistory.innerHTML = this.karma.history.length === 0
      ? '<li style="color:#667;">Belum ada pilihan.</li>'
      : this.karma.history.map(h => {
        const chips = Object.entries(h.delta).map(([k, v]) => {
          const icon = KARMA_PILLARS[k].icon;
          const cls = v > 0 ? 'up' : 'down';
          const sign = v > 0 ? '+' : '';
          return `<span class="${cls}">${icon}${sign}${Math.round(v)}</span>`;
        }).join(' ');
        return `<li><span>${h.source}</span><span class="delta-list">${chips}</span></li>`;
      }).join('');
  }

  toggleQuestLog() {
    this.questLogOpen = !this.questLogOpen;
    if (this.questLogOpen) {
      this.elQuestLog.classList.remove('hidden');
      this._renderQuestLog('active');
      this.elQuestLog.querySelectorAll('.tab').forEach(btn => {
        btn.onclick = () => {
          this.elQuestLog.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._renderQuestLog(btn.dataset.tab);
        };
      });
    } else this.elQuestLog.classList.add('hidden');
  }
  _renderQuestLog(tab) {
    const list = tab === 'active' ? this.quests.getActive() : this.quests.getCompleted();
    if (!list.length) { this.elQuestBody.innerHTML = `<div class="quest-empty">Belum ada misi.</div>`; return; }
    this.elQuestBody.innerHTML = list.map(q => {
      const badge = q.def.type === 'main' ? 'MAIN' : 'SIDE';
      const objs = q.objectives.map(o => `<div class="quest-obj ${o.done ? 'done' : ''}">${o.desc}${o.count > 1 ? ` <span class="progress">(${o.progress}/${o.count})</span>` : ''}</div>`).join('');
      return `<div class="quest-card ${q.def.type}"><div class="quest-title"><span>${q.def.title}</span><span class="quest-badge ${q.def.type}">${badge}</span></div><div class="quest-desc">${q.def.desc}</div>${objs}</div>`;
    }).join('');
  }

  toggleKarmaPanel() {
    this.karmaOpen = !this.karmaOpen;
    if (this.karmaOpen) { this.elKarmaPanel.classList.remove('hidden'); this._refreshKarmaUI(); }
    else this.elKarmaPanel.classList.add('hidden');
  }

  toggleFactionPanel() {
    this.factionPanelOpen = !this.factionPanelOpen;
    if (this.factionPanelOpen) { this.elFactionPanel.classList.remove('hidden'); this._renderFactionPanel(); }
    else this.elFactionPanel.classList.add('hidden');
  }
  _renderFactionPanel() {
    const dom = this.faction.dominantFaction;
    const d = FACTIONS[dom];
    const dt = this.faction.getTier(dom);
    this.elFactionDominant.innerHTML = `<span style="font-size:18px;">${d.icon}</span> Terdekat: <b style="color:${d.color}">${d.name}</b> (${dt.icon} ${dt.label})`;
    this.elFactionMeta.innerHTML = `Sekutu: <b>${this.faction.alliedFactions.length}</b> · Banned: <b>${Object.keys(FACTIONS).filter(id => this.faction.isBannedFrom(id)).length}</b>`;
    this.elFactionList.innerHTML = Object.keys(FACTIONS).map(fid => {
      const f = FACTIONS[fid];
      const v = this.faction.get(fid);
      const tier = this.faction.getTier(fid);
      const pct = (v + 100) / 2;
      return `<div class="faction-row ${tier.key}">
        <div class="faction-icon" style="color:${f.color};">${f.icon}</div>
        <div class="faction-info">
          <div class="faction-name"><span>${f.name}</span><span class="tier-label" style="color:${tier.color};">${tier.icon} ${tier.label}</span></div>
          <div class="faction-rep-bar"><div class="faction-rep-marker" style="left:${pct}%;"></div><div class="faction-rep-value">${Math.round(v)}</div></div>
        </div>
      </div>`;
    }).join('');
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) { this.elInv.classList.remove('hidden'); this.renderInventory(); }
    else this.elInv.classList.add('hidden');
  }
  renderInventory() {
    if (!this.inventory.items.length) { this.elInvList.innerHTML = '<li style="color:#667;">(Kosong)</li>'; return; }
    this.elInvList.innerHTML = this.inventory.items.map(i => `<li><span>${i.icon} ${i.name}</span><span class="qty">x${i.qty}</span></li>`).join('');
  }

  toggleHousingPanel() {
    this.housingPanelOpen = !this.housingPanelOpen;
    if (this.housingPanelOpen) { this.elHousingPanel.classList.remove('hidden'); this._renderHousingPanel(); }
    else this.elHousingPanel.classList.add('hidden');
  }
  _renderHousingPanel() {
    const owned = this.housing.ownedTier;
    const ot = owned ? HOUSING_TIERS.find(t => t.id === owned) : null;
    document.getElementById('housing-header').innerHTML = ot
      ? `${ot.icon} <b>${ot.name}</b><br><span style="font-size:9px;color:#88d060;">Storage: ${this.housing.storage.length}/${ot.storageSlots}</span>`
      : `🏚️ Belum punya rumah. Beli di bawah!`;
    const cards = HOUSING_TIERS.map(t => {
      const isOwned = owned === t.id;
      const check = this.housing.canBuy(t.id);
      const isLocked = !isOwned && !check.ok;
      return `<div class="tier-card ${isOwned ? 'owned' : ''} ${isLocked ? 'locked' : ''}" data-tier="${t.id}">
        <span class="tier-icon">${t.icon}</span>
        <div class="tier-name">${t.name}</div>
        <div class="tier-price">${isOwned ? '✓ Dimiliki' : t.price + ' 🪙'}</div>
        <div class="tier-desc">${t.desc}</div>
      </div>`;
    }).join('');
    document.getElementById('housing-content').innerHTML = `<div class="tier-grid">${cards}</div>`;
    document.querySelectorAll('#housing-content .tier-card:not(.owned):not(.locked)').forEach(el => {
      el.onclick = () => { if (this.housing.buy(el.dataset.tier)) this._renderHousingPanel(); };
    });
  }

  openStoragePanel() {
    this.storageOpen = true;
    this.elStoragePanel.classList.remove('hidden');
    this._renderStorageUI();
  }
  _renderStorageUI() {
    document.getElementById('inv-count').textContent = this.inventory.items.length;
    document.getElementById('stg-count').textContent = this.housing.storage.length;
    document.getElementById('stg-cap').textContent = this.housing.storageCapacity;
    document.getElementById('storage-inv').innerHTML = this.inventory.items.length === 0
      ? '<div class="storage-item empty">Kosong</div>'
      : this.inventory.items.map((it, i) => `<div class="storage-item" data-idx="${i}" data-src="inv"><span>${it.icon} ${it.name}</span><span class="qty">x${it.qty}</span></div>`).join('');
    document.getElementById('storage-stg').innerHTML = this.housing.storage.length === 0
      ? '<div class="storage-item empty">Lemari kosong</div>'
      : this.housing.storage.map((it, i) => `<div class="storage-item" data-idx="${i}" data-src="stg"><span>${it.icon} ${it.name}</span><span class="qty">x${it.qty}</span></div>`).join('');
    document.querySelectorAll('#storage-inv .storage-item:not(.empty)').forEach(el => {
      el.onclick = (e) => { this.housing.deposit(parseInt(el.dataset.idx), e.shiftKey ? 10 : 1); this._renderStorageUI(); };
    });
    document.querySelectorAll('#storage-stg .storage-item:not(.empty)').forEach(el => {
      el.onclick = (e) => { this.housing.withdraw(parseInt(el.dataset.idx), e.shiftKey ? 10 : 1); this._renderStorageUI(); };
    });
  }

  toggleFamilyPanel() {
    const p = document.getElementById('familypanel');
    if (p.classList.contains('hidden')) { p.classList.remove('hidden'); this._renderFamilyPanel(); }
    else p.classList.add('hidden');
  }
  _renderFamilyPanel() {
    const f = this.family;
    const h = document.getElementById('family-header');
    if (f.status === 'single') h.innerHTML = `<div class="family-avatar">💔</div><div><b>Belum Menikah</b></div>`;
    else if (f.status === 'courting') h.innerHTML = `<div class="family-avatar">${f.spouse.icon}</div><div><b>Pendekatan dengan ${f.spouse.name}</b></div>`;
    else if (f.status === 'married') h.innerHTML = `<div class="family-avatar">${f.spouse.icon}</div><div><b>Keluarga dengan ${f.spouse.name}</b><div class="family-meta">${f.children.length} anak · ${f.spouse.trait}</div></div>`;
    const c = document.getElementById('family-content');
    if (f.status !== 'married') {
      c.innerHTML = `<div class="housing-section-title">💕 Kandidat</div><div class="candidates-grid">${Object.entries(MARRIAGE_CANDIDATES).map(([id, ca]) => {
        const check = f.canPropose(id);
        return `<div class="candidate-card ${check.ok ? '' : 'locked'}" data-cid="${id}"><div class="candidate-avatar">${ca.icon}</div><div class="candidate-name">${ca.name}</div><div class="candidate-faction">${FACTIONS[ca.faction].icon} ${FACTIONS[ca.faction].name}</div><div class="candidate-bio">${ca.bio}</div></div>`;
      }).join('')}</div>`;
      document.querySelectorAll('.candidate-card:not(.locked)').forEach(el => {
        el.onclick = () => { if (this.family.startCourtship(el.dataset.cid)) this._renderFamilyPanel(); };
      });
    } else {
      c.innerHTML = `
        <div class="family-stat"><div class="family-stat-header"><span class="stat-name">❤️ Love</span><span class="stat-val">${Math.round(f.spouse.love)}/100</span></div><div class="family-stat-bar"><div class="family-stat-fill love" style="width:${f.spouse.love}%"></div></div></div>
        <div class="family-stat"><div class="family-stat-header"><span class="stat-name">😊 Happiness</span><span class="stat-val">${Math.round(f.spouse.happiness)}/100</span></div><div class="family-stat-bar"><div class="family-stat-fill happiness" style="width:${f.spouse.happiness}%"></div></div></div>
      `;
    }
  }

  togglePartyPanel() {
    const p = document.getElementById('partypanel');
    if (p.classList.contains('hidden')) { p.classList.remove('hidden'); this._renderPartyPanel(); }
    else p.classList.add('hidden');
  }
  _renderPartyPanel() {
    document.getElementById('party-header').innerHTML = `Party ${this.party.members.length}/${this.party.maxSize} · Formasi: ${FORMATIONS[this.party.formation].name}`;
    document.getElementById('party-formations').innerHTML = Object.values(FORMATIONS).map(f =>
      `<div class="formation-card ${f.id === this.party.formation ? 'selected' : ''}" data-form="${f.id}"><span class="f-icon">${f.icon}</span><div class="f-name">${f.name}</div></div>`
    ).join('');
    document.querySelectorAll('.formation-card').forEach(el => {
      el.onclick = () => { this.party.formation = el.dataset.form; this._renderPartyPanel(); };
    });
    document.getElementById('party-members').innerHTML = this.party.members.map(m => {
      const cls = m.isPlayer ? 'player' : m.isSpouse ? 'spouse' : m.isChild ? 'child' : 'companion';
      const hp = (m.hp / m.maxHp) * 100;
      return `<div class="party-member-card ${cls}"><div class="pm-header"><span class="pm-avatar">${m.avatar}</span><div><div class="pm-name">${m.name}</div><div class="pm-role">Lv.${m.level} · ${FACTIONS[m.faction]?.name || m.faction}</div></div></div><div class="pm-stats"><span>ATK ${m.atk}</span><span>DEF ${m.def}</span><span>SPD ${m.spd}</span></div><div class="pm-hp-bar"><div class="pm-hp-fill" style="width:${hp}%"></div></div></div>`;
    }).join('');
    document.getElementById('party-recruit').innerHTML = this.party.availableCompanions.map(c => {
      const r = this.party.recruitedCompanions.find(x => x.id === c.id);
      const ok = Math.max(...Object.values(this.karma.pillars)) >= c.karmaReq;
      return `<div class="recruit-card"><span class="recruit-avatar">🧑‍🤝‍🧑</span><div class="recruit-info"><div class="recruit-name">${c.name}</div><div class="recruit-meta">${FACTIONS[c.faction].icon} ${c.role}</div></div><button ${r || !ok ? 'disabled' : ''} data-recruit="${c.id}">${r ? '✓' : ok ? 'Rekrut' : `Karma ${c.karmaReq}+`}</button></div>`;
    }).join('');
    document.querySelectorAll('button[data-recruit]').forEach(b => {
      b.onclick = () => {
        const r = this.party.recruit(b.dataset.recruit);
        if (!r.ok) this.showToast('❌ ' + r.reason);
        else this._renderPartyPanel();
      };
    });
  }

  toggleTravelMenu() {
    this.travelMenuOpen = !this.travelMenuOpen;
    if (this.travelMenuOpen) { this.elTravelMenu.classList.remove('hidden'); this._renderTravelMenu(); }
    else this.elTravelMenu.classList.add('hidden');
  }
  _renderTravelMenu() {
    const fromId = this.mapManager.currentRegion;
    const fromR = REGIONS[fromId];
    this.elTravelCurrent.textContent = `${fromR.icon} ${fromR.name} — ${fromR.subtitle}`;
    const dests = this.travel.getAvailableDestinations(fromId);
    this.elTravelDest.innerHTML = dests.map(({ region, route }) => {
      const acc = this.travel.checkAccess(region.id, this);
      const cls = acc.ok ? '' : 'locked';
      return `<div class="dest-card ${cls}" data-region="${region.id}">
        <span class="dest-icon">${region.icon}</span>
        <div class="dest-name">${region.name}</div>
        <div class="dest-sub">${region.subtitle}</div>
        <div class="dest-cost">💰 ${route.cost.money || 0} · ⏱ ${route.cost.time || 0}m</div>
      </div>`;
    }).join('');
    document.querySelectorAll('.dest-card:not(.locked)').forEach(el => {
      el.onclick = () => {
        this.selectedDest = el.dataset.region;
        document.querySelectorAll('.dest-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this._renderTravelModes();
        this._updateTravelConfirm();
      };
    });
    this._renderTravelModes();
    this._updateTravelConfirm();
  }
  _renderTravelModes() {
    this.elTravelModes.innerHTML = ['walk','horse','ship','steamship','airplane'].map(mid => {
      const m = TRANSPORT_MODES[mid];
      const ok = this.travel.checkModeAvailable(mid, this).ok;
      return `<button class="mode-btn ${ok ? '' : 'locked'} ${this.selectedMode === mid ? 'selected' : ''}" data-mode="${mid}">
        <span class="mode-icon">${m.icon}</span><div>${m.name}</div><div class="mode-speed">×${m.speed}</div>
      </button>`;
    }).join('');
    document.querySelectorAll('.mode-btn:not(.locked)').forEach(el => {
      el.onclick = () => { this.selectedMode = el.dataset.mode; this._renderTravelModes(); this._updateTravelConfirm(); };
    });
  }
  _updateTravelConfirm() {
    const ok = !!(this.selectedDest && this.selectedMode);
    this.elTravelConfirm.disabled = !ok;
    this.elTravelConfirm.onclick = () => {
      if (!ok) return;
      if (this.travel.startTravel(this.selectedDest, this.selectedMode)) this.toggleTravelMenu();
    };
  }

  toggleSavePanel() {
    this.savePanelOpen = !this.savePanelOpen;
    if (this.savePanelOpen) { this.elSaveLoad.classList.remove('hidden'); this._renderSlots(); this._setupSaveTabs(); }
    else this.elSaveLoad.classList.add('hidden');
  }
  _setupSaveTabs() {
    this.elSaveLoad.querySelectorAll('.sl-tabs .tab').forEach(btn => {
      btn.onclick = () => {
        this.saveMode = btn.dataset.mode;
        this.elSaveLoad.querySelectorAll('.sl-tabs .tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderSlots();
      };
    });
  }
  _renderSlots() {
    const mode = this.saveMode || 'save';
    const slots = this.save.getAllSlots();
    const html = [];
    html.push(this._renderSlotCard('auto', this.save.getSlotInfo('auto'), mode, 'AUTO'));
    for (let i = 0; i < slots.length; i++) html.push(this._renderSlotCard(i + 1, slots[i], mode, i + 1));
    this.elSlots.innerHTML = html.join('');
    this.elSlots.querySelectorAll('.save-slot').forEach(el => {
      const slot = el.dataset.slot;
      el.querySelectorAll('.slot-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (btn.dataset.act === 'save') this._performSave(slot);
          if (btn.dataset.act === 'load') this._performLoad(slot);
          if (btn.dataset.act === 'delete') this._performDelete(slot);
        };
      });
    });
  }
  _renderSlotCard(slot, info, mode, label) {
    if (!info) {
      const act = mode === 'save' ? `<button class="slot-btn" data-act="save">💾 Simpan</button>` : '';
      return `<div class="save-slot empty" data-slot="${slot}"><div class="slot-num">${label}</div><div class="slot-info"><div class="slot-title">— Kosong —</div></div><div class="slot-actions">${act}</div></div>`;
    }
    const m = info.meta;
    const acts = mode === 'save'
      ? `<button class="slot-btn" data-act="save">💾 Timpa</button><button class="slot-btn danger" data-act="delete">🗑</button>`
      : `<button class="slot-btn" data-act="load">📂 Muat</button><button class="slot-btn danger" data-act="delete">🗑</button>`;
    return `<div class="save-slot" data-slot="${slot}"><div class="slot-num">${label}</div><div class="slot-info"><div class="slot-title">${m.titleIcon} ${m.title} · 🪙 ${m.money}</div><div class="slot-meta">Hari ${m.day} · ${m.time} · ${m.region || 'jawa'}<br>⏱ ${formatPlaytime(info.playtime)} · ${formatSaveDate(info.timestamp)}</div></div><div class="slot-actions">${acts}</div></div>`;
  }
  _performSave(slot) { if (this.save.save(slot)) { this.showToast('💾 Tersimpan'); this._renderSlots(); } }
  _performLoad(slot) { if (this.save.load(slot)) { this.showToast('📂 Dimuat'); this._refreshNPCVisibility(); this.closeAllPanels(); this._lastDay = this.time.day; } }
  _performDelete(slot) { if (confirm('Hapus?')) { this.save.delete(slot); this._renderSlots(); } }

  toggleMpPanel() {
    this.mpPanelOpen = !this.mpPanelOpen;
    if (this.mpPanelOpen) this.elMpPanel.classList.remove('hidden');
    else this.elMpPanel.classList.add('hidden');
  }
  _updateMpStatus(s, m) {
    const bar = document.getElementById('mp-status-bar');
    if (!bar) return;
    bar.className = s === 'connected' || s === 'online' ? 'online' : s === 'error' ? 'error' : s === 'connecting' ? 'connecting' : '';
    document.getElementById('mp-status-icon').textContent = { connecting:'⏳', ready:'⚪', connected:'🟢', online:'🟢', offline:'🔴', error:'❌' }[s] || '⚪';
    document.getElementById('mp-status-text').textContent = m;
  }
  _mpAppendChat(name, text, isMe) {
    const el = document.getElementById('mp-chat-messages');
    if (!el) return;
    const d = document.createElement('div');
    d.className = 'mp-chat-msg';
    d.innerHTML = `<span class="sender">${isMe ? '👤 Kamu' : '👥 ' + name}</span><span class="text">${text}</span>`;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  toggleLeaderboard() {
    this.lbPanelOpen = !this.lbPanelOpen;
    if (this.lbPanelOpen) { this.elLbPanel.classList.remove('hidden'); this._renderLeaderboard(); }
    else this.elLbPanel.classList.add('hidden');
  }
  async _renderLeaderboard() {
    const lb = this.leaderboard;
    const s = lb.seasonId;
    document.getElementById('lb-season-name').textContent = `Musim ${s.num}: ${s.name}`;
    document.getElementById('lb-season-days').textContent = `Hari ${this.time.day} / ${s.endDay}`;
    document.getElementById('lb-category-tabs').innerHTML = Object.values(LB_CATEGORIES).map(c =>
      `<button class="tab ${c.id === lb.currentCategory ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`
    ).join('');
    document.querySelectorAll('#lb-category-tabs .tab').forEach(b => {
      b.onclick = () => { lb.currentCategory = b.dataset.cat; this._renderLeaderboard(); };
    });
    document.querySelectorAll('#lb-scope-tabs .tab').forEach(b => {
      b.classList.toggle('active', b.dataset.scope === lb.currentScope);
      b.onclick = () => {
        lb.currentScope = b.dataset.scope;
        lb.currentFilterValue = lb.currentScope === 'region' ? this.mapManager.currentRegion :
          lb.currentScope === 'faction' ? this.faction.dominantFaction : null;
        this._renderLeaderboard();
      };
    });
    document.getElementById('lb-top-list').innerHTML = '<div class="lb-loading">Memuat...</div>';
    const [top, myRank] = await Promise.all([lb.fetchTop(lb.currentScope, 10, lb.currentFilterValue), lb.fetchMyRank(lb.currentScope, lb.currentFilterValue)]);
    if (myRank) {
      document.getElementById('lb-my-rank-num').textContent = `#${myRank.rank}`;
      document.getElementById('lb-my-score').textContent = myRank.score.toLocaleString();
      const tier = lb.getTierForRank(myRank.rank, 1000);
      document.getElementById('lb-my-tier').textContent = `${tier.icon} ${tier.name}`;
      document.getElementById('lb-my-tier').style.color = tier.color;
    } else {
      document.getElementById('lb-my-rank-num').textContent = '—';
      document.getElementById('lb-my-tier').textContent = 'Mainkan dulu';
    }
    document.getElementById('lb-my-avatar').textContent = this.player.avatar || '👤';
    document.getElementById('lb-top-list').innerHTML = top.length === 0
      ? '<div class="lb-empty">Belum ada data.</div>'
      : top.map((e, i) => {
        const rank = i + 1;
        const cls = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        return `<div class="lb-row ${cls}"><div class="lb-rank">${medal}</div><div class="lb-avatar">${e.avatar || '👤'}</div><div class="lb-name-block"><div class="lb-name">${e.name}</div><div class="lb-title">${e.title || ''}</div></div><div class="lb-score">${(e.score || 0).toLocaleString()}</div></div>`;
      }).join('');
  }

  // ============================================================
  // RENDER
  // ============================================================
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);

    if (this.combat.active) { this.combat.render(ctx); return; }

    const curMap = this.mapManager.getMap();
    const isInterior = this.mapManager.isInterior();
    let camX, camY;
    if (isInterior) {
      camX = Math.max(0, (curMap.pixelW - CONFIG.VIEW_W) / 2);
      camY = Math.max(0, (curMap.pixelH - CONFIG.VIEW_H) / 2);
      if (curMap.pixelW < CONFIG.VIEW_W) camX = -(CONFIG.VIEW_W - curMap.pixelW) / 2;
      if (curMap.pixelH < CONFIG.VIEW_H) camY = -(CONFIG.VIEW_H - curMap.pixelH) / 2;
    } else {
      camX = Math.floor(this.camera.x);
      camY = Math.floor(this.camera.y);
    }

    const t = CONFIG.TILE;
    const sTX = Math.max(0, Math.floor(camX / t));
    const sTY = Math.max(0, Math.floor(camY / t));
    const eTX = Math.ceil((camX + CONFIG.VIEW_W) / t);
    const eTY = Math.ceil((camY + CONFIG.VIEW_H) / t);
    for (let ty = sTY; ty <= eTY; ty++) {
      for (let tx = sTX; tx <= eTX; tx++) {
        const def = curMap.def(tx, ty);
        if (!def) continue;
        drawTile(ctx, def, tx * t - camX, ty * t - camY, tx, ty);
      }
    }

    // Furniture
    if (isInterior && this.housing.ownedTier === this.mapManager.current) {
      const tpl = this.mapManager.getTemplate();
      if (tpl?.furnitureSlots) {
        for (const slot of tpl.furnitureSlots) {
          const f = this.housing.furniture[slot.id];
          if (!f) continue;
          ctx.font = '24px serif';
          ctx.textAlign = 'center';
          ctx.fillText(FURNITURE_ITEMS[f.itemId]?.icon || '📦', slot.x - camX, slot.y - camY);
        }
      }
    }

    const drawables = [this.player, ...this.npcs.filter(n => !n.hidden)].sort((a, b) => a.y - b.y);
    for (const e of drawables) {
      const sx = Math.floor(e.x - camX);
      const sy = Math.floor(e.y - camY);
      if (sx < -80 || sx > CONFIG.VIEW_W + 80) continue;
      if (sy < -100 || sy > CONFIG.VIEW_H + 100) continue;
      drawCharacter(ctx, sx, sy, e);
      if (e instanceof KarmaGatedNPC && !e.isSpouse && !e.isChild) {
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const w = ctx.measureText(e.name).width;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(sx - w/2 - 4, sy - 82, w + 8, 12);
        ctx.fillStyle = '#ffd966';
        ctx.fillText(e.name, sx, sy - 73);
      }
    }

    if (this.net?.connected) this.net.render(ctx, camX, camY);

    if (!isInterior) {
      const a = this.time.nightAlpha;
      if (a > 0.01) {
        const nc = this.nightCtx;
        nc.clearRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
        nc.fillStyle = `rgba(10,15,45,${a})`;
        nc.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
        const px = this.player.x - camX, py = this.player.y - camY - 20;
        const r = 170;
        nc.globalCompositeOperation = 'destination-out';
        const grad = nc.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        nc.fillStyle = grad;
        nc.fillRect(px - r, py - r, r * 2, r * 2);
        nc.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.nightCanvas, 0, 0);
      }
    } else {
      ctx.fillStyle = 'rgba(255,200,120,0.05)';
      ctx.fillRect(0, 0, CONFIG.VIEW_W, CONFIG.VIEW_H);
    }

    // Scanlines
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#000';
    for (let y = 0; y < CONFIG.VIEW_H; y += 3) ctx.fillRect(0, y, CONFIG.VIEW_W, 1);
    ctx.restore();

    if (this.travel.active) this.travel.render(ctx);
  }
}

// ============================================================
// BOOT
// ============================================================
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  game.start();
  window.__GAME__ = game;
});