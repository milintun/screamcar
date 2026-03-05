class Trees {
    constructor() {
        this.trees = [];
        this._generate();
    }

    _generate() {
        // pick cluster centers offset from the track, then spawn trees near each
        const CLUSTER_T_VALUES = [0.1, 0.25, 0.45, 0.62, 0.78, 0.92];
        const CLUSTER_OFFSET_MIN = 5;  // grid cells from track center
        const CLUSTER_OFFSET_MAX = 15;
        const TREES_PER_CLUSTER  = [4, 15]; // min/max trees per cluster
        const CLUSTER_SPREAD     = 4;  // grid cells radius around cluster center

        for (const t of CLUSTER_T_VALUES) {
            const pos    = track.getPointAt(t);
            const side   = random() > 0.5 ? 1 : -1;
            const offset = random(CLUSTER_OFFSET_MIN, CLUSTER_OFFSET_MAX);
            const nx     = -pos.ty * side;
            const ny     =  pos.tx * side;
            const cx     = floor((pos.x + nx * offset * pixelSize) / pixelSize);
            const cy     = floor((pos.y + ny * offset * pixelSize) / pixelSize);

            const count = floor(random(TREES_PER_CLUSTER[0], TREES_PER_CLUSTER[1] + 1));
            for (let i = 0; i < count; i++) {
                const col = cx + floor(random(-CLUSTER_SPREAD, CLUSTER_SPREAD + 1));
                const row = cy + floor(random(-CLUSTER_SPREAD, CLUSTER_SPREAD + 1));
                this.trees.push(this._makeTree(col, row));
            }
        }
    }

    _makeTree(baseCol, baseRow) {
        const shade    = random(0.65, 1.0);
        const canopyW  = floor(random(2, 4));  // 1–3 wide
        const canopyH  = floor(random(1, 4));  // 1–3 tall
        const trunkH   = floor(random(1, 3));  // 1–2 trunk pixels
        const halfW    = floor(canopyW / 2);

        const pixels = [];

        // trunk
        for (let dy = 0; dy < trunkH; dy++) {
            pixels.push({
                col: baseCol,
                row: baseRow + dy,
                color: [floor(101 * shade * random(0.8, 1.0)),
                        floor(67  * shade * random(0.8, 1.0)),
                        floor(33  * shade * random(0.8, 1.0))],
            });
        }

        // canopy — centered on baseCol, sits above trunk
        for (let dy = 0; dy < canopyH; dy++) {
            for (let dx = -halfW; dx <= halfW; dx++) {
                // taper the top row narrower for a rounder look
                if (dy === canopyH - 1 && canopyH > 1 && abs(dx) === halfW) continue;
                pixels.push({
                    col: baseCol + dx,
                    row: baseRow - 1 - dy,
                    color: [floor(random(20, 60)  * shade),
                            floor(random(110, 180) * shade),
                            floor(random(15, 45)  * shade)],
                });
            }
        }

        return pixels;
    }

    writeToBuffer() {
        for (const tree of this.trees) {
            for (const { col, row, color } of tree) {
                setPixel(col, row, color);
            }
        }
    }
}
