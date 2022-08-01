import { register } from "@hathora/server-sdk";
import dotenv from "dotenv";

import { ClientMessage, ClientMessageType, Direction, ServerMessage, ServerMessageType } from "../shared/messages.js";
import { Chest, Difficulty, GameState } from "../shared/state.js";
import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };

type RoomId = bigint;
type UserId = string;
const numChests = 15;

const PLAYER_SPEED = 10;
type ServerPlayer = {
  id: string;
  x: number;
  y: number;
  direction: Direction;
};

type ServerState = {
  players: ServerPlayer[];
  chests: Chest[];
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
      //load up chests here
      let tempChestArray: Chest[] = [];
      for (let index = 0; index < numChests; index++) {
        //find random beach spot
        let newSpot;
        do {
          newSpot = {
            x: Math.floor(Math.random() * 128),
            y: Math.floor(Math.random() * 64),
          };
        } while (!isBeachTile(newSpot));
        let newReward = 1 + Math.floor(Math.random() * 3);
        let tempDiff = Math.floor(Math.random() * 3);
        let newDifficulty: Difficulty = Math.floor(Math.random() * 3);
        let newID = Math.random().toString(36).substring(2);
        tempChestArray.push({
          id: newID,
          x: newSpot.x,
          y: newSpot.y,
          reward: newReward,
          difficulty: newDifficulty,
        });
        //load up chest
      }
      console.log(tempChestArray);
      console.log("newState", roomId.toString(36), userId, data);
      states.set(roomId, { subscribers: new Set(), game: { players: [], chests: tempChestArray } });
    },
    subscribeUser(roomId, userId) {
      console.log("subscribeUser", roomId.toString(36), userId);
      const { subscribers, game } = states.get(roomId)!;
      subscribers.add(userId);
      if (!game.players.some(player => player.id === userId)) {
        game.players.push({ id: userId, x: 650, y: 550, direction: Direction.None });
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
        const player = game.players.find(p => p.id === userId);
        if (player !== undefined) {
          player.direction = message.direction;
        }
      }
    },
  },
});

function broadcastUpdates(roomId: RoomId) {
  const { subscribers, game } = states.get(roomId)!;
  subscribers.forEach(userId => {
    const gameState: GameState = {
      players: game.players.map(player => ({ id: player.id, x: player.x, y: player.y })),
      chests: game.chests,
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
    game.players.forEach(player => {
      if (player.direction === Direction.Up) {
        const nextTile = pixelToTile(player.x, player.y - PLAYER_SPEED);
        if (isBeachTile(nextTile)) {
          player.y -= PLAYER_SPEED;
        }
      } else if (player.direction === Direction.Down) {
        const nextTile = pixelToTile(player.x, player.y + PLAYER_SPEED);
        if (isBeachTile(nextTile)) {
          player.y += PLAYER_SPEED;
        }
      } else if (player.direction === Direction.Right) {
        const nextTile = pixelToTile(player.x + PLAYER_SPEED, player.y);
        if (isBeachTile(nextTile)) {
          player.x += PLAYER_SPEED;
        }
      } else if (player.direction === Direction.Left) {
        const nextTile = pixelToTile(player.x - PLAYER_SPEED, player.y);
        if (isBeachTile(nextTile)) {
          player.x -= PLAYER_SPEED;
        }
      }
    });
    broadcastUpdates(roomId);
  });
}, 50);

const pixelToTile = (x: number, y: number): { x: number; y: number } => {
  return { x: Math.floor(x / 64), y: Math.floor(y / 64) };
};

const isBeachTile = (tile: { x: number; y: number }): boolean => {
  // lookup which array index of tile is map data referring too
  const arrayIndex = tile.y * 128 + tile.x;
  return mapData.layers[1].data[arrayIndex] != 0;
};
