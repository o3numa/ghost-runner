/* Ghost Runner — minimal endless runner with deterministic obstacles and ghost replay.
   No Socket.io. Uses fetch() to GET/POST highscore + ghost to Express/lowdb.
*/

let highscore = 0;
let ghost = null; // { name, seed, jumps[], date }
let game; // per-run state

// UI refs
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const ghostLabel = document.getElementById('ghostLabel');
const nameInput = document.getElementById('playerName');
const restartBtn = document.getElementById('restartBtn');
restartBtn.onclick = () => startRun();

async function setup(){
  const c = createCanvas(800, 300);
  c.parent('game');

  try {
    const res = await fetch('/api/highscore');
    const data = await res.json();
    applyState(data);
  } catch(e){ console.error('Failed to load highscore', e); }

  startRun();
}

function applyState({ highscore: hs, ghost: g }){
  if (typeof hs === 'number') {
    highscore = hs; highEl.textContent = highscore.toFixed(1);
  }
  ghost = g || null;
  ghostLabel.textContent = ghost ? ` • Ghost: ${ghost.name} — ${new Date(ghost.date).toLocaleString()}` : '';
}

function startRun(){
  game = createGame();
}

function draw(){
  if (!game) return;
  game.update();
  game.render();
}

// ---------------- core game ----------------
function createGame(){
  const gravity = 0.65;
  const jumpVel = -11.5;
  const groundY = height - 40;

  // One seed per run; determines obstacle timing/size/speed.
  const seed = Math.floor(Math.random() * 1e9);
  const rng = mulberry32(seed);

  // Player & optional ghost sim
  const player = { x: 80, y: groundY, vy: 0, w: 28, h: 28, alive: true, wantJump:false, jumpedAt: [] };
  const ghostSim = ghost ? makeGhostSim(ghost, gravity, jumpVel, groundY) : null;

  let startedAt = millis();
  let lastObstacleAt = 0;
  const obstacles = [];

  function spawnObstacle(){
    const gap = 600 + rng() * 400;           // ms between spawns
    const now = millis();
    if (now - lastObstacleAt < gap) return;
    lastObstacleAt = now;

    const h = 30 + Math.floor(rng() * 40);   // 30–70px
    const w = 20 + Math.floor(rng() * 20);   // 20–40px
    const speed = 6 + rng() * 2;             // 6–8 px/frame
    obstacles.push({ x: width + 10, y: groundY - h, w, h, speed });
  }

  function updatePlayer(p, isGhost=false){
    if (!isGhost){
      if (p.wantJump){
        if (onGround(p)) p.vy = jumpVel;
        p.wantJump = false;
      }
    } else if (ghostSim && ghostSim.shouldJump(millis() - startedAt)){
      if (onGround(p)) p.vy = jumpVel;
    }

    p.vy += gravity;
    p.y += p.vy;
    if (p.y > groundY){ p.y = groundY; p.vy = 0; }
  }

  function updateObstacles(){
    for (const o of obstacles) o.x -= o.speed;
    while (obstacles.length && obstacles[0].x + obstacles[0].w < -20) obstacles.shift();
  }

  function checkCollisions(p){
    for (const o of obstacles){
      if (rectsOverlap(p.x,p.y,p.w,p.h,o.x,o.y,o.w,o.h)) return true;
    }
    return false;
  }

  async function onDeath(){
    const score = (millis() - startedAt) / 1000; // seconds survived
    if (score > highscore){
      const name = nameInput.value?.trim() || 'anon';
      try {
        const res = await fetch('/api/highscore', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, score, seed, jumps: player.jumpedAt, date: new Date().toISOString() })
        });
        const data = await res.json();
        applyState(data);
      } catch(e){ console.error('submit-highscore failed', e); }
    }
  }

  function update(){
    if (!player.alive) return;
    spawnObstacle();
    updatePlayer(player, false);
    if (ghostSim) updatePlayer(ghostSim.p, true);
    updateObstacles();

    if (checkCollisions(player)){
      player.alive = false;
      onDeath();
    }

    const score = (millis() - startedAt) / 1000;
    scoreEl.textContent = score.toFixed(1);
  }

  function render(){
    background(12, 16, 24);
    stroke(60); strokeWeight(2); line(0, groundY + 14, width, groundY + 14);

    noStroke(); fill(200, 220, 255);
    for (const o of obstacles) rect(o.x, o.y, o.w, o.h, 4);

    if (ghostSim){
      push(); noStroke(); fill(120, 200, 255, 120);
      rect(ghostSim.p.x, ghostSim.p.y, ghostSim.p.w, ghostSim.p.h, 6); pop();
    }

    push(); noStroke(); fill(80, 255, 160);
    rect(player.x, player.y, player.w, player.h, 6); pop();
  }

  function keyPressed(){
    if (keyCode === 82 /*R*/) startRun();
    if ((key === ' ' || keyCode === UP_ARROW) && player.alive){
      player.wantJump = true;
      player.jumpedAt.push(millis() - startedAt); // record jump time relative to run start (ms)
    }
  }

  window.keyPressed = keyPressed; // expose to p5
  return { update, render };
}

function onGround(p){ return p.y >= height - 40; }
function rectsOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function makeGhostSim(ghost, gravity, jumpVel, groundY){
  const p = { x: 80, y: groundY, vy: 0, w: 28, h: 28, alive: true };
  const jumps = [...(ghost.jumps || [])];
  let i = 0;
  return {
    p,
    shouldJump: (t) => { // t = ms since run start
      if (i < jumps.length && t >= jumps[i] - 10){ i++; return true; }
      return false;
    }
  };
}

// tiny deterministic PRNG
function mulberry32(a){
  let t = a >>> 0;
  return function(){
    t |= 0; t = t + 0x6D2B79F5 | 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
