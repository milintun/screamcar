/* /////////////////////////////////////

  4.043 / 4.044 Design Studio: Interaction Intelligence
  February 7, 2025
  Marcelo Coelho

*/ /////////////////////////////////////


let displaySize = 40;   // how many pixels are visible in the game
let pixelSize = 20;     // how big each 'pixel' looks on screen

let track;
let car;

let controller;   // This is where the state machine and game logic lives

const MAX_GRIP = 20;

let bgColor;


function setup() {

  createCanvas((displaySize*pixelSize), (displaySize*pixelSize));     // dynamically sets canvas size

  // randomize new track once
  track = new Track();
  car = new Car(track, MAX_GRIP);
  track.show();

  bgColor = 'white';
  
}

function draw() {
  background(bgColor);
  track.show();

  car.update();
  car.show();

  if (car.dead) {
    bgColor = 'red';
  }
}


