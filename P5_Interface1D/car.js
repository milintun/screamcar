
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

        // INPUT MODE
    
        // // input2: hold to accelerate, release to stop
        // if (keyIsDown(87)) {
        //     this.speed += 0.0005;
        // } else if (keyIsDown(83)) {
        //     this.speed -= 0.0005;
        // } else {
        //     this.speed = 0;
        // }

        // input1: click to accelerate / decelerate
        if (key == 'w') {
          this.speed += 0.00005;
        } else if (key === 's') {
            // A: dont go backwards, just stop
            if (this.speed > 0) {
                this.speed -= 0.00005;
            } 
            // // B: can go backwards
            // car.speed -= 0.00005;

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
