// This is used to aggregrate visual information from all objects before we display them. 
// First we populate display and then we show it to user.
// This is particularly helpful once you start outputting your game to an LED strip, of if you want to have two separate 'screens'

class RandomBezier {
    constructor(x1, y1, x2, y2, prevBezier = null) {
      // set start and end points
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;

      this.randomizeControlPoints(prevBezier)

      this.polyRep = this.getPolyRep()
    }

    randomizeControlPoints(prevBezier) {
      // Calculate direction vector from start to end
      const dx = this.x2 - this.x1;
      const dy = this.y2 - this.y1;
      const length = Math.sqrt(dx * dx + dy * dy);

      // Perpendicular direction (rotated 90 degrees)
      const perpX = -dy / length;
      const perpY = dx / length;

      // If there's a previous bezier, ensure C1 continuity
      // (last control point of prev, end of prev/start of current, first control point of current are collinear)
      const noise = RECTANGULAR ? 0.7 : 1;
      if (prevBezier) {
        this.cpx1 = this.x1 + (this.x1 - prevBezier.cpx2);
        this.cpy1 = this.y1 + (this.y1 - prevBezier.cpy2);
      } else {
        const offset1 = random(-length * noise, length * noise);
        this.cpx1 = this.x1 + dx * 0.33 + perpX * offset1;
        this.cpy1 = this.y1 + dy * 0.33 + perpY * offset1;
      }

      // Always randomize second control point
      const offset2 = random(-length * noise, length * noise);
      this.cpx2 = this.x1 + dx * 0.67 + perpX * offset2;
      this.cpy2 = this.y1 + dy * 0.67 + perpY * offset2;
    }

    getPolyRep() {
      // expand cubic Bézier equations into standard polynomial form: ax³ + bx² + cx + d
      // x coefficients [c0, c1, c2, c3] for [t⁰, t¹, t², t³]
      const xCoeffs = [
        this.x1,
        -3 * this.x1 + 3 * this.cpx1,
        3 * this.x1 - 6 * this.cpx1 + 3 * this.cpx2,
        -this.x1 + 3 * this.cpx1 - 3 * this.cpx2 + this.x2
      ];

      // y coefficients [c0, c1, c2, c3] for [t⁰, t¹, t², t³]
      const yCoeffs = [
        this.y1,
        -3 * this.y1 + 3 * this.cpy1,
        3 * this.y1 - 6 * this.cpy1 + 3 * this.cpy2,
        -this.y1 + 3 * this.cpy1 - 3 * this.cpy2 + this.y2
      ];

      return { x: xCoeffs, y: yCoeffs };
    }

    getDerivative(t) {
      const { x, y } = this.polyRep;
      return { dx: x[1] + 2*x[2]*t + 3*x[3]*t**2, dy: y[1] + 2*y[2]*t + 3*y[3]*t**2 };
    }

    // how fast tangent changes wrt arc length
    getCurvature(t) {
      const { x, y } = this.polyRep;
      const { dx, dy } = this.getDerivative(t);
      const d2x = 2*x[2] + 6*x[3]*t;
      const d2y = 2*y[2] + 6*y[3]*t;
      return 1000 * Math.abs(dx*d2y - dy*d2x) / (dx**2 + dy**2)**1.5;
    }

    show() {
      noFill();
      stroke('black')
      strokeWeight(20)
      bezier(this.x1, this.y1, this.cpx1, this.cpy1, this.cpx2, this.cpy2, this.x2, this.y2);
    }

}

class Track {
    constructor() {
        this.beziers = [];
        this.bananas = [];
        this.generateBananas();
        this.generateTrack();
    }


    samplePointsAroundEllipse(sampleNum=500) {
      const ellipsePath = []
      const cx = width / 2
      const cy = height / 2
      const a = displayCols * pixelSize * 0.3  // scales with canvas width
      const b = displayRows * pixelSize * 0.2  // scales with canvas height
      for (let i = 0; i < sampleNum; i++) {
        const t = (TWO_PI / sampleNum) * i
        const x = cx + a * cos(t)
        const y = cy + b * sin(t)
        ellipsePath.push([x, y])
      }
      return ellipsePath
    }

    samplePointsAroundCircle(r, sampleNum) {
      const samplePoints = []
      const cx = width / 2
      const cy = height / 2
      for (let i = 0; i < sampleNum; i++) {
          const t = (TWO_PI / sampleNum) * i
          const x = cx + r * cos(t)
          const y = cy + r * sin(t)
          samplePoints.push([x, y])
        }
      return samplePoints
    }

    generateBananas(numBananas=3) {
      for (let i=0; i < numBananas; i++) {
        const banana = new Banana()
        this.bananas.push(banana)
      }
    }

    generateTrack() {
        const circleR = min(displayRows, displayCols) * pixelSize * 0.3;
        const samplePoints = RECTANGULAR ? this.samplePointsAroundEllipse(6) : this.samplePointsAroundCircle(circleR, 6);
        for (const [index, [x, y]] of samplePoints.entries()) {
            const prevIndex = index === 0 ? samplePoints.length - 1 : index - 1;
            const [x1, y1] = samplePoints[prevIndex];
            const prevBezier = this.beziers.length > 0 ? this.beziers[this.beziers.length - 1] : null;
            const randomBezier = new RandomBezier(x1, y1, x, y, prevBezier);
            this.beziers.push(randomBezier);
        }

        // update first bezier to have C1 continuity with last bezier
        if (this.beziers.length > 1) {
            const firstBezier = this.beziers[0];
            const lastBezier = this.beziers[this.beziers.length - 1];
            firstBezier.cpx1 = firstBezier.x1 + (firstBezier.x1 - lastBezier.cpx2);
            firstBezier.cpy1 = firstBezier.y1 + (firstBezier.y1 - lastBezier.cpy2);
            firstBezier.polyRep = firstBezier.getPolyRep();
        }

        this.rasterizeTrack();
    }

    // Pre-compute which grid cells the track occupies.
    // Called once after generateTrack(); result is reused every frame.
    rasterizeTrack() {
        this.centerCells = new Set();
        this.radiusCells = new Set();
        this.outerCells  = new Set();
        this.orderedCenterCells = []; // [{col, row}] in t-order, for countdown animation
        this.orderedRadiusCells = []; // [{col, row}] in t-order, for countdown animation
        const SAMPLES = 8000;
        const RADIUS = 1; // cells of padding around the center line

        for (let i = 0; i <= SAMPLES; i++) {
            const t = i / SAMPLES;
            const pos = this.getPointAt(t);
            const col = floor(pos.x / pixelSize);
            const row = floor(pos.y / pixelSize);
            const ck = `${col},${row}`;
            if (!this.centerCells.has(ck)) this.orderedCenterCells.push({col, row});
            this.centerCells.add(ck);
            for (let dr = -RADIUS; dr <= RADIUS; dr++) {
                for (let dc = -RADIUS; dc <= RADIUS; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const rk = `${col + dc},${row + dr}`;
                    if (!this.radiusCells.has(rk)) this.orderedRadiusCells.push({col: col + dc, row: row + dr});
                    this.radiusCells.add(rk);
                }
            }
            // outer ring: one cell further out (max(|dr|,|dc|) == RADIUS+1)
            const OR = RADIUS + 1;
            for (let dr = -OR; dr <= OR; dr++) {
                for (let dc = -OR; dc <= OR; dc++) {
                    if (Math.max(Math.abs(dr), Math.abs(dc)) === OR) {
                        this.outerCells.add(`${col + dc},${row + dr}`);
                    }
                }
            }
        }

        // pre-compute finish line: collect cells, deduplicate, then color by grid position
        const lp = this.getPointAt(0);
        const nx = -lp.ty;
        const ny =  lp.tx;
        const seen = new Set();
        const cells = [];
        for (let tStep = 0; tStep < 2; tStep++) {
            for (let step = -RADIUS - 1; step <= RADIUS + 1; step++) {
                const col = floor((lp.x + nx * step * pixelSize + lp.tx * tStep * pixelSize) / pixelSize);
                const row = floor((lp.y + ny * step * pixelSize + lp.ty * tStep * pixelSize) / pixelSize);
                const key = `${col},${row}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    cells.push({ col, row });
                }
            }
        }
        // color so no two adjacent cells share the same color
        this.finishLineCells = cells.map(({ col, row }) => ({
            col, row,
            color: (col + row) % 2 === 0 ? [0, 0, 0] : [255, 255, 255],
        }));
    }

    writeToBuffer() {
        if (RED_WHITE_BORDER) {
          // outer ring — red/white alternating by grid position
          for (const key of this.outerCells) {
              const [c, r] = key.split(',').map(Number);
              setPixel(c, r, (c + r) % 2 === 0 ? [150, 26, 26] : [190, 190, 190]);
          }
        }
        
        // radius border — drawn next so it overwrites outer ring overlaps
        for (const key of this.radiusCells) {
            const [c, r] = key.split(',').map(Number);
            setPixel(c, r, [30, 30, 30]);
        }
        // center track line (dark)
        for (const key of this.centerCells) {
            const [c, r] = key.split(',').map(Number);
            setPixel(c, r, [70, 70, 70]);
        }

        // bananas — 2 pixels along tangent, blinking
        if (floor(frameCount / 20) % 3 === 0) {
            for (const banana of this.bananas) {
                const pos  = this.getPointAt(banana.t);
                const col  = floor(pos.x / pixelSize);
                const row  = floor(pos.y / pixelSize);
                const col2 = floor((pos.x + pos.tx * pixelSize) / pixelSize);
                const row2 = floor((pos.y + pos.ty * pixelSize) / pixelSize);
                setPixel(col,  row,  [247, 226, 156]); // pale yellow
                setPixel(col2, row2, [200, 170,  60]); // darker yellow
            }
        }

        // finish line — checkered stripe across track width
        for (const { col, row, color } of this.finishLineCells) {
            setPixel(col, row, color);
        }

    }

    writeCountdownBuffer(phase, blobT) {
        const COLORS = [
            { center: [200, 40,  40],  radius: [140, 20,  20]  }, // red
            { center: [230, 200, 30],  radius: [170, 140, 20]  }, // yellow
            { center: [40,  200, 40],  radius: [20,  140, 20]  }, // green
        ];

        const paintC = Math.floor(this.orderedCenterCells.length * blobT);
        const paintR = Math.floor(this.orderedRadiusCells.length * blobT);

        // draw unpainted portion in previous phase color (gives trail effect)
        if (phase > 0) {
            const prev = COLORS[phase - 1];
            for (let i = paintR; i < this.orderedRadiusCells.length; i++) {
                const {col, row} = this.orderedRadiusCells[i];
                setPixel(col, row, prev.radius);
            }
            for (let i = paintC; i < this.orderedCenterCells.length; i++) {
                const {col, row} = this.orderedCenterCells[i];
                setPixel(col, row, prev.center);
            }
        }

        // draw painted portion in current phase color
        const cur = COLORS[phase];
        for (let i = 0; i < paintR; i++) {
            const {col, row} = this.orderedRadiusCells[i];
            setPixel(col, row, cur.radius);
        }
        for (let i = 0; i < paintC; i++) {
            const {col, row} = this.orderedCenterCells[i];
            setPixel(col, row, cur.center);
        }
    }

    debugDraw() {
        const circleR = min(displayRows, displayCols) * pixelSize * 0.3;
        const debugPoints = RECTANGULAR ? this.samplePointsAroundEllipse(6) : this.samplePointsAroundCircle(circleR, 6);
        noStroke();
        fill(255, 0, 0);
        for (const [x, y] of debugPoints) {
            circle(x, y, 50);
        }
    }

    getPointAt(t) {
      const n = this.beziers.length;
      const scaled = t * n;
      const i = Math.min(Math.floor(scaled), n - 1);
      const localT = scaled - i;
      const b = this.beziers[i];

      const x = b.polyRep.x[0] + b.polyRep.x[1]*localT + b.polyRep.x[2]*localT**2 + b.polyRep.x[3]*localT**3;
      const y = b.polyRep.y[0] + b.polyRep.y[1]*localT + b.polyRep.y[2]*localT**2 + b.polyRep.y[3]*localT**3;

      const curvature = b.getCurvature(localT);

      const { dx, dy } = b.getDerivative(localT);
      const tLen = Math.sqrt(dx**2 + dy**2);

      return { x, y, curvature, tx: dx/tLen, ty: dy/tLen };
    }

}