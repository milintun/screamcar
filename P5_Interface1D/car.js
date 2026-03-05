
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
        // crash animation state
        this.crashPhase  = 'sliding'; // 'sliding' | 'crashed'
        this.crashTimer  = 0;
        this.wreckage    = [];        // static pixels [{col,row,color}]
        this.smoke       = [];        // smoke sources [{baseCol,baseRow,phase,height}]
    }

    update() {
        if (this.dead) {
            this.crashTimer++;
            if (this.crashPhase === 'sliding') {
                this.deadX     += this.deadTx * this.deadSpeed;
                this.deadY     += this.deadTy * this.deadSpeed;
                if (this.crashTimer >= 50) {
                    this.crashPhase = 'crashed';
                    this._buildCrash();
                }
            }
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

        } else if (this.inputMode === "ultrasonic") {
            // SPEED (GO)
            if (val > 30) {
                this.speed = 0.0005
            } else {
                this.speed = map(val, 30, 0, 0, 0.005);
            }
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
        if (this.inBananaZone()) {
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
        this.crashPhase = 'sliding';
        this.crashTimer = 0;
        audience.excite();
    }

    _buildCrash() {
        const col = floor(this.deadX / pixelSize);
        const row = floor(this.deadY / pixelSize);

        // scattered wreckage pixels: car color, black, gray, burnt orange
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (random() > 0.55) continue;
                const roll = random();
                let color;
                if      (roll < 0.30) color = this.carColor;
                else if (roll < 0.50) color = [15, 15, 15];          // black char
                else if (roll < 0.75) color = [90, 90, 90];          // gray debris
                else                  color = [160, 55, 0];           // burnt orange
                this.wreckage.push({ col: col + dc, row: row + dr, color });
            }
        }

        // smoke sources just above the wreckage
        for (let i = 0; i < 4; i++) {
            this.smoke.push({
                baseCol: col + floor(random(-2, 3)),
                baseRow: row - 1,
                phase:   random(TWO_PI),
                height:  floor(random(3, 6)),
                speed:   random(0.025, 0.06),
            });
        }
    }

    writeToBuffer() {
        if (this.dead) {
            const col = floor(this.deadX / pixelSize);
            const row = floor(this.deadY / pixelSize);

            if (this.crashPhase === 'sliding') {
                setPixel(col, row, this.carColor);
                return;
            }

            // explosion burst — shown for 20 frames after sliding ends (frame 50–70)
            if (this.crashTimer >= 50 && this.crashTimer < 70) {
                const burstR = min(floor((this.crashTimer - 50) / 4) + 1, 3);
                for (let dr = -burstR; dr <= burstR; dr++) {
                    for (let dc = -burstR; dc <= burstR; dc++) {
                        if (dc*dc + dr*dr > burstR*burstR + 1) continue;
                        const heat = random();
                        const c = heat < 0.5
                            ? [255, floor(random(80, 180)), 0]   // orange
                            : [220, floor(random(20, 60)),  0];  // red
                        setPixel(col + dc, row + dr, c);
                    }
                }
            }

            // static wreckage
            for (const { col: wc, row: wr, color } of this.wreckage) {
                setPixel(wc, wr, color);
            }

            // animated smoke rising above wreckage
            for (const s of this.smoke) {
                for (let h = 0; h < s.height; h++) {
                    const drift = round(sin(frameCount * s.speed + s.phase + h * 0.8) * 0.9);
                    const gray  = floor(lerp(160, 220, h / s.height));
                    setPixel(s.baseCol + drift, s.baseRow - h, [gray, gray, gray]);
                }
            }

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
