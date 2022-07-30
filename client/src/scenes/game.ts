import Phaser from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";
import { HathoraClient } from "@hathora/client-sdk";
import { HathoraTransport, TransportType } from "@hathora/client-sdk/lib/transport";

export class GameScene extends Phaser.Scene {
  private client!: HathoraClient;
  private token!: string;
  private roomId!: string;
  private connection!: HathoraTransport;
  private controls!: Phaser.Cameras.Controls.SmoothedKeyControl;

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
    const inputText = new InputText(
      this,
      this.scale.width / 2,
      this.scale.height - 40,
      300,
      50,
      roomCodeConfig
    ).setOrigin(0.5);
    this.add.existing(inputText);

    const music = this.sound.add("music");
    music.play();

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tiles_sheet", "tiles");
    map.createLayer("Water", tileset);
    map.createLayer("Beach", tileset);

    this.cameras.main.setBounds(0, 0, 8192, 4096);

    const cursors = this.input.keyboard.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 0.01,
      maxSpeed: 1.0,
    };
    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

    this.client
      .connect(this.token, this.roomId, this.handleMessage, this.handleClose, TransportType.WebSocket)
      .then((connection) => {
        this.connection = connection;
        console.log("connected");
      });
  }

  update(time: number, delta: number): void {
    this.controls.update(delta);
  }

  handleMessage(data: ArrayBuffer) {
    console.log("message", data);
  }

  handleClose(e: { code: number; reason: string }) {
    console.error("close", e);
  }
}
