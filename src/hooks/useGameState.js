import { useReducer, useCallback, useEffect } from 'react';
import { rollDice } from '../utils/dice';
import {
    COLORS, COLOR_CONFIG, TRACK_CELLS, SAFE_SQUARES,
    getCellForStep, computeNewStep, isOnMainTrack, HOME_CELL,
} from '../utils/boardConstants';
// ─── Token factory ─────────────────────────────────────────────────────────────
function createTokens(players) {
    return players.flatMap(color =>
        [0, 1, 2, 3].map(i => ({
            id: `${color}-${i}`,
            color,
            step: 0,        // 0=yard, 1-52=main track, 53-57=home column, 58=home
            yardSlot: i,
        }))
    );
}

function createInitialState(players) {
    return {
        tokens: createTokens(players),
        players,
        currentPlayerIndex: 0,
        diceValue: null,
        consecutiveSixes: 0,
        phase: 'roll',        // 'roll' | 'move' | 'gameover'
        validMoveIds: [],
        winner: null,
        lastMessage: '',
        extraTurn: false,
    };
}

// ─── Compute which tokens can legally move ────────────────────────────────────
function computeValidMoves(tokens, color, dice) {
    return tokens
        .filter(t => t.color === color && t.step < 57)
        .filter(t => computeNewStep(color, t.step, dice) !== null)
        .map(t => t.id);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function gameReducer(state, action) {
    switch (action.type) {

        case 'ROLL_DICE': {
            const rolled = action.customValue || rollDice();
            const currentColor = state.players[state.currentPlayerIndex];
            const newSixes = rolled === 6 ? state.consecutiveSixes + 1 : 0;

            // Three consecutive 6s → forfeit
            if (newSixes === 3) {
                const next = (state.currentPlayerIndex + 1) % state.players.length;
                return {
                    ...state, diceValue: rolled, consecutiveSixes: 0,
                    currentPlayerIndex: next, phase: 'roll', validMoveIds: [],
                    extraTurn: false,
                    lastMessage: `Triple 6! ${currentColor.toUpperCase()} forfeits the turn!`,
                };
            }

            const validMoveIds = computeValidMoves(state.tokens, currentColor, rolled);

            if (validMoveIds.length === 0) {
                const next = (state.currentPlayerIndex + 1) % state.players.length;
                return {
                    ...state, diceValue: rolled, consecutiveSixes: 0,
                    currentPlayerIndex: next, phase: 'roll', validMoveIds: [],
                    extraTurn: false,
                    lastMessage: `${currentColor.toUpperCase()} rolled ${rolled} — no valid moves!`,
                };
            }

            return {
                ...state, diceValue: rolled, consecutiveSixes: newSixes,
                phase: 'move', validMoveIds,
                lastMessage: `${currentColor.toUpperCase()} rolled a ${rolled}!`,
            };
        }

        case 'ANIMATE_START': {
            return { ...state, phase: 'animating', validMoveIds: [] };
        }

        case 'ANIMATE_STEP': {
            const { tokenId, newStep, duration } = action;
            const newTokens = state.tokens.map(t =>
                t.id === tokenId ? { ...t, step: newStep, animateDuration: duration } : t
            );
            return { ...state, tokens: newTokens };
        }

        case 'MOVE_TOKEN_FINISH': {
            const { tokenId } = action;
            const token = state.tokens.find(t => t.id === tokenId);
            if (!token) return state;

            const color = token.color;
            const finalStep = token.step;
            const landingCell = getCellForStep(color, finalStep);

            // --- Capture check ---
            let captured = false;
            let newTokens = state.tokens.map(t => {
                if (t.id === tokenId) return { ...t, animateDuration: undefined };
                // Capture: opponent on same main-track cell, not a safe square
                if (
                    t.color !== color &&
                    isOnMainTrack(t.step) &&
                    isOnMainTrack(finalStep) &&
                    getCellForStep(t.color, t.step) === landingCell &&
                    !SAFE_SQUARES.has(landingCell)
                ) {
                    captured = true;
                    return { ...t, step: 0 }; // send back to yard
                }
                return t;
            });

            // --- Win check ---
            const won = newTokens.filter(t => t.color === color).every(t => t.step >= 57);
            if (won) {
                return {
                    ...state, tokens: newTokens, phase: 'gameover',
                    winner: color, validMoveIds: [],
                    lastMessage: `🎉 ${color.toUpperCase()} wins!`,
                };
            }

            // --- Extra turn logic ---
            const reachedHome = finalStep === 57;
            const getsExtra = state.diceValue === 6 || captured || reachedHome;
            if (getsExtra) {
                let msg = `${color.toUpperCase()} rolled 6! Extra turn! 🎲`;
                if (captured) msg = `${color.toUpperCase()} captured! Extra turn! 🎯`;
                else if (reachedHome) msg = `${color.toUpperCase()} reached home! Extra turn! 🌟`;

                return {
                    ...state, tokens: newTokens, phase: 'roll', validMoveIds: [],
                    extraTurn: true,
                    lastMessage: msg,
                };
            }

            const next = (state.currentPlayerIndex + 1) % state.players.length;
            return {
                ...state, tokens: newTokens, phase: 'roll',
                currentPlayerIndex: next, validMoveIds: [],
                consecutiveSixes: 0, extraTurn: false, lastMessage: '',
            };
        }

        case 'RESET':
            return createInitialState(action.players);

        default:
            return state;
    }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useGameState(players) {
    const [state, dispatch] = useReducer(gameReducer, players, createInitialState);

    const roll = useCallback((customValue) => {
        if (state.phase === 'roll') {
            const rolled = customValue || rollDice();
            dispatch({ type: 'ROLL_DICE', customValue: rolled });
            return rolled;
        }
        return null;
    }, [state.phase]);

    const moveToken = useCallback(async (tokenId) => {
        if (state.phase !== 'move') return;

        const token = state.tokens.find(t => t.id === tokenId);
        if (!token || !state.validMoveIds.includes(tokenId)) return;

        const color = token.color;
        const startStep = token.step;
        const newStep = computeNewStep(color, startStep, state.diceValue);
        if (newStep === null) return;

        dispatch({ type: 'ANIMATE_START' });

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const PER_SQUARE_MS = 150;

        if (startStep === 0) {
            dispatch({ type: 'ANIMATE_STEP', tokenId, newStep: 1, duration: 0.2 });
            await delay(200);
        } else {
            let current = startStep;
            while (current < newStep) {
                current++;
                dispatch({ type: 'ANIMATE_STEP', tokenId, newStep: current, duration: PER_SQUARE_MS / 1000 });
                await delay(PER_SQUARE_MS);
            }
        }

        dispatch({ type: 'MOVE_TOKEN_FINISH', tokenId });
    }, [state.phase, state.tokens, state.validMoveIds, state.diceValue]);

    useEffect(() => {
        if (state.phase === 'move' && state.validMoveIds.length > 0) {
            const validTokens = state.tokens.filter(t => state.validMoveIds.includes(t.id));
            if (validTokens.length === 0) return;

            // If every single valid token is on the exact same starting square,
            // they all represent the exact same move, so we auto-play it.
            const firstStep = validTokens[0].step;
            const allSameStep = validTokens.every(t => t.step === firstStep);

            if (allSameStep) {
                const autoMoveTimer = setTimeout(() => {
                    // Because useEffect captures closures, state might shift rapidly, 
                    // but react dispatch handles rapid re-entrancies. 
                    moveToken(validTokens[0].id);
                }, 400); // 400ms lets the player see what they rolled before it runs away 
                return () => clearTimeout(autoMoveTimer);
            }
        }
    }, [state.phase, state.validMoveIds, state.tokens, moveToken]);

    const reset = useCallback((newPlayers) => {
        dispatch({ type: 'RESET', players: newPlayers });
    }, []);

    return { state, roll, moveToken, reset };
}
