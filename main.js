const CARD_COUNT = 63;
const CANVAS_W   = 5000;
const CANVAS_H   = 3600;
const CARD_W     = 220;
const CARD_H     = 300;

// Grid: 13 cols × 8 rows = 104 cells. Fill rate: 63/104 ≈ 60%.
// Cell 385×450px → min gap 165px H / 150px V when adjacent.
// 1 empty cell between = ~550px gap. 2 empty = ~935px (rare at 60% fill).
const GRID_COLS = 13;
const GRID_ROWS = 8;
const CELL_W    = CANVAS_W / GRID_COLS; // ≈ 385px
const CELL_H    = CANVAS_H / GRID_ROWS; // = 450px

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

// ── Placement (sparse single-territory grid) ─────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildPositions() {
  // All 240 cells in one pool — shuffle and keep 63.
  // Random selection naturally creates varied gaps: adjacent cells = 130px apart,
  // cells separated by 2-3 empty ones = 480-830px apart.
  const cells = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      cells.push({ c, r });
    }
  }
  shuffle(cells);

  return cells.slice(0, CARD_COUNT).map(({ c, r }) => ({
    x: Math.round(c * CELL_W + (CELL_W - CARD_W) / 2),
    y: Math.round(r * CELL_H + (CELL_H - CARD_H) / 2),
  }));
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

// ── 3D card state (declared here so tick() can reference them) ────────────────

let openCardEl    = null;
let openCardInner = null;
let openCardOrigin = null;
let rotX = 0, rotY = 0;
let rotTargetX = 0, rotTargetY = 0;
const ROT_LERP = 0.12;

// ── Always-running render loop ────────────────────────────────────────────────

function tick() {
  currentX = lerp(currentX, targetX, LERP_FACTOR);
  currentY = lerp(currentY, targetY, LERP_FACTOR);
  canvas.style.transform = `translate(${currentX}px, ${currentY}px)`;

  if (openCardEl) {
    rotX = lerp(rotX, rotTargetX, ROT_LERP);
    rotY = lerp(rotY, rotTargetY, ROT_LERP);
    gsap.set(openCardInner, { rotateX: rotX, rotateY: rotY });
  }

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
  if (e.button !== 0 || openCardEl) return;
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
    if (card) openCard(card);
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
    if (card) openCard(card);
    return;
  }
  targetX += velX * MOMENTUM_FACTOR;
  targetY += velY * MOMENTUM_FACTOR;
  clampTarget();
});

// ── Trackpad (wheel) ──────────────────────────────────────────────────────────
// deltaX/deltaY are accumulated directly into target — the lerp loop provides
// smoothing, and the OS already decelerates trackpad deltas on finger lift.

scene.addEventListener('wheel', e => {
  if (openCardEl) { e.preventDefault(); return; }
  // deltaMode 0 = pixels (trackpad), 1 = lines (mouse wheel) → normalize
  const scale = e.deltaMode === 1 ? 20 : 1;
  targetX -= e.deltaX * scale;
  targetY -= e.deltaY * scale;
  clampTarget();
}, { passive: false });

// ── Card 3D interaction ───────────────────────────────────────────────────────

const ROT_SENSITIVITY = 0.45; // deg per px dragged
const ROT_MOMENTUM    = 5;    // inertia multiplier on release

let is3DDragging = false;
let last3DX, last3DY;
let rotVelX = 0, rotVelY = 0;

function openCard(card) {
  if (openCardEl) return;

  const rect = card.getBoundingClientRect();
  openCardOrigin = {
    rect,
    parentNode : card.parentNode,
    left       : card.style.left,
    top        : card.style.top,
  };

  // Lift card out of canvas into body, pinned at current screen coords.
  card.style.position = 'fixed';
  card.style.left     = '0';
  card.style.top      = '0';
  card.style.zIndex   = '100';
  document.body.appendChild(card);

  // Overlay — click handler attached after open animation to avoid accidental close.
  const overlay = document.createElement('div');
  overlay.id = 'card-overlay';
  document.body.insertBefore(overlay, card);
  gsap.set(overlay, { opacity: 0 });
  gsap.to(overlay, { opacity: 1, duration: 0.35 });

  // Target: centered in viewport, scaled to fill ~65% of the smaller dimension.
  const openScale = Math.min(
    window.innerWidth  * 0.65 / CARD_W,
    window.innerHeight * 0.75 / CARD_H
  );
  const tx = (window.innerWidth  - CARD_W * openScale) / 2;
  const ty = (window.innerHeight - CARD_H * openScale) / 2;

  const inner = card.querySelector('.card-inner');
  gsap.set(card, { x: rect.left, y: rect.top, scale: 1 });
  gsap.to(card,  { x: tx, y: ty, scale: openScale, duration: 0.75, ease: 'power2.inOut' });

  // 360° Y spin during flight; hand off to tick() rotation on complete.
  gsap.fromTo(inner,
    { rotateY: 0 },
    {
      rotateY  : 360,
      duration : 0.75,
      ease     : 'power2.inOut',
      onComplete() {
        gsap.set(inner, { rotateY: 0 });
        rotX = rotY = rotTargetX = rotTargetY = rotVelX = rotVelY = 0;
        openCardEl    = card;
        openCardInner = inner;
        card.addEventListener('mousedown', on3DDown);
        overlay.addEventListener('click', closeCard);
      },
    }
  );
}

function closeCard() {
  if (!openCardEl) return;
  is3DDragging = false;

  const card    = openCardEl;
  const inner   = openCardInner;
  const origin  = openCardOrigin;
  const overlay = document.getElementById('card-overlay');

  // Stop tick() from updating rotation — GSAP takes back control.
  openCardEl = openCardInner = openCardOrigin = null;
  card.removeEventListener('mousedown', on3DDown);

  gsap.to(inner, { rotateX: 0, rotateY: 0, duration: 0.4, ease: 'power2.inOut' });
  gsap.to(card, {
    x        : origin.rect.left,
    y        : origin.rect.top,
    scale    : 1,
    duration : 0.6,
    ease     : 'power2.inOut',
    onComplete() {
      gsap.set(card, { clearProps: 'all' });
      card.style.left     = origin.left;
      card.style.top      = origin.top;
      card.style.position = '';
      card.style.zIndex   = '';
      origin.parentNode.appendChild(card);
    },
  });

  if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => overlay.remove() });
}

function on3DDown(e) {
  e.stopPropagation();
  is3DDragging = true;
  last3DX = e.clientX;
  last3DY = e.clientY;
  rotVelX = rotVelY = 0;
}

// 3D drag — window-level so mouse can move freely outside the card.
window.addEventListener('mousemove', e => {
  if (!is3DDragging) return;
  const dx = e.clientX - last3DX;
  const dy = e.clientY - last3DY;
  last3DX = e.clientX;
  last3DY = e.clientY;
  rotVelY = dx * ROT_SENSITIVITY;
  rotVelX = -dy * ROT_SENSITIVITY;
  rotTargetY += rotVelY;
  rotTargetX += rotVelX;
});

window.addEventListener('mouseup', () => {
  if (!is3DDragging) return;
  is3DDragging = false;
  rotTargetY += rotVelY * ROT_MOMENTUM;
  rotTargetX += rotVelX * ROT_MOMENTUM;
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeCard();
});
