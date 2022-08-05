import { HathoraClient } from "@hathora/client-sdk";
import { InterpolationBuffer } from "interpolation-buffer";
import Phaser from "phaser";

import mapUrl from "../../../shared/HAT_mainmap.json";
import { ClientMessageType, Direction, ServerMessage, ServerMessageType } from "../../../shared/messages";
import { Chest, Difficulty, GameState, Player } from "../../../shared/state";
import { RoomConnection } from "../connection";

export class GameScene extends Phaser.Scene {
  private connection!: RoomConnection;
  private user!: object & { id: string };

  private buffer: InterpolationBuffer<GameState> | undefined;

  private players: Map<string, { sprite: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text }> = new Map();
  private chests: Map<string, { difficulty: Difficulty; reward: number; object: Phaser.GameObjects.Sprite }> =
    new Map();

  constructor() {
    super("game");
  }

  init({ connection }: { connection: RoomConnection }) {
    this.connection = connection;
    this.user = HathoraClient.getUserFromToken(connection.token);
  }

  preload() {
    this.load.tilemapTiledJSON("map", mapUrl);
    this.load.image("tiles", "tiles_sheet.png");
    this.load.spritesheet("player", "pirate-Sheet.png", { frameWidth: 34, frameHeight: 45 });
    this.load.spritesheet("blackbeard", "bb-Sheet.png", { frameWidth: 34, frameHeight: 45 });
    this.load.audio("game-music", "game_music.mp3");
    this.load.spritesheet("chest", "chest_sheet.png", { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    this.connection.addListener((msg) => this.handleMessage(msg));

    const music = this.sound.add("game-music", { loop: true, volume: 0.25 });
    music.play();

    this.events.on("shutdown", () => {
      music.stop();
    });

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tiles_sheet", "tiles");
    map.createLayer("Water", tileset);
    map.createLayer("Beach", tileset);

    this.cameras.main.setBounds(0, 0, 2688, 2048);
    this.cameras.main.setZoom(0.5, 0.5);

    this.anims.create({
      key: "bbwalkdown",
      frames: this.anims.generateFrameNumbers("blackbeard", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "bbwalkup",
      frames: this.anims.generateFrameNumbers("blackbeard", {
        start: 4,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "bbwalkright",
      frames: this.anims.generateFrameNumbers("blackbeard", {
        start: 8,
        end: 11,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "bbwalkleft",
      frames: this.anims.generateFrameNumbers("blackbeard", {
        start: 12,
        end: 15,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "bbidle",
      frames: this.anims.generateFrameNumbers("blackbeard", {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "walkdown",
      frames: this.anims.generateFrameNumbers("player", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walkup",
      frames: this.anims.generateFrameNumbers("player", {
        start: 4,
        end: 7,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walkright",
      frames: this.anims.generateFrameNumbers("player", {
        start: 8,
        end: 11,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walkleft",
      frames: this.anims.generateFrameNumbers("player", {
        start: 12,
        end: 15,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("player", {
        start: 0,
        end: 0,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "open",
      frames: this.anims.generateFrameNumbers("chest", { frames: [0, 1, 2] }),
      frameRate: 5,
      repeat: 0,
    });

    const keys = this.input.keyboard.createCursorKeys();
    let prevDirection = Direction.None;
    const handleKeyEvt = () => {
      let direction: Direction;
      if (keys.up.isDown) {
        direction = Direction.Up;
      } else if (keys.down.isDown) {
        direction = Direction.Down;
      } else if (keys.right.isDown) {
        direction = Direction.Right;
      } else if (keys.left.isDown) {
        direction = Direction.Left;
      } else {
        direction = Direction.None;
      }

      if (prevDirection !== direction) {
        prevDirection = direction;
        const msg = { type: ClientMessageType.SetDirection, direction };
        console.log("sending msg", msg);
        this.connection.sendMessage(msg);
      }
    };
    this.input.keyboard.on("keydown", handleKeyEvt);
    this.input.keyboard.on("keyup", handleKeyEvt);
  }

  update(): void {
    if (this.buffer === undefined) {
      return;
    }

    const { state } = this.buffer.getInterpolatedState(Date.now());

    state.chests.forEach((c) => {
      if (!this.chests.has(c.id)) {
        this.addChest(c);
      }
    });
    this.chests.forEach((chest, chestId) => {
      if (!state.chests.some((c) => c.id === chestId)) {
        chest.object.destroy();
        this.chests.delete(chestId);
      }
    });

    state.players.forEach((player) => {
      if (!this.players.has(player.id)) {
        this.addPlayer(player);
      } else {
        this.updatePlayer(player);
      }
    });
  }

  private handleMessage(msg: ServerMessage) {
    if (msg.type === ServerMessageType.StateUpdate) {
      if (this.buffer === undefined) {
        this.buffer = new InterpolationBuffer(msg.state, 50, lerp);
      } else {
        this.buffer.enqueue(msg.state, [], msg.ts);
      }
    }
  }

  private addChest({ id, x, y, reward, difficulty }: Chest) {
    const chestSprite = new Phaser.GameObjects.Sprite(this, x, y, "chest");
    this.add.existing(chestSprite);
    this.chests.set(id, { reward: reward, difficulty: difficulty, object: chestSprite });
  }

  private addPlayer({ id, x, y, name, role }: Player) {
    let sprite;
    if (role === "blackbeard") {
      sprite = new Phaser.GameObjects.Sprite(this, x, y, "blackbeard");
      name = "Black Beard";
    } else {
      sprite = new Phaser.GameObjects.Sprite(this, x, y, "player");
    }
    const nameText = new Phaser.GameObjects.Text(this, x, y - sprite.height, name, {
      // eslint-disable-next-line quotes
      fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
      fontSize: "24px",
      color: "black",
      fixedHeight: 28,
    }).setOrigin(0.5, 0);
    this.add.existing(sprite);
    this.add.existing(nameText);
    this.players.set(id, { sprite, name: nameText });
    if (id === this.user.id) {
      this.cameras.main.startFollow(sprite, true);
    }
  }

  private updatePlayer({ id, x, y, dir, role }: Player) {
    const { sprite, name } = this.players.get(id)!;
    if (dir === Direction.Left) {
      if (role === "blackbeard") {
        sprite.anims.play("bbwalkleft", true);
      } else {
        sprite.anims.play("walkleft", true);
      }
    } else if (dir === Direction.Right) {
      if (role === "blackbeard") {
        sprite.anims.play("bbwalkright", true);
      } else {
        sprite.anims.play("walkright", true);
      }
    } else if (dir === Direction.Down) {
      if (role === "blackbeard") {
        sprite.anims.play("bbwalkdown", true);
      } else {
        sprite.anims.play("walkdown", true);
      }
    } else if (dir === Direction.Up) {
      if (role === "blackbeard") {
        sprite.anims.play("bbwalkup", true);
      } else {
        sprite.anims.play("walkup", true);
      }
    } else if (dir === Direction.None) {
      if (role === "blackbeard") {
        sprite.anims.play("bbidle", true);
      } else {
        sprite.anims.play("idle", true);
      }
    }
    sprite.x = x;
    sprite.y = y;
    name.x = x;
    name.y = y - sprite.height;
  }
}

function lerp(from: GameState, to: GameState, pctElapsed: number): GameState {
  return {
    players: to.players.map((toPlayer) => {
      const fromPlayer = from.players.find((p) => p.id === toPlayer.id);
      return fromPlayer !== undefined ? lerpPlayer(fromPlayer, toPlayer, pctElapsed) : toPlayer;
    }),
    chests: to.chests,
  };
}

function lerpPlayer(from: Player, to: Player, pctElapsed: number): Player {
  return {
    id: from.id,
    x: from.x + (to.x - from.x) * pctElapsed,
    y: from.y + (to.y - from.y) * pctElapsed,
    dir: to.dir,
    name: from.name,
    role: from.role,
  };
}
