import React from 'react';
import styles from './Token.module.css';

const COLOR_MAP = {
    red: '#e74c3c',
    blue: '#3498db',
    yellow: '#f1c40f',
    green: '#2ecc71',
};

const BORDER_MAP = {
    red: '#96281b',
    blue: '#1f6390',
    yellow: '#d4ac0d',
    green: '#1e8449',
};

export default function Token({ token, isValid, onClick }) {
    const color = COLOR_MAP[token.color];
    const border = BORDER_MAP[token.color];

    return (
        <div
            className={`${styles.token} ${isValid ? styles.valid : ''} ${token.phase === 'home' ? styles.atHome : ''}`}
            style={{ '--token-color': color, '--token-border': border }}
            onClick={isValid ? onClick : undefined}
            title={`${token.color} token ${token.yardSlot}`}
            role={isValid ? 'button' : 'img'}
            aria-label={`${token.color} token`}
        >
            <div className={styles.tokenInner} />
            {isValid && <div className={styles.pulse} />}
        </div>
    );
}
