import { Direction } from "./messages";

export type Player = {
  id: string;
  x: number;
  y: number;
  dir: Direction;
  name: string;
  role: "pirate" | "blackbeard";
  suspended: boolean;
  coins: number;
};

export type Chest = {
  id: string;
  x: number;
  y: number;
};

export enum BlackBeardKillState {
  Idle,
  Enabled,
  Disabled,
}

export type GameState = {
  players: Player[];
  chests: Chest[];
  blackbeard: {
    cooloff: number;
    state: BlackBeardKillState;
  };
  winner: "pirate" | "blackbeard" | undefined;
};
