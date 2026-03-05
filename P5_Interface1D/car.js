
class Car {

    constructor(track, maxGrip, id, inputMode, carColor) {
        this.track = track;
        this.maxGrip = maxGrip;
        this.id = id;               // 1 or 2 — matches serial prefix
        this.inputMode = inputMode;  // "keyboard", "potentiometer", "button", "microphone"
        this.carColor = carColor;    // [r, g, b]
        this.t = 0.01;
        this.prevT = 0.01;
        this.speed = 0;
        this.lapped = false;
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

        // Read this car's serial value by id
        let val = serial.values[this.id] || 0;

        if (this.inputMode === "keyboard") {
            // Car 1: W/S keys, Car 2: Up/Down arrows
            let accelKey = this.id === 1 ? keyIsDown(87) : keyIsDown(UP_ARROW);
            let brakeKey = this.id === 1 ? keyIsDown(83) : keyIsDown(DOWN_ARROW);
            if (accelKey) {
                this.speed += 0.00005;
            } else if (brakeKey) {
                if (this.speed > 0) {
                    this.speed -= 0.00005;
                }
            }

        } else if (this.inputMode === "potentiometer") {
            this.speed = map(val, 0, 500, 0.0001, 0.003);

        } else if (this.inputMode === "button") {
            if (val === 1) {
                this.speed += 0.0001;
            } else {
                if (this.speed > 0) {
                    this.speed -= 0.00001;
                }
            }

        } else if (this.inputMode === "microphone") {
            let loudness = mic.level; // 0-1023 from computer mic
            console.log(loudness)

            // SPEED
            if (loudness > 300) {
                this.speed = map(loudness, 300, 1023, 0.00001, 0.005);
            } 
            // ACCELERATION
            if (loudness > 300) {
                this.speed += map(loudness, 300, 1023, 0.00001, 0.0002);
            } else {
                if (this.speed > 0) {
                    this.speed -= 0.00003;
                } 
            }

            // if (loudness > 100) {
            //     this.speed += map(loudness, 300, 1023, 0.00001, 0.0002);
            // } else {
            //     if (this.speed > 0) {
            //         this.speed -= 0.00003;
            //     }
            // }

        } else if (this.inputMode === "ultrasonic") {
            // SPEED (BRAKE)
            // if (val > 30) {
            //     this.speed = 0.005
            // } else {
            //     this.speed = map(val, 0, 30, 0, 0.003);
            // }

            // SPEED (GO)
            if (val > 30) {
                this.speed = 0.0005
            } else {
                this.speed = map(val, 30, 0, 0, 0.005);
            }


            //// ACCELERATION
            // if (val > 30) {
            //     // Far away = brake
            //     this.speed -= 0.0001;
            // } else {
            //     // Close = accelerate (closer = faster)
            //     this.speed += map(val, 30, 0, 0, 0.0001);
            // }
            // // Never go backwards
            // if (this.speed < 0) this.speed = 0;
        }

        this.prevT = this.t;
        this.t = (this.t + this.speed) % 1;
        if (this.t < 0) this.t += 1;

        // Detect lap: t wrapped from high back to low
        if (this.prevT > 0.9 && this.t < 0.1 && this.speed > 0) {
            this.lapped = true;
        }

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
        audience.excite();
    }

    writeToBuffer() {
        if (this.dead) {
            const col = floor(this.deadX / pixelSize);
            const row = floor(this.deadY / pixelSize);
            setPixel(col, row, this.carColor);
            return;
        }

        const pos = this.track.getPointAt(this.t);
        const col = floor(pos.x / pixelSize);
        const row = floor(pos.y / pixelSize);

        // trail (drawn first so car pixel is on top)
        const trailLen = floor(map(this.speed, 0, 0.002, 0, 5));
        for (let i = trailLen; i >= 1; i--) {
            const cloneT = ((this.t - i * 0.003) % 1 + 1) % 1;
            const clonePos = this.track.getPointAt(cloneT);
            const tc = floor(clonePos.x / pixelSize);
            const tr = floor(clonePos.y / pixelSize);
            const factor = map(i, 1, trailLen, 0.75, 0.2);
            setPixel(tc, tr, [
                this.carColor[0] * factor,
                this.carColor[1] * factor,
                this.carColor[2] * factor,
            ]);
        }

        // car pixel on top
        setPixel(col, row, this.carColor);
    }
}
