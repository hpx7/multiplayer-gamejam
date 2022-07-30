import { GameState } from "./state";

export enum ClientMessageType {
  SetDirection,
}

export enum ServerMessageType {
  StateUpdate,
}

export enum Direction {
  None,
  Up,
  Down,
  Left,
  Right,
}

export type ClientMessage = SetDirectionMessage;

export type SetDirectionMessage = {
  type: ClientMessageType.SetDirection;
  direction: Direction;
};

export type ServerMessage = StateUpdateMessage;

export type StateUpdateMessage = {
  type: ServerMessageType.StateUpdate;
  state: GameState;
};
