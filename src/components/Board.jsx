import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    TRACK_CELLS, COLOR_CONFIG, SAFE_SQUARES, HOME_COLUMN_SETS, HOME_CELL,
    getCellForStep, YARD_TOKEN_CELLS, START_SQUARES
} from '../utils/boardConstants';
import layoutStyles from './LudoBoard.module.css';
import tokenStyles from './Board.module.css';

// ─── Color helpers ─────────────────────────────────────────────────────────────
const TOKEN_COLORS = { blue: '#3498db', red: '#e74c3c', green: '#2ecc71', yellow: '#f1c40f' };
const TOKEN_BORDERS = { blue: '#1f6390', red: '#96281b', green: '#1e8449', yellow: '#b7950b' };

// ─── Classify a cell into one of six zone types ────────────────────────────
function getCellZone(row, col) {
    const cid = `${row},${col}`;

    // Center home
    if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return { zone: 'center' };

    // Yard quadrants (6×6 corner blocks)
    if (row <= 5 && col <= 5) return { zone: 'yard', color: 'blue' };
    if (row <= 5 && col >= 9) return { zone: 'yard', color: 'red' };
    if (row >= 9 && col <= 5) return { zone: 'yard', color: 'yellow' };
    if (row >= 9 && col >= 9) return { zone: 'yard', color: 'green' };

    // Home columns
    for (const color of ['blue', 'red', 'yellow', 'green']) {
        if (HOME_COLUMN_SETS[color].has(cid)) return { zone: 'home', color };
    }

    // Walkway / track
    const inCorridor = (row >= 6 && row <= 8) || (col >= 6 && col <= 8);
    if (inCorridor) return { zone: 'track' };

    return { zone: 'empty' };
}

// ─── Star SVG ─────────────────────────────────────────────────────────────────
function StarIcon() {
    return (
        <svg className={layoutStyles.starIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
                fill="#f39c12" stroke="#e67e22" strokeWidth="0.5" />
        </svg>
    );
}

// ─── Single Token dot ─────────────────────────────────────────────────────────
function TokenDot({ token, isValid, onClick, cellWidthPct, leftPct, topPct, size = 1, animateDuration }) {
    const bg = TOKEN_COLORS[token.color];
    const border = TOKEN_BORDERS[token.color];
    return (
        <motion.div
            initial={false}
            animate={{ left: `${leftPct}%`, top: `${topPct}%` }}
            transition={{ type: "tween", duration: animateDuration || 0.25, ease: "linear" }}
            className={isValid ? tokenStyles.tokenValid : ''}
            style={{
                position: 'absolute',
                width: `${cellWidthPct}%`,
                height: `${cellWidthPct}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: isValid ? 20 : 10,
                cursor: isValid ? 'pointer' : 'default'
            }}
            onClick={isValid ? onClick : undefined}
            role={isValid ? 'button' : 'img'}
            aria-label={`${token.color} token`}
        >
            <div
                className={tokenStyles.tokenDotVisual}
                style={{
                    '--tc': bg,
                    '--tb': border,
                    width: `${size * 78}%`,
                    height: `${size * 78}%`
                }}
            />
        </motion.div>
    );
}

// ─── Cell (renders static board geometry) ─────────────────────────────────────
function Cell({ row, col }) {
    const cid = `${row},${col}`;
    const { zone, color } = getCellZone(row, col);
    const isSafe = SAFE_SQUARES.has(cid);
    const startColor = START_SQUARES[cid];

    const isYardSlot = zone === 'yard' && YARD_TOKEN_CELLS[color]?.has(cid);
    const isCenter = zone === 'center';

    const cls = [layoutStyles.cell];
    if (zone === 'yard') cls.push(layoutStyles[`yard_${color}`]);
    if (zone === 'home') cls.push(layoutStyles[`home_${color}`]);
    if (startColor) cls.push(tokenStyles[`home_${startColor}`]);
    if (zone === 'track') cls.push(layoutStyles.trackCell);
    if (isCenter) cls.push(layoutStyles.centerCell);
    if (isSafe && zone === 'track' && !startColor) cls.push(layoutStyles.safeCell);

    return (
        <div
            className={cls.join(' ')}
            data-safe={isSafe || undefined}
            style={{
                gridRow: isCenter ? '7 / 10' : row + 1,
                gridColumn: isCenter ? '7 / 10' : col + 1
            }}
        >
            {isSafe && zone === 'track' && !startColor && <StarIcon />}
            {isCenter && <div className={layoutStyles.centerInner} />}
            {isYardSlot && <div className={`${layoutStyles.yardSlot} ${layoutStyles['slot_' + color]}`} />}
        </div>
    );
}

// ─── Board ─────────────────────────────────────────────────────────────────────
export default function Board({ tokens, validMoveIds, onTokenClick }) {
    // 1. Build grid cells
    const cells = [];
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
            const { zone } = getCellZone(row, col);
            if (zone === 'center') {
                if (row === 7 && col === 7) cells.push(<Cell key={`${row},${col}`} row={row} col={col} />);
                continue;
            }
            cells.push(<Cell key={`${row},${col}`} row={row} col={col} />);
        }
    }

    // 2. Compute absolute token renders
    const tokenRenders = [];
    const cellWidthPct = 100 / 15;
    const cellMap = new Map();

    for (const tok of tokens) {
        let row, col;
        if (tok.step === 0) {
            const config = COLOR_CONFIG[tok.color];
            const [r, c] = config.yardTokenPositions[tok.yardSlot];
            row = r; col = c;
        } else {
            const cid = getCellForStep(tok.color, tok.step);
            if (!cid) continue;
            [row, col] = cid.split(',').map(Number);
        }

        const key = `${row},${col}`;
        if (!cellMap.has(key)) cellMap.set(key, []);
        cellMap.get(key).push(tok);
    }

    for (const [key, toksOnCell] of cellMap.entries()) {
        const [row, col] = key.split(',').map(Number);
        const count = toksOnCell.length;

        toksOnCell.forEach((tok, index) => {
            let size = 1;
            let diffX = 0;
            let diffY = 0;

            if (row === 7 && col === 7) {
                // Tokens in the final finish square
                size = 0.45;

                // Shift the geometric center to place them deep inside their respective colored triangle
                const baseShift = 0.85 * cellWidthPct; // approx 5.6% 
                const baseX = tok.color === 'blue' ? -baseShift : tok.color === 'green' ? baseShift : 0;
                const baseY = tok.color === 'red' ? -baseShift : tok.color === 'yellow' ? baseShift : 0;

                // Form a clean perfect 2x2 square inside the triangle, independently mapping each of the 4 available tokens to a fixed spot  
                const gridOffset = 1.4;
                const cPos = [
                    [-gridOffset, -gridOffset],
                    [gridOffset, -gridOffset],
                    [-gridOffset, gridOffset],
                    [gridOffset, gridOffset]
                ];

                diffX = baseX + cPos[tok.yardSlot][0];
                diffY = baseY + cPos[tok.yardSlot][1];
            } else {
                if (count === 2) {
                    size = 0.72;
                    diffX = index === 0 ? -1.2 : 1.2;
                    diffY = index === 0 ? -1.2 : 1.2;
                } else if (count >= 3) {
                    size = 0.52;
                    const positions = [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]];
                    const p = positions[index % 4];
                    diffX = p[0];
                    diffY = p[1];
                }
            }

            const leftPct = col * cellWidthPct + diffX;
            const topPct = row * cellWidthPct + diffY;

            tokenRenders.push(
                <TokenDot
                    key={tok.id}
                    token={tok}
                    isValid={validMoveIds.includes(tok.id)}
                    onClick={() => onTokenClick(tok.id)}
                    size={size}
                    cellWidthPct={cellWidthPct}
                    leftPct={leftPct}
                    topPct={topPct}
                    animateDuration={tok.animateDuration}
                />
            );
        });
    }

    return (
        <div className={layoutStyles.boardWrapper}>
            <div className={layoutStyles.board}>
                {cells}

                {/* Overlay yards decorations */}
                <div className={`${layoutStyles.yardWhiteBox} ${layoutStyles.top_left_white}`} />
                <div className={`${layoutStyles.yardWhiteBox} ${layoutStyles.top_right_white}`} />
                <div className={`${layoutStyles.yardWhiteBox} ${layoutStyles.bottom_left_white}`} />
                <div className={`${layoutStyles.yardWhiteBox} ${layoutStyles.bottom_right_white}`} />

                {/* Token Overlay */}
                {tokenRenders}
            </div>
        </div>
    );
}
