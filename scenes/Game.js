export default class Game extends Phaser.Scene {
  constructor() {
    super("game");
  }

  // Recibimos los datos de la escena anterior (Nivel y Score acumulado)
  init(data) {
    this.currentLevel = data.level || 1; // Si no viene nada, arranca en el 1
    this.score = data.score || 0;        // Mantiene el puntaje acumulado
    this.collectedItems = 0;             // Contador de estrellas juntas en ESTE nivel
  }

  preload() {
    // Cargamos dinámicamente el JSON del nivel actual: map1.json, map2.json, map3.json
    // IMPORTANTE: Renombrá tus mapas en la carpeta tilemap como map1.json, map2.json, etc.
    this.load.tilemapTiledJSON(`map${this.currentLevel}`, `public/assets/tilemap/map${this.currentLevel}.json`);
    
    this.load.image("tileset", "public/assets/texture.png");
    this.load.image("star", "public/assets/star.png");

    this.load.spritesheet("dude", "./public/assets/dude.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
  }

  create() {
    // 1. CREACIÓN DEL MAPA
    const map = this.make.tilemap({ key: `map${this.currentLevel}` });
    const tileset = map.addTilesetImage("tileset", "tileset");

    const belowLayer = map.createLayer("Fondo", tileset, 0, 0);
    const platformLayer = map.createLayer("Plataformas", tileset, 0, 0);
    const objectsLayer = map.getObjectLayer("Objetos");

    platformLayer.setCollisionByProperty({ esColisionable: true });

    // 2. JUGADOR (SpawnPoint desde Tiled)
    const spawnPoint = map.findObject("Objetos", (obj) => obj.name === "player");
    this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, "dude");
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(true);

    // Animaciones (Evitamos duplicar si ya existen en el gestor)
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

    this.physics.add.collider(this.player, platformLayer);

    // 3. CÁMARA (Mejora 2: Se adapta al tamaño de cualquier mapa)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

    // 4. GRUPOS: ESTRELLAS, ENEMIGOS Y LLEGADA
    this.stars = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.goals = this.physics.add.staticGroup(); // Punto de llegada

    // Procesar capa de objetos de Tiled
    objectsLayer.objects.forEach((objData) => {
      const { x = 0, y = 0, name, type } = objData;

      // Dependiendo del "type" configurado en Tiled:
      if (type === "star") {
        const star = this.stars.create(x, y, "star");
        star.setBounceY(Phaser.Math.FloatBetween(0.2, 0.4));
      } 
      else if (type === "goal") {
        // Objeto de llegada (puedes usar un sprite o dejarlo invisible con una estrella/zona)
        const goal = this.goals.create(x, y, "star").setTint(0xff00ff); // Destacado en rosa
        goal.name = "meta";
      } 
      else if (type === "enemy") {
        // Mejora 3: Enemigos. Leemos una propiedad personalizada de Tiled llamada "direccion" (horizontal o vertical)
        const dir = objData.properties?.find(p => p.name === "direccion")?.value || "horizontal";
        const enemy = this.enemies.create(x, y, "star").setTint(0xff0000); // Enemigo rojo temporario
        enemy.setData("direccion", dir);
        
        if (dir === "horizontal") {
          enemy.setVelocityX(100);
        } else {
          enemy.setVelocityY(100);
          enemy.body.allowGravity = false; // Para que no caiga infinitamente si va vertical
        }
        enemy.setCollideWorldBounds(true);
        enemy.setBounce(1); // Rebota contra las paredes automáticamente
      }
    });

    // Colisiones de objetos
    this.physics.add.collider(this.stars, platformLayer);
    this.physics.add.collider(this.enemies, platformLayer);
    
    // Interacciones del jugador
    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.overlap(this.player, this.goals, this.reachGoal, null, this);
    this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);

    // 5. INTERFAZ DE USUARIO (Fijada a la pantalla para que no se mueva con la cámara)
    this.uiContainer = this.add.container(0, 0).setScrollFactor(0);
    
    this.scoreText = this.add.text(16, 16, `Puntaje Total: ${this.score}`, { fontSize: "24px", fill: "#fff", backgroundColor: "#000" });
    this.levelText = this.add.text(16, 45, `Nivel: ${this.currentLevel}`, { fontSize: "24px", fill: "#fff", backgroundColor: "#000" });
    this.countText = this.add.text(16, 74, `Estrellas: ${this.collectedItems} / 5`, { fontSize: "24px", fill: "#ffff00", backgroundColor: "#000" });
    
    this.uiContainer.add([this.scoreText, this.levelText, this.countText]);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  update() {
    // Movimiento Horizontal
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play("left", true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play("right", true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play("turn");
    }

    // Salto (solo si toca el suelo)
    if (this.cursors.up.isDown && this.player.body.blocked.down) {
      this.player.setVelocityY(-350);
    }

    // Reiniciar nivel manualmente con la R
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart({ level: this.currentLevel, score: this.score });
    }

    // IA básica de enemigos: si chocan de frente contra algo, invierten su velocidad
    this.enemies.children.iterate((enemy) => {
      if (enemy) {
        if (enemy.getData("direccion") === "horizontal" && (enemy.body.blocked.left || enemy.body.blocked.right)) {
          enemy.setVelocityX(enemy.body.velocity.x * -1);
        }
        if (enemy.getData("direccion") === "vertical" && (enemy.body.blocked.up || enemy.body.blocked.down)) {
          enemy.setVelocityY(enemy.body.velocity.y * -1);
        }
      }
    });
  }

  collectStar(player, star) {
    star.disableBody(true, true);
    this.score += 10;
    this.collectedItems += 1;
    
    // Actualizar textos
    this.scoreText.setText(`Puntaje Total: ${this.score}`);
    this.countText.setText(`Estrellas: ${this.collectedItems} / 5`);
  }

  reachGoal(player, goal) {
    // REQUISITO DE CONDICIÓN PARA GANAR: Al menos 5 elementos
    if (this.collectedItems >= 5) {
      console.log("¡Ganaste el nivel!");
      
      if (this.currentLevel < 3) {
        // MEJORA 1: Pasa al siguiente mapa transportando el puntaje
        this.scene.restart({
          level: this.currentLevel + 1,
          score: this.score
        });
      } else {
        // Pantalla final si pasa el nivel 3
        this.add.text(200, 300, "¡JUEGO COMPLETADO COMPLETO!", { fontSize: "32px", fill: "#0f0", backgroundColor: "#000" }).setScrollFactor(0);
        this.physics.pause();
      }
    } else {
      // Si no tiene 5 estrellas, le avisa en consola o pantalla
      console.log("Te faltan estrellas para poder escapar.");
    }
  }

  hitEnemy(player, enemy) {
    // Si toca un enemigo, se reinicia el nivel actual
    console.log("Te tocó un enemigo. ¡Reiniciando nivel!");
    this.scene.restart({ level: this.currentLevel, score: this.score });
  }
}