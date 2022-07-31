import InputText from "phaser3-rex-plugins/plugins/inputtext";
import Phaser from "phaser";
import { InterpolationBuffer } from "interpolation-buffer";
import { HathoraTransport, TransportType } from "@hathora/client-sdk/lib/transport";
import { HathoraClient } from "@hathora/client-sdk";

import { GameState, Player } from "../../../shared/state";
import {
  ClientMessage,
  ClientMessageType,
  Direction,
  ServerMessage,
  ServerMessageType,
} from "../../../shared/messages";
import mapUrl from "../../../shared/HAT_mainmap.json";

export class GameScene extends Phaser.Scene {
  private encoder: TextEncoder;
  private decoder: TextDecoder;

  private client!: HathoraClient;
  private token!: string;
  private roomId!: string;
  private user!: object & { id: string };

  private connection!: HathoraTransport;
  private buffer: InterpolationBuffer<GameState> | undefined;

  private players: Map<string, Phaser.GameObjects.Sprite> = new Map();

  constructor() {
    super("game");
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  init({ client, token, roomId }: { client: HathoraClient; token: string; roomId: string }) {
    this.client = client;
    this.token = token;
    this.roomId = roomId;
    this.user = HathoraClient.getUserFromToken(token);
  }

  preload() {
    this.load.tilemapTiledJSON("map", mapUrl);
    this.load.image("tiles", "tiles_sheet.png");
    this.load.spritesheet("player", "pirate-Sheet.png", { frameWidth: 34, frameHeight: 45 });
    this.load.audio("music", "music.mp3");
  }

  create() {
    const roomCodeConfig: InputText.IConfig = {
      text: `Room Code: ${this.roomId}`,
      color: "white",
      fontFamily: "futura",
      fontSize: "20px",
      readOnly: true,
    };
    const inputText = new InputText(this, this.scale.width - 125, 20, 300, 50, roomCodeConfig).setScrollFactor(0);
    this.add.existing(inputText);

    const music = this.sound.add("music");
    music.play();

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tiles_sheet", "tiles");
    map.createLayer("Water", tileset);
    map.createLayer("Beach", tileset);

    this.cameras.main.setBounds(0, 0, 8192, 4096);

    this.client
      .connect(
        this.token,
        this.roomId,
        (data) => this.handleMessage(data),
        (err) => this.handleClose(err),
        TransportType.WebSocket
      )
      .then((connection) => {
        this.connection = connection;
        console.log("connected");
      });

    const keys = this.input.keyboard.createCursorKeys();
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

      const msg: ClientMessage = { type: ClientMessageType.SetDirection, direction };
      console.log("sending msg", msg);
      this.connection.write(this.encoder.encode(JSON.stringify(msg)));
    };
    this.input.keyboard.on("keydown", handleKeyEvt);
    this.input.keyboard.on("keyup", handleKeyEvt);
  }

  update(): void {
    if (this.buffer === undefined) {
      return;
    }

    const { state } = this.buffer.getInterpolatedState(Date.now());
    state.players.forEach((player) => {
      if (!this.players.has(player.id)) {
        this.addPlayer(player);
      } else {
        this.updatePlayer(player);
      }
    });
  }

  private handleMessage(data: ArrayBuffer) {
    const msg: ServerMessage = JSON.parse(this.decoder.decode(data));
    if (msg.type === ServerMessageType.StateUpdate) {
      if (this.buffer === undefined) {
        this.buffer = new InterpolationBuffer(msg.state, 50, lerp);
      } else {
        this.buffer.enqueue(msg.state, [], Date.now());
      }
    }
  }

  private handleClose(err: { code: number; reason: string }) {
    console.error("close", err);
  }

  private addPlayer({ id, x, y }: Player) {
    const sprite = new Phaser.GameObjects.Sprite(this, x, y, "player").setOrigin(0, 0);
    this.add.existing(sprite);
    this.players.set(id, sprite);
    if (id === this.user.id) {
      this.cameras.main.startFollow(sprite, true);
    }
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
  }

  private updatePlayer({ id, x, y }: Player) {
    const sprite = this.players.get(id)!;
    if (x < sprite.x) {
      sprite.anims.play("walkleft", true);
    } else if (x > sprite.x) {
      sprite.anims.play("walkright", true);
    } else if (y > sprite.y) {
      sprite.anims.play("walkdown", true);
    } else if (y < sprite.y) {
      sprite.anims.play("walkup", true);
    } else {
      sprite.anims.play("idle");
    }
    sprite.x = x;
    sprite.y = y;
  }
}

function lerp(from: GameState, to: GameState, pctElapsed: number): GameState {
  return {
    players: to.players.map((toPlayer) => {
      const fromPlayer = from.players.find((p) => p.id === toPlayer.id);
      return fromPlayer !== undefined ? lerpPlayer(fromPlayer, toPlayer, pctElapsed) : toPlayer;
    }),
  };
}

function lerpPlayer(from: Player, to: Player, pctElapsed: number): Player {
  return {
    id: from.id,
    x: from.x + (to.x - from.x) * pctElapsed,
    y: from.y + (to.y - from.y) * pctElapsed,
  };
}
