import React from 'react';
import { X, Circle } from 'lucide-react';
import type { Player } from '../utils/gameLogic';

interface SquareProps {
  value: Player;
  onClick: () => void;
  isWinningCell: boolean;
  disabled: boolean;
}

export const Square: React.FC<SquareProps> = ({ value, onClick, isWinningCell, disabled }) => {
  return (
    <button
      className={`square ${isWinningCell ? 'winning-cell' : ''}`}
      onClick={onClick}
      disabled={disabled || value !== null}
      aria-label={value ? `Square occupied by ${value}` : 'Empty square'}
    >
      {value === 'X' && <X size={64} strokeWidth={2.5} className="icon-x animate-pop-in" />}
      {value === 'O' && <Circle size={56} strokeWidth={3} className="icon-o animate-pop-in" />}
    </button>
  );
};
