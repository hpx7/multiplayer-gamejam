/* eslint-disable prettier/prettier */
import AbstractServerPlayer from "./abstractServerPlayer.js";

export default class RealPlayer extends AbstractServerPlayer {
  isNpc: false = false;

  private constructor(id: string, x: number, y: number) {
    super(id, x, y);
  }

  public static create(id: string, startingTile: { x: number; y: number }) {
    return new RealPlayer(id, startingTile.x, startingTile.y);
  }
}
