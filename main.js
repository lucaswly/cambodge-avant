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

// ── Initial canvas position (centered in viewport) ───────────────────────────

let canvasX = -(CANVAS_W / 2 - window.innerWidth  / 2);
let canvasY = -(CANVAS_H / 2 - window.innerHeight / 2);
canvas.style.transform = `translate(${canvasX}px, ${canvasY}px)`;

// ── Drag + inertia ────────────────────────────────────────────────────────────

let isDragging = false;
let startX, startY;
let lastX, lastY;
let velX = 0, velY = 0;
let totalTravel = 0;
let rafId;

scene.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  isDragging  = true;
  totalTravel = 0;
  startX = e.clientX - canvasX;
  startY = e.clientY - canvasY;
  lastX  = e.clientX;
  lastY  = e.clientY;
  velX   = 0;
  velY   = 0;
  cancelAnimationFrame(rafId);
  scene.classList.add('dragging');
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  velX = e.clientX - lastX;
  velY = e.clientY - lastY;
  totalTravel += Math.abs(velX) + Math.abs(velY);
  lastX   = e.clientX;
  lastY   = e.clientY;
  canvasX = e.clientX - startX;
  canvasY = e.clientY - startY;
  canvas.style.transform = `translate(${canvasX}px, ${canvasY}px)`;
});

window.addEventListener('mouseup', e => {
  if (!isDragging) return;
  isDragging = false;
  scene.classList.remove('dragging');

  // Click guard — only flip if barely any movement
  if (totalTravel < 5) {
    const card = e.target.closest('.card');
    if (card) card.classList.toggle('flipped');
    return;
  }

  applyInertia();
});

function applyInertia() {
  const friction = 0.92;

  function step() {
    velX *= friction;
    velY *= friction;
    if (Math.abs(velX) < 0.3 && Math.abs(velY) < 0.3) return;
    canvasX += velX;
    canvasY += velY;
    canvas.style.transform = `translate(${canvasX}px, ${canvasY}px)`;
    rafId = requestAnimationFrame(step);
  }

  rafId = requestAnimationFrame(step);
}

// ── Touch support ────────────────────────────────────────────────────────────

let touchStartX, touchStartY, touchLastX, touchLastY;

scene.addEventListener('touchstart', e => {
  const t = e.touches[0];
  isDragging  = true;
  totalTravel = 0;
  touchStartX = t.clientX - canvasX;
  touchStartY = t.clientY - canvasY;
  touchLastX  = t.clientX;
  touchLastY  = t.clientY;
  velX = velY = 0;
  cancelAnimationFrame(rafId);
}, { passive: true });

scene.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const t = e.touches[0];
  velX = t.clientX - touchLastX;
  velY = t.clientY - touchLastY;
  totalTravel += Math.abs(velX) + Math.abs(velY);
  touchLastX  = t.clientX;
  touchLastY  = t.clientY;
  canvasX = t.clientX - touchStartX;
  canvasY = t.clientY - touchStartY;
  canvas.style.transform = `translate(${canvasX}px, ${canvasY}px)`;
}, { passive: true });

scene.addEventListener('touchend', e => {
  isDragging = false;
  if (totalTravel < 5) {
    const card = e.changedTouches[0] && document.elementFromPoint(
      e.changedTouches[0].clientX,
      e.changedTouches[0].clientY
    )?.closest('.card');
    if (card) card.classList.toggle('flipped');
    return;
  }
  applyInertia();
});
