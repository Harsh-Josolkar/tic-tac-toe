import React from 'react';
import { Square } from './Square';
import type { Player } from '../utils/gameLogic';

interface BoardProps {
  squares: Player[];
  onClick: (i: number) => void;
  winningLine: number[] | null;
  isGameOver: boolean;
}

export const Board: React.FC<BoardProps> = ({ squares, onClick, winningLine, isGameOver }) => {
  const renderSquare = (i: number) => {
    const isWinningCell = winningLine?.includes(i) ?? false;
    return (
      <Square
        key={i}
        value={squares[i]}
        onClick={() => onClick(i)}
        isWinningCell={isWinningCell}
        disabled={isGameOver && !isWinningCell}
      />
    );
  };

  return (
    <div className="board glass">
      {squares.map((_, i) => renderSquare(i))}
    </div>
  );
};
