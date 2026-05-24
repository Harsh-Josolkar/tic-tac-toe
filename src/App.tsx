import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Users, Monitor, Wifi, Copy, Trophy, Swords } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Board } from './components/Board';
import { GameStatus } from './components/GameStatus';
import { ScoreBoard } from './components/ScoreBoard';
import { calculateWinner, calculateDraw, getWinningLine } from './utils/gameLogic';
import type { Player, GameState } from './utils/gameLogic';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');

type PlayMode = 'local' | 'online';
type OnlineState = 'menu' | 'hosting' | 'joining' | 'in_room';

function App() {
  const [playMode, setPlayMode] = useState<PlayMode>('local');
  const [onlineState, setOnlineState] = useState<OnlineState>('menu');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const [role, setRole] = useState<string | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [playersInRoom, setPlayersInRoom] = useState<any[]>([]);
  
  const [contestSize, setContestSize] = useState<number>(3);
  const [matchesPlayed, setMatchesPlayed] = useState<number>(0);
  const [seriesWinner, setSeriesWinner] = useState<string | null>(null);
  
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    history: [Array(9).fill(null)],
    currentMove: 0,
  });

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (playMode === 'online' && !socket) {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);
    }
  }, [playMode, socket]);

  useEffect(() => {
    if (!socket) return;

    const onJoined = (data: any) => {
      setRole(data.role);
      setGameState(data.gameState);
      setScores(data.scores);
      setPlayersInRoom(data.players);
      setContestSize(data.contestSize || 3);
      setMatchesPlayed(data.matchesPlayed || 0);
      setSeriesWinner(data.seriesWinner || null);
      setOnlineState('in_room');
    };

    socket.on('joined', onJoined);
    socket.on('player_joined', setPlayersInRoom);
    socket.on('player_left', setPlayersInRoom);
    socket.on('game_updated', setGameState);
    socket.on('score_updated', (data) => {
      setScores(data.scores);
      setMatchesPlayed(data.matchesPlayed);
      if (data.seriesWinner) setSeriesWinner(data.seriesWinner);
    });
    socket.on('series_reset', (data) => {
      setGameState(data.gameState);
      setScores(data.scores);
      setMatchesPlayed(data.matchesPlayed);
      setSeriesWinner(data.seriesWinner);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    });

    return () => {
      socket.off('joined', onJoined);
      socket.off('player_joined', setPlayersInRoom);
      socket.off('player_left', setPlayersInRoom);
      socket.off('game_updated', setGameState);
      socket.off('score_updated');
      socket.off('series_reset');
    };
  }, [socket]);

  const currentSquares = gameState.history[gameState.currentMove];
  const winner = calculateWinner(currentSquares);
  const winningLine = getWinningLine(currentSquares);
  const isDraw = calculateDraw(currentSquares);
  const isGameOver = winner !== null || isDraw;
  const xIsNext = gameState.currentMove % 2 === 0;

  useEffect(() => {
    if (isGameOver && !seriesWinner) {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

      resetTimeoutRef.current = setTimeout(() => {
        if (playMode === 'online') {
           if (role === 'X' || (role === 'O' && !playersInRoom.find(p => p.role === 'X'))) {
             socket?.emit('reset_round', roomId);
           }
        } else {
          setGameState({ history: [Array(9).fill(null)], currentMove: 0 });
        }
      }, 2000);
    }
  }, [isGameOver, playMode, role, socket, roomId, seriesWinner, playersInRoom]);

  const handlePlay = (nextSquares: Player[]) => {
    if (seriesWinner) return;

    const nextHistory = [...gameState.history.slice(0, gameState.currentMove + 1), nextSquares];
    const newGameState = {
      history: nextHistory,
      currentMove: nextHistory.length - 1,
    };
    
    setGameState(newGameState);

    if (playMode === 'online') {
      socket?.emit('make_move', roomId, newGameState);
      
      const newWinner = calculateWinner(nextSquares);
      const newIsDraw = calculateDraw(nextSquares);
      
      if (newWinner) {
        socket?.emit('round_ended', roomId, { result: newWinner });
      } else if (newIsDraw) {
        socket?.emit('round_ended', roomId, { result: 'Draw' });
      }

    } else {
      const newWinner = calculateWinner(nextSquares);
      const newIsDraw = calculateDraw(nextSquares);
      
      if (newWinner || newIsDraw) {
        const nextMatchesPlayed = matchesPlayed + 1;
        setMatchesPlayed(nextMatchesPlayed);
        
        const newScores = { ...scores };
        if (newWinner) {
          newScores[newWinner] += 1;
          setScores(newScores);
        }
        
        const remainingMatches = contestSize - nextMatchesPlayed;
        if (newScores.X > newScores.O + remainingMatches) {
          setSeriesWinner('X');
        } else if (newScores.O > newScores.X + remainingMatches) {
          setSeriesWinner('O');
        } else if (remainingMatches === 0 && newScores.X === newScores.O) {
          setSeriesWinner('Draw');
        }
      }
    }
  };

  const handleClick = (i: number) => {
    if (currentSquares[i] || winner || seriesWinner) return;
    
    if (playMode === 'online') {
      if (role === 'Spectator') return;
      if ((xIsNext && role !== 'X') || (!xIsNext && role !== 'O')) return;
    }

    const nextSquares = currentSquares.slice();
    nextSquares[i] = xIsNext ? 'X' : 'O';
    handlePlay(nextSquares);
  };

  const resetSeries = () => {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    
    if (playMode === 'online') {
      if (role !== 'Spectator') socket?.emit('reset_series', roomId);
    } else {
      setGameState({ history: [Array(9).fill(null)], currentMove: 0 });
      setScores({ X: 0, O: 0 });
      setMatchesPlayed(0);
      setSeriesWinner(null);
    }
  };

  const startHosting = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    setPlayerName('Host');
    socket?.emit('join_room', newRoomId, 'Host', contestSize);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && playerName.trim()) {
      socket?.emit('join_room', roomId.toUpperCase(), playerName);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const switchMode = (mode: PlayMode) => {
    setPlayMode(mode);
    setGameState({ history: [Array(9).fill(null)], currentMove: 0 });
    setScores({ X: 0, O: 0 });
    setMatchesPlayed(0);
    setSeriesWinner(null);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    
    if (mode === 'local') {
      setOnlineState('menu');
      socket?.disconnect();
      setSocket(null);
    } else {
      setOnlineState('menu');
    }
  };

  return (
    <div className="app-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <img src="/logo.png" alt="Tic Tac Toe Logo" style={{ width: '48px', height: '48px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' }} />
        <h1 className="game-title" style={{ marginBottom: 0 }}>Tic Tac Toe</h1>
      </div>
      
      <div className="glass" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
        <button 
          className={`menu-button ${playMode === 'local' ? 'active' : ''}`}
          onClick={() => switchMode('local')}
        >
          <Monitor size={16} /> Local
        </button>
        <button 
          className={`menu-button ${playMode === 'online' ? 'active' : ''}`}
          onClick={() => switchMode('online')}
        >
          <Wifi size={16} /> Online
        </button>
      </div>

      {playMode === 'online' && onlineState === 'menu' && (
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', width: '100%', maxWidth: '400px' }}>
          <button className="reset-button glass" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setOnlineState('hosting')}>
            <Wifi size={20} /> Host Match
          </button>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>OR</div>
          <button className="reset-button glass" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setOnlineState('joining')}>
            <Users size={20} /> Join Match
          </button>
        </div>
      )}

      {playMode === 'online' && onlineState === 'hosting' && (
        <div className="glass" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Host Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Contest Size</label>
              <select 
                value={contestSize} 
                onChange={(e) => setContestSize(Number(e.target.value))}
                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(0, 0, 0, 0.3)', color: 'white', fontSize: '1rem', outline: 'none' }}
              >
                <option value={1}>Best of 1</option>
                <option value={3}>Best of 3</option>
                <option value={5}>Best of 5</option>
                <option value={7}>Best of 7</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="menu-button" onClick={() => setOnlineState('menu')}>Back</button>
              <button className="reset-button glass" style={{ flex: 2, justifyContent: 'center' }} onClick={startHosting}>Create Room</button>
            </div>
          </div>
        </div>
      )}

      {playMode === 'online' && onlineState === 'joining' && (
        <div className="glass" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Your Name</label>
              <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required />
            </div>
            <div>
              <label>Room ID</label>
              <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="menu-button" onClick={() => setOnlineState('menu')}>Back</button>
              <button type="submit" className="reset-button glass" style={{ flex: 2, justifyContent: 'center' }}>Join Room</button>
            </div>
          </form>
        </div>
      )}

      {(playMode === 'local' || (playMode === 'online' && onlineState === 'in_room')) && (
        <>
          {playMode === 'local' && (
            <div className="glass" style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0.75rem 1.5rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ margin: 0 }}>Contest Size:</label>
                <select 
                  value={contestSize} 
                  onChange={(e) => {
                    setContestSize(Number(e.target.value));
                    setMatchesPlayed(0);
                    setScores({ X: 0, O: 0 });
                    setSeriesWinner(null);
                  }}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0, 0, 0, 0.3)', color: 'white', fontSize: '0.875rem' }}
                >
                  <option value={1}>Best of 1</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                </select>
              </div>
            </div>
          )}

          {playMode === 'online' && (
            <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem 1.5rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem' }}>
                Role: <strong className={role === 'X' ? 'status-player-x' : role === 'O' ? 'status-player-o' : ''}>{role}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
                <span title="Players in Room" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                  <Users size={14} /> {playersInRoom.length}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Room: <strong style={{ color: 'var(--primary)' }}>{roomId}</strong>
                  <button onClick={copyRoomId} title="Copy Room ID" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Copy size={14} />
                  </button>
                </span>
              </div>
            </div>
          )}

          <ScoreBoard scores={scores} playerRole={playMode === 'online' ? role : null} matchesPlayed={matchesPlayed} contestSize={contestSize} />

          <GameStatus winner={winner} isDraw={isDraw} xIsNext={xIsNext} />

          <div style={{ position: 'relative' }}>
            <Board squares={currentSquares} onClick={handleClick} winningLine={winningLine} isGameOver={isGameOver || seriesWinner !== null} />
            
            {seriesWinner && (
              <div className="series-winner-overlay">
                {seriesWinner === 'Draw' ? (
                  <>
                    <Swords size={64} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
                    <h2 className="series-winner-title" style={{ color: 'white', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>SERIES TIED!</h2>
                  </>
                ) : (
                  <>
                    <Trophy size={64} color={seriesWinner === 'X' ? 'var(--x-color)' : 'var(--o-color)'} style={{ marginBottom: '1rem', filter: `drop-shadow(0 0 20px var(--${seriesWinner.toLowerCase()}-glow))` }} />
                    <h2 className={`series-winner-title ${seriesWinner.toLowerCase()}`}>Player {seriesWinner} Wins!</h2>
                    <p style={{ color: 'white', marginBottom: '2rem', fontSize: '1.2rem', letterSpacing: '0.1em' }}>SERIES CHAMPION</p>
                  </>
                )}
                {(playMode === 'local' || (playMode === 'online' && role !== 'Spectator')) && (
                  <button className="reset-button glass animate-pop-in" onClick={resetSeries} style={{ marginTop: seriesWinner === 'Draw' ? '2rem' : '0' }}>
                    <RefreshCw size={20} /> Restart Series
                  </button>
                )}
              </div>
            )}
          </div>
          
          {(playMode === 'local' || (playMode === 'online' && role !== 'Spectator')) && !seriesWinner && (
            <button className="reset-button glass animate-pop-in" onClick={resetSeries} aria-label="Restart Series" style={{ marginTop: '1rem' }}>
              <RefreshCw size={20} /> Restart Series
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default App;
