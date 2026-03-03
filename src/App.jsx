import React, { useState, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import Board from './components/Board';
import DicePanel from './components/DicePanel';
import WinModal from './components/WinModal';
import { useGameState } from './hooks/useGameState';
import { useMultiplayer } from './hooks/useMultiplayer';
import styles from './App.module.css';

function Game({ gameConfig, multi, onRestart }) {
  const { initialPlayers, localColors, colorNames = {} } = gameConfig;
  const { state, roll, moveToken, reset } = useGameState(initialPlayers);

  // Sync networking for active Game
  useEffect(() => {
    if (multi.incomingActions.length > 0) {
      const act = multi.incomingActions[0];
      multi.consumeAction();

      if (act.type === 'roll') roll(act.value);
      if (act.type === 'move') moveToken(act.tokenId);
    }
  }, [multi.incomingActions, multi, roll, moveToken]);

  const currentColor = state.players[state.currentPlayerIndex];
  const isMyTurn = multi.mode === 'local' || localColors.includes(currentColor);

  function handleRoll(val) {
    if (!isMyTurn) return;
    const rolled = roll(val);
    if (rolled && multi.mode !== 'local') {
      multi.sendAction({ type: 'roll', value: rolled });
    }
  }

  function handleTokenClick(tokenId) {
    if (!isMyTurn) return;
    if (state.phase === 'move' && state.validMoveIds.includes(tokenId)) {
      moveToken(tokenId);
      if (multi.mode !== 'local') multi.sendAction({ type: 'move', tokenId });
    }
  }

  function handleRestart() {
    onRestart();
  }

  return (
    <div className={styles.gameLayout}>
      <header className={styles.header}>
        <div className={styles.logo}>♟ LUDO</div>
        {multi.mode !== 'local' && multi.roomCode && (
          <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', fontSize: '1rem', background: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '12px' }}>
            Room Code: <span style={{ color: '#f1c40f', letterSpacing: '1px' }}>{multi.roomCode.toUpperCase()}</span>
          </div>
        )}
        <button className={styles.menuBtn} onClick={handleRestart}>
          ☰ Quit
        </button>
      </header>

      <main className={styles.main}>
        <Board
          tokens={state.tokens}
          validMoveIds={state.validMoveIds}
          onTokenClick={handleTokenClick}
        />

        <aside className={styles.sidebar}>
          <DicePanel
            currentPlayer={currentColor}
            playerName={colorNames[currentColor]}
            diceValue={state.diceValue}
            phase={state.phase}
            consecutiveSixes={state.consecutiveSixes}
            extraTurn={state.extraTurn}
            lastMessage={state.lastMessage}
            onRoll={handleRoll}
            players={state.players}
            isMyTurn={isMyTurn}
          />

          {/* Rules quick-ref */}
          <div className={styles.rulesCard}>
            <div className={styles.rulesTitle}>Quick Rules</div>
            <ul className={styles.rulesList}>
              <li>Roll <strong>6</strong> to exit yard</li>
              <li>Roll <strong>6</strong> → extra turn</li>
              <li>Three 6s → forfeit turn</li>
              <li>Capture = extra roll</li>
              <li>★ Safe squares: no capture</li>
              <li>Exact roll to reach home</li>
            </ul>
          </div>
        </aside>
      </main>

      {state.phase === 'gameover' && state.winner && (
        <WinModal winner={state.winner} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default function App() {
  const multi = useMultiplayer();
  const [gameConfig, setGameConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('ludoConfig_cache');
      if (saved) return JSON.parse(saved);
    } catch { }
    return null;
  });

  useEffect(() => {
    if (gameConfig) {
      localStorage.setItem('ludoConfig_cache', JSON.stringify({
        initialPlayers: gameConfig.initialPlayers,
        localColors: gameConfig.localColors,
        colorNames: gameConfig.colorNames
      }));
    } else {
      localStorage.removeItem('ludoConfig_cache');
      localStorage.removeItem('ludo_game_state_cache');
    }
  }, [gameConfig]);

  if (!gameConfig) {
    return <StartScreen multi={multi} onStart={(config) => {
      setGameConfig({
        initialPlayers: config.selectedColors,
        localColors: config.localColors,
        colorNames: config.colorNames || {}
      });
    }} />;
  }

  // Attempt to reconnect to a cached host lobby dynamically (for guests reloading)
  useEffect(() => {
    if (gameConfig && multi.status === 'disconnected') {
      const savedRoom = localStorage.getItem('ludo_cached_roomcode');
      if (savedRoom) {
        if (localStorage.getItem('ludo_was_host') === 'true') {
          // We can't trivially resume hosting the same peer ID via random re-init in PeerJS right now,
          // so we will just let them play local or they need to issue a new invite
        } else if (localStorage.getItem('ludo_was_guest') === 'true') {
          multi.joinGame(savedRoom);
        }
      }
    }
  }, [gameConfig, multi]);

  return (
    <Game
      key={gameConfig.initialPlayers.join('-')}
      gameConfig={gameConfig}
      multi={multi}
      onRestart={() => {
        multi.disconnect();
        localStorage.removeItem('ludoConfig_cache');
        localStorage.removeItem('ludo_game_state_cache');
        localStorage.removeItem('ludo_cached_roomcode');
        localStorage.removeItem('ludo_was_host');
        localStorage.removeItem('ludo_was_guest');
        setGameConfig(null);
      }}
    />
  );
}
