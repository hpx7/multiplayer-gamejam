import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };
import { Direction } from "../shared/messages";

export type ServerPlayer = {
  isNpc: boolean;
  id: string;
  x: number;
  y: number;
  direction: Direction;
};
export type ServerState = {
  players: ServerPlayer[];
};

export const isBeachTile = (tile: { x: number; y: number }): boolean => {
  // lookup which array index of tile is map data referring too
  const arrayIndex = tile.y * mapData.width + tile.x;
  return mapData.layers[1].data[arrayIndex] != 0;
};

export function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
