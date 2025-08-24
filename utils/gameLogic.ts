import { GameBoard, Player, Winner } from '../types';

export const checkWinner = (board: GameBoard): { winner: Winner, line: number[] } | null => {
  const lines = [
    // Rows
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    // Columns
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    // Diagonals
    [0, 4, 8], [2, 4, 6]
  ];

  const flatBoard = board.flat();

  for (const line of lines) {
    const [a, b, c] = line;
    if (flatBoard[a] && flatBoard[a] === flatBoard[b] && flatBoard[a] === flatBoard[c]) {
      return { winner: flatBoard[a] as Player, line };
    }
  }

  if (flatBoard.every(cell => cell !== null)) {
    return { winner: 'tie', line: [] };
  }

  return null;
};
