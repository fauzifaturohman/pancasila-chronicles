/* ============================================================
   TILES — Definisi tile & TileMap class
   ============================================================ */
'use strict';

const TILE_DEFS = {
  'T': { id:'tree',   solid:true,  color:'#2d5a27', detail:'tree'   },
  'W': { id:'wall',   solid:true,  color:'#8b6f47', detail:'wall'   },
  '~': { id:'water',  solid:true,  color:'#3a7ca5', detail:'water'  },
  '.': { id:'grass',  solid:false, color:'#4a7c3f', detail:null     },
  ',': { id:'grass2', solid:false, color:'#557f45', detail:null     },
  'p': { id:'path',   solid:false, color:'#b8a06a', detail:null     },
  'D': { id:'door',   solid:false, color:'#5a3a1a', detail:'door'   },
  'f': { id:'flower', solid:false, color:'#4a7c3f', detail:'flower' },
};

// 30 x 20 tile (1440 x 960 px)
const MAP_VILLAGE = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
  "T,,,WWWWW,,,,,,,,,TTTT,,,,~~~T",
  "T,,,W...W,,,,,,,,,TTTTT,,,~~~T",
  "T,,,W.D.W,,,,,,,,,TTTTT,,,~~~T",
  "T,,,W...W,,,,,,,,,,TTT,,,,~~~T",
  "T,,,WWWWW,,,,,,,,,,,,,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
  "T,,,,ppppppppppppppppppp,,,,,T",
  "T,,,,p,,,,,,,,,,,,,,,,,p,,,,,T",
  "T,,,,p,,,,,,,,,,,,,,,,,p,,,,,T",
  "T,,,,p,,,,,,,,,,,,,,,,,p,,,,,T",
  "T,,,,ppppppppppppppppppp,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
  "T,,,TTTT,,,,,,,,,TTTT,,,,,,,,T",
  "T,,,TTTT,,,,,,,,,TTTT,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
];

class TileMap {
  constructor(rows) {
    this.rows = rows;
    this.h = rows.length;
    this.w = rows[0].length;
  }
  get pixelW() { return this.w * CONFIG.TILE; }
  get pixelH() { return this.h * CONFIG.TILE; }
  def(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null;
    return TILE_DEFS[this.rows[ty][tx]] || TILE_DEFS['.'];
  }
  isSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    const d = TILE_DEFS[this.rows[ty][tx]];
    return !d || d.solid;
  }
}
