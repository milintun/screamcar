let PIXEL = 12; // scale everything

// Oval track (grid units snapped to PIXEL grid)
const GRID_W = 60;
const GRID_H = 40;
const SEGMENTS = 220;
const A = 18; // x-radius
const B = 11; // y-radius

// Gameplay
const NUM_BANANAS = 2;

// Speed / feel
let speed = 0;          // t/sec
let maxSpeed = 0.20;
let accel = 0.35;
let brake = 0.55;
let friction = 0.15;

// Banana behavior
const BANANA_KILL_SPEED = 0.12;   // only die if speed >= this
const BANANA_SLOW_FACTOR = 0.25;  // if slow, reduce speed to this fraction
const BANANA_RESPAWN_MS = 1500;

let trackPts = [];      // {x,y,heading}
let bananas = [];       // {x,y,active,respawnAtMs}

// Start / spawn
let startTimeMs = 0;
let startIdx = 0;       // index on trackPts
let t = 0;              // 0..1 around track

// State
let state = "countdown"; // countdown | racing | dead
let deadAtMs = 0;
let laps = 0;
let lastWrapU = 0;

function setup() {
  createCanvas(GRID_W * PIXEL, GRID_H * PIXEL);
  noSmooth();
  textFont("monospace");
  resetGame();
}

function resetGame() {
  startTimeMs = millis();
  state = "countdown";
  deadAtMs = 0;
  speed = 0;
  laps = 0;

  buildTrack();
  spawnBananas();

  // spawn car at start pixel on track
  t = startIdx / SEGMENTS;
  lastWrapU = ((t % 1) + 1) % 1;
  
}

function draw() {
  background(0);
  

  // State transition: green at 5s
  if (state === "countdown" && millis() - startTimeMs >= 5000) {
    
    state = "racing";
  }

  if (state === "racing") {
    updateCar();
    updateBananaRespawns();
    checkBananas();
    checkLap();
  } else {
    updateBananaRespawns();
  }

  drawTrack();
  drawBananas();
  drawStartLightOnTrack();
  drawHUD();
  drawCarOrDeath();
}

// --------- TRACK ---------
function buildTrack() {
  trackPts = [];
  const cx = GRID_W / 2;
  const cy = GRID_H / 2;

  for (let i = 0; i < SEGMENTS; i++) {
    let u = i / SEGMENTS;
    let ang = u * TWO_PI;

    let x = cx + A * cos(ang);
    let y = cy + B * sin(ang);

    let dx = -A * sin(ang);
    let dy =  B * cos(ang);
    let heading = atan2(dy, dx);

    trackPts.push({
      x: round(x) * PIXEL,
      y: round(y) * PIXEL,
      heading
    });
  }

  // Find start pixel: top-most track pixel, closest to canvas center X
  let best = 0;
  let bestY = Infinity;
  let bestXDist = Infinity;
  const centerX = width / 2;

  for (let i = 0; i < trackPts.length; i++) {
    let p = trackPts[i];
    if (p.y < bestY) {
      bestY = p.y;
      bestXDist = abs(p.x - centerX);
      best = i;
    } else if (p.y === bestY) {
      let xd = abs(p.x - centerX);
      if (xd < bestXDist) {
        bestXDist = xd;
        best = i;
      }
    }
  }

  startIdx = best;
}

function ptOnTrack(tt) {
  let u = ((tt % 1) + 1) % 1;
  let idx = floor(u * SEGMENTS);
  return trackPts[idx];
}

function drawTrack() {
  noStroke();
  fill(255);
  for (let p of trackPts) square(p.x, p.y, PIXEL);
}

// --------- START LIGHT (ON TRACK) ---------
function drawStartLightOnTrack() {
  let p = trackPts[startIdx];
  let elapsed = millis() - startTimeMs;

  if (elapsed >= 5000) return; // disappear after green

  noStroke();
  if (elapsed < 2000) fill(255, 0, 0);
  else if (elapsed < 3500) fill(255, 255, 0);
  else fill(0, 250, 0);

  square(p.x, p.y, PIXEL);
}

// --------- CAR (trail ON TRACK, 50% shorter) ---------
function drawCarOrDeath() {
  let p = ptOnTrack(t);

  if (state === "dead") {
    dieSprite(p.x, p.y);
    return;
  }

  // trail length: 50% shorter than before (cap at 5 instead of 10)
  let trailLen = constrain(floor(map(speed, 0, maxSpeed, 1, 5)), 1, 5);

  // Draw trail by stepping backwards along the track indices
  // so every pixel is exactly on-track.
  noStroke();
  for (let i = trailLen; i >= 1; i--) {
    let idx = (floor(((t % 1 + 1) % 1) * SEGMENTS) - i + SEGMENTS) % SEGMENTS;
    let tp = trackPts[idx];
    let alpha = map(i, 0, trailLen, 40, 180);
    fill(0, 120, 255, alpha);
    square(tp.x, tp.y, PIXEL);
  }

  // Car pixel
  fill(0, 0, 255);
  square(p.x, p.y, PIXEL);
}

function dieSprite(x, y) {
  noStroke();
  if ((millis() - deadAtMs) % 400 < 200) fill(255, 0, 0);
  else fill(120, 0, 0);
  square(x, y, PIXEL);
}

// --------- BANANAS ---------
function banana(x, y) {
  if (millis() % 1000 < 500) {
    fill(255, 255, 0);
    noStroke();
    square(x, y, PIXEL);
  }
}

function spawnBananas() {
  bananas = [];

  for (let i = 0; i < NUM_BANANAS; i++) {
    let idx = randomBananaIndexAvoidStart();
    let p = trackPts[idx];
    bananas.push({
      idx,
      x: p.x,
      y: p.y,
      active: true,
      respawnAtMs: 0
    });
  }
}

function randomBananaIndexAvoidStart() {
  // keep bananas away from start zone
  let idx;
  do {
    idx = floor(random(0, SEGMENTS));
  } while (circularDist(idx, startIdx, SEGMENTS) < 18);
  return idx;
}

function circularDist(a, b, n) {
  let d = abs(a - b);
  return min(d, n - d);
}

function drawBananas() {
  for (let b of bananas) {
    if (b.active) banana(b.x, b.y);
  }
}

function updateBananaRespawns() {
  let now = millis();
  for (let b of bananas) {
    if (!b.active && b.respawnAtMs > 0 && now >= b.respawnAtMs) {
      // respawn somewhere new (still avoiding start)
      b.idx = randomBananaIndexAvoidStart();
      let p = trackPts[b.idx];
      b.x = p.x; b.y = p.y;
      b.active = true;
      b.respawnAtMs = 0;
    }
  }
}

function checkBananas() {
  let carIdx = floor((((t % 1) + 1) % 1) * SEGMENTS);

  for (let b of bananas) {
    if (!b.active) continue;

    // Hit test: same track index (simple + very 1D)
    if (carIdx === b.idx) {
      if (speed >= BANANA_KILL_SPEED) {
        state = "dead";
        deadAtMs = millis();
        speed = 0;
        return;
      } else {
        // slow-down but don't die
        speed = max(0, speed * BANANA_SLOW_FACTOR);

        // temporarily remove banana
        b.active = false;
        b.respawnAtMs = millis() + BANANA_RESPAWN_MS;
      }
    }
  }
}

// --------- GAME LOGIC ---------
function updateCar() {
  // cannot move until green
  if (millis() - startTimeMs < 5000) {
    speed = 0;
    return;
  }

  let dt = deltaTime / 1000;

  let a = 0;
  if (keyIsDown(UP_ARROW)) a += accel;
  if (keyIsDown(DOWN_ARROW)) a -= brake;

  speed += a * dt;

  // friction toward 0
  let fr = friction * dt;
  if (speed > 0) speed = max(0, speed - fr);
  else speed = 0;

  speed = constrain(speed, 0, maxSpeed);

  t += speed * dt;
}

function checkLap() {
  let u = ((t % 1) + 1) % 1;
  if (lastWrapU > 0.85 && u < 0.15) laps++;
  lastWrapU = u;
}

function drawHUD() {
  fill(255);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text(`Laps: ${laps}`, 10, 10);

  if (state === "countdown") {
    textAlign(CENTER, CENTER);
    textSize(18);
    text("READY...", width / 2, height - 2.5 * PIXEL);
    start(355,90);
    
  }

  if (state === "dead") {
    textAlign(CENTER, CENTER);
    textSize(18);
    text("CRASH! Press R", width / 2, height - 2.5 * PIXEL);
  }
}

function start(x, y) {
  let elapsed = millis();
  let size = PIXEL;
  push();
  resetMatrix();
  noStroke();

  if (elapsed < 2000) {
    fill(255, 0, 0); // RED
    square(x, y, size);
  } 
  else if (elapsed < 3500) {
    fill(255, 255, 0); // YELLOW
    square(x, y, size);
  } 
  else if (elapsed < 5000) {
    fill(0, 250, 0); // GREEN
    square(x, y, size);
  }
  pop();
}




function keyPressed() {
  if (key === "r" || key === "R") resetGame();
}

