import Phaser from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";

import { ClientMessage, ClientMessageType, ServerMessage, ServerMessageType } from "../../../shared/messages";
import { RoomConnection } from "../connection";

export class LobbyScene extends Phaser.Scene {
  private connection!: RoomConnection;
  private music!: Phaser.Sound.BaseSound;
  private lobbyText: any;
  private isAddingPlayers = true;

  constructor() {
    super("lobby");
  }

  init({ connection, music }: { connection: RoomConnection; music: Phaser.Sound.BaseSound }) {
    this.connection = connection;
    this.music = music;
    this.isAddingPlayers = true;
  }

  preload() {
    this.load.image("help", "whitequestion-mark.png");
    this.load.image("back", "whiteback-button.png");
    this.load.audio("title-music", "title_music.mp3");
  }

  create() {
    this.connection.addListener((msg) => this.handleMessage(msg));

    this.events.on("shutdown", () => {
      this.music.stop();
    });

    /**
     * Setting up Lobby UI
     */

    //Start Game Button
    const { width, height } = this.scale;
    const createButton = this.add
      .text(width / 2, (9 * height) / 10, "START GAME", {
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
        this.isAddingPlayers = false;
        const msg: ClientMessage = { type: ClientMessageType.StartGame };
        console.log("sending starting game message", msg);
        this.connection.sendMessage(msg);
      });

    //title
    const titleConfig: InputText.IConfig = {
      text: `LOBBY -  ROOM CODE: ${this.connection.roomId}`,
      color: "black",
      fontFamily: "futura",
      fontSize: "32px",
      readOnly: true,
      backgroundColor: "#dddddd",
    };
    const inputText = new InputText(this, width / 2, 30, 600, 50, titleConfig).setScrollFactor(0);
    this.add.existing(inputText);

    //back button
    this.add
      .image(45, (9 * height) / 10, "back")
      .setScale(0.075, 0.075)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        //disconnect from game
        this.connection.disconnect();
        //go back to title screen
        this.scene.start("title");
        sessionStorage.removeItem("roomId");
        sessionStorage.removeItem("token");
      });

    //help button
    let helpElement: Phaser.GameObjects.DOMElement;
    this.add
      .image(755, (9 * height) / 10, "help")
      .setScale(0.075, 0.075)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => {
        let helpDiv = document.createElement("div");
        helpDiv.innerHTML =
          "<p>For player movement, use arrow keys</p><p>Collect Chests</p> <p>For Blackbeard:</p> <p>Hit SpaceBar to eliminate players when armed</p><p>Your BOT pirates will turn in their gold periodically</p>";
        helpElement = this.add.dom(
          width / 2,
          height / 2,
          helpDiv,
          "font-size: x-large; text-align: center; color: white; width: 600px; height: 300px; border: 1px solid white; background-color: black"
        );
      })
      .on("pointerout", () => {
        helpElement.removeElement();
      });

    //backstory text
    this.make.text({
      x: 20,
      y: 250,
      padding: {
        left: 50,
        right: 50,
        top: 50,
        bottom: 50,
      },

      text: "BlackBeard the pirate has found a series of islands with legendary treasure scattered about, and he recruits a crew to collect it.  However, he starts to suspect that not all of his crew are loyal to him.  It is up to BlackBeard himself to learn who he can and cannot trust.\n\nBlackBeard must discover the imposter pirates before they steal too much treasure for themselves!",
      style: {
        fontSize: "22px",
        fontFamily: "fortuna",
        color: "#ffffff",
        align: "center",
        backgroundColor: "black",
        wordWrap: {
          width: 675,
        },
      },
      add: true,
    });

    //pretty rectangle border
    let graphics = this.add.graphics();
    graphics.lineStyle(2, 0xdddddd, 1);
    graphics.strokeRoundedRect(25, 75, 750, 200, 20);

    //all the players connected
    this.lobbyText = this.make.text({
      x: 50,
      y: 80,
      padding: {
        left: 5,
        right: 5,
        top: 5,
        bottom: 5,
      },

      text: "This is where Players will be listed",
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

  private handleMessage(msg: ServerMessage) {
    if (msg.type === ServerMessageType.StateUpdate) {
      if (this.isAddingPlayers) {
        let lobbyString = "";
        msg.state.players.forEach((player, index) => {
          lobbyString = lobbyString + `(Player: ${index}, Name: ${player.name})  `;
        });
        this.lobbyText.text = lobbyString;
      }
    } else if (msg.type === ServerMessageType.SrvStartGame) {
      console.log("received start message from server");
      this.isAddingPlayers = false;
      this.scene.start("game", { connection: this.connection });
    }
  }
}
