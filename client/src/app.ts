import Phaser from "phaser";

import { TitleScene } from "./scenes/title";
import { GameScene } from "./scenes/game";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [TitleScene, GameScene],
  parent: "root",
  dom: { createContainer: true },
});
