class Audience {
    constructor() {
        this.members = [];
        this.excitement = 0;
        this._generate();
    }

    _generate() {
        const CENTERS   = [0, 0.35, 0.8]; // t positions along the track
        const T_RANGE   = 0.04;  // half-length of each grandstand along the track
        const T_STEPS   = 18;    // people per row per grandstand
        const ROWS      = 3;     // depth of grandstand (rows away from track)
        const CLEARANCE = 6;     // grid cells from track center to front row

        for (const center of CENTERS) {
            const side = random() > 0.5 ? 1 : -1; // random side of track

            for (let step = 0; step <= T_STEPS; step++) {
                const t = ((center - T_RANGE + (2 * T_RANGE * step / T_STEPS)) % 1 + 1) % 1;
                const pos = track.getPointAt(t);

                // unit normal: perpendicular to tangent, side chosen randomly
                const nx = -pos.ty * side;
                const ny =  pos.tx * side;

                for (let row = 0; row < ROWS; row++) {
                    const dist = (CLEARANCE + row) * pixelSize;
                    const col  = floor((pos.x + nx * dist) / pixelSize);
                    const r    = floor((pos.y + ny * dist) / pixelSize);

                    this.members.push({
                        col,
                        baseRow: r,
                        phase: random(TWO_PI),
                        headColor: this._skinTone(random(1)),
                        bodyColor: this._hsv(random(360), 0.6, 0.65),
                    });
                }
            }
        }
    }

    // t: 0 (light beige) → 1 (dark brown)
    _skinTone(t) {
        const light = [255, 220, 177];
        const dark  = [101,  55, 0];
        return [
            round(lerp(light[0], dark[0], t)),
            round(lerp(light[1], dark[1], t)),
            round(lerp(light[2], dark[2], t)),
        ];
    }

    _hsv(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r, g, b;
        if      (h < 60)  { r=c; g=x; b=0; }
        else if (h < 120) { r=x; g=c; b=0; }
        else if (h < 180) { r=0; g=c; b=x; }
        else if (h < 240) { r=0; g=x; b=c; }
        else if (h < 300) { r=x; g=0; b=c; }
        else              { r=c; g=0; b=x; }
        return [round((r+m)*255), round((g+m)*255), round((b+m)*255)];
    }

    excite() {
        this.excitement = 0.4;
    }

    update() {
        this.excitement = max(0, this.excitement - 0.008);
    }

    writeToBuffer() {
        const speed     = lerp(0.01, 0.18, this.excitement);
        const amplitude = lerp(0.6,  3.5,  this.excitement);

        for (const m of this.members) {
            const offset = round(sin(frameCount * speed + m.phase) * amplitude);
            const headRow = m.baseRow + offset;
            setPixel(m.col, headRow,     m.headColor);
            setPixel(m.col, headRow + 1, m.bodyColor);
        }
    }
}
