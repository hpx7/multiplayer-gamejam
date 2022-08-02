import { register } from "@hathora/server-sdk";
import dotenv from "dotenv";

import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };
import { ClientMessage, ClientMessageType, ServerMessage, ServerMessageType } from "../shared/messages.js";
import { Chest, Difficulty, GameState } from "../shared/state.js";

import AbstractServerPlayer from "./player/abstractServerPlayer.js";
import { USED_NAMES } from "./player/nameGenerator.js";
import NPC from "./player/npc.js";
import RealPlayer from "./player/realPlayer.js";
import { isBeachTile, pixelToTile, ServerState } from "./utils.js";

type RoomId = bigint;
type UserId = string;

const NUM_CHESTS = 15;
const NUM_NPCS = 20;

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
      for (let index = 0; index < NUM_CHESTS; index++) {
        //find random beach spot
        let newSpot;
        do {
          newSpot = {
            x: Math.floor(Math.random() * 128),
            y: Math.floor(Math.random() * 64),
          };
        } while (!isBeachTile(newSpot));
        let newReward = 1 + Math.floor(Math.random() * 3);

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
      USED_NAMES.clear();
      states.set(roomId, {
        subscribers: new Set(),
        game: { players: generateNPCs(NUM_NPCS), chests: tempChestArray },
      });
    },
    subscribeUser(roomId, userId) {
      console.log("subscribeUser", roomId.toString(36), userId);
      const { subscribers, game } = states.get(roomId)!;
      subscribers.add(userId);
      if (!game.players.some((player) => player.id === userId)) {
        game.players.push(RealPlayer.create(userId, getRandomBeachPixel()));
      }
    },
    unsubscribeUser(roomId, userId) {
      console.log("unsubscribeUser", roomId.toString(36), userId);
      states.get(roomId)!.subscribers.delete(userId);
      let findIndex = states.get(roomId)!.game.players.findIndex((p) => {
        p.id === userId;
      });
      states.get(roomId)!.game.players.splice(findIndex, 1);
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

      if (message.type === ClientMessageType.StartGame) {
        //now add the NPC's
        console.log("Adding NPCs");
        game.players = [...game.players, ...generateNPCs(NUM_NPCS)];
        console.log(game.players);
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
        name: player.name,
      })),
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
    game.players.forEach((player) => {
      if (player.isNpc) {
        (player as NPC).applyNpcAlgorithm(game);
      }
      player.update();
    });
    broadcastUpdates(roomId);
  });
}, 50);

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

function generateNPCs(numNPCs: number): AbstractServerPlayer[] {
  return Array(numNPCs)
    .fill(undefined)
    .map(() => NPC.create(getRandomBeachPixel()));
}
