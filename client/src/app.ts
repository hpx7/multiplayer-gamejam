import Phaser from "phaser";

import { GameScene } from "./scenes/game";
import { GameOver } from "./scenes/gameover";
import { LobbyScene } from "./scenes/lobby";
import { TitleScene } from "./scenes/title";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [TitleScene, LobbyScene, GameScene, GameOver],
  parent: "root",
  dom: { createContainer: true },
});
