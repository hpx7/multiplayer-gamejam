import Phaser from "phaser";

import { GameScene } from "./scenes/game";
import { LobbyScene } from "./scenes/lobby";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [LobbyScene, GameScene],
  parent: "root",
  dom: { createContainer: true },
});
