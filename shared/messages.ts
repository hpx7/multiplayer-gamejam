import { GameState } from "./state";

export enum ClientMessageType {
  SetDirection,
  StartGame,
  EliminatePlayer,
}

export enum ServerMessageType {
  StateUpdate,
  SrvStartGame,
  SuspendPlayer,
}

export enum Direction {
  None,
  Up,
  Down,
  Left,
  Right,
}

export type ClientMessage = SetDirectionMessage | StartGameMessage| EliminatePlayerMessage;

export type SetDirectionMessage = {
  type: ClientMessageType.SetDirection;
  direction: Direction;
};

export type StartGameMessage = {
  type: ClientMessageType.StartGame;
};

export type EliminatePlayerMessage = {
  type: ClientMessageType.EliminatePlayer;
};

export type ServerMessage = StateUpdateMessage | SrvStartGameMessage| SrvSuspendPlayerMsg;

export type StateUpdateMessage = {
  type: ServerMessageType.StateUpdate;
  state: GameState;
  ts: number;
};

export type SrvStartGameMessage = {
  type: ServerMessageType.SrvStartGame;
};

export type SrvSuspendPlayerMsg ={
  type: ServerMessageType.SuspendPlayer;
};
