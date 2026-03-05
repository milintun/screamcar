class Grass {
    constructor() {
        this.specks = [];
        // sparse darker-green specks over the background — ~10% of cells
        for (let r = 0; r < displayRows; r++) {
            for (let c = 0; c < displayCols; c++) {
                if (random() < 0.03) {
                    this.specks.push({
                        col: c, row: r,
                        color: [107, 168, 54]
                    });
                }
            }
        }
    }

    writeToBuffer() {
        for (const { col, row, color } of this.specks) {
            setPixel(col, row, color);
        }
    }
}
