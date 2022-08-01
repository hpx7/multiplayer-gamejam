import { register } from "@hathora/server-sdk";
import dotenv from "dotenv";

import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };
import { ClientMessage, ClientMessageType, Direction, ServerMessage, ServerMessageType } from "../shared/messages.js";
import { GameState } from "../shared/state.js";

import NPC from "./npc.js";
import { isBeachTile } from "./utils.js";

type RoomId = bigint;
type UserId = string;

const PLAYER_SPEED = 10;
const NUM_NPCS = 100; //TODO: change lol

type ServerPlayer = {
  isNpc: boolean;
  id: string;
  x: number;
  y: number;
  direction: Direction;
};
type ServerState = {
  players: ServerPlayer[];
};
const states: Map<RoomId, { subscribers: Set<UserId>; game: ServerState }> = new Map();

dotenv.config({ path: "../.env" });
if (process.env.APP_SECRET === undefined) {
  throw new Error("APP_SECRET must be set");
}

const coordinator = await register({
  appSecret: process.env.APP_SECRET,
  authInfo: { anonymous: { separator: "-" } },
  store: {
    newState(roomId, userId, data) {
      console.log("newState", roomId.toString(36), userId, data);
      states.set(roomId, {
        subscribers: new Set(),
        game: { players: generateNPCs(NUM_NPCS) },
      });
    },
    subscribeUser(roomId, userId) {
      console.log("subscribeUser", roomId.toString(36), userId);
      const { subscribers, game } = states.get(roomId)!;
      subscribers.add(userId);
      if (!game.players.some((player) => player.id === userId)) {
        game.players.push({
          id: userId,
          x: 650,
          y: 550,
          direction: Direction.None,
          isNpc: false,
        });
      }
    },
    unsubscribeUser(roomId, userId) {
      console.log("unsubscribeUser", roomId.toString(36), userId);
      states.get(roomId)!.subscribers.delete(userId);
    },
    unsubscribeAll() {
      console.log("unsubscribeAll");
    },
    onMessage(roomId, userId, data) {
      const dataStr = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
      console.log("onMessage", roomId.toString(36), userId, dataStr);
      const { game } = states.get(roomId)!;
      const message: ClientMessage = JSON.parse(dataStr);
      if (message.type === ClientMessageType.SetDirection) {
        const player = game.players.find((p) => p.id === userId);
        if (player !== undefined) {
          player.direction = message.direction;
        }
      }
    },
  },
});

function broadcastUpdates(roomId: RoomId) {
  const { subscribers, game } = states.get(roomId)!;
  subscribers.forEach((userId) => {
    const gameState: GameState = {
      players: game.players.map((player) => ({
        id: player.id,
        x: player.x,
        y: player.y,
        dir: player.direction,
      })),
    };
    const msg: ServerMessage = {
      type: ServerMessageType.StateUpdate,
      state: gameState,
    };
    coordinator.stateUpdate(roomId, userId, Buffer.from(JSON.stringify(msg), "utf8"));
  });
}

setInterval(() => {
  states.forEach(({ game }, roomId) => {
    game.players.forEach((player) => {
      const nextTile = getNextTile(player.x, player.y, player.direction);
      if (player.isNpc) {
        (player as NPC).makeMoves(game, nextTile);
      }
      if (player.direction === Direction.Up) {
        if (isBeachTile(nextTile)) {
          player.y -= PLAYER_SPEED;
        }
      } else if (player.direction === Direction.Down) {
        if (isBeachTile(nextTile)) {
          player.y += PLAYER_SPEED;
        }
      } else if (player.direction === Direction.Right) {
        if (isBeachTile(nextTile)) {
          player.x += PLAYER_SPEED;
        }
      } else if (player.direction === Direction.Left) {
        if (isBeachTile(nextTile)) {
          player.x -= PLAYER_SPEED;
        }
      }
    });
    broadcastUpdates(roomId);
  });
}, 50);

const pixelToTile = (x: number, y: number): { x: number; y: number } => {
  return { x: Math.floor(x / mapData.tilewidth), y: Math.floor(y / mapData.tileheight) };
};

function getNextTile(x: number, y: number, direction: Direction): { x: number; y: number } {
  switch (direction) {
    case Direction.Up:
      return pixelToTile(x, y - PLAYER_SPEED);
    case Direction.Down:
      return pixelToTile(x, y + PLAYER_SPEED);
    case Direction.Left:
      return pixelToTile(x - PLAYER_SPEED, y);
    case Direction.Right:
      return pixelToTile(x + PLAYER_SPEED, y);
    case Direction.None:
      return { x, y };
  }
}

function getRandomBeachPixel(): { x: number; y: number } {
  let pixel = undefined;
  while (pixel == null || !isBeachTile(pixelToTile(pixel.x, pixel.y))) {
    pixel = {
      x: Math.floor(Math.random() * mapData.width * mapData.tilewidth),
      y: Math.floor(Math.random() * mapData.height * mapData.tileheight),
    };
  }
  return pixel;
}

function generateNPCs(numNPCs: number): ServerPlayer[] {
  return Array(numNPCs)
    .fill(undefined)
    .map(() => NPC.create(getRandomBeachPixel()));
}
