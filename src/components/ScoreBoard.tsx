import React from 'react';

interface ScoreBoardProps {
  scores: { X: number; O: number };
  playerRole: string | null;
  matchesPlayed: number;
  contestSize: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores, playerRole, matchesPlayed, contestSize }) => {
  const currentMatchNumber = Math.min(matchesPlayed + 1, contestSize);
  
  return (
    <div className="status-bar glass" style={{ flexDirection: 'column', width: '100%', marginBottom: '0.5rem', padding: '1rem 2rem' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
        Match {currentMatchNumber} of {contestSize}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        <div 
          className={`status-text ${playerRole === 'X' ? 'status-player-x' : ''}`} 
          style={{ fontSize: '1.2rem', color: 'var(--x-color)', textShadow: '0 0 10px var(--x-glow)' }}
        >
          Player X <span style={{ fontWeight: '800', marginLeft: '0.75rem', fontSize: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.8rem', borderRadius: '8px' }}>{scores.X}</span>
        </div>
        <div style={{ color: 'var(--surface-border)', fontSize: '1.2rem', fontWeight: '800', alignSelf: 'center' }}>VS</div>
        <div 
          className={`status-text ${playerRole === 'O' ? 'status-player-o' : ''}`} 
          style={{ fontSize: '1.2rem', color: 'var(--o-color)', textShadow: '0 0 10px var(--o-glow)' }}
        >
          <span style={{ fontWeight: '800', marginRight: '0.75rem', fontSize: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.8rem', borderRadius: '8px' }}>{scores.O}</span> Player O
        </div>
      </div>
    </div>
  );
};
