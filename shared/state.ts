import { Direction } from "./messages";

export type Player = {
  id: string;
  x: number;
  y: number;
  dir: Direction;
  name: string;
  role: "pirate" | "blackbeard"
  suspended: boolean;
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

export enum BlackBeardKillState{
  Idle,
  Enabled,
  Disabled,
}

export type GameState = {
  players: Player[];
  chests: Chest[];
  blackbeard:{
    cooloff: number,
    state: BlackBeardKillState;
  };
   
};
