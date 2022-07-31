import { Direction } from "../shared/messages.js";
import { GameState } from "../shared/state.js";
import { isBeachTile } from "./utils.js";

export default class NPC {
  //hack, copied over to make this a valid ServerPlayer since depending on it
  //would make a circular dependency--maybe should clean up later
  id: string;
  x: number;
  y: number;
  direction: Direction;
  isNpc: true = true;

  private constructor(x: number, y: number) {
    this.id = Math.random().toString(36).substring(2);
    this.x = x;
    this.y = y;
    this.direction = Direction.None;
  }

  public static create(startingTile: {x: number, y: number}) {
    return new NPC(startingTile.x, startingTile.y);
  }

  public makeMoves(
    state: GameState,
    nextTile: {
      x: number;
      y: number;
    }
  ) {
      if (this.direction === Direction.None || !isBeachTile(nextTile) || Math.random() < .01) {
        this.direction = getRandomAdjacentDirection(this.direction);
      }
  }
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

//never returns None
function getRandomAdjacentDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Up:
    case Direction.Down:
      return getRandomElement([Direction.Left, Direction.Right]);
    case Direction.Left:
    case Direction.Right:
      return getRandomElement([Direction.Up, Direction.Down])
    case Direction.None:
      return getRandomElement([Direction.Left, Direction.Right, Direction.Down, Direction.Up]);
    default:
      return direction as never;
  }
}
