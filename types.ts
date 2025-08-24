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