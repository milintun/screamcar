/* /////////////////////////////////////

  4.043 / 4.044 Design Studio: Interaction Intelligence
  February 7, 2025
  Marcelo Coelho

*/ /////////////////////////////////////


let displaySize = 40;   // how many pixels are visible in the game
let pixelSize = 20;     // how big each 'pixel' looks on screen

let track;
let car1;
let car2;

let controller;   // This is where the state machine and game logic lives

const MAX_GRIP = 20;

// ========== CAR CONFIG ==========
// Input modes: "keyboard", "potentiometer", "button", "microphone"
// Arduino sends: "1 value\n" for car 1, "2 value\n" for car 2
const CAR1_MODE = "keyboard";
const CAR2_MODE = "keyboard";
const CAR1_COLOR = [0, 184, 46];    // green
const CAR2_COLOR = [230, 50, 50];   // red
// ================================

let bgColor;
let resetTimer = -1;
const RESET_DELAY = 90; // frames to pause before reset
let paused = false;


function setup() {

  createCanvas((displaySize*pixelSize), (displaySize*pixelSize));     // dynamically sets canvas size

  // randomize new track once
  track = new Track();
  car1 = new Car(track, MAX_GRIP, 1, CAR1_MODE, CAR1_COLOR);
  car2 = new Car(track, MAX_GRIP, 2, CAR2_MODE, CAR2_COLOR);
  track.show();

  bgColor = 'white';

  // Serial: try auto-reconnect, show button as fallback
  if (CAR1_MODE !== "keyboard" || CAR2_MODE !== "keyboard") {
    serial.autoConnect();
    let btn = createButton('Connect Arduino');
    btn.position(10, displaySize * pixelSize + 10);
    btn.mousePressed(() => serial.connect());
  }
}

function draw() {
  background(bgColor);
  track.show();

  if (!paused) {
    car1.update();
    car2.update();
  }
  car1.show();
  car2.show();

  // Check for win (car completes a lap — t wraps past 0.95 back below 0.05)
  if (!paused && resetTimer < 0) {
    if (car1.lapped) {
      bgColor = `rgb(${CAR1_COLOR[0]}, ${CAR1_COLOR[1]}, ${CAR1_COLOR[2]})`;
      paused = true;
      resetTimer = RESET_DELAY;
    } else if (car2.lapped) {
      bgColor = `rgb(${CAR2_COLOR[0]}, ${CAR2_COLOR[1]}, ${CAR2_COLOR[2]})`;
      paused = true;
      resetTimer = RESET_DELAY;
    }
  }

  // Check for both dead
  if (!paused && (car1.dead && car2.dead) && resetTimer < 0) {
    bgColor = 'red';
    resetTimer = RESET_DELAY;
  }

  // Reset countdown
  if (resetTimer > 0) {
    resetTimer--;
  } else if (resetTimer === 0) {
    track = new Track();
    car1 = new Car(track, MAX_GRIP, 1, CAR1_MODE, CAR1_COLOR);
    car2 = new Car(track, MAX_GRIP, 2, CAR2_MODE, CAR2_COLOR);
    bgColor = 'white';
    paused = false;
    resetTimer = -1;
  }
}


