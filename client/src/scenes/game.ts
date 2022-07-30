import Phaser from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";
import { HathoraClient } from "@hathora/client-sdk";
import { HathoraTransport, TransportType } from "@hathora/client-sdk/lib/transport";

export class GameScene extends Phaser.Scene {
  private client!: HathoraClient;
  private token!: string;
  private roomId!: string;
  private connection!: HathoraTransport;

  constructor() {
    super("game");
  }

  init({ client, token, roomId }: { client: HathoraClient; token: string; roomId: string }) {
    this.client = client;
    this.token = token;
    this.roomId = roomId;
  }

  preload() {
    this.load.tilemapTiledJSON("map", "HAT_mainmap.json");
    this.load.image("tiles", "tiles_sheet.png");
  }

  create() {
    const roomCodeConfig: InputText.IConfig = {
      text: `Room Code: ${this.roomId}`,
      color: "white",
      fontFamily: "futura",
      fontSize: "20px",
      readOnly: true,
    };
    const inputText = new InputText(
      this,
      this.scale.width / 2,
      this.scale.height - 40,
      300,
      50,
      roomCodeConfig
    ).setOrigin(0.5);
    this.add.existing(inputText);

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tiles_sheet", "tiles");
    map.createLayer("Water", tileset);
    map.createLayer("Beach", tileset);

    this.client
      .connect(this.token, this.roomId, this.handleMessage, this.handleClose, TransportType.WebSocket)
      .then((connection) => {
        this.connection = connection;
        console.log("connected");
      });
  }

  handleMessage(data: ArrayBuffer) {
    console.log("message", data);
  }

  handleClose(e: { code: number; reason: string }) {
    console.error("close", e);
  }
}
