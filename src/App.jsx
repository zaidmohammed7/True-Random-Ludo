import React, { useState, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import Board from './components/Board';
import DicePanel from './components/DicePanel';
import WinModal from './components/WinModal';
import { useGameState } from './hooks/useGameState';
import { useMultiplayer } from './hooks/useMultiplayer';
import styles from './App.module.css';

function Game({ gameConfig, multi, onRestart }) {
  const { initialPlayers, localColors } = gameConfig;
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
        <button className={styles.menuBtn} onClick={handleRestart}>
          ☰ New Game
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
  const [gameConfig, setGameConfig] = useState(null);

  if (!gameConfig) {
    return <StartScreen multi={multi} onStart={(config) => {
      setGameConfig({ initialPlayers: config.selectedColors, localColors: config.localColors, multi });
    }} />;
  }

  return (
    <Game
      key={gameConfig.initialPlayers.join('-')}
      gameConfig={gameConfig}
      multi={multi}
      onRestart={() => {
        multi.disconnect();
        setGameConfig(null);
      }}
    />
  );
}
