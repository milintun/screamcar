/* /////////////////////////////////////

  4.043 / 4.044 Design Studio: Interaction Intelligence
  February 7, 2025
  Marcelo Coelho

*/ /////////////////////////////////////


const CANVAS_SIZE = 800; // fixed physical canvas size in screen pixels
let pixelSize = 10;      // how big each 'pixel' looks on screen (tune this)

const RECTANGULAR      = false;      // true = double width, same height
const RED_WHITE_BORDER = true;      // outer alternating red/white ring on track
const GRASS_STYLE      = 'specks';  // 'specks' | 'stripes'

let displayRows = CANVAS_SIZE / pixelSize;
let displayCols = RECTANGULAR ? displayRows * 2 : displayRows;
let displaySize = displayRows; // alias kept for any legacy references

let track;
let cars = [];
let audience;
let trees;
let grass;

let controller;   // This is where the state machine and game logic lives

const MAX_GRIP = 20;

// ========== CAR CONFIG ==========
// Add/remove entries to change number of cars
// Input modes: "keyboard", "potentiometer"
// Arduino sends: "id value\n" where id matches the car's id
const CAR_CONFIG = [
  { id: 1, mode: "potentiometer", color: [255, 17, 0]  },   // red
  { id: 2, mode: "potentiometer", color: [66, 135, 245] },  // blue
];
// ================================

let bgColor;
let resetTimer = -1;
const RESET_DELAY = 150;            // frames to pause before reset
const COUNTDOWN_PHASE_FRAMES = 60; // frames per countdown phase (3 phases: red → yellow → green)
const COUNTDOWN_TOTAL = COUNTDOWN_PHASE_FRAMES * 3;
const COUNTDOWN_PHASE_MS = Math.round(COUNTDOWN_PHASE_FRAMES * 1000 / 60); // ms per phase at 60fps
let paused = false;
let countdownActive = false;
let countdownTimer = 0;

let pixelBuffer = [];

function initBuffer() {
  pixelBuffer = Array.from({length: displayRows}, () => Array(displayCols).fill(null));
}

function clearBuffer() {
  for (let r = 0; r < displayRows; r++)
    for (let c = 0; c < displayCols; c++)
      pixelBuffer[r][c] = null;
}

// col, row are grid coordinates; color is [r, g, b]
function setPixel(col, row, color) {
  if (col < 0 || col >= displayCols || row < 0 || row >= displayRows) return;
  pixelBuffer[row][col] = color;
}

function renderBuffer() {
  noStroke();
  for (let r = 0; r < displayRows; r++) {
    for (let c = 0; c < displayCols; c++) {
      const color = pixelBuffer[r][c];
      if (color !== null) {
        fill(color[0], color[1], color[2]);
        rect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
      }
    }
  }
}


function setup() {

  createCanvas(RECTANGULAR ? CANVAS_SIZE * 2 : CANVAS_SIZE, CANVAS_SIZE);
  noSmooth();
  initBuffer();

  // randomize new track once
  track = new Track();
  cars = CAR_CONFIG.map(c => new Car(track, MAX_GRIP, c.id, c.mode, c.color, c.accelMode ?? false));
  audience = new Audience();
  trees = new Trees();
  grass = new Grass();

  bgColor = [94, 156, 54];
  paused = true;
  countdownActive = true;
  countdownTimer = 0;

  // Start computer microphone if any car uses it
  if (CAR_CONFIG.some(c => c.mode === "microphone")) {
    mic.start();
  }

  // Serial: try auto-reconnect, show button as fallback
  if (CAR_CONFIG.some(c => c.mode !== "keyboard" && c.mode !== "microphone")) {
    serial.autoConnect();
    let btn = createButton('Connect Arduino');
    btn.position(10, CANVAS_SIZE + 10);
    btn.mousePressed(() => serial.connect());

    // home motors
    serial.send('H')
  }
}

function draw() {
  if (countdownActive) {
    background('black');
    const frameInPhase = countdownTimer % COUNTDOWN_PHASE_FRAMES;
    const phase = Math.floor(countdownTimer / COUNTDOWN_PHASE_FRAMES);
    const blobT = Math.min(1.0, frameInPhase / (COUNTDOWN_PHASE_FRAMES - 1));
    track.writeCountdownBuffer(phase, blobT);

    // send rumble once at the start of each phase
    if (frameInPhase === 0) {
      const durations = [100, 200, COUNTDOWN_PHASE_MS]
      const freqs = [20, 20, 40];
      
      serial.send(`R ${durations[phase]} ${freqs[phase]}`);
    }

    countdownTimer++;
    
    if (countdownTimer >= COUNTDOWN_TOTAL) {
      countdownActive = false;
      paused = false;
    }
  } else {
      background(bgColor);
      clearBuffer();
      grass.writeToBuffer();
      trees.writeToBuffer();
      audience.update();
      audience.writeToBuffer();
    track.writeToBuffer();
    for (let car of cars) {
      if (!paused) car.update();
      car.writeToBuffer();
    }
  }
  renderBuffer();
  // track.debugDraw();

  // Check for win (car completes a lap)
  if (!paused && resetTimer < 0) {
    let winner = cars.find(car => car.lapped);
    if (winner) {
      paused = true;
      resetTimer = RESET_DELAY;
      audience.excite(winner.carColor);
      // rumble motor celebration
      serial.send(`${winner.id}R 100 10`);
    }
  }

  // Check for all dead
  if (!paused && cars.every(car => car.dead) && resetTimer < 0) {
    resetTimer = RESET_DELAY;
    audience.excite();
  }

  // Reset countdown
  if (resetTimer > 0) {
    resetTimer--;
  } else if (resetTimer === 0) {
    track = new Track();
    cars = CAR_CONFIG.map(c => new Car(track, MAX_GRIP, c.id, c.mode, c.color, c.accelMode ?? false));
    audience = new Audience();
    trees = new Trees();
    grass = new Grass();
    initBuffer();
    bgColor = [94, 156, 54];
    paused = true;
    resetTimer = -1;
    countdownActive = true;
    countdownTimer = 0;
  }
}
