import React from 'react';
import { GameBoard, Player, Winner } from '../types';

interface TicTacToeProps {
  board: GameBoard;
  onPlayerMove: (row: number, col: number) => void;
  isPlayerTurn: boolean;
  winnerInfo: { winner: Winner, line: number[] } | null;
  isGameLoading: boolean;
}

const TicTacToe: React.FC<TicTacToeProps> = ({ board, onPlayerMove, isPlayerTurn, winnerInfo, isGameLoading }) => {
  const getCellClasses = (row: number, col: number) => {
    const flatIndex = row * 3 + col;
    const isWinningCell = winnerInfo?.line.includes(flatIndex);
    const isOccupied = board[row][col] !== null;

    let classes = 'w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-5xl md:text-7xl font-bold transition-all duration-300 rounded-lg shadow-lg ';
    
    if (isWinningCell) {
        classes += 'bg-cyan-400 text-black animate-pulse';
    } else {
        classes += 'bg-gray-900/80 border border-cyan-500/20 ';
        if (!isOccupied && isPlayerTurn && !winnerInfo) {
            classes += 'cursor-pointer hover:bg-cyan-900/50';
        } else {
            classes += 'cursor-not-allowed';
        }
    }
    return classes;
  };

  const getPlayerSymbolClasses = (player: Player | null) => {
      if (player === 'X') return 'text-cyan-300';
      if (player === 'O') return 'text-red-400';
      return '';
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 my-4 flex-1">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
            {board.map((row, rowIndex) => 
                row.map((cell, colIndex) => (
                    <div 
                        key={`${rowIndex}-${colIndex}`} 
                        className={getCellClasses(rowIndex, colIndex)}
                        onClick={() => isPlayerTurn && cell === null && !winnerInfo && onPlayerMove(rowIndex, colIndex)}
                        aria-label={`Cell ${rowIndex}, ${colIndex} is ${cell || 'empty'}`}
                        role="button"
                    >
                        <span className={getPlayerSymbolClasses(cell)}>{cell}</span>
                    </div>
                ))
            )}
        </div>
        {isGameLoading && (
             <div className="mt-6 text-cyan-300 animate-pulse">Victor is thinking...</div>
        )}
    </div>
  );
};

export default TicTacToe;
