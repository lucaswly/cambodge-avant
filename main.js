const CARD_COUNT  = 63;
const CANVAS_W    = 5000;
const CANVAS_H    = 3500;
const CARD_W      = 220;
const CARD_H      = 300;
const COLS        = 9;
const ROWS        = 7;   // 9 × 7 = 63 cells

const scene  = document.getElementById('scene');
const canvas = document.getElementById('canvas');

// ── Card factory ────────────────────────────────────────────────────────────

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

// ── Placement (grid-jitter) ──────────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function buildPositions() {
  const cellW = CANVAS_W / COLS;
  const cellH = CANVAS_H / ROWS;
  const jitterX = cellW - CARD_W;
  const jitterY = cellH - CARD_H;

  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      cells.push({ col, row });
    }
  }
  shuffle(cells);

  return cells.map(({ col, row }) => ({
    x: col * cellW + rand(0, jitterX),
    y: row * cellH + rand(0, jitterY),
    rotate: rand(-8, 8),
  }));
}

// ── Init cards ───────────────────────────────────────────────────────────────

const positions = buildPositions();

for (let i = 0; i < CARD_COUNT; i++) {
  const card = createCard(i + 1);
  const { x, y, rotate } = positions[i];
  card.style.left      = `${x}px`;
  card.style.top       = `${y}px`;
  card.style.transform = `rotate(${rotate}deg)`;
  canvas.appendChild(card);
}

// ── Lerp helper ──────────────────────────────────────────────────────────────

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const LERP_FACTOR      = 0.07;   // heavy, slow-following feel
const MOMENTUM_FACTOR  = 12;     // how far the target is projected on release

// ── Canvas state ─────────────────────────────────────────────────────────────

const initX = -(CANVAS_W / 2 - window.innerWidth  / 2);
const initY = -(CANVAS_H / 2 - window.innerHeight / 2);

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
});

window.addEventListener('mouseup', e => {
  if (!isDragging) return;
  isDragging = false;
  scene.classList.remove('dragging');

  // Click guard — flip only if mouse barely moved
  if (totalTravel < 5) {
    const card = e.target.closest('.card');
    if (card) card.classList.toggle('flipped');
    return;
  }

  // Project target forward — lerp will naturally drift and decelerate toward it
  targetX += velX * MOMENTUM_FACTOR;
  targetY += velY * MOMENTUM_FACTOR;
});

// ── Touch support ────────────────────────────────────────────────────────────

let touchLastX, touchLastY;

scene.addEventListener('touchstart', e => {
  const t = e.touches[0];
  isDragging  = true;
  totalTravel = 0;
  startX = t.clientX - targetX;
  startY = t.clientY - targetY;
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
});
