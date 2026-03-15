import React, { useState, useEffect } from 'react';
import { auditRolls } from '../utils/dice';
import styles from './StartScreen.module.css';

const ALL_COLORS = [
    { id: 'red', label: 'Red', hex: '#e74c3c', border: '#c0392b' },
    { id: 'blue', label: 'Blue', hex: '#3498db', border: '#2980b9' },
    { id: 'yellow', label: 'Yellow', hex: '#f1c40f', border: '#d68910' },
    { id: 'green', label: 'Green', hex: '#2ecc71', border: '#1e8449' }
];

export default function StartScreen({ onStart, multi }) {
    const [joinInput, setJoinInput] = useState('');
    const [auditResult, setAuditResult] = useState(null);
    const [auditing, setAuditing] = useState(false);

    // PWA Install Prompt State
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        }
    };

    // LOBBY STATE
    // This maps peerId -> { isHost: boolean, ready: boolean, colors: [] }
    const [lobby, setLobby] = useState({});

    // Names for each chosen color
    const [colorNames, setColorNames] = useState(() => {
        try { return JSON.parse(localStorage.getItem('ludo_color_names')) || {}; }
        catch { return {}; }
    });

    // The lobby state is derived from local selections if Pass & Play,
    // or synced over the network if Host/Guest.

    // Calculate total claimed colors across entire lobby
    const allClaimedColors = Object.values(lobby).flatMap(p => p.colors);

    // Listen to network events
    useEffect(() => {
        if (multi.mode === 'local' || multi.incomingActions.length === 0) return;

        const act = multi.incomingActions[0];

        // As HOST
        if (multi.mode === 'host') {
            if (act.type === 'PEER_CONNECT') {
                setLobby(prev => {
                    const newLobby = { ...prev, [act.peerId]: { isHost: false, ready: false, colors: [] } };
                    multi.sendAction({ type: 'SYNC_LOBBY', lobby: newLobby });
                    return newLobby;
                });
                multi.sendAction({ type: 'SYNC_NAMES', colorNames });
            }
            else if (act.type === 'PEER_DISCONNECT') {
                setLobby(prev => {
                    const newLobby = { ...prev };
                    delete newLobby[act.peerId];
                    multi.sendAction({ type: 'SYNC_LOBBY', lobby: newLobby });
                    return newLobby;
                });
            }
            else if (act.type === 'TOGGLE_COLOR' && act._from) {
                setLobby(prev => {
                    const newLobby = { ...prev };
                    const p = { ...(newLobby[act._from] || { colors: [] }) };
                    if (p.colors.includes(act.color)) {
                        p.colors = p.colors.filter(c => c !== act.color);
                    } else {
                        const localClaimed = Object.values(prev).flatMap(x => x.colors);
                        if (!localClaimed.includes(act.color)) {
                            p.colors = [...p.colors, act.color];
                        }
                    }
                    newLobby[act._from] = p;
                    multi.sendAction({ type: 'SYNC_LOBBY', lobby: newLobby });
                    return newLobby;
                });
            }
            else if (act.type === 'TOGGLE_READY' && act._from) {
                setLobby(prev => {
                    const newLobby = { ...prev };
                    if (newLobby[act._from]) {
                        const p = { ...newLobby[act._from] };
                        p.ready = !p.ready;
                        newLobby[act._from] = p;
                        multi.sendAction({ type: 'SYNC_LOBBY', lobby: newLobby });
                    }
                    return newLobby;
                });
            }
            else if (act.type === 'SET_NAME' && act._from) {
                setColorNames(prev => {
                    const next = { ...prev, [act.color]: act.name };
                    localStorage.setItem('ludo_color_names', JSON.stringify(next));
                    multi.sendAction({ type: 'SYNC_NAMES', colorNames: next });
                    return next;
                });
            }
        }
        // As GUEST
        else if (multi.mode === 'guest') {
            if (act.type === 'SYNC_LOBBY') {
                setLobby(act.lobby);
            }
            if (act.type === 'SYNC_NAMES') {
                setColorNames(act.colorNames);
                localStorage.setItem('ludo_color_names', JSON.stringify(act.colorNames));
            }
            if (act.type === 'START_GAME') {
                const myLobbyProfile = act.lobby[multi.myPeerId] || { colors: [] };
                setColorNames(act.colorNames);
                localStorage.setItem('ludo_color_names', JSON.stringify(act.colorNames));
                onStart({
                    selectedColors: act.players,
                    localColors: myLobbyProfile.colors,
                    colorNames: act.colorNames
                });
            }
        }

        multi.consumeAction();
    }, [multi.incomingActions, multi.mode, allClaimedColors, multi]);

    // Initialize Host Lobby when host mode activates
    useEffect(() => {
        if (multi.mode === 'host' && multi.myPeerId && Object.keys(lobby).length === 0) {
            setLobby({
                [multi.myPeerId]: { isHost: true, ready: true, colors: [] }
            });
        }
        if (multi.mode === 'local' && Object.keys(lobby).length === 0) {
            setLobby({
                'local': { isHost: true, ready: true, colors: [] }
            });
        }
    }, [multi.mode, multi.myPeerId, lobby]);

    const myId = multi.mode === 'local' ? 'local' : multi.myPeerId;
    const amIReady = lobby[myId]?.ready || false;

    // Is everyone in the lobby ready?
    const guests = Object.entries(lobby).filter(([id, p]) => !p.isHost);
    const allGuestsReady = guests.length > 0 && guests.every(([id, p]) => p.ready);
    const hasEnoughPlayers = allClaimedColors.length >= 2;

    function handleStart() {
        if (!hasEnoughPlayers) return;

        // Ensure players are passed in correct clockwise order
        const orderedPlayers = ALL_COLORS.map(c => c.id).filter(id => allClaimedColors.includes(id));

        if (multi.mode === 'host') {
            multi.sendAction({ type: 'START_GAME', players: orderedPlayers, lobby, colorNames });
            localStorage.setItem('ludo_was_host', 'true');
            localStorage.setItem('ludo_cached_roomcode', multi.roomCode);
        } else if (multi.mode === 'guest') {
            localStorage.setItem('ludo_was_guest', 'true');
            localStorage.setItem('ludo_cached_roomcode', multi.roomCode);
        } else {
            localStorage.removeItem('ludo_was_host');
            localStorage.removeItem('ludo_was_guest');
            localStorage.removeItem('ludo_cached_roomcode');
        }

        onStart({
            selectedColors: orderedPlayers,
            localColors: lobby[myId]?.colors || [],
            colorNames
        });
    }

    function toggleColor(colorId) {
        if (multi.mode === 'local') {
            setLobby(prev => {
                const newLobby = { ...prev };
                const p = { ...(newLobby['local'] || { colors: [] }) };
                if (p.colors.includes(colorId)) {
                    p.colors = p.colors.filter(c => c !== colorId);
                } else {
                    p.colors = [...p.colors, colorId];
                }
                newLobby['local'] = p;
                return newLobby;
            });
        }
        else if (multi.mode === 'host') {
            setLobby(prev => {
                const newLobby = { ...prev };
                const p = { ...(newLobby[myId] || { colors: [] }) };
                if (p.colors.includes(colorId)) {
                    p.colors = p.colors.filter(c => c !== colorId);
                } else {
                    const localClaimed = Object.values(prev).flatMap(x => x.colors);
                    if (!localClaimed.includes(colorId)) {
                        p.colors = [...p.colors, colorId];
                    }
                }
                newLobby[myId] = p;
                multi.sendAction({ type: 'SYNC_LOBBY', lobby: newLobby });
                return newLobby;
            });
        }
        else if (multi.mode === 'guest') {
            multi.sendAction({ type: 'TOGGLE_COLOR', color: colorId });
        }
    }

    function toggleReady() {
        if (multi.mode === 'guest') {
            multi.sendAction({ type: 'TOGGLE_READY' });
        }
    }

    function runAudit() {
        setAuditing(true);
        setTimeout(() => {
            const counts = auditRolls(6000);
            setAuditResult(counts);
            setAuditing(false);
        }, 50);
    }

    return (
        <div className={styles.screen}>
            <div className={styles.card}>
                <div className={styles.title}>
                    <span className={styles.titleIcon}>♟</span>
                    <h1>LUDO</h1>
                    <span className={styles.titleIcon}>♟</span>
                </div>
                <p className={styles.subtitle}>Classic board game — true randomness guaranteed</p>

                {deferredPrompt && (
                    <button className={styles.installBtn} onClick={handleInstallClick}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Install App
                    </button>
                )}

                {/* Networking Tabs */}
                {Object.keys(lobby).length <= 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', width: '100%' }}>
                        {[{ id: 'local', label: 'Pass & Play' }, { id: 'host', label: 'Host Game' }, { id: 'guest', label: 'Join Game' }].map(m => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    setLobby({});
                                    if (m.id === 'local') { multi.disconnect(); setJoinInput(''); }
                                    else if (m.id === 'host') { multi.disconnect(); multi.hostGame(); setJoinInput(''); }
                                    else if (m.id === 'guest') { multi.disconnect(); multi.setMode('guest'); setJoinInput(''); }
                                }}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                    background: (multi.mode === m.id || (m.id === 'guest' && joinInput !== '' && multi.mode !== 'host' && multi.mode !== 'local')) ? '#3498db' : 'transparent',
                                    color: 'white', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Guest Join flow */}
                {(!['local', 'host'].includes(multi.mode) || multi.mode === 'guest') && multi.status !== 'connected' && (
                    <div className={styles.section} style={{ padding: '20px 0' }}>
                        <label className={styles.sectionLabel}>Enter 4-Character Room Code</label>
                        <input
                            type="text"
                            placeholder="CODE"
                            value={joinInput}
                            maxLength={4}
                            onChange={e => {
                                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                setJoinInput(val);
                                if (val.length === 4) multi.joinGame(val);
                            }}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.2)', color: 'white', textTransform: 'uppercase', padding: '16px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '12px', width: '100%', outline: 'none', letterSpacing: '0.5em', fontWeight: 'bold' }}
                        />
                        {multi.status === 'connecting' && <div style={{ color: '#f39c12', marginTop: '12px', fontWeight: 'bold' }}>Connecting to host...</div>}
                    </div>
                )}

                {/* Common Lobby UI (Visible once connected or local/host) */}
                {(multi.status === 'connected' || multi.mode === 'local' || multi.mode === 'host') && (
                    <>
                        <div className={styles.section}>
                            <label className={styles.sectionLabel}>Select Your Color(s)</label>
                            <div className={styles.countButtons}>
                                {ALL_COLORS.map(({ id, label, hex, border }) => {
                                    // See who has claimed this
                                    const claimerEntry = Object.entries(lobby).find(([peerId, p]) => p.colors.includes(id));
                                    const takenByMe = claimerEntry && claimerEntry[0] === String(myId);
                                    const takenByOther = claimerEntry && claimerEntry[0] !== String(myId);

                                    const isClickable = !takenByOther && (!amIReady || multi.mode !== 'guest');
                                    const myColorName = colorNames[id] || '';

                                    return (
                                        <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button
                                                className={`${styles.colorBtn} ${takenByMe ? styles.active : ''}`}
                                                onClick={() => {
                                                    if (isClickable) toggleColor(id);
                                                }}
                                                style={{
                                                    '--btn-color': hex,
                                                    filter: takenByOther ? 'grayscale(100%) opacity(0.2)' : 'none',
                                                    boxShadow: takenByMe ? `0 0 0 3px ${hex}, 0 0 15px ${hex}` : 'none',
                                                    cursor: isClickable ? 'pointer' : 'not-allowed',
                                                    transform: takenByMe ? 'scale(1.05)' : 'none',
                                                    transition: 'all 0.2s',
                                                    border: takenByMe ? `2px solid #fff` : `2px solid transparent`
                                                }}
                                            >
                                                <div className={styles.tokenVisual} style={{ background: hex, borderColor: border }} />
                                                <span>{label}</span>
                                                {takenByOther && <span style={{ fontSize: '0.6rem', color: '#e74c3c' }}>Taken</span>}
                                            </button>

                                            {takenByMe && (
                                                <input
                                                    type="text"
                                                    placeholder="Name..."
                                                    value={myColorName}
                                                    onChange={(e) => {
                                                        const val = e.target.value.substring(0, 10);
                                                        setColorNames(prev => {
                                                            const next = { ...prev, [id]: val };
                                                            localStorage.setItem('ludo_color_names', JSON.stringify(next));
                                                            if (multi.mode === 'guest') {
                                                                multi.sendAction({ type: 'SET_NAME', color: id, name: val });
                                                            } else if (multi.mode === 'host' || multi.mode === 'local') {
                                                                multi.sendAction({ type: 'SYNC_NAMES', colorNames: next });
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)', color: 'white', textAlign: 'center', fontSize: '0.8rem' }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Host Code Display */}
                        {multi.mode === 'host' && (
                            <div style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '16px', borderRadius: '12px', width: '100%', textAlign: 'center', border: '1px solid rgba(52, 152, 219, 0.3)', marginTop: '8px' }}>
                                <div style={{ fontSize: '0.85rem', color: '#bdc3c7', textTransform: 'uppercase', marginBottom: '8px' }}>Your Room Code</div>
                                <div style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.2em', color: '#3498db' }}>{multi.roomCode || '...'}</div>
                                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#bdc3c7' }}>
                                    Players in lobby: <strong>{Object.keys(lobby).length}</strong>
                                </div>
                            </div>
                        )}

                        {/* Guest Ready Display */}
                        {multi.mode === 'guest' && (
                            <button
                                className={styles.startBtn}
                                onClick={toggleReady}
                                style={{
                                    background: amIReady ? '#e67e22' : '#2ecc71',
                                    marginTop: '16px'
                                }}
                            >
                                {amIReady ? 'Unready' : 'I am Ready!'}
                            </button>
                        )}

                        {/* Start Button (Host or Local) */}
                        {['local', 'host'].includes(multi.mode) && (
                            <button
                                className={styles.startBtn}
                                onClick={handleStart}
                                disabled={!hasEnoughPlayers || (multi.mode === 'host' && !allGuestsReady)}
                                style={{
                                    marginTop: '8px'
                                }}
                            >
                                {multi.mode === 'host' ?
                                    (!hasEnoughPlayers ? 'Select min 2 colors across lobby' :
                                        !allGuestsReady ? 'Waiting for guests to ready...' :
                                            'Start Online Match 🎲')
                                    : 'Start Game 🎲'}
                            </button>
                        )}
                    </>
                )}

                {/* Fairness audit */}
                <div className={styles.auditSection}>
                    <button
                        className={styles.auditBtn}
                        onClick={runAudit}
                        disabled={auditing}
                    >
                        {auditing ? 'Running audit…' : '🎲 Fairness Audit (6000 rolls)'}
                    </button>
                    {auditResult && (
                        <div className={styles.auditResult}>
                            <div className={styles.auditTitle}>Roll Distribution</div>
                            <table className={styles.auditTable}>
                                <thead>
                                    <tr>
                                        <th>Face</th>
                                        {[1, 2, 3, 4, 5, 6].map(n => <th key={n}>{n}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Count</td>
                                        {[1, 2, 3, 4, 5, 6].map(n => (
                                            <td key={n} className={styles.auditCount}>{auditResult[n]}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
