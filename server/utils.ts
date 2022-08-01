import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };
import { Direction } from "../shared/messages.js";

import AbstractServerPlayer from "./player/abstractServerPlayer.js";
export type ServerState = {
  players: AbstractServerPlayer[];
};

export const PLAYER_SPEED = 10;

export const isBeachTile = (tile: { x: number; y: number }): boolean => {
  // lookup which array index of tile is map data referring too
  const arrayIndex = tile.y * mapData.width + tile.x;
  return mapData.layers[1].data[arrayIndex] != 0;
};

export function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getNextTile(x: number, y: number, direction: Direction): { x: number; y: number } {
  switch (direction) {
    case Direction.Up:
      return pixelToTile(x, y - PLAYER_SPEED);
    case Direction.Down:
      return pixelToTile(x, y + PLAYER_SPEED);
    case Direction.Left:
      return pixelToTile(x - PLAYER_SPEED, y);
    case Direction.Right:
      return pixelToTile(x + PLAYER_SPEED, y);
    case Direction.None:
      return { x, y };
    default:
      assertNever(direction);
  }
}

export const pixelToTile = (x: number, y: number): { x: number; y: number } => {
  return { x: Math.round(x / mapData.tilewidth), y: Math.round(y / mapData.tileheight) };
};

export function assertNever(shouldBeNever: never): never {
  throw new Error("Was not never: " + shouldBeNever);
}
