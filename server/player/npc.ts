import { Direction } from "../../shared/messages.js";
import { assertNever, getNextTile, getRandomElement, isBeachTile, ServerState } from "../utils.js";

import AbstractServerPlayer, { PIRATE_SPEED } from "./abstractServerPlayer.js";

export default class NPC extends AbstractServerPlayer {
  playerType: "npc" = "npc";

  private constructor(x: number, y: number) {
    super(Math.random().toString(36).substring(2), x, y);
  }

  public static create(startingTile: { x: number; y: number }) {
    return new NPC(startingTile.x, startingTile.y);
  }

  // eslint-disable-next-line no-unused-vars
  public applyNpcAlgorithm(_state: ServerState) {
    const nextTile = getNextTile(this.x, this.y, this.direction, PIRATE_SPEED);
    if (this.direction === Direction.None || !isBeachTile(nextTile) || Math.random() < 0.01) {
      this.direction = getRandomAdjacentDirection(this.direction);
    }
  }
}

function getRandomAdjacentDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Up:
    case Direction.Down:
      return getRandomElement([Direction.Left, Direction.Right]);
    case Direction.Left:
    case Direction.Right:
      return getRandomElement([Direction.Up, Direction.Down]);
    case Direction.None:
      return getRandomElement([Direction.Left, Direction.Right, Direction.Down, Direction.Up]);
    default:
      assertNever(direction);
  }
}

export function isNpc(player: AbstractServerPlayer): player is NPC {
  return player.playerType === "npc";
}
