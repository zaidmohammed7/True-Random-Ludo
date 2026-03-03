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
    playerName,
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
                <span className={styles.playerLabel}>{playerName || COLOR_LABELS[currentPlayer]}'s Turn</span>
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

            <div className={styles.interactiveRow}>
                {/* 3D Dice Scene */}
                <div className={styles.diceScene}>
                    <div className={`${styles.diceWrapper} ${rolling ? styles.rolling : ''}`}>
                        <div className={`${styles.diceCube} ${rolling ? styles.rolling : styles['show' + (diceValue || 1)]}`}>
                            <div className={`${styles.diceFace} ${styles.face1}`}>
                                <span className={`${styles.dot} ${styles.posG}`} />
                            </div>
                            <div className={`${styles.diceFace} ${styles.face2}`}>
                                <span className={`${styles.dot} ${styles.posA}`} />
                                <span className={`${styles.dot} ${styles.posB}`} />
                            </div>
                            <div className={`${styles.diceFace} ${styles.face3}`}>
                                <span className={`${styles.dot} ${styles.posA}`} />
                                <span className={`${styles.dot} ${styles.posG}`} />
                                <span className={`${styles.dot} ${styles.posB}`} />
                            </div>
                            <div className={`${styles.diceFace} ${styles.face4}`}>
                                <span className={`${styles.dot} ${styles.posA}`} />
                                <span className={`${styles.dot} ${styles.posC}`} />
                                <span className={`${styles.dot} ${styles.posD}`} />
                                <span className={`${styles.dot} ${styles.posB}`} />
                            </div>
                            <div className={`${styles.diceFace} ${styles.face5}`}>
                                <span className={`${styles.dot} ${styles.posA}`} />
                                <span className={`${styles.dot} ${styles.posC}`} />
                                <span className={`${styles.dot} ${styles.posG}`} />
                                <span className={`${styles.dot} ${styles.posD}`} />
                                <span className={`${styles.dot} ${styles.posB}`} />
                            </div>
                            <div className={`${styles.diceFace} ${styles.face6}`}>
                                <span className={`${styles.dot} ${styles.posA}`} />
                                <span className={`${styles.dot} ${styles.posE}`} />
                                <span className={`${styles.dot} ${styles.posD}`} />
                                <span className={`${styles.dot} ${styles.posC}`} />
                                <span className={`${styles.dot} ${styles.posF}`} />
                                <span className={`${styles.dot} ${styles.posB}`} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.actionCol}>
                    {/* Consecutive 6s warning */}
                    {consecutiveSixes > 0 && (
                        <div className={styles.sixsWarning}>
                            {consecutiveSixes === 1 && '⚠️ One 6 in a row'}
                            {consecutiveSixes === 2 && '🚨 Two 6s in a row!'}
                        </div>
                    )}

                    {/* Extra turn badge */}
                    {extraTurn && (
                        <div className={styles.extraTurnBadge}>🎯 Extra Turn!</div>
                    )}

                    {/* Roll button */}
                    {!isMyTurn ? (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center', color: '#bdc3c7', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            Waiting for opponent...
                        </div>
                    ) : (
                        <button
                            className={`${styles.rollBtn} ${!canRoll ? styles.disabled : ''}`}
                            onClick={handleRoll}
                            disabled={!canRoll}
                        >
                            {rolling ? 'Rolling…' : phase === 'move' ? 'Move Token' : 'Roll Dice 🎲'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
