import AbstractServerPlayer from "./abstractServerPlayer.js";

export default class HumanPlayer extends AbstractServerPlayer {
  playerType: "human" = "human";

  private constructor(id: string, x: number, y: number) {
    super(id, x, y);
  }

  public static create(id: string, startingTile: { x: number; y: number }) {
    return new HumanPlayer(id, startingTile.x, startingTile.y);
  }
}
