import Game from "./scenes/Game.js";

const config = {
  type: Phaser.AUTO,
  width: 720,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 600,
    },
    max: {
      width: 1600,
      height: 1200,
    },
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // Laberinto estricto sin caídas
      debug: true,       // Dejalo en true para ver las cajitas verdes de colisión
    },
  },
  scene: [Game],
};

window.game = new Phaser.Game(config);