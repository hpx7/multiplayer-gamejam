import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };

export const isBeachTile = (tile: { x: number; y: number }): boolean => {
  // lookup which array index of tile is map data referring too
  const arrayIndex = tile.y * mapData.width + tile.x;
  return mapData.layers[1].data[arrayIndex] != 0;
};
