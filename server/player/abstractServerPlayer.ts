import { Direction } from "../../shared/messages.js";
import { assertNever, getNextTile, isBeachTile, PLAYER_SPEED } from "../utils.js";

import { generatePirateName } from "./nameGenerator.js";

export default abstract class AbstractServerPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  abstract playerType: "npc" | "rebel";

  protected constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.direction = Direction.None;
    this.name = generatePirateName();
  }

  public update() {
    const nextTile = getNextTile(this.x, this.y, this.direction);
    if (isBeachTile(nextTile)) {
      switch (this.direction) {
        case Direction.Up:
          this.y -= PLAYER_SPEED;
          break;
        case Direction.Down:
          this.y += PLAYER_SPEED;
          break;
        case Direction.Left:
          this.x -= PLAYER_SPEED;
          break;
        case Direction.Right:
          this.x += PLAYER_SPEED;
          break;
        case Direction.None:
          break;
        default:
          assertNever(this.direction);
      }
    }
  }
}
