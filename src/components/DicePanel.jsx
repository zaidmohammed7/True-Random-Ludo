import React, { useState } from 'react';
import styles from './DicePanel.module.css';

const DICE_FACES = {
    1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

const COLOR_LABELS = {
    red: '🔴 Red',
    blue: '🔵 Blue',
    yellow: '🟡 Yellow',
    green: '🟢 Green',
};

const COLOR_MAP = {
    red: '#e74c3c',
    blue: '#3498db',
    yellow: '#f1c40f',
    green: '#2ecc71',
};

export default function DicePanel({
    currentPlayer,
    diceValue,
    phase,
    consecutiveSixes,
    extraTurn,
    lastMessage,
    onRoll,
    players,
    isMyTurn
}) {
    const [rolling, setRolling] = useState(false);
    const [rollingFace, setRollingFace] = useState(null);

    function handleRoll(e, customVal) {
        if (phase !== 'roll' || rolling) return;
        setRolling(true);

        const cycle = setInterval(() => {
            setRollingFace(Math.floor(Math.random() * 6) + 1);
        }, 50);

        setTimeout(() => {
            clearInterval(cycle);
            setRollingFace(null);
            onRoll(customVal || null);
            setRolling(false);
        }, 600);
    }

    const color = COLOR_MAP[currentPlayer];
    const canRoll = phase === 'roll' && !rolling && isMyTurn;

    return (
        <div className={styles.panel} style={{ '--player-color': color }}>
            {/* Player Indicator */}
            <div className={styles.playerBadge}>
                <div className={styles.playerDot} />
                <span className={styles.playerLabel}>{COLOR_LABELS[currentPlayer]}'s Turn</span>
            </div>

            {/* Turn order strip */}
            <div className={styles.turnOrder}>
                {players.map(p => (
                    <div
                        key={p}
                        className={`${styles.playerPip} ${p === currentPlayer ? styles.activePip : ''}`}
                        style={{ '--pip-color': COLOR_MAP[p] }}
                    />
                ))}
            </div>

            {/* 3D Dice Scene */}
            <div className={styles.diceScene}>
                <div className={`${styles.diceWrapper} ${rolling ? styles.rolling : ''}`}>
                    <div className={`${styles.diceCube} ${rolling ? styles.rolling : styles['show' + (diceValue || 1)]}`}>
                        <div className={`${styles.diceFace} ${styles.face1}`}>
                            <span className={styles.dot} style={{ gridArea: 'g' }} />
                        </div>
                        <div className={`${styles.diceFace} ${styles.face2}`}>
                            <span className={styles.dot} style={{ gridArea: 'a' }} />
                            <span className={styles.dot} style={{ gridArea: 'b' }} />
                        </div>
                        <div className={`${styles.diceFace} ${styles.face3}`}>
                            <span className={styles.dot} style={{ gridArea: 'a' }} />
                            <span className={styles.dot} style={{ gridArea: 'g' }} />
                            <span className={styles.dot} style={{ gridArea: 'b' }} />
                        </div>
                        <div className={`${styles.diceFace} ${styles.face4}`}>
                            <span className={styles.dot} style={{ gridArea: 'a' }} />
                            <span className={styles.dot} style={{ gridArea: 'c' }} />
                            <span className={styles.dot} style={{ gridArea: 'd' }} />
                            <span className={styles.dot} style={{ gridArea: 'b' }} />
                        </div>
                        <div className={`${styles.diceFace} ${styles.face5}`}>
                            <span className={styles.dot} style={{ gridArea: 'a' }} />
                            <span className={styles.dot} style={{ gridArea: 'c' }} />
                            <span className={styles.dot} style={{ gridArea: 'g' }} />
                            <span className={styles.dot} style={{ gridArea: 'd' }} />
                            <span className={styles.dot} style={{ gridArea: 'b' }} />
                        </div>
                        <div className={`${styles.diceFace} ${styles.face6}`}>
                            <span className={styles.dot} style={{ gridArea: 'a' }} />
                            <span className={styles.dot} style={{ gridArea: 'e' }} />
                            <span className={styles.dot} style={{ gridArea: 'd' }} />
                            <span className={styles.dot} style={{ gridArea: 'c' }} />
                            <span className={styles.dot} style={{ gridArea: 'f' }} />
                            <span className={styles.dot} style={{ gridArea: 'b' }} />
                        </div>
                    </div>
                </div>
            </div>

            {diceValue && !rolling && (
                <div className={styles.diceNumber}>{diceValue}</div>
            )}

            {/* Consecutive 6s warning */}
            {consecutiveSixes > 0 && (
                <div className={styles.sixsWarning}>
                    {consecutiveSixes === 1 && '⚠️ One 6 in a row'}
                    {consecutiveSixes === 2 && '🚨 Two 6s in a row! Next 6 forfeits!'}
                </div>
            )}

            {/* Extra turn badge */}
            {extraTurn && (
                <div className={styles.extraTurnBadge}>🎯 Extra Turn!</div>
            )}

            {/* Last message */}
            {lastMessage && (
                <div className={styles.message}>{lastMessage}</div>
            )}

            {/* Roll button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!isMyTurn ? (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center', color: '#bdc3c7', fontWeight: 'bold' }}>
                        Waiting for opponent...
                    </div>
                ) : (
                    <button
                        className={`${styles.rollBtn} ${!canRoll ? styles.disabled : ''}`}
                        onClick={handleRoll}
                        disabled={!canRoll}
                    >
                        {rolling ? 'Rolling…' : phase === 'move' ? 'Select a Token' : 'Roll Dice 🎲'}
                    </button>
                )}
            </div>

            {/* Phase hint */}
            <div className={styles.phaseHint}>
                {phase === 'roll' && 'Click Roll Dice to begin your turn'}
                {phase === 'move' && 'Click a highlighted token to move it'}
            </div>
        </div>
    );
}
