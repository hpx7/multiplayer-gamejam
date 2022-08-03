import AbstractServerPlayer from "./abstractServerPlayer.js";

export default class Rebel extends AbstractServerPlayer {
  playerType: "rebel" = "rebel";

  private constructor(id: string, x: number, y: number) {
    super(id, x, y);
  }

  public static create(id: string, startingTile: { x: number; y: number }) {
    return new Rebel(id, startingTile.x, startingTile.y);
  }
}
