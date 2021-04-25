class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.objects = {}
    }

    preload() {
        this.load.image('main/player', 'img/player_32.png');
        this.load.image('main/obstacle_particle', 'img/particle.png');

        this.load.audio('main/explosion', 'sound/explosion5.wav');
        this.load.audio('main/explosion_long', 'sound/explosion5_long.wav');
        this.load.audio('main/bgm', 'sound/deeper.wav')
    }

    create() {
        // Set bounds for world and camera
        this.physics.world.setBounds(100, 0, 800, WORLD_HEIGHT);
        this.cameras.main.setBounds(0,0,800, WORLD_HEIGHT);
        this.currentTimescale = 1;
        this.mainCamera = this.cameras.main;
        this.metersFallen = 0;
        this.lastEmittedScore = 0;
        this.lives = 3;
        this.canUpdateScore = true;
    
        // Create input
        this.cursor = this.input.keyboard.createCursorKeys();
        this.cursor.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
        // Create sound
        this.explosionSound = this.sound.add('main/explosion');
        this.explosionLongSound = this.sound.add('main/explosion_long');
        this.bgm = this.sound.add('main/bgm', {
            loop: true
        });

        // Create player
        this.player = this.physics.add.sprite(500, 0, 'main/player', 0);
        this.player.body.setMaxVelocityY(TS(800));
        this.player.setCollideWorldBounds(true);
        this.player.canShake = true;

        // player = this.player; // Expose globally
        this.player.moveLeft = function(dt, allowTilt = true) {
            var blocked = this.body.blocked.down;
            this.body.setVelocityX(TS(-80) * dt);
            if(!blocked && allowTilt)
                this.setAngle(-15);
        }
    
        this.player.moveRight = function(dt, allowTilt = true) {
            var blocked = this.body.blocked.down;
            this.body.setVelocityX(TS(80) * dt);
            
            if(!blocked && allowTilt)
            this.setAngle(15);
        }
    
        // Create floor
        this.objects.floor = this.add.rectangle(400, WORLD_HEIGHT - 50, 700, 100, 0x000000);
        this.physics.add.existing(this.objects.floor);
        this.objects.floor.body.allowGravity = false;
        this.objects.floor.body.setImmovable(true);

        // Create obstacles
        this.objects.obstacles  = []
        // TODO: Better generation
        // Sending in 'this' because I might want to move this to a separate class
        this.generateObstacles(this, WORLD_HEIGHT);
        
        // Setup particles for destroyed obstacles
        this.particles = this.add.particles('main/player');
        this.particles.createEmitter({
            angle: { min: 240, max: 300 },
            speed: { min: 100, max: 200 },
            quantity: { min: 5, max: 15 },
            lifespan: 1000,
            alpha: { start: 1, end: 0 },
            scale: { min: 0.1, max: 0.5},
            rotate: {start: 0, end: 360, ease: 'Back.easeOut'},
            gravityY: 800,
            on: false
        });

        this.lineParticles = this.add.particles('main/obstacle_particle');
        var theLine = new Phaser.Geom.Line(0, 0, 200, 0);
        this.lineParticles.createEmitter({
            angle: { min: 90, max: 90 },
            speed: { min: 400, max: 600 },
            lifespan: 4000,
            alpha: { start: 1, end: 0 },
            scale: { min: 0.5, max: 2},
            quantity: 20,
            rotate: {start: 0, end: 0},
            emitZone: {type: 'edge', source: theLine, quantity: 20},
            gravityY: 800,
            on: false
        });

        this.deathParticles = this.add.particles('main/player');
        this.deathParticles.createEmitter({
            angle: { min: -5, max: 5 },
            speed: { min: 100, max: 1500 },
            quantity: { min: 50, max: 100 },
            lifespan: 2000,
            alpha: { start: 1, end: 0.5 },
            scale: { min: 0.1, max: 0.5},
            rotation: {min: 0, max: 360},
            on: false
        });
        this.deathParticles.createEmitter({
            angle: { min: 175, max: 185 },
            speed: { min: 100, max: 1500 },
            quantity: { min: 50, max: 100 },
            lifespan: 2000,
            alpha: { start: 1, end: 0.5 },
            scale: { min: 0.1, max: 0.5},
            rotation: {min: 0, max: 360},
            on: false
        });


        // Add collision between player and floor
        this.physics.add.collider(this.player, this.objects.floor,
            (player, floor) => this.playerImpact(player, floor));
    
        // Add collision between player and obstacles
        this.objects.obstacles.forEach(element => {
            this.physics.add.collider(this.player, element, 
                (player, floor) => this.playerImpact(player, floor));
        });
    
        // Set camera to follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.followOffset.set(0, -200);
        
        this.bgm.play();
        console.log('Done creating!');
    }

    handleInput(dt) {
        var c = this.cursor;
        // Bullet time test
        if(c.space.isDown) {
            this.setTimeScale(this, TS(10));
        }
        else {
            this.setTimeScale(this, TS(1));
        }
        
        var dtUnScaled = dt * this.currentTimescale;
        if(c.left.isDown) {
            this.player.moveLeft(dtUnScaled);
        }
        else if(c.right.isDown) {
            this.player.moveRight(dtUnScaled);
        }
    
        var pointer = this.input.activePointer;
        if(pointer.isDown) {
            var diff = Math.abs(pointer.x - (this.player.x));
            if(diff > 5) {
                if(pointer.x < this.player.x) {
                    this.player.moveLeft(dtUnScaled, diff > 5);
                }
                else {
                    this.player.moveRight(dtUnScaled, diff > 5);
                }
            }
        }
    }

    update(time, dt) {
        var blocked = this.player.body.blocked.down;
        this.player.canShake = !blocked;
    
        // Reset before calculating new status
        this.player.body.setVelocityX(0);
        this.player.setAngle(0);
        
        if(this.lives > 0)
            this.handleInput(dt);
        
        this.metersFallen = this.player.body.y / 100;
        if(this.metersFallen - this.lastEmittedScore > 1 && this.canUpdateScore) {
            var newScore = Math.floor(this.metersFallen);
            this.events.emit('scoreChanged', newScore);
            this.lastEmittedScore = newScore;
        }
    }

    lerp(start, end, time, callback) {
        var cb = function() {
            var p = timer.getOverallProgress();
            // console.log("Overall progress: ", p);
            var v = (1 - p) * start + p * end;
            callback(v);
        }
        var delay = 1;
        var repeat = time / delay;
        console.log("Repeating " + repeat + " times with delay " + delay);
        var timer = this.time.addEvent({
            delay: delay,
            callback: cb,
            callbackScope: this,
            repeat: repeat
        });
    }

    playerImpact(player, floor) {
        //console.log("Impact!");
        //console.log(player.body.blocked, this.canShake);
        if(player.body.blocked.down && player.canShake) {
            this.cameras.main.shake(250, 0.025);
            this.player.canShake = false;
            this.loseLife();
            
            // this.cameras.main.setLerp(0.1, 0.1);
            
            // Camera "impact" only in real time
            if(this.currentTimescale == 1) {
                this.lerp(-200, -300, TS(100), (t) => this.cameras.main.followOffset.set(0, t));
                this.time.delayedCall(TS(100), () => {
                    this.lerp(-300, -200, TS(500), (t) => this.cameras.main.followOffset.set(0, t));
                });
            }


            if(this.lives > 0) {
                this.explosionSound.play();
                this.particles.emitParticleAt(this.player.x, this.player.y);
                this.lineParticles.emitParticleAt(floor.body.x, floor.body.y);
                floor.destroy();
            }
            else {
                this.explosionLongSound.play();
                this.player.visible = false;
                this.setTimeScale(this, TS(1));
                this.deathParticles.emitParticleAt(this.player.x, this.player.y);
            }
        }
    }

    loseLife() {
        this.lives -= 1;
        this.events.emit('livesChanged', this.lives);

        if(this.lives == 0) {
            this.canUpdateScore = false;
            this.cameras.main.fade(2000);
            this.bgm.destroy();
            this.time.delayedCall(400, () => {
               // var guiScene = this.scene.get('GUIScene');
               // guiScene.scene.restart();
                this.scene.restart();
                this.events.emit('gameOver');
            });

        }
    }

    setTimeScale(ctx, scale) {
        ctx.currentTimescale = scale * TIME_SCALE;
        ctx.tweens.timeScale = scale;
        ctx.physics.world.timeScale = scale;
        ctx.time.timeScale = scale;
    }

    generateObstacles(scene, depth) {
        for(var y = 0; y < depth; y += 50) {
            var difficulty = (y / depth) * 100;
            var rnd = Phaser.Math.RND.realInRange(0, 100);
            if (rnd < difficulty) {
                var x = Phaser.Math.RND.integerInRange(50, 750);
                var obstacle = scene.add.rectangle(x, y, 200, 50, 0x000000);
                scene.objects.obstacles.push(obstacle);
                scene.physics.add.existing(obstacle);
                obstacle.body.allowGravity = false;
                obstacle.body.setImmovable(true);
            }
        }
    }
}