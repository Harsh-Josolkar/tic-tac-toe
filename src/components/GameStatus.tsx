import React from 'react';
import type { Player } from '../utils/gameLogic';
import { Trophy, Swords, X, Circle } from 'lucide-react';

interface GameStatusProps {
  winner: Player | null;
  isDraw: boolean;
  xIsNext: boolean;
}

export const GameStatus: React.FC<GameStatusProps> = ({ winner, isDraw, xIsNext }) => {
  if (winner) {
    return (
      <div className="status-bar glass animate-pop-in" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: `1px solid var(--${winner.toLowerCase()}-color)`, boxShadow: `0 0 20px var(--${winner.toLowerCase()}-glow)` }}>
        <span className="status-text" style={{ color: `var(--${winner.toLowerCase()}-color)`, textShadow: `0 0 15px var(--${winner.toLowerCase()}-glow)` }}>
          <Trophy size={24} />
          Winner: {winner}
        </span>
      </div>
    );
  }

  if (isDraw) {
    return (
      <div className="status-bar glass animate-draw" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--text-secondary)' }}>
        <span className="status-text" style={{ color: 'var(--text-secondary)' }}>
          <Swords size={24} />
          It's a Draw!
        </span>
      </div>
    );
  }

  return (
    <div className="status-bar glass" style={{ width: '100%', padding: '1rem', marginBottom: '1rem' }}>
      <span className="status-text" style={{ color: 'var(--text-primary)' }}>
        Turn: 
        <span className={xIsNext ? 'status-player-x animate-pop-in' : 'status-player-o animate-pop-in'} key={xIsNext ? 'X' : 'O'}>
          {xIsNext ? <X size={20} strokeWidth={3} /> : <Circle size={18} strokeWidth={4} />}
        </span>
      </span>
    </div>
  );
};
