import { HathoraClient } from "@hathora/client-sdk";
import Phaser from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";

import { RoomConnection } from "../connection";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  preload() {
    this.load.audio("title-music", "title_music.mp3");
  }

  create() {
    const client = new HathoraClient(import.meta.env.APP_ID);

    const music = this.sound.add("title-music", { loop: true, volume: 0.25 });
    music.play();

    getToken(client).then(async (token) => {
      const savedRoomId = sessionStorage.getItem("roomId");
      if (savedRoomId !== null) {
        this.scene.start("game", { connection: await getConnection(client, token, savedRoomId) });
      }

      const url = window.location === window.parent.location ? document.location.href : document.referrer;
      if (url.includes("?")) {
        const queryString = url.split("?")[1];
        const queryParams = new URLSearchParams(queryString);
        const roomId = queryParams.get("roomId");

        if (roomId !== null) {
          this.scene.start("lobby", { connection: await getConnection(client, token, roomId), music });
          return;
        }
      }

      const { width, height } = this.scale;
      const createButton = this.add
        .text(width / 2, height / 4, "Create New Game", {
          fontSize: "20px",
          fontFamily: "futura",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setPadding(10)
        .setStyle({ backgroundColor: "#111" })
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => createButton.setStyle({ fill: "#f39c12" }))
        .on("pointerout", () => createButton.setStyle({ fill: "#FFF" }))
        .on("pointerdown", async () => {
          const roomId = await client.create(token, new Uint8Array());
          this.scene.start("lobby", { connection: await getConnection(client, token, roomId), music });
        });

      const joinButton = this.add
        .text(width / 2, (height * 3) / 4, "Join Existing Game", {
          fontSize: "20px",
          fontFamily: "futura",
        })
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setPadding(10)
        .setStyle({ backgroundColor: "#111" })
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => joinButton.setStyle({ fill: "#f39c12" }))
        .on("pointerout", () => joinButton.setStyle({ fill: "#FFF" }))
        .on("pointerdown", async () => {
          const roomId = inputText.text?.trim();
          if (roomId === undefined || roomId === "") {
            alert("Please enter an existing room code or create a new game!");
            return;
          }
          this.scene.start("lobby", { connection: await getConnection(client, token, roomId), music });
        });

      const inputTextConfig: InputText.IConfig = {
        border: 10,
        borderColor: "black",
        backgroundColor: "white",
        placeholder: "Room Code",
        color: "black",
        fontFamily: "futura",
        fontSize: "16px",
      };
      const inputText = new InputText(this, joinButton.x, joinButton.y - 40, 100, 30, inputTextConfig);
      this.add.existing(inputText);
    });
  }
}

async function getToken(client: HathoraClient): Promise<string> {
  const token = sessionStorage.getItem("token");
  if (token === null) {
    const newToken = await client.loginAnonymous();
    sessionStorage.setItem("token", newToken);
    return newToken;
  }
  return token;
}

async function getConnection(client: HathoraClient, token: string, roomId: string): Promise<RoomConnection> {
  const connection = new RoomConnection(client, token, roomId);
  await connection.connect();
  return connection;
}
