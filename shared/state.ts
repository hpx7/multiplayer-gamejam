import { Direction } from "./messages";

export type Player = {
  id: string;
  x: number;
  y: number;
  dir: Direction;
};

export type GameState = {
  players: Player[];
};
