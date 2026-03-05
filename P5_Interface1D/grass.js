const STRIPE_WIDTH   = 5;                // grid cells per stripe
const STRIPE_COLOR   = [107, 168, 54];   // lighter stripe green
// bg color [94, 156, 54] is the other stripe — already the canvas background, no pixel needed

class Grass {
    constructor() {
        this.cells = [];

        if (GRASS_STYLE === 'stripes') {
            // fill every other band of STRIPE_WIDTH columns with the stripe color
            for (let r = 0; r < displayRows; r++) {
                for (let c = 0; c < displayCols; c++) {
                    if (floor(r / STRIPE_WIDTH) % 2 === 0) {
                        this.cells.push({ col: c, row: r, color: STRIPE_COLOR });
                    }
                }
            }
        } else {
            // specks: ~3% of cells get a slightly lighter green dot
            for (let r = 0; r < displayRows; r++) {
                for (let c = 0; c < displayCols; c++) {
                    if (random() < 0.03) {
                        this.cells.push({ col: c, row: r, color: STRIPE_COLOR });
                    }
                }
            }
        }
    }

    writeToBuffer() {
        for (const { col, row, color } of this.cells) {
            setPixel(col, row, color);
        }
    }
}
