const CARD_COUNT = 63;
const CANVAS_W   = 7000;
const CANVAS_H   = 5000;
const CARD_W     = 220;
const CARD_H     = 300;

// Grid: 23 cols × 12 rows = 276 cells. Fill rate: 63/276 ≈ 23% (1 in ~4.4 cells).
const GRID_COLS = 23;
const GRID_ROWS = 12;
const CELL_W    = CANVAS_W / GRID_COLS; // ≈ 304px
const CELL_H    = CANVAS_H / GRID_ROWS; // ≈ 417px

const scene  = document.getElementById('scene');
const canvas = document.getElementById('canvas');

// ── Card factory ─────────────────────────────────────────────────────────────

function createCard(id) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = id;
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-front"><div class="photo-placeholder"></div></div>
      <div class="card-back"><p class="annotation">— annotation —</p></div>
    </div>`;
  return card;
}

// ── Placement (island grid) ───────────────────────────────────────────────────

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Island zones: each defines a rectangle of grid cells.
// Only cells inside islands are eligible — everything outside stays empty.
// c0/c1 = col range (inclusive), r0/r1 = row range (inclusive), count = cards to place.
// Counts sum to 63.
const ISLANDS = [
  { c0: 0,  c1: 4,  r0: 0,  r1: 3,  count: 8  }, // top-left
  { c0: 18, c1: 22, r0: 0,  r1: 4,  count: 11 }, // top-right
  { c0: 8,  c1: 13, r0: 4,  r1: 8,  count: 14 }, // center
  { c0: 0,  c1: 5,  r0: 8,  r1: 11, count: 15 }, // bottom-left
  { c0: 16, c1: 22, r0: 7,  r1: 11, count: 15 }, // bottom-right
];

function buildPositions() {
  const placed = [];

  for (const island of ISLANDS) {
    // Collect all cells in this island zone, shuffle, then take `count`.
    const cells = [];
    for (let r = island.r0; r <= island.r1; r++) {
      for (let c = island.c0; c <= island.c1; c++) {
        cells.push({ c, r });
      }
    }
    shuffle(cells);

    for (const { c, r } of cells.slice(0, island.count)) {
      // Center card within cell, then apply ±20px organic offset.
      const baseX = c * CELL_W + (CELL_W - CARD_W) / 2;
      const baseY = r * CELL_H + (CELL_H - CARD_H) / 2;
      placed.push({
        x: Math.round(baseX + rand(-20, 20)),
        y: Math.round(baseY + rand(-20, 20)),
      });
    }
  }

  return placed;
}

// ── Init cards ────────────────────────────────────────────────────────────────

const positions = buildPositions();

for (let i = 0; i < CARD_COUNT; i++) {
  const card      = createCard(i + 1);
  const { x, y } = positions[i];
  card.style.left = `${x}px`;
  card.style.top  = `${y}px`;
  canvas.appendChild(card);
}

// ── Canvas bounds (content bounding box + padding) ───────────────────────────

const PAD = 300;
let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
for (const { x, y } of positions) {
  if (x              < bMinX) bMinX = x;
  if (y              < bMinY) bMinY = y;
  if (x + CARD_W > bMaxX) bMaxX = x + CARD_W;
  if (y + CARD_H > bMaxY) bMaxY = y + CARD_H;
}
const bLeft   = bMinX - PAD;
const bTop    = bMinY - PAD;
const bRight  = bMaxX + PAD;
const bBottom = bMaxY + PAD;

// At min: content right edge at screen right. At max: content left edge at screen left.
const minTargetX = window.innerWidth  - bRight;
const maxTargetX = -bLeft;
const minTargetY = window.innerHeight - bBottom;
const maxTargetY = -bTop;

function clampTarget() {
  targetX = Math.max(minTargetX, Math.min(maxTargetX, targetX));
  targetY = Math.max(minTargetY, Math.min(maxTargetY, targetY));
}

// ── Lerp helper ───────────────────────────────────────────────────────────────

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const LERP_FACTOR     = 0.07;
const MOMENTUM_FACTOR = 12;

// ── Canvas state — initial view centered on content bounding box ──────────────

const initX = window.innerWidth  / 2 - (bLeft + bRight)  / 2;
const initY = window.innerHeight / 2 - (bTop  + bBottom) / 2;

let targetX  = initX;
let targetY  = initY;
let currentX = initX;
let currentY = initY;

// ── Always-running render loop ────────────────────────────────────────────────

function tick() {
  currentX = lerp(currentX, targetX, LERP_FACTOR);
  currentY = lerp(currentY, targetY, LERP_FACTOR);
  canvas.style.transform = `translate(${currentX}px, ${currentY}px)`;
  requestAnimationFrame(tick);
}
tick();

// ── Drag ─────────────────────────────────────────────────────────────────────

let isDragging  = false;
let startX, startY;
let lastX, lastY;
let velX = 0, velY = 0;
let totalTravel = 0;

scene.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  isDragging  = true;
  totalTravel = 0;
  startX = e.clientX - targetX;
  startY = e.clientY - targetY;
  lastX  = e.clientX;
  lastY  = e.clientY;
  velX   = 0;
  velY   = 0;
  scene.classList.add('dragging');
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  velX = e.clientX - lastX;
  velY = e.clientY - lastY;
  totalTravel += Math.abs(velX) + Math.abs(velY);
  lastX   = e.clientX;
  lastY   = e.clientY;
  targetX = e.clientX - startX;
  targetY = e.clientY - startY;
  clampTarget();
});

window.addEventListener('mouseup', e => {
  if (!isDragging) return;
  isDragging = false;
  scene.classList.remove('dragging');

  if (totalTravel < 5) {
    const card = e.target.closest('.card');
    if (card) card.classList.toggle('flipped');
    return;
  }

  targetX += velX * MOMENTUM_FACTOR;
  targetY += velY * MOMENTUM_FACTOR;
  clampTarget();
});

// ── Touch support ─────────────────────────────────────────────────────────────

let touchLastX, touchLastY;

scene.addEventListener('touchstart', e => {
  const t     = e.touches[0];
  isDragging  = true;
  totalTravel = 0;
  startX     = t.clientX - targetX;
  startY     = t.clientY - targetY;
  touchLastX = t.clientX;
  touchLastY = t.clientY;
  velX = velY = 0;
}, { passive: true });

scene.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const t = e.touches[0];
  velX = t.clientX - touchLastX;
  velY = t.clientY - touchLastY;
  totalTravel += Math.abs(velX) + Math.abs(velY);
  touchLastX = t.clientX;
  touchLastY = t.clientY;
  targetX = t.clientX - startX;
  targetY = t.clientY - startY;
  clampTarget();
}, { passive: true });

scene.addEventListener('touchend', e => {
  isDragging = false;
  if (totalTravel < 5) {
    const touch = e.changedTouches[0];
    const card  = touch && document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.card');
    if (card) card.classList.toggle('flipped');
    return;
  }
  targetX += velX * MOMENTUM_FACTOR;
  targetY += velY * MOMENTUM_FACTOR;
  clampTarget();
});
