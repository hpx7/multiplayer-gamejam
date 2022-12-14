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
  winner: "pirate" | "blackbeard" | undefined;
};

export const isBeachTile = (tile: { x: number; y: number }): boolean => {
  // lookup which array index of tile is map data referring too
  const arrayIndex = tile.y * mapData.width + tile.x;
  return mapData.layers[1].data[arrayIndex] != 0;
};

export function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getNextTile(x: number, y: number, direction: Direction, speed: number): { x: number; y: number } {
  switch (direction) {
    case Direction.Up:
      return pixelToTile(x, y - speed);
    case Direction.Down:
      return pixelToTile(x, y + speed);
    case Direction.Left:
      return pixelToTile(x - speed, y);
    case Direction.Right:
      return pixelToTile(x + speed, y);
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

export function getClosestTarget(position: { x: number; y: number }, game: ServerState): string | undefined {
  let targetArray: { id: string; distance: number }[] = [];
  game.players.forEach((p) => {
    if (p.role !== "blackbeard") {
      const distance = dist(position.x, position.y, p.x, p.y) / 64;
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

  return tempTarget.id;
}
