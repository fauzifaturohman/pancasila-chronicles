'use strict';

class MapManager {
  constructor() {
    this.maps = {};
    this.current = 'village';
    this.currentRegion = 'jawa';
    this.transitionActive = false;
  }
  register(id, tileMap, regionId, opts = {}) {
    this.maps[id] = { tileMap, regionId, type: opts.type || 'outdoor', template: opts.template || null };
  }
  getMap(id = this.current) { return this.maps[id]?.tileMap || null; }
  getRegion(id = this.current) { const m = this.maps[id]; return m ? REGIONS[m.regionId] : null; }
  getMapType(id = this.current) { return this.maps[id]?.type || 'outdoor'; }
  getTemplate(id = this.current) { return this.maps[id]?.template || null; }
  isInterior(id = this.current) { return this.getMapType(id) === 'interior'; }
  async switchTo(id, sx, sy, player, game) {
    if (this.transitionActive || !this.maps[id]) return false;
    this.transitionActive = true;
    const fade = this.isInterior(id) ? 250 : 500;
    await game.fadeOut(fade);
    this.current = id;
    this.currentRegion = this.maps[id].regionId;
    player.x = sx; player.y = sy; player.dir = 'down'; player.moving = false;
    game.map = this.getMap(id);
    if (game._refreshNPCVisibility) game._refreshNPCVisibility();
    await game.fadeIn(fade);
    this.transitionActive = false;
    return true;
  }
}
