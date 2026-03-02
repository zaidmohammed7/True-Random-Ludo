import React from 'react';
import styles from './WinModal.module.css';

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

export default function WinModal({ winner, onRestart }) {
    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ '--win-color': COLOR_MAP[winner] }}>
                <div className={styles.confetti}>
                    {Array.from({ length: 20 }, (_, i) => (
                        <div
                            key={i}
                            className={styles.confettiPiece}
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                background: Object.values(COLOR_MAP)[i % 4],
                            }}
                        />
                    ))}
                </div>

                <div className={styles.trophy}>🏆</div>
                <h2 className={styles.winnerTitle}>{COLOR_LABELS[winner]}</h2>
                <p className={styles.winnerSubtitle}>Wins the game!</p>

                <div className={styles.winGlow} />

                <button className={styles.restartBtn} onClick={onRestart}>
                    Play Again 🎲
                </button>
            </div>
        </div>
    );
}
