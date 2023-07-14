import { Application, RoomId, UserId, startServer, verifyJwt } from "@hathora/server-sdk";
import dotenv from "dotenv";

import mapData from "../shared/HAT_mainmap.json" assert { type: "json" };
import { ClientMessage, ClientMessageType, ServerMessage, ServerMessageType } from "../shared/messages.js";
import { BlackBeardKillState, Chest, GameState } from "../shared/state.js";

import AbstractServerPlayer from "./player/abstractServerPlayer.js";
import { USED_NAMES } from "./player/nameGenerator.js";
import NPC, { isNpc } from "./player/npc.js";
import HumanPlayer from "./player/realPlayer.js";
import { getClosestTarget, dist, isBeachTile, pixelToTile, ServerState } from "./utils.js";

const NUM_CHESTS = 15;
const NUM_PLAYERS = 10;
const BB_COOLOFF = 30000;

const states: Map<RoomId, { game: ServerState }> = new Map();

dotenv.config({ path: "../.env" });
if (process.env.HATHORA_APP_SECRET === undefined) {
  throw new Error("HATHORA_APP_SECRET must be set");
}

const store: Application = {
  async verifyToken(token: string): Promise<UserId | undefined> {
    const userId = verifyJwt(token, process.env.HATHORA_APP_SECRET!);
    if (userId === undefined) {
      console.error("Failed to verify token", token);
    }
    return userId;
  },
  async subscribeUser(roomId, userId) {
    console.log("subscribeUser", roomId, userId);
    if (!states.has(roomId)) {
      console.log("newState", roomId, userId);
      // load up chests
      const chests: Chest[] = [];
      for (let index = 0; index < NUM_CHESTS; index++) {
        chests.push(getRandomChest());
      }
      USED_NAMES.clear();
      states.set(roomId, {
        game: {
          players: [],
          chests,
          blackbeard: { cooloff: BB_COOLOFF, state: BlackBeardKillState.Idle },
          winner: undefined,
        },
      });
    }
    const { game } = states.get(roomId)!;
    if (!game.players.some((player) => player.id === userId)) {
      game.players.push(HumanPlayer.create(userId, getRandomBeachPixel()));
    }
  },
  async unsubscribeUser(roomId, userId) {
    console.log("unsubscribeUser", roomId, userId);
    const { game } = states.get(roomId)!;
    if (game.players.length < NUM_PLAYERS) {
      let playerIdx = game.players.findIndex((p) => p.id === userId);
      game.players.splice(playerIdx, 1);
    }
  },
  async onMessage(roomId, userId, data) {
    const dataStr = Buffer.from(data).toString("utf8");
    const { game } = states.get(roomId)!;
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
      if (eliminatedPlayerIndex !== undefined) {
        const player = game.players[eliminatedPlayerIndex];
        player.suspended = true;
        game.blackbeard.cooloff = BB_COOLOFF;
        game.blackbeard.state = BlackBeardKillState.Disabled;
        const msg: ServerMessage = { type: ServerMessageType.PlayerEliminated };
        server.sendMessage(roomId, userId, Buffer.from(JSON.stringify(msg), "utf8"));
      }
    }
  },
};
const port = 4000;
const server = await startServer(store, port);
console.log(`Server listening on port ${port}`);

function broadcastUpdates(roomId: RoomId) {
  const { game } = states.get(roomId)!;
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
      coins: player.coins,
    })),
    chests: game.chests,
    blackbeard: {
      cooloff: game.blackbeard.cooloff,
      state: game.blackbeard.state,
    },
    winner: game.winner,
  };
  const msg: ServerMessage = {
    type: ServerMessageType.StateUpdate,
    state: gameState,
    ts: now,
  };
  server.broadcastMessage(roomId, Buffer.from(JSON.stringify(msg), "utf8"));
}

function startGame(roomId: RoomId) {
  console.log("sending starging game message to all subscribers");
  const msg: ServerMessage = {
    type: ServerMessageType.SrvStartGame,
  };
  server.broadcastMessage(roomId, Buffer.from(JSON.stringify(msg), "utf8"));
}

function findTargetIndex(roomId: RoomId): number | undefined {
  console.log("Finding nearest target to Blackbeard");

  //get BB's position
  const { game } = states.get(roomId)!;
  const bbIndex = game.players.findIndex((p) => p.role == "blackbeard");

  if (bbIndex == undefined || bbIndex < 0) {
    return undefined;
  }

  const bbLocation = { x: game.players[bbIndex].x, y: game.players[bbIndex].y };
  if (bbLocation == undefined) {
    return undefined;
  }

  let tempTarget = getClosestTarget(bbLocation, game);
  //if no eligible targets, bail

  if (tempTarget == undefined) {
    return undefined;
  }
  console.log("Target: ", tempTarget);
  return game.players.findIndex((p) => p.id === tempTarget);
}

setInterval(() => {
  states.forEach(({ game }, roomId) => {
    if (game.winner !== undefined) {
      return;
    }

    // update blackbeard cooldown
    if (game.blackbeard.state == BlackBeardKillState.Disabled) {
      game.blackbeard.cooloff -= 50;
      if (game.blackbeard.cooloff <= 0) {
        game.blackbeard.state = BlackBeardKillState.Enabled;
      }
    }

    // update players
    game.players.forEach((player) => {
      if (player.suspended) {
        return;
      }

      // movement
      if (isNpc(player)) {
        player.applyNpcAlgorithm(game);
      }
      player.update();

      // chest collisions
      for (let i = game.chests.length - 1; i >= 0; i--) {
        const chest = game.chests[i];
        if (dist(player.x, player.y, chest.x, chest.y) < 30) {
          game.chests.splice(i, 1);
          player.coins++;
        }
      }

      // check for game over
      if (player.playerType === "human") {
        if (player.role === "pirate" && player.coins >= 25) {
          game.winner = "pirate";
          return;
        } else if (player.role === "blackbeard" && player.coins >= 50) {
          game.winner = "blackbeard";
          return;
        }
      }
    });

    // spawn chests
    while (game.chests.length < NUM_CHESTS) {
      game.chests.push(getRandomChest());
    }

    // send updates
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

function getRandomChest(): Chest {
  const { x, y } = getRandomBeachPixel();
  return {
    id: Math.random().toString(36).substring(2),
    x,
    y,
  };
}
