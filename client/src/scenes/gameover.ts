import Phaser from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";

import { RoomConnection } from "../connection";

export class GameOver extends Phaser.Scene {
  winningteam: any;
  connection!: RoomConnection;

  constructor() {
    super("gameover");
  }

  init({ winner, connection }: { winner: string; connection: RoomConnection }) {
    this.winningteam = winner;
    this.connection = connection;
  }

  preload() {
    this.load.audio("g_over", "Game Over.wav");
  }

  create() {
    /**
     * Setting up game over UI
     */
    const music = this.sound.add("g_over", { loop: true, volume: 0.25 });
    music.play();

    this.events.on("shutdown", () => {
      music.stop();
    });

    //Restart Game Button
    const { width, height } = this.scale;
    const createButton = this.add
      .text(width / 2, (9 * height) / 10, "BACK TO TITLE SCREEN", {
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
        if (this.connection) {
          this.connection.disconnect();
        }
        const savedRoomId = sessionStorage.getItem("roomId");
        if (savedRoomId) {
          sessionStorage.removeItem("roomId");
        }

        this.scene.start("title");
      });

    //title
    const titleConfig: InputText.IConfig = {
      text: "GAME OVER",
      align: "center",
      color: "black",
      fontFamily: "futura",
      fontSize: "32px",
      readOnly: true,
      backgroundColor: "#dddddd",
    };
    const inputText = new InputText(this, width / 2, 30, 500, 50, titleConfig).setScrollFactor(0);
    this.add.existing(inputText);

    //pretty rectangle border
    let graphics = this.add.graphics();
    graphics.lineStyle(2, 0xdddddd, 1);
    graphics.strokeRoundedRect(25, 75, 750, 200, 20);

    //all the players connected
    this.make.text({
      x: 50,
      y: 80,
      padding: {
        left: 5,
        right: 5,
        top: 5,
        bottom: 5,
      },

      text: `The winning team was: ${this.winningteam}`,
      style: {
        fontSize: "22px",
        fontFamily: "fortuna",
        color: "#ffffff",
        align: "center", // 'left'|'center'|'right'|'justify'
        backgroundColor: "black",
        wordWrap: {
          width: 700,
        },
      },
      add: true,
    });
  }
}
