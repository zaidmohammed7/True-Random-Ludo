/**
 * Standard Ludo board constants for a 15×15 grid (0-indexed rows & cols).
 *
 * Color quadrant layout (matching standard clockwise board):
 *   Blue   → top-left     (rows 0-5, cols 0-5)
 *   Red    → top-right    (rows 0-5, cols 9-14)
 *   Green  → bottom-right (rows 9-14, cols 9-14)
 *   Yellow → bottom-left  (rows 9-14, cols 0-5)
 *
 * Home columns form a CROSS pointing to center (7,7):
 *   Blue   → row 7, cols 1-5  (going RIGHT  → center)
 *   Red    → col 7, rows 1-5  (going DOWN   → center)
 *   Green  → row 7, cols 9-13 (going LEFT   → center)
 *   Yellow → col 7, rows 9-13 (going UP     → center)
 *
 * 52-cell main track (clockwise):
 *   Blue = 0   Red = 13   Green = 26   Yellow = 39
 */

export const COLORS = ['blue', 'red', 'green', 'yellow'];

const id = (r, c) => `${r},${c}`;

// ─── 52-cell clockwise main track ────────────────────────────────────────────
export const TRACK_CELLS = [
    // 0-12  Left arm top row -> Top arm left col -> Mid top
    id(6, 0), id(6, 1), id(6, 2), id(6, 3), id(6, 4), id(6, 5),   // Left arm top row
    id(5, 6), id(4, 6), id(3, 6), id(2, 6), id(1, 6), id(0, 6), // Top arm left col
    id(0, 7), // Mid Top
    // 13-25 Top arm right col -> Right arm top row -> Mid right
    id(0, 8), id(1, 8), id(2, 8), id(3, 8), id(4, 8), id(5, 8), // Top arm right col
    id(6, 9), id(6, 10), id(6, 11), id(6, 12), id(6, 13), id(6, 14), // Right arm top row
    id(7, 14), // Mid Right
    // 26-38 Right arm bottom row -> Bottom arm right col -> Mid bottom
    id(8, 14), id(8, 13), id(8, 12), id(8, 11), id(8, 10), id(8, 9), // Right arm bot row
    id(9, 8), id(10, 8), id(11, 8), id(12, 8), id(13, 8), id(14, 8), // Bot arm right col
    id(14, 7), // Mid Bottom
    // 39-51 Bottom arm left col -> Left arm bottom row -> Mid left
    id(14, 6), id(13, 6), id(12, 6), id(11, 6), id(10, 6), id(9, 6), // Bot arm left col
    id(8, 5), id(8, 4), id(8, 3), id(8, 2), id(8, 1), id(8, 0), // Left arm bot row
    id(7, 0) // Mid Left
];

// ─── Per-color configuration ──────────────────────────────────────────────────
export const COLOR_CONFIG = {
    blue: {
        yardTokenPositions: [[2, 2], [2, 3], [3, 2], [3, 3]],
        trackEntryIndex: 1,
        homeColumn: ['7,1', '7,2', '7,3', '7,4', '7,5'],
        startSafeSquare: id(6, 1),
        midSafeSquare: id(2, 6),
        colorHex: '#3498db',
    },
    red: {
        yardTokenPositions: [[2, 11], [2, 12], [3, 11], [3, 12]],
        trackEntryIndex: 14,
        homeColumn: ['1,7', '2,7', '3,7', '4,7', '5,7'],
        startSafeSquare: id(1, 8),
        midSafeSquare: id(6, 12),
        colorHex: '#e74c3c',
    },
    green: {
        yardTokenPositions: [[11, 11], [11, 12], [12, 11], [12, 12]],
        trackEntryIndex: 27,
        homeColumn: ['7,13', '7,12', '7,11', '7,10', '7,9'],
        startSafeSquare: id(8, 13),
        midSafeSquare: id(12, 8),
        colorHex: '#2ecc71',
    },
    yellow: {
        yardTokenPositions: [[11, 2], [11, 3], [12, 2], [12, 3]],
        trackEntryIndex: 40,
        homeColumn: ['13,7', '12,7', '11,7', '10,7', '9,7'],
        startSafeSquare: id(13, 6),
        midSafeSquare: id(8, 2),
        colorHex: '#f1c40f',
    }
};

// 8 standard safe squares (no capture allowed)
export const SAFE_SQUARES = new Set([
    id(6, 1), id(1, 8), id(8, 13), id(13, 6),  // start squares
    id(2, 6), id(6, 12), id(12, 8), id(8, 2),   // mid-track stars
]);

export const START_SQUARES = {
    '6,1': 'blue',
    '1,8': 'red',
    '8,13': 'green',
    '13,6': 'yellow'
};

// Center home cell
export const HOME_CELL = id(7, 7);

// ─── Cell type helpers (used by Board for coloring) ───────────────────────────

// All home-column cells per color (for CSS coloring)
export const HOME_COLUMN_SETS = {
    blue: new Set(['7,1', '7,2', '7,3', '7,4', '7,5']),
    red: new Set(['1,7', '2,7', '3,7', '4,7', '5,7']),
    green: new Set(['7,13', '7,12', '7,11', '7,10', '7,9']),
    yellow: new Set(['13,7', '12,7', '11,7', '10,7', '9,7']),
};

// Yard inner decoration cells (circular token slots - just the 2×2 inner area)
export const YARD_TOKEN_CELLS = {
    blue: new Set([[2, 2], [2, 3], [3, 2], [3, 3]].map(([r, c]) => id(r, c))),
    red: new Set([[2, 11], [2, 12], [3, 11], [3, 12]].map(([r, c]) => id(r, c))),
    green: new Set([[11, 11], [11, 12], [12, 11], [12, 12]].map(([r, c]) => id(r, c))),
    yellow: new Set([[11, 2], [11, 3], [12, 2], [12, 3]].map(([r, c]) => id(r, c))),
};

// Track index map for quick lookup
export const TRACK_INDEX_MAP = new Map(TRACK_CELLS.map((cell, i) => [cell, i]));

// ─── Token path helpers ────────────────────────────────────────────────────────

/**
 * Returns the board cell ID for a token given its color and logical step.
 *  step 0        → in yard (no cell)
 *  step 1-51     → on main track
 *  step 52-56    → in home column (steps 1-5)
 *  step 57       → in center home (WIN)
 */
export function getCellForStep(color, step) {
    if (step <= 0 || step >= 58) return null;
    if (step <= 51) {
        const entryIdx = COLOR_CONFIG[color].trackEntryIndex;
        const trackIdx = (entryIdx + step - 1) % 52;
        return TRACK_CELLS[trackIdx];
    }
    // Home column: step 52 = homeColumn[0], step 56 = homeColumn[4]
    if (step <= 56) {
        return COLOR_CONFIG[color].homeColumn[step - 52];
    }
    return HOME_CELL;
}

/**
 * Given a color and step, compute the new step after moving `dice` squares.
 * Returns null if the move is invalid (would overshoot home).
 */
export function computeNewStep(color, currentStep, dice) {
    if (currentStep === 0) {
        // In yard: must roll 6 to exit, lands on step 1
        return dice === 6 ? 1 : null;
    }
    const newStep = currentStep + dice;
    if (newStep > 57) return null; // Overshoot home column
    return newStep;
}

/**
 * Returns true if the token at `step` is on the main track (not yard, not home column).
 */
export function isOnMainTrack(step) {
    return step >= 1 && step <= 51;
}
