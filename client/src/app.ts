import Phaser from "phaser";

import { GameScene } from "./scenes/game";
import { LobbyScene } from "./scenes/lobby";
import { TitleScene } from "./scenes/title";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [TitleScene, GameScene, LobbyScene],
  parent: "root",
  dom: { createContainer: true },
});
