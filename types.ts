export enum Role {
  USER = 'user',
  MODEL = 'model',
  ERROR = 'error'
}

export interface Source {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  imageUrl?: string;
}

// Types for Tic-Tac-Toe Game
export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type GameBoard = CellValue[][];
export type Winner = Player | 'tie';