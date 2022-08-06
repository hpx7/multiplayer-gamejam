import { Direction } from "../../shared/messages.js";
import { assertNever, getNextTile, isBeachTile } from "../utils.js";

import { generatePirateName } from "./nameGenerator.js";

export const PIRATE_SPEED = 15;
export const BLACKBEARD_SPEED = 20;

export default abstract class AbstractServerPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  suspended: boolean;
  role: "pirate" | "blackbeard";
  coins: number;
  abstract playerType: "npc" | "human";

  protected constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.direction = Direction.None;
    this.name = generatePirateName();
    this.role = "pirate";
    this.suspended = false;
    this.coins = 0;
  }

  public update() {
    const speed = this.role === "pirate" ? PIRATE_SPEED : BLACKBEARD_SPEED;
    const nextTile = getNextTile(this.x, this.y, this.direction, speed);
    if (isBeachTile(nextTile)) {
      switch (this.direction) {
        case Direction.Up:
          this.y -= speed;
          break;
        case Direction.Down:
          this.y += speed;
          break;
        case Direction.Left:
          this.x -= speed;
          break;
        case Direction.Right:
          this.x += speed;
          break;
        case Direction.None:
          break;
        default:
          assertNever(this.direction);
      }
    }
  }
}
