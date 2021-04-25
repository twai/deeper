const WORLD_HEIGHT = 80000;
const TIME_SCALE = 10;

// Apply global timescale hack for smooth bullet time
function TS(s) {
    return s / TIME_SCALE;
}