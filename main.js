const CARD_COUNT = 63;
const CANVAS_W   = 5000;
const CANVAS_H   = 3500;
const CARD_W     = 220;
const CARD_H     = 300;

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

// ── Placement (editorial scatter) ────────────────────────────────────────────

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Each cluster: { cx, cy, rx, ry, count, gap }
// cx/cy = center, rx/ry = spread radius, gap = min space between card edges.
// Counts sum to 63.
const CLUSTERS = [
  { cx: 550,  cy: 500,  rx: 600,  ry: 500, count: 7, gap: 80  }, // dense,       top-left
  { cx: 4300, cy: 550,  rx: 600,  ry: 500, count: 6, gap: 80  }, // dense,       top-right
  { cx: 2200, cy: 750,  rx: 1000, ry: 600, count: 9, gap: 160 }, // medium,      top-center
  { cx: 900,  cy: 2500, rx: 650,  ry: 550, count: 7, gap: 160 }, // medium,      mid-left
  { cx: 3900, cy: 2200, rx: 750,  ry: 600, count: 8, gap: 160 }, // medium,      mid-right
  { cx: 2500, cy: 2950, rx: 1100, ry: 450, count: 7, gap: 320 }, // sparse,      bottom-center
  { cx: 750,  cy: 3100, rx: 500,  ry: 350, count: 5, gap: 240 }, // airy,        bottom-left
  { cx: 4400, cy: 3100, rx: 450,  ry: 350, count: 4, gap: 240 }, // airy,        bottom-right
  { cx: 1900, cy: 1750, rx: 1500, ry: 950, count: 5, gap: 500 }, // very sparse, center (large voids)
  { cx: 3400, cy: 1300, rx: 700,  ry: 550, count: 5, gap: 200 }, // medium,      right-of-center
];

function buildPositions() {
  const placed = [];

  for (const cl of CLUSTERS) {
    for (let i = 0; i < cl.count; i++) {
      let pos, tries = 0;
      do {
        pos = {
          x: Math.max(0, Math.min(CANVAS_W - CARD_W, cl.cx + rand(-cl.rx, cl.rx))),
          y: Math.max(0, Math.min(CANVAS_H - CARD_H, cl.cy + rand(-cl.ry, cl.ry))),
        };
        tries++;
      } while (
        tries < 100 &&
        placed.some(p =>
          Math.abs(p.x - pos.x) < CARD_W + cl.gap &&
          Math.abs(p.y - pos.y) < CARD_H + cl.gap
        )
      );
      placed.push({ ...pos, rotate: 0 });
    }
  }

  return placed;
}

// ── Init cards ────────────────────────────────────────────────────────────────

const positions = buildPositions();

for (let i = 0; i < CARD_COUNT; i++) {
  const card = createCard(i + 1);
  const { x, y } = positions[i];
  card.style.left      = `${x}px`;
  card.style.top       = `${y}px`;
  canvas.appendChild(card);
}

// ── Canvas bounds (content bounding box + padding) ───────────────────────────

const PAD = 300;
let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
for (const { x, y } of positions) {
  if (x < bMinX) bMinX = x;
  if (y < bMinY) bMinY = y;
  if (x + CARD_W > bMaxX) bMaxX = x + CARD_W;
  if (y + CARD_H > bMaxY) bMaxY = y + CARD_H;
}
const bLeft   = bMinX - PAD;
const bTop    = bMinY - PAD;
const bRight  = bMaxX + PAD;
const bBottom = bMaxY + PAD;

// At minTargetX: content right edge aligns with screen right edge.
// At maxTargetX: content left edge aligns with screen left edge.
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
