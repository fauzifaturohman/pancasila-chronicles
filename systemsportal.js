'use strict';

class PortalSystem {
  constructor(game) { this.game = game; this.portals = {}; this.cooldown = 0; }
  register(mapId, portals) { this.portals[mapId] = portals || []; }
  update(dt) {
    if (this.cooldown > 0) { this.cooldown -= dt; return; }
    if (this.game.travel.active || this.game.mapManager.transitionActive) return;
    const mapId = this.game.mapManager.current;
    const list = this.portals[mapId] || [];
    const p = this.game.player;
    const tx = Math.floor(p.x / CONFIG.TILE);
    const ty = Math.floor(p.y / CONFIG.TILE);
    for (const portal of list) {
      if (portal.from.x === tx && portal.from.y === ty) { this._trigger(portal); return; }
    }
  }
  async _trigger(portal) {
    this.cooldown = 1.0;
    const g = this.game;
    await g.mapManager.switchTo(portal.to, portal.spawn.x, portal.spawn.y, g.player, g);
    g._refreshNPCVisibility();
  }
}