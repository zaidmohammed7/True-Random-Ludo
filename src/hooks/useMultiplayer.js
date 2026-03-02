import { useState, useCallback, useRef } from 'react';
import Peer from 'peerjs';

const PREFIX = 'ludoreact-v2-';

export function useMultiplayer() {
    const [mode, setMode] = useState('local'); // 'local', 'host', 'guest'
    const [roomCode, setRoomCode] = useState('');
    const [status, setStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'waiting', 'connected'
    const [myPeerId, setMyPeerId] = useState(null);

    const peerRef = useRef(null);

    // For Host: holds multiple connections
    // For Guest: holds the single connection to the host
    const connsRef = useRef({});
    // Trigger re-renders when connection count changes
    const [connCount, setConnCount] = useState(0);

    const [incomingActions, setIncomingActions] = useState([]);

    const handleData = useCallback((data, fromPeerId) => {
        setIncomingActions(prev => [...prev, { ...data, _from: fromPeerId }]);
        // If Host, relay to other guests if it's a game action
        if (peerRef.current && peerRef.current.id && peerRef.current.id.length === 4 + PREFIX.length) {
            // we are host
            if (data._relay) {
                Object.values(connsRef.current).forEach(conn => {
                    if (conn.peer !== fromPeerId && conn.open) {
                        conn.send(data);
                    }
                });
            }
        }
    }, []);

    const addConnection = useCallback((conn) => {
        connsRef.current[conn.peer] = conn;
        setConnCount(Object.keys(connsRef.current).length);

        conn.on('data', (data) => handleData(data, conn.peer));
        conn.on('close', () => {
            delete connsRef.current[conn.peer];
            setConnCount(Object.keys(connsRef.current).length);
            // Notify host logic that someone disconnected
            setIncomingActions(prev => [...prev, { type: 'PEER_DISCONNECT', peerId: conn.peer }]);
        });
    }, [handleData]);

    const hostGame = useCallback(() => {
        setMode('host');
        setStatus('connecting');
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        setRoomCode(code);

        const peer = new Peer(PREFIX + code);
        peerRef.current = peer;

        peer.on('open', (id) => {
            setMyPeerId(id);
            setStatus('waiting');
        });

        peer.on('connection', (conn) => {
            conn.on('open', () => {
                setStatus('connected');
                addConnection(conn);
                setIncomingActions(prev => [...prev, { type: 'PEER_CONNECT', peerId: conn.peer }]);
            });
        });

        peer.on('error', (err) => console.error('Peer error', err));

        return () => peer.destroy();
    }, [addConnection]);

    const joinGame = useCallback((code) => {
        setMode('guest');
        setStatus('connecting');
        setRoomCode(code.toUpperCase());

        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            setMyPeerId(id);
            const conn = peer.connect(PREFIX + code.toUpperCase());

            conn.on('open', () => {
                setStatus('connected');
                addConnection(conn);
            });
            conn.on('error', (err) => {
                console.error('Conn error', err);
                setStatus('disconnected');
            });
        });

        peer.on('error', (err) => {
            console.error('Peer error', err);
            setStatus('disconnected');
        });

        return () => peer.destroy();
    }, [addConnection]);

    const sendAction = useCallback((action) => {
        const payload = { ...action, _relay: true };
        Object.values(connsRef.current).forEach(conn => {
            if (conn.open) {
                conn.send(payload);
            }
        });
    }, []);

    const consumeAction = useCallback(() => {
        setIncomingActions(prev => prev.slice(1));
    }, []);

    const disconnect = useCallback(() => {
        if (peerRef.current) peerRef.current.destroy();
        connsRef.current = {};
        setConnCount(0);
        setMode('local');
        setStatus('disconnected');
        setRoomCode('');
        setMyPeerId(null);
        setIncomingActions([]);
    }, []);

    return {
        mode, status, roomCode,
        myPeerId,
        conns: connsRef.current,
        connCount,
        hostGame, joinGame, sendAction,
        incomingActions, consumeAction, disconnect, setMode
    };
}
