
class Car {

    constructor(track, maxGrip) {
        this.track = track;
        this.maxGrip = maxGrip;
        this.t = 0;
        this.speed = 0;
        this.dead = false;
        this.deadX = 0;
        this.deadY = 0;
        this.deadTx = 0;
        this.deadTy = 0;
        this.deadSpeed = 0;
    }

    update() {
        // DEAD ANIMATION
        if (this.dead) {
            this.deadX += this.deadTx * this.deadSpeed;
            this.deadY += this.deadTy * this.deadSpeed;
            return;
        }

        // INPUT MODE — change INPUT_MODE in main.js to switch
        // "keyboard"    : W/S keys (original)
        // "potentiometer": analog value (0-1023) maps directly to speed
        // "button"      : serial value acts like W/S (0 = brake, 1 = accel)
        // "microphone"  : loudness (0-1023) maps to acceleration

        if (INPUT_MODE === "keyboard") {
            if (key == 'w') {
                this.speed += 0.00005;
            } else if (key === 's') {
                if (this.speed > 0) {
                    this.speed -= 0.00005;
                }
            }

        } else if (INPUT_MODE === "potentiometer") {
            // Map 0-1023 directly to speed range
            this.speed = map(serial.rawValue, 0, 700, 0, 0.003);

        } else if (INPUT_MODE === "button") {
            // 1 = accelerate, 0 = brake
            if (serial.rawValue === 1) {
                this.speed += 0.0001;
            } else {
                if (this.speed > 0) {
                    this.speed -= 0.00001;
                }
            }

        } else if (INPUT_MODE === "microphone") {
            // Louder = faster acceleration
            let loudness = serial.rawValue; // 0-1023
            if (loudness > 100) { // noise threshold
                this.speed += map(loudness, 100, 1023, 0.00001, 0.0002);
            } else {
                // Slow down when quiet
                if (this.speed > 0) {
                    this.speed -= 0.00003;
                }
            }
        }

        this.t = (this.t + this.speed) % 1;
        if (this.t < 0) this.t += 1;



        // INTERACTIONS
        const pos = this.track.getPointAt(this.t);
        // curvature
        const lateralAcc = this.speed ** 2 * pos.curvature * 10000;
        if (lateralAcc > this.maxGrip) {
            this.die(pos);
        }

        // banana (range check for now until discretized into pixels)
        // console.log(this.inBananaZone())
        if (this.inBananaZone()) {
            // console.log(this.speed)
            if (this.speed >= BANANA_KILL_SPEED) {
                this.die(pos)
            }
        }
    }

    inBananaZone() {
      return this.track.bananas.some(banana => banana.startT <= this.t && this.t <= banana.endT)
    }

    die(pos) {
        this.dead = true;
        this.deadX = pos.x;
        this.deadY = pos.y;
        this.deadTx = pos.tx * Math.sign(this.speed);
        this.deadTy = pos.ty * Math.sign(this.speed);
        this.deadSpeed = Math.abs(this.speed) * 700;
    }

    show() {
        if (this.dead) {
            circle(this.deadX, this.deadY, 15);
        } else {
        fill(0, 184, 46);
        const pos = this.track.getPointAt(this.t);
        circle(pos.x, pos.y, 15);
        // trail length: 50% shorter than before (cap at 5 instead of 10)
        let trailLen = floor(map(this.speed, 0, 0.002, 0, 5));

        // Draw trail by stepping backwards along the track indices
        // so every pixel is exactly on-track.
        // TODO: work backwards?
        noStroke();
        for (let i = trailLen; i >= 1; i--) {
            const cloneT = this.t - i * 0.003;
            let remappedCloneT = cloneT;
            if (cloneT < 0) {
                remappedCloneT = 1 - cloneT;
            }
            const clonePos = this.track.getPointAt(remappedCloneT);
            const alpha = map(i, 0, trailLen, 100, 40);
            fill(0, 184, 46, alpha);
            circle(clonePos.x, clonePos.y, 15);
        }
        }
    }
}
