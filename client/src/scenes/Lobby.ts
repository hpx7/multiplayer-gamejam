/* eslint-disable prettier/prettier */
import { HathoraClient } from "@hathora/client-sdk";
import { HathoraTransport, TransportType } from "@hathora/client-sdk/lib/transport";
import { InterpolationBuffer } from "interpolation-buffer";
import Phaser from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";

import { ClientMessage, ClientMessageType, ServerMessage, ServerMessageType } from "../../../shared/messages";
import { GameState, Player } from "../../../shared/state";


export class LobbyScene extends Phaser.Scene {
  //private encoder: TextEncoder;
  private decoder: TextDecoder;
  private encoder: TextEncoder;
  private client!: HathoraClient;
  private token!: string;
  private roomId!: string;
  private user!: object & { id: string };
  private buffer: InterpolationBuffer<GameState> | undefined;
  private players: Map<string, number> = new Map();
  private lobbyText: any;
  private connection!: HathoraTransport;
  private isAddingPlayers= true;
  

  constructor() {
    super("lobby");
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  init({ client, token, roomId }: { client: HathoraClient; token: string; roomId: string }) {
    this.client = client;
    this.token = token;
    this.roomId = roomId;
    this.user = HathoraClient.getUserFromToken(token);
  }

  preload(){
    this.load.image("help", "whitequestion-mark.png");
    this.load.image("back", "whiteback-button.png");
  }

  create(){
    
    this.client
      .connect(
        this.token,
        this.roomId,
        (data) => this.handleMessage(data), //this.handleMessage(data)
        (err) => this.handleClose(err),
        TransportType.WebSocket
      )
      .then((connection) => {
        this.connection = connection;
        console.log("connected");
      });
    


    /**
    * Setting up Lobby UI
    */

    //Start Game Button
    const { width, height } = this.scale;
    const createButton = this.add
      .text(width / 2, 9*height / 10, "START GAME", {
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
        console.log("sending msg", msg);
        this.connection.write(this.encoder.encode(JSON.stringify(msg)));
        const roomId = await this.client.create(this.token, new Uint8Array());
        this.scene.start("game", { client: this.client,token: this.token, roomId: roomId, connection:this.connection, decoder: this.decoder });
      });

    //title
    const titleConfig: InputText.IConfig = {
      text: `LOBBY -  ROOM: ${this.roomId}`,
      color: "black",
      fontFamily: "futura",
      fontSize: "32px",
      readOnly: true,
      backgroundColor: "#dddddd",
    };
    const inputText = new InputText(this, width/2, 30, 500, 50, titleConfig).setScrollFactor(0);
    this.add.existing(inputText);

    //back button
    const backButton = this.add
      .image(45,9*height / 10,"back")
      .setScale(.075,.075)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        //disconnect from game
        this.connection.disconnect();
        //go back to title screen
        this.scene.start("title");
      });

    //help button
    let helpElement:Phaser.GameObjects.DOMElement;
    const helpButton = this.add
      .image(755,9*height / 10,"help")
      .setScale(.075,.075)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => {

        let helpDiv = document.createElement("div");
        helpDiv.innerHTML = "<-- For player movement, use arrow keys -->    <-- For Chest mini-game: use Z and X keys to move wrench, Enter to attempt to open -->    <-- Hit SpaceBar to open chests -->";
        helpElement = this.add.dom(width/2,height/2,helpDiv,"font-size: xx-large; text-align: center; color: white; width: 600px; height: 300px; border: 1px solid white; background-color: black");
      })
      .on("pointerout", () => {
        helpElement.removeElement();
      });

    //backstory text
    let btext = this.make.text({
      x: 20,
      y: 250,
      padding: {
        left: 50,
        right: 50,
        top: 50,
        bottom: 50,        
      },
      
      text: "Welcome to Honor Amongst Thieves -- In this game, BlackBeard the Pirate has found a series of islands with treasure scattered about.  BlackBeard starts to suspect that not all of his crew are loyal to him.  It is up to BlackBeard himself to learn who he can and cannot trust.  There are imposter Pirates on the crew who are looking out for their own rival crew.  They are looking to not lose BlackBeards trust, while keeping some of the gold for themselves.",
      style: {
        fontSize: "22px",
        fontFamily: "fortuna",
        color: "#ffffff",
        align: "center",  
        backgroundColor: "black",
        wordWrap: {
          width: 675
        },
      },
      add: true
    });

    //pretty rectangle border
    let graphics = this.add.graphics();
    graphics.lineStyle(2, 0xdddddd, 1);
    graphics.strokeRoundedRect(25,75,750,200,20);
    

    //all the players connected
    this.lobbyText = this.make.text({
      x: 50,
      y:  80,
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
        align: "center",  // 'left'|'center'|'right'|'justify'
        backgroundColor: "black",
        wordWrap: {
          width: 700
        },
      },
      add: true
    });
  }
  
  update(): void {
    if (this.buffer === undefined) {
      return;
    }

    if(this.isAddingPlayers){
      let lobbyString = "";
      const { state } = this.buffer.getInterpolatedState(Date.now());
      state.players.forEach((player, index) => {
        
        if (!this.players.has(player.id))  {this.players.set(player.id, index);} 
        lobbyString = lobbyString + (`(Player: ${index}, ID: ${player.id})  `);
      });
      this.lobbyText.text = lobbyString;
    }
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
    dir: to.dir,
  };
}
  