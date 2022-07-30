import Phaser from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";
import { HathoraClient } from "@hathora/client-sdk";
import { HathoraTransport, TransportType } from "@hathora/client-sdk/lib/transport";

import { ClientMessage, ClientMessageType, Direction } from "../../../shared/messages";

export class GameScene extends Phaser.Scene {
  private encoder: TextEncoder;
  private decoder: TextDecoder;

  private client!: HathoraClient;
  private token!: string;
  private roomId!: string;
  private connection!: HathoraTransport;

  constructor() {
    super("game");
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  init({ client, token, roomId }: { client: HathoraClient; token: string; roomId: string }) {
    this.client = client;
    this.token = token;
    this.roomId = roomId;
  }

  preload() {
    this.load.tilemapTiledJSON("map", "HAT_mainmap.json");
    this.load.image("tiles", "tiles_sheet.png");
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
    const that = this;
    function handleKeyEvt() {
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
      that.connection.write(that.encoder.encode(JSON.stringify(msg)));
    }
    this.input.keyboard.on("keydown", handleKeyEvt);
    this.input.keyboard.on("keyup", handleKeyEvt);
  }

  update(time: number, delta: number): void {}

  handleMessage(data: ArrayBuffer) {
    const msg = JSON.parse(this.decoder.decode(data));
    console.log("server message", msg);
  }

  handleClose(err: { code: number; reason: string }) {
    console.error("close", err);
  }
}
