export default class Game extends Phaser.Scene {
  constructor() {
    super("game");
  }

  init(data) {
    this.currentLevel = data.level || 1; 
    this.score = data.score || 0;        
    this.collectedStarsInLevel = 0;      
  }

  preload() {
    if (this.currentLevel === 1) {
      this.load.tilemapTiledJSON("map", "public/assets/tilemap/map.json");
      this.load.image("tileset", "public/assets/texture.png");
    } else {
      this.load.tilemapTiledJSON("map", "public/assets/tilemap/map2.json");
      this.load.image("tileset", "public/assets/texture2.png");
    }

    this.load.image("star", "public/assets/star.png");
    this.load.image("bomb", "public/assets/bomb.png"); 

    this.load.spritesheet("dude", "public/assets/dude.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
  }

  create() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("tileset", "tileset");

    const belowLayer = map.createLayer("Fondo", tileset, 0, 0);
    const platformLayer = map.createLayer("Plataformas", tileset, 0, 0);
    const objectsLayer = map.getObjectLayer("Objetos");

    const spawnPoint = map.findObject("Objetos", (obj) => obj.name === "player");
    this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, "dude");
    
    // Le sacamos el setBounce para que no rebote feo contra los pasillos del laberinto
    this.player.setCollideWorldBounds(true);

    if (!this.anims.exists("left")) {
      this.anims.create({
        key: "left",
        frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: "turn",
        frames: [{ key: "dude", frame: 4 }],
        frameRate: 20,
      });
      this.anims.create({
        key: "right",
        frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    platformLayer.setCollisionByProperty({ esColisionable: true });
    this.physics.add.collider(this.player, platformLayer);

    this.stars = this.physics.add.group();
    this.goals = this.physics.add.staticGroup(); 

    objectsLayer.objects.forEach((objData) => {
      const { x = 0, y = 0, name, type } = objData;
      
      if (type === "star") {
        const star = this.stars.create(x, y, "star");
        // En un laberinto de vista de arriba, las estrellas no caen, quedan fijas en su lugar
        star.body.allowGravity = false; 
      } 
      else if (type === "goal") {
        this.goals.create(x, y, "bomb");
      }
    });

    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.overlap(this.player, this.goals, this.reachGoal, null, this);

    this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, { fontSize: "32px", fill: "#000" });
    this.starsText = this.add.text(16, 50, `Estrellas: ${this.collectedStarsInLevel} / 5`, { fontSize: "24px", fill: "#000" });
    this.levelText = this.add.text(550, 16, `Nivel: ${this.currentLevel}`, { fontSize: "24px", fill: "#000" });
  }

  update() {
    // 👈 MOVIMIENTO DE LABERINTO (4 DIRECCIONES)
    
    // Primero reseteamos la velocidad para que si no tocás nada, se quede quieto
    this.player.setVelocity(0);

    // Eje Horizontal (Izquierda / Derecha)
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play("left", true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play("right", true);
    }

    // Eje Vertical (Arriba / Abajo)
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-160); // Camina hacia arriba
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
        this.player.anims.play("left", true); // Animación temporal
      }
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(160); // Camina hacia abajo
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
        this.player.anims.play("right", true); // Animación temporal
      }
    }

    // Si no se mueve en ninguna dirección, frame quieto
    if (this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0) {
      this.player.anims.play("turn");
    }

    // Reiniciar nivel con la R
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart({ level: this.currentLevel, score: this.score });
    }
  }

  collectStar(player, star) {
    star.disableBody(true, true);
    this.score += 10;
    this.collectedStarsInLevel += 1;
    this.scoreText.setText(`Score: ${this.score}`);
    this.starsText.setText(`Estrellas: ${this.collectedStarsInLevel} / 5`);
  }

  reachGoal(player, goal) {
    if (this.collectedStarsInLevel >= 5) {
      console.log("¡Ganaste el nivel!");
      if (this.currentLevel === 1) {
        this.scene.restart({
          level: 2,
          score: this.score
        });
      } else {
        this.add.text(150, 300, "¡GANASTE EL JUEGO!", { fontSize: "40px", fill: "#0f0", backgroundColor: "#000" });
        this.physics.pause();
      }
    } else {
      console.log("Te faltan estrellas. Necesitás mínimo 5.");
    }
  }
}