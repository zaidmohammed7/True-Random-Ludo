/**
 * Board.jsx — Simplified structural skeleton (no game logic, no tokens).
 *
 * Renders a 15×15 Ludo grid with correct zone coloring:
 *   • 6×6 Yard quadrants (Blue / Red / Yellow / Green)
 *   • 3-wide Walkway (cross-shaped path cells)
 *   • Home Columns (colored arms converging on center)
 *   • 8 Safe / Star squares
 *   • Center Home cell with a four-triangle conic-gradient
 */

import React from 'react';
import {
    SAFE_SQUARES,
    HOME_COLUMN_SETS,
} from '../utils/boardConstants';
import styles from './LudoBoard.module.css';

// ─── Yard token-slot positions (2×2 inner circles in each yard) ────────────
const YARD_SLOT_CELLS = new Set([
    // Blue  (top-left)
    '2,2', '2,3', '3,2', '3,3',
    // Red   (top-right)
    '2,11', '2,12', '3,11', '3,12',
    // Yellow (bottom-left)
    '11,2', '11,3', '12,2', '12,3',
    // Green  (bottom-right)
    '11,11', '11,12', '12,11', '12,12',
]);

// ─── Star SVG (rendered inside safe squares on the walkway) ───────────────
function StarIcon() {
    return (
        <svg
            className={styles.starIcon}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77
                   l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
                fill="#f39c12"
                stroke="#e67e22"
                strokeWidth="0.5"
            />
        </svg>
    );
}

// ─── Classify a cell into one of six zone types ────────────────────────────
function getCellZone(row, col) {
    const cid = `${row},${col}`;

    // Center home (single cell at 7,7)
    if (row === 7 && col === 7) return { zone: 'center' };

    // Yard quadrants (6×6 corner blocks)
    if (row <= 5 && col <= 5) return { zone: 'yard', color: 'blue' };
    if (row <= 5 && col >= 9) return { zone: 'yard', color: 'red' };
    if (row >= 9 && col <= 5) return { zone: 'yard', color: 'yellow' };
    if (row >= 9 && col >= 9) return { zone: 'yard', color: 'green' };

    // Home columns (colored arms of the cross)
    for (const color of ['blue', 'red', 'yellow', 'green']) {
        if (HOME_COLUMN_SETS[color].has(cid)) return { zone: 'home', color };
    }

    // Walkway (the 3-wide corridor forming the cross)
    const inCorridor = (row >= 6 && row <= 8) || (col >= 6 && col <= 8);
    if (inCorridor) return { zone: 'track' };

    // Unreachable quadrant corners (outside the playable area)
    return { zone: 'empty' };
}

// ─── Single cell ───────────────────────────────────────────────────────────
function Cell({ row, col }) {
    const cid = `${row},${col}`;
    const { zone, color } = getCellZone(row, col);
    const isSafe = SAFE_SQUARES.has(cid);
    const isYardSlot = zone === 'yard' && YARD_SLOT_CELLS.has(cid);

    // Build className list
    const classNames = [styles.cell];

    if (zone === 'yard') classNames.push(styles[`yard_${color}`]);
    if (zone === 'home') classNames.push(styles[`home_${color}`]);
    if (zone === 'track') classNames.push(styles.trackCell);
    if (zone === 'center') classNames.push(styles.centerCell);
    // safe cells override track background
    if (isSafe && zone === 'track') classNames.push(styles.safeCell);

    return (
        <div
            className={classNames.join(' ')}
            data-row={row}
            data-col={col}
            data-zone={zone}
            aria-label={`Cell ${row},${col} (${zone}${color ? ` ${color}` : ''})`}
        >
            {/* ── Yard inner circle decoration ── */}
            {isYardSlot && <div className={styles.yardSlot} />}

            {/* ── Safe square star icon ── */}
            {isSafe && zone === 'track' && <StarIcon />}

            {/* ── Center home triangle ── */}
            {zone === 'center' && <div className={styles.centerInner} />}
        </div>
    );
}

// ─── Board ─────────────────────────────────────────────────────────────────
export default function Board() {
    // Build all 225 cells (15 rows × 15 cols)
    const cells = [];
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
            cells.push(<Cell key={`${row},${col}`} row={row} col={col} />);
        }
    }

    return (
        <div className={styles.boardWrapper}>
            <div className={styles.board} role="grid" aria-label="Ludo board">
                {cells}
            </div>
        </div>
    );
}
