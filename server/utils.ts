import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };
import { Direction } from "../shared/messages.js";
import { BlackBeardKillState, Chest } from "../shared/state";

import AbstractServerPlayer from "./player/abstractServerPlayer.js";
export type ServerState = {
  players: AbstractServerPlayer[];
  chests: Chest[];
  blackbeard: {
    cooloff: number;
    state: BlackBeardKillState;
  };
};

export const PLAYER_SPEED = 15;

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
  return { x: Math.floor(x / mapData.tilewidth), y: Math.floor(y / mapData.tileheight) };
};

export function dist(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function assertNever(shouldBeNever: never): never {
  throw new Error("Was not never: " + shouldBeNever);
}

export function getClosestTarget(
  index?: number,
  position?: { x?: number; y?: number },
  state?:
    | {
        subscribers: Set<string>;
        game: ServerState;
      }
    | undefined
):
  | {
      id: string;
      distance: number;
    }
  | undefined {
  let targetArray: Array<{ id: string; distance: number }> = [];
  state?.game.players.forEach((p, i) => {
    //not blackbeard
    if (i != index) {
      if (position?.x === undefined || position?.y === undefined) {
        return undefined;
      }
      console.log("positions:", position.x, position.y, p.x, p.y);
      const distance = dist(position?.x, position?.y, p.x, p.y) / 64;
      if (distance <= 3.5) {
        targetArray.push({ id: p.id, distance: distance });
      }
    }
  });

  if (targetArray.length == 0 || targetArray == undefined) {
    return undefined;
  }

  //find the target which is closest
  let tempTarget = targetArray.reduce(
    (previousValue: { id: string; distance: number }, currentValue: { id: string; distance: number }) => {
      if (previousValue.distance < currentValue.distance) {
        return previousValue;
      } else {
        return currentValue;
      }
    },
    { id: "", distance: Infinity }
  );

  return tempTarget;
}
