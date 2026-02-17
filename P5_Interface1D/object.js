// objects that appear on the track (obstacles, powerups, etc.)



// BANANA
const BANANA_KILL_SPEED = 0.003;   // only die if speed >= this
const BANANA_SLOW_FACTOR = 0.25;  // if slow, reduce speed to this fraction
const BANANA_RESPAWN_MS = 1500;

class Banana {
    constructor() {
        this.killSpeed = BANANA_KILL_SPEED;
        this.slowFactor = BANANA_SLOW_FACTOR;
        this.respawnMs = BANANA_RESPAWN_MS;
        this.t = random(0, 1);
        this.startT = this.t - 0.005;
        this.endT = this.t + 0.005;
    }
}