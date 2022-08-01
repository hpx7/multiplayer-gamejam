/* eslint-disable prettier/prettier */
import Phaser from "phaser";

import { GameScene } from "./scenes/game";
import { TitleScene } from "./scenes/title";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [TitleScene, GameScene],
  parent: "root",
  dom: { createContainer: true },
});
