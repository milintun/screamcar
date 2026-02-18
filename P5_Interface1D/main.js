/* /////////////////////////////////////

  4.043 / 4.044 Design Studio: Interaction Intelligence
  February 7, 2025
  Marcelo Coelho

*/ /////////////////////////////////////


let displaySize = 40;   // how many pixels are visible in the game
let pixelSize = 20;     // how big each 'pixel' looks on screen

let track;
let cars = [];

let controller;   // This is where the state machine and game logic lives

const MAX_GRIP = 20;

// ========== CAR CONFIG ==========
// Add/remove entries to change number of cars
// Input modes: "keyboard", "potentiometer", "button", "microphone", "ultrasonic"
// Arduino sends: "id value\n" where id matches the car's id
const CAR_CONFIG = [
  { id: 1, mode: "potentiometer", color: [0, 184, 46]  },   // green
  { id: 2, mode: "potentiometer", color: [66, 135, 245] },  // blue

  // { id: 1, mode: "ultrasonic", color: [0, 184, 46]  },   // green
  // { id: 2, mode: "microphone", color: [66, 135, 245] },  // blue
];
// ================================

let bgColor;
let resetTimer = -1;
const RESET_DELAY = 90; // frames to pause before reset
let paused = false;


function setup() {

  createCanvas((displaySize*pixelSize), (displaySize*pixelSize));     // dynamically sets canvas size

  // randomize new track once
  track = new Track();
  cars = CAR_CONFIG.map(c => new Car(track, MAX_GRIP, c.id, c.mode, c.color));
  track.show();

  bgColor = 'white';

  // Start computer microphone if any car uses it
  if (CAR_CONFIG.some(c => c.mode === "microphone")) {
    mic.start();
  }

  // Serial: try auto-reconnect, show button as fallback
  if (CAR_CONFIG.some(c => c.mode !== "keyboard" && c.mode !== "microphone")) {
    serial.autoConnect();
    let btn = createButton('Connect Arduino');
    btn.position(10, displaySize * pixelSize + 10);
    btn.mousePressed(() => serial.connect());
  }
}

function draw() {
  background(bgColor);
  track.show();

  for (let car of cars) {
    if (!paused) car.update();
    car.show();
  }

  // Check for win (car completes a lap)
  if (!paused && resetTimer < 0) {
    let winner = cars.find(car => car.lapped);
    if (winner) {
      bgColor = `rgb(${winner.carColor[0]}, ${winner.carColor[1]}, ${winner.carColor[2]})`;
      paused = true;
      resetTimer = RESET_DELAY;
    }
  }

  // Check for all dead
  if (!paused && cars.every(car => car.dead) && resetTimer < 0) {
    bgColor = 'red';
    resetTimer = RESET_DELAY;
  }

  // Reset countdown
  if (resetTimer > 0) {
    resetTimer--;
  } else if (resetTimer === 0) {
    track = new Track();
    cars = CAR_CONFIG.map(c => new Car(track, MAX_GRIP, c.id, c.mode, c.color));
    bgColor = 'white';
    paused = false;
    resetTimer = -1;
  }
}
