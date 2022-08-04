import { HathoraClient } from "@hathora/client-sdk";
import { InterpolationBuffer } from "interpolation-buffer";
import Phaser, { GameObjects } from "phaser";
import InputText from "phaser3-rex-plugins/plugins/inputtext";

import mapUrl from "../../../shared/HAT_mainmap.json";
import {
  ClientMessage,
  ClientMessageType,
  Direction,
  ServerMessage,
  ServerMessageType,
} from "../../../shared/messages";
import { BlackBeardKillState, Chest, Difficulty, GameState, Player } from "../../../shared/state";
import { RoomConnection } from "../connection";

export class GameScene extends Phaser.Scene {
  private connection!: RoomConnection;
  private user!: object & { id: string };

  private buffer: InterpolationBuffer<GameState> | undefined;

  private players: Map<string, { sprite: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text }> = new Map();
  private chests: Map<string, { difficulty: Difficulty; reward: number; object: Phaser.GameObjects.Sprite }> =
    new Map();

  private gameStatus: string | undefined = undefined;
  private bbStatus: "enabled" | "disabled" | undefined;
  private bbID: string | undefined;
  private normalTintColor = 0xffffff;
  private bbWarningColor = 0xff0000;
  private previousStatus: "enabled" | "disabled" | undefined;
  private playerTween: any;

  constructor() {
    super("game");
  }

  init({ connection }: { connection: RoomConnection }) {
    this.connection = connection;
    this.user = HathoraClient.getUserFromToken(connection.token);
    this.bbStatus = "disabled";
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

    /**
     * BlackBeards' Elimination Code
     */
    let tempKey = this.input.keyboard.addKey("SPACE"); // Get key object

    tempKey.on("down", () => {
      //this code only works if the player is BlackBeard
      if (this.user.id != this.bbID) {
        return;
      }
      //add gaurd condition for disabled
      if (this.bbStatus == "disabled") {
        return;
      }

      //get state
      if (this.buffer) {
        const { state } = this.buffer.getInterpolatedState(Date.now());
        //get BB's position
        let bbPosition = getBBPosition(this.bbID, state);
        let targetArray: Array<{ id: string; distance: number }> = getListofElibibleTargets(
          this.bbID,
          bbPosition,
          state
        );
        //if no eligible targets, bail
        if (!targetArray) {
          return;
        }
        //find the target which is closest
        let target = targetArray.reduce(
          (previousValue: { id: string; distance: number }, currentValue: { id: string; distance: number }) => {
            if (previousValue.distance < currentValue.distance) {
              return previousValue;
            } else {
              return currentValue;
            }
          },
          { id: "", distance: Infinity }
        );

        //Tell server to eliminate player
        const msg: ClientMessage = { type: ClientMessageType.EliminatePlayer, player: target.id };
        this.connection.sendMessage(msg);
      }
    });

    let prevDirection = Direction.None;
    const handleKeyEvt = () => {
      if (!this.gameStatus) {
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
          const msg: ClientMessage = { type: ClientMessageType.SetDirection, direction };
          console.log("sending msg", msg);
          this.connection.sendMessage(msg);
        }
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

    if (this.chests.size === 0) {
      //first time through
      state.chests.forEach((c) => {
        this.addChest(c);
      });
      console.log(this.chests);
    }

    if (state.blackbeard.state == BlackBeardKillState.Enabled) {
      this.bbStatus = "enabled";
    } else {
      this.bbStatus = "disabled";
    }

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
    } else if (msg.type === ServerMessageType.SuspendPlayer) {
      /*
        This is what happens to a player if they are eliminated by Blackbeard
        keyboard controls disabled, camera starts following Blackbeard
        Game over screen shows up
      */

      //disables keybaord
      this.gameStatus = "suspended";
      //set's camera to BlackBeard
      let bbValues;
      if (this.bbID) {
        bbValues = this.players.get(this.bbID);
      }
      if (bbValues) {
        this.cameras.main.startFollow(bbValues.sprite, true);
      }
      //Display Game Over
      //title
      const { width, height } = this.scale;
      const titleConfig: InputText.IConfig = {
        text: "GAME OVER",
        color: "red",
        fontFamily: "futura",
        fontSize: "96px",
        readOnly: true,
      };
      const inputText = new InputText(this, width / 2 - 150, 3 * (height / 10), 600, 100, titleConfig).setScrollFactor(
        0
      );
      this.add.existing(inputText);
    }
  }

  private addChest({ id, x, y, reward, difficulty }: Chest) {
    //convert x,y to pixel
    x *= 64;
    y *= 64;
    const chestSprite = new Phaser.GameObjects.Sprite(this, x, y, "chest").setOrigin(0, 0);

    this.add.existing(chestSprite);
    this.chests.set(id, { reward: reward, difficulty: difficulty, object: chestSprite });
  }

  private addPlayer({ id, x, y, name, role }: Player) {
    let sprite: GameObjects.Sprite;
    if (role === "blackbeard") {
      sprite = new Phaser.GameObjects.Sprite(this, x, y, "blackbeard").setOrigin(0.5, 1);
      name = "Black Beard";
      this.bbID = id;
    } else {
      sprite = new Phaser.GameObjects.Sprite(this, x, y, "player").setOrigin(0.5, 1);
    }
    sprite.setTint(this.normalTintColor);
    const normalColor = Phaser.Display.Color.ValueToColor(this.normalTintColor);

    this.playerTween = this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 750,
      ease: Phaser.Math.Easing.Sine.InOut,
      repeat: -1,
      yoyo: true,
      onUpdate: (tween) => {
        const value = tween.getValue();
        const colorObject = Phaser.Display.Color.Interpolate.ColorWithColor(normalColor, normalColor, 100, value);
        const myColor = Phaser.Display.Color.GetColor(colorObject.r, colorObject.g, colorObject.g);
        sprite.setTint(myColor);
      },
    });

    const nameText = new Phaser.GameObjects.Text(this, x, y - sprite.height, name, {
      // eslint-disable-next-line quotes
      fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
      fontSize: "24px",
      color: "black",
      fixedHeight: 28,
    }).setOrigin(0.5, 1);
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

    //tweening colors
    if (this.bbStatus == "enabled" && role == "blackbeard" && this.previousStatus != this.bbStatus) {
      console.log("setting Blackbeard to killmode");
      this.previousStatus = this.bbStatus;
      const normalColor = Phaser.Display.Color.ValueToColor(this.normalTintColor);
      const newColor = Phaser.Display.Color.ValueToColor(this.bbWarningColor);
      this.playerTween = this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 750,
        ease: Phaser.Math.Easing.Sine.InOut,
        repeat: -1,
        yoyo: true,
        onUpdate: (tween) => {
          const value = tween.getValue();
          const colorObject = Phaser.Display.Color.Interpolate.ColorWithColor(normalColor, newColor, 100, value);
          const myColor = Phaser.Display.Color.GetColor(colorObject.r, colorObject.g, colorObject.g);
          sprite.setTint(myColor);
        },
      });
    } else if (this.bbStatus == "disabled" && role == "blackbeard" && this.previousStatus != this.bbStatus) {
      console.log("setting Blackbeard back to normal");
      this.previousStatus = this.bbStatus;
      const normalColor = Phaser.Display.Color.ValueToColor(this.normalTintColor);

      this.playerTween = this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 750,
        ease: Phaser.Math.Easing.Sine.InOut,
        repeat: -1,
        yoyo: true,
        onUpdate: (tween) => {
          const value = tween.getValue();
          const colorObject = Phaser.Display.Color.Interpolate.ColorWithColor(normalColor, normalColor, 100, value);
          const myColor = Phaser.Display.Color.GetColor(colorObject.r, colorObject.g, colorObject.g);
          sprite.setTint(myColor);
        },
      });
    }
  }
}

function lerp(from: GameState, to: GameState, pctElapsed: number): GameState {
  return {
    players: to.players.map((toPlayer) => {
      const fromPlayer = from.players.find((p) => p.id === toPlayer.id);
      return fromPlayer !== undefined ? lerpPlayer(fromPlayer, toPlayer, pctElapsed) : toPlayer;
    }),
    chests: to.chests,
    blackbeard: to.blackbeard,
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

function getBBPosition(bbid: string | undefined, state: GameState): { x: number; y: number } {
  let bbplayer = state.players.findIndex((p) => {
    return p.id == bbid;
  });
  return {
    x: state.players[bbplayer].x,
    y: state.players[bbplayer].y,
  };
}

function getListofElibibleTargets(
  id: string,
  position: { x: number; y: number },
  state: GameState
): Array<{ id: string; distance: number }> {
  let targetArray: Array<{ id: string; distance: number }> = [];
  state.players.forEach((p) => {
    //not blackbeard
    if (p.id != id) {
      //Distance = |P-E| = |(3,3)-(1,2)| = |(2,1)| = sqrt(2*2+1*1) = sqrt(5) = 2.23
      const distanceVector = { x: 0, y: 0 };
      //convert to tiles
      distanceVector.x = Math.abs(position.x - p.x) / 64;
      distanceVector.y = Math.abs(position.y - p.y) / 64;
      const distance = Math.sqrt(distanceVector.x * distanceVector.x + distanceVector.y * distanceVector.y);
      if (distance <= 3.5) {
        targetArray.push({ id: p.id, distance: distance });
      }
    }
  });
  return targetArray;
}
