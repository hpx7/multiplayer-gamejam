import { register } from "@hathora/server-sdk";
import dotenv from "dotenv";

import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };
import { ClientMessage, ClientMessageType, ServerMessage, ServerMessageType } from "../shared/messages.js";
import { BlackBeardKillState, Chest, Difficulty, GameState } from "../shared/state.js";

import AbstractServerPlayer from "./player/abstractServerPlayer.js";
import { USED_NAMES } from "./player/nameGenerator.js";
import NPC, { isNpc } from "./player/npc.js";
import Rebel from "./player/realPlayer.js";
import { dist, getListofElibibleTargets, isBeachTile, pixelToTile, ServerState } from "./utils.js";

type RoomId = bigint;
type UserId = string;

const NUM_CHESTS = 15;
const NUM_PLAYERS = 10;
const BB_COOLOFF = 30000;

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
      const tempChestArray: Chest[] = [];
      for (let index = 0; index < NUM_CHESTS; index++) {
        //find random beach spot
        const newSpot = getRandomBeachPixel();
        const newReward = 1 + Math.floor(Math.random() * 3);
        const newDifficulty: Difficulty = Math.floor(Math.random() * 3);
        const newID = Math.random().toString(36).substring(2);
        tempChestArray.push({
          id: newID,
          x: newSpot.x,
          y: newSpot.y,
          reward: newReward,
          difficulty: newDifficulty,
        });
      }
      console.log("newState", roomId.toString(36), userId, data);
      USED_NAMES.clear();
      states.set(roomId, {
        subscribers: new Set(),
        game: {
          players: [],
          chests: tempChestArray,
          blackbeard: { cooloff: BB_COOLOFF, state: BlackBeardKillState.Idle },
        },
      });
    },
    subscribeUser(roomId, userId) {
      console.log("subscribeUser", roomId.toString(36), userId);
      const { subscribers, game } = states.get(roomId)!;
      subscribers.add(userId);
      if (!game.players.some((player) => player.id === userId)) {
        game.players.push(Rebel.create(userId, getRandomBeachPixel()));
      }
    },
    unsubscribeUser(roomId, userId) {
      console.log("unsubscribeUser", roomId.toString(36), userId);
      const { subscribers, game } = states.get(roomId)!;
      subscribers.delete(userId);
      if (game.players.length < NUM_PLAYERS) {
        let playerIdx = game.players.findIndex((p) => p.id === userId);
        game.players.splice(playerIdx, 1);
      }
    },
    unsubscribeAll() {
      console.log("unsubscribeAll");
    },
    onMessage(roomId, userId, data) {
      const dataStr = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
      // console.log("onMessage", roomId.toString(36), userId, dataStr);
      const { game, subscribers } = states.get(roomId)!;
      if (!subscribers.has(userId)) {
        return;
      }
      const message: ClientMessage = JSON.parse(dataStr);
      if (message.type === ClientMessageType.SetDirection) {
        const player = game.players.find((p) => p.id === userId);
        if (player !== undefined) {
          player.direction = message.direction;
        }
      } else if (message.type === ClientMessageType.StartGame) {
        //set one of the players to BlackBeard role
        //choose random index 0-#players
        const bbIndex = Math.floor(Math.random() * game.players.length);
        game.players[bbIndex].role = "blackbeard";
        console.log(`Player: ${game.players[bbIndex].id} is ${game.players[bbIndex].role}`);
        //now add the NPC's
        game.players = [...game.players, ...generateNPCs(NUM_PLAYERS - game.players.length)];
        game.blackbeard.state = BlackBeardKillState.Disabled;
        startGame(roomId);
      } else if (message.type === ClientMessageType.EliminatePlayer) {
        //const player = game.players.find((p) => p.id === message.player);
        console.log("Received Elim Message: ");
        const eliminatedPlayerIndex = findTargetIndex(roomId);
        if (eliminatedPlayerIndex != undefined) {
          const player = game.players[eliminatedPlayerIndex];
          suspendPlayer(roomId, player!);
          console.log(player);
          game.blackbeard.cooloff = BB_COOLOFF;
          game.blackbeard.state = BlackBeardKillState.Disabled;
        }
      }
    },
  },
});

function broadcastUpdates(roomId: RoomId) {
  const { subscribers, game } = states.get(roomId)!;
  const now = Date.now();
  const gameState: GameState = {
    players: game.players.map((player) => ({
      id: player.id,
      x: player.x,
      y: player.y,
      dir: player.direction,
      name: player.name,
      role: player.role,
      suspended: player.suspended,
    })),
    chests: game.chests,
    blackbeard: {
      cooloff: game.blackbeard.cooloff,
      state: game.blackbeard.state,
    },
  };
  subscribers.forEach((userId) => {
    const msg: ServerMessage = {
      type: ServerMessageType.StateUpdate,
      state: gameState,
      ts: now,
    };
    coordinator.stateUpdate(roomId, userId, Buffer.from(JSON.stringify(msg), "utf8"));
  });
}

function startGame(roomId: RoomId) {
  const { subscribers } = states.get(roomId)!;
  console.log("sending starging game message to all subscribers, count: ", subscribers.size);
  subscribers.forEach((userId) => {
    const msg: ServerMessage = {
      type: ServerMessageType.SrvStartGame,
    };
    coordinator.stateUpdate(roomId, userId, Buffer.from(JSON.stringify(msg), "utf8"));
  });
}

function suspendPlayer(roomId: RoomId, player: AbstractServerPlayer) {
  console.log("sending suspend game message", player);
  //if player, send message, if NPC, just remove from list
  let myGame = states.get(roomId);
  let playerIndex;
  if (myGame) {
    playerIndex = myGame.game.players.findIndex((p) => p.id == player.id);
  }
  if (player.playerType === "npc" && myGame && playerIndex) {
    //remove it
    myGame.game.players.splice(playerIndex, 1);
  } else if (myGame && playerIndex) {
    /* const msg: ServerMessage = { type: ServerMessageType.SuspendPlayer };
    coordinator.stateUpdate(roomId, player.id, Buffer.from(JSON.stringify(msg), "utf8")); */
    myGame.game.players[playerIndex].suspended = true;
  }
}

function findTargetIndex(roomId: RoomId): number | undefined {
  console.log("Finding nearest target to Blackbeard");

  //get BB's position
  const myGame = states.get(roomId);
  const bbIndex = myGame?.game.players.findIndex((p) => p.role == "blackbeard");
  let bbLocation: { x?: number; y?: number };
  console.log("blackbeard index", bbIndex);
  let targetArray;
  if (bbIndex == undefined || bbIndex < 0) {
    return undefined;
  }

  bbLocation = { x: myGame?.game.players[bbIndex].x, y: myGame?.game.players[bbIndex].y };
  console.log("blackbeard location", bbLocation);

  if (bbLocation == undefined) {
    return undefined;
  }

  targetArray = getListofElibibleTargets(bbIndex, bbLocation, myGame);
  console.log("target array: ", targetArray);
  //if no eligible targets, bail

  if (targetArray.length == 0 || targetArray == undefined) {
    return undefined;
  }

  //find the target which is closest
  let tempTarget = targetArray.reduce(
    (previousValue: { id: string; distance: number }, currentValue: { id: string; distance: number }) => {
      if (previousValue.distance < currentValue.distance) {
        return previousValue;
      } else {
        return currentValue;
      }
    },
    { id: "", distance: Infinity }
  );

  console.log("tempTarget: ", tempTarget);
  return myGame?.game.players.findIndex((p) => p.id === tempTarget.id);
}

setInterval(() => {
  states.forEach(({ game }, roomId) => {
    if (game.blackbeard.state == BlackBeardKillState.Disabled) {
      game.blackbeard.cooloff -= 50;
      if (game.blackbeard.cooloff <= 0) {
        game.blackbeard.state = BlackBeardKillState.Enabled;
      }
    }

    game.players.forEach((player) => {
      if (isNpc(player)) {
        player.applyNpcAlgorithm(game);
      }
      player.update();

      // chest collisions
      for (let i = game.chests.length - 1; i >= 0; i--) {
        const chest = game.chests[i];
        if (dist(player.x, player.y, chest.x, chest.y) < 30) {
          game.chests.splice(i, 1);
        }
      }
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
