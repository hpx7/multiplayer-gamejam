import { GameState } from "./state";

export enum ClientMessageType {
  SetDirection, StartGame
}

export enum ServerMessageType {
  StateUpdate, SrvStartGame
}

export enum Direction {
  None,
  Up,
  Down,
  Left,
  Right,
}

export type ClientMessage = SetDirectionMessage | StartGameMessage;

export type SetDirectionMessage = {
  type: ClientMessageType.SetDirection;
  direction: Direction;
};

export type StartGameMessage ={
  type: ClientMessageType.StartGame;
}

export type ServerMessage = StateUpdateMessage|SrvStartGameMessage;

export type StateUpdateMessage = {
  type: ServerMessageType.StateUpdate;
  state: GameState;
};

export type SrvStartGameMessage={
  type: ServerMessageType.SrvStartGame;
}
