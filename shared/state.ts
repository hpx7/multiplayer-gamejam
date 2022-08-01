import { Direction } from "./messages";

export type Player = {
  id: string;
  x: number;
  y: number;
  dir: Direction;
};

export enum Difficulty {
  low,
  med,
  hard,
}

export type Chest = {
  id: string;
  x: number;
  y: number;
  difficulty: Difficulty;
  reward: number;
};

export type GameState = {
  players: Player[];
  chests: Chest[];
};
