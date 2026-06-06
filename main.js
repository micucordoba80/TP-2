import Game from "./scenes/Game.js";

const config = {
  type: Phaser.AUTO,
  width: 720,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 }, // Gravedad para plataformas
      debug: false,       // Cambiar a true para ver los recuadros de colisión
    },
  },
  // Pasamos un objeto con el nivel actual al iniciar la escena
  scene: [Game],
};

new Phaser.Game(config);