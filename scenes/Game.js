export default class Game extends Phaser.Scene {
  constructor() {
    super("game");
  }

  init(data) {
    this.currentLevel = data.level !== undefined ? data.level : 3; // Empieza temporalmente en el nivel 3
    this.score = data.score || 0;        // Mantiene el puntaje acumulado anterior
    this.collectedStarsInLevel = 0;      // Contador de estrellas de este nivel
  }

  preload() {
    const mapKey = `map${this.currentLevel}`;
    let mapFile = "public/assets/tilemap/map.json";
    let tilesetFile = "public/assets/1.png";

    if (this.currentLevel === 2) {
      mapFile = "public/assets/tilemap/map2.json";
    } else if (this.currentLevel === 3) {
      mapFile = "public/assets/tilemap/map3.json";
    }

    this.load.tilemapTiledJSON(`map${this.currentLevel}`, mapFile);
    this.load.image(`tilesetKey${this.currentLevel}`, tilesetFile);



    // Assets globales de tu proyecto
    this.load.image("star", "public/assets/star.png");
    this.load.image("bomb", "public/assets/bomb.png"); 

    this.load.spritesheet("dude", "public/assets/dude.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
  }

  create() {
    // Definimos las claves dinámicas correspondientes a este nivel específico
    const mapKey = `map${this.currentLevel}`;
    const tilesetKey = `tilesetKey${this.currentLevel}`;

    const map = this.make.tilemap({ key: mapKey });
    
    // Importante: El primer parámetro "tileset" tiene que coincidir con el nombre del patrón en tu Tiled
    const tileset = map.addTilesetImage("tileset", tilesetKey);

    const findLayerName = (names, fallbackIndex) => {
      const lower = names.map((name) => name.toLowerCase());
      const found = map.layers.find((layer) => lower.some((name) => layer.name.toLowerCase().includes(name)));
      return found ? found.name : map.layers[fallbackIndex]?.name;
    };

    const belowLayerName = findLayerName(["fondo", "capa de patrones"], 0);
    const platformLayerName = findLayerName(["plataforma", "plataformas"], 1);
    const objectsLayer = map.getObjectLayer("Objetos") || map.getObjectLayer("Capa de Objetos 1") || map.layers.find((layer) => layer.type === "objectgroup");

    const belowLayer = map.createLayer(belowLayerName, tileset, 0, 0);
    const platformLayer = map.createLayer(platformLayerName, tileset, 0, 0);

    // Spawn del jugador basado en Tiled
    const spawnPoint = objectsLayer?.objects?.find((obj) => obj.name === "player");
    if (!spawnPoint) {
      throw new Error("No se encontró el punto de spawn del jugador en el tilemap");
    }
    this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, "dude");
    this.player.setCollideWorldBounds(true);

    // Animaciones del personaje
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

    // Controles por teclado
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Paredes colisionables
    platformLayer.setCollisionByProperty({ esColisionable: true });
    this.physics.add.collider(this.player, platformLayer);

    // 🎥 SEGUIMIENTO DE CÁMARA: Únicamente se activa en el Nivel 3 gigante
    if (this.currentLevel === 3) {
      this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    // Inicializar grupos de estrellas y meta
    this.stars = this.physics.add.group();
    this.goals = this.physics.add.staticGroup(); 

    // Cargar los objetos desde Tiled de forma segura
    if (objectsLayer && objectsLayer.objects) {
      objectsLayer.objects.forEach((objData) => {
        const { x = 0, y = 0, type } = objData;
        
        if (type === "star") {
          const star = this.stars.create(x, y, "star");
          star.body.allowGravity = false; 
        } 
        else if (type === "goal") {
          this.goals.create(x, y, "bomb"); 
        }
      });
    }

    // Colisiones e interacciones
    this.physics.add.collider(this.stars, platformLayer);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.overlap(this.player, this.goals, this.reachGoal, null, this);

    // Interfaz de Usuario fija en pantalla (No se desplaza con la cámara)
    this.uiContainer = this.add.container(0, 0).setScrollFactor(0);
    this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, { fontSize: "28px", fill: "#fff", backgroundColor: "#000" });
    this.starsText = this.add.text(16, 50, `Estrellas: ${this.collectedStarsInLevel} / 5`, { fontSize: "20px", fill: "#ffff00", backgroundColor: "#000" });
    this.levelText = this.add.text(580, 16, `Nivel: ${this.currentLevel}`, { fontSize: "24px", fill: "#fff", backgroundColor: "#000" });
    this.uiContainer.add([this.scoreText, this.starsText, this.levelText]);
  }

  update() {
    this.player.setVelocity(0);

    // Controles de movimiento en 4 direcciones
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-180);
      this.player.anims.play("left", true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(180);
      this.player.anims.play("right", true);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-180);
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.anims.play("left", true);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(180);
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.anims.play("left", true);
    }

    if (this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0) {
      this.player.anims.play("turn");
    }

    // Reiniciar nivel actual de forma segura con la tecla R
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
    const requiredStars = 5;

    if (this.collectedStarsInLevel >= requiredStars) {
      if (this.currentLevel < 3) {
        this.scene.start("game", {
          level: this.currentLevel + 1,
          score: this.score,
        });
      } else {
        this.add.text(140, 320, "¡JUEGO LABERINTO COMPLETADO!", { fontSize: "36px", fill: "#0f0", backgroundColor: "#000" }).setScrollFactor(0);
        this.physics.pause();
      }
      return;
    }

    this.add.text(120, 360, `Necesitas ${requiredStars} estrellas para avanzar`, { fontSize: "24px", fill: "#ff0", backgroundColor: "#000" }).setScrollFactor(0).setDepth(10);
  }
}