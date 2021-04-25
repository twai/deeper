class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.objects = {}
    }

    preload() {
        this.load.image('main/player', 'img/player_32.png');
        this.load.image('main/player_white', 'img/player_white_32.png');
        this.load.image('main/obstacle_particle', 'img/particle.png');

        this.load.audio('main/explosion', 'sound/explosion5.wav');
        this.load.audio('main/explosion_long', 'sound/explosion5_long.wav');
        this.load.audio('main/bgm', 'sound/deeper.wav');
        this.load.audio('main/blip', 'sound/blip.wav');

        console.log("Preloaded!");
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
        this.bulletTime = 100;
        this.bulletTimeCooldown = false;
        this.fakeFloors = {}
    
        // Create input
        this.cursor = this.input.keyboard.createCursorKeys();
        this.cursor.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
        // Create sound
        this.explosionSound = this.sound.add('main/explosion');
        this.explosionLongSound = this.sound.add('main/explosion_long');
        this.blipSound = this.sound.add('main/blip');
        this.bgm = this.sound.add('main/bgm', {
            loop: true
        });

        // Create background
        var textureId = 'main/gradient';
        var texture = this.textures.exists(textureId) ? this.textures.get(textureId) : this.textures.createCanvas('main/gradient', 100, 800);
        var ctx = texture.getContext();
        ctx.fillRect(0, 0, 100, 800);
        texture.refresh();
        this.background = this.add.sprite(500, WORLD_HEIGHT / 2, texture);
        this.background.setScale(10, WORLD_HEIGHT / 800);
        this.background.setTint(0xffffff, 0xffffff, 0x383838, 0x383838);
        this.background.tintFill = true;

        // Create motivational text
        this.basicTextStyle = {font: "110px Courier", fill: "#000000"};
        this.add.text(180, 100, "GO DEEPER!", this.basicTextStyle);
        
        this.basicTextStyleWhite = {font: "110px Courier", fill: "#ffffff"};
        this.smallTextStyle = {font: "26px Courier", fill: "#ffffff"};
        this.add.text(110, WORLD_HEIGHT - 250, "THAT'S DEEP!", this.basicTextStyleWhite);
        this.add.text(110, WORLD_HEIGHT -150, "- Created for Ludum Dare 48 by Mattias Willemsen - ", this.smallTextStyle);

        // Create initial fake floor
        var firstFakeFloor = this.add.rectangle(500, 600, 1000, 800, 0x000000);
        firstFakeFloor.setData('specialType', 'FakeFloor');
        this.fakeFloors['start'] = firstFakeFloor;
        this.physics.add.existing(firstFakeFloor);
        firstFakeFloor.body.allowGravity = false;
        firstFakeFloor.body.setImmovable(true);


        // Create player
        this.player = this.physics.add.sprite(500, 0, 'main/player_white', 0);
        var tint = Phaser.Display.Color.GetColor(237, 28, 28);
        this.player.setTint(tint);
        this.player.body.setMaxVelocityY(TS(800));
        this.player.setCollideWorldBounds(true);
        this.player.canShake = true;

        this.player.setSaturation = function(percentage) {
            const full = {r: 237, g: 28, b: 28};
            const empty = {r: 10, g: 10, b: 10};
            var r = full.r * percentage + empty.r * (1 - percentage);
            var g = full.g * percentage + empty.g * (1 - percentage);
            var b = full.b * percentage + empty.b * (1 - percentage);
            var tint = Phaser.Display.Color.GetColor(r, g, b);
            this.setTint(tint);
        }

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

        //this.background = this.add.rectangle(0, 0, 1000, WORLD_HEIGHT, 0xffffff);
        //this.background.setTint(0xffffff, 0xffffff, 0x000000, 0x000000);
    
        // Create floor
        // this.objects.floor = this.add.rectangle(400, WORLD_HEIGHT - 50, 700, 100, 0x000000);
        // this.physics.add.existing(this.objects.floor);
        // this.objects.floor.body.allowGravity = false;
        // this.objects.floor.body.setImmovable(true);
        
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
            tint: this.player.tint,
            lifespan: 1000,
            alpha: { start: 1, end: 0 },
            scale: { min: 0.1, max: 0.5},
            rotate: {start: 0, end: 360, ease: 'Back.easeOut'},
            gravityY: 800,
            on: false
        });

        this.playerLine = new Phaser.Geom.Line(-10, -10, 15, -10);
        this.trail = this.add.particles('main/player');
        this.trailEmitter = this.trail.createEmitter({
            angle: { min: 240, max: 300 },
            speed: 50,
            emitZone: {
                source: this.playerLine,
                type: 'edge',
                quantity: 5
            },
            quantity: 1,
            frequency: 100,
            lifespan: 1000,
            tint: this.player.tint,
            alpha: { min: 0, max: 0.5 },
            scale: { min: 0.2, max: 0.9},
            rotate: { onEmit: () => Phaser.Math.RND.realInRange(0, 90) },
            // rotate: {start: 0, end: 180, ease: 'Back.easeOut'},
            gravityY: 0,
            follow: this.player,
           // blendMode: 'ADD'
        });

        

        this.lineParticles = this.add.particles('main/obstacle_particle');
       // var theLine = new Phaser.Geom.Line(0, 0, 200, 0);
        this.lineParticles.createEmitter({
            name: 'emitter/line',
            angle: { min: 90, max: 90 },
            speed: { min: 400, max: 600 },
            lifespan: 4000,
            alpha: { start: 1, end: 0 },
            scale: { min: 0.5, max: 2},
            quantity: 20,
            rotate: {start: 0, end: 0},
            //emitZone: {type: 'edge', source: theLine, quantity: 20},
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

        // Add collision between player and obstacles
        this.objects.obstacles.forEach(element => {
            this.physics.add.collider(this.player, element, 
                (player, floor) => this.playerImpact(player, floor));
        });
    
        // Add collision between player and first floor    
        this.physics.add.collider(this.player, firstFakeFloor, 
            (player, floor) => {
                
            if(player.body.blocked.down && player.canShake) {
                this.explosionSound.play();
                this.cameras.main.shake(250, 0.025);
                this.player.canShake = false;
                
                this.time.delayedCall(TS(500), () => {
                    this.destroyFakeFloor('start');
                });
            }
        });
    

        // Set camera to follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.followOffset.set(0, -200);
        
        // Set up mute hotkey
        this.input.keyboard.on('keyup-M', (event) => {
            this.sound.setMute(!this.sound.mute);
        });

        this.bgm.play();
        console.log('Done creating!');
    }

    properRestart() {
        this.scene.restart();
    }


    handleInput(dt) {
        var c = this.cursor;

        if(c.down.isDown) {
            // this.lives = 100;
            // this.player.y = 78000;
            //this.player.body.setMaxVelocity(100000);
            //this.player.body.setVelocityY(1000);
        }

        // Bullet time test
        if((c.space.isDown || c.up.isDown) && !this.bulletTimeCooldown) {
            this.bulletTime -= dt * 0.05;
            this.setTimeScale(this, TS(10));
        }
        else {
            this.bulletTime += dt * 0.01;
            this.setTimeScale(this, TS(1));
        }
        this.bulletTime = Phaser.Math.Clamp(this.bulletTime, 0, 100);
        this.player.setSaturation(this.bulletTime / 100);

        if(this.bulletTime === 0) {
            this.bulletTimeCooldown = true;
        }
        else if(this.bulletTimeCooldown && this.bulletTime > 20) {
            this.bulletTimeCooldown = false;
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
        // console.log("Repeating " + repeat + " times with delay " + delay);
        var timer = this.time.addEvent({
            delay: delay,
            callback: cb,
            callbackScope: this,
            repeat: repeat
        });
    }

    destroyFakeFloor(id) {
        var floor = this.fakeFloors[id];
        this.time.delayedCall(TS(500), () => 
        {
            this.explosionSound.play();
            this.cameras.main.shake(100, 0.025);
            this.time.delayedCall(TS(1000), () => {
                this.explosionSound.play();
                this.cameras.main.shake(250, 0.025);
                this.time.delayedCall(TS(1000), () => {
                    this.explosionLongSound.play();
                    // this.particles.emitParticleAt(this.player.x, this.player.y);

                    var emitter = this.lineParticles.emitters.getByName('emitter/line');
                    var source = new Phaser.Geom.Rectangle(-floor.body.halfWidth, -floor.body.halfHeight, floor.body.width, floor.body.height);
                    emitter.setEmitZone({type: 'random', source: source, quantity: 200});
                    emitter.setQuantity(400);
                    this.lineParticles.emitters.getByName('emitter/line').emitParticleAt(floor.x, floor.y);
                    emitter.setQuantity(20);
                    this.cameras.main.shake(500, 0.025);
                    floor.destroy();
                    this.fakeFloors[id] = undefined;
                });
            });
        });

    }

    playerImpact(player, floor) {
        //console.log("Impact!");
        //console.log(player.body.blocked, this.canShake);
        if(player.body.blocked.down && player.canShake) {

            var type = floor.getData('specialType');
            if(type && type == 'FakeFloor') {
                this.explosionSound.play();
                this.cameras.main.shake(250, 0.025);
                this.player.canShake = false;
                return;
            }


            this.cameras.main.shake(250, 0.025);
            this.player.canShake = false;
            this.loseLife();
            
            // this.cameras.main.setLerp(0.1, 0.1);
            
            // Camera "impact" only in real time
            if(this.currentTimescale === 1) {
                this.lerp(-200, -300, TS(100), (t) => this.cameras.main.followOffset.set(0, t));
            }

            if(this.lives > 0) {
                this.time.delayedCall(TS(100), () => {
                    this.lerp(-300, -200, TS(500), (t) => this.cameras.main.followOffset.set(0, t));
                });
                this.explosionSound.play();
                this.particles.emitParticleAt(this.player.x, this.player.y);

                var emitter = this.lineParticles.emitters.getByName('emitter/line');
                var source = new Phaser.Geom.Rectangle(-floor.body.halfWidth, -floor.body.halfHeight, floor.body.width, floor.body.height);
                emitter.setEmitZone({type: 'random', source: source, quantity: 20});
                this.lineParticles.emitters.getByName('emitter/line').emitParticleAt(floor.x, floor.y);
                
                floor.destroy();
            }
            else {
                this.time.delayedCall(TS(100), () => {
                    this.lerp(-300, 0, TS(2000), (t) => this.cameras.main.followOffset.set(0, t));
                });
                this.explosionLongSound.play();
                this.player.visible = false;
                this.setTimeScale(this, TS(1));
                this.deathParticles.emitParticleAt(this.player.x, this.player.y);
                this.trailEmitter.killAll();
                this.trail.setActive(false);
            }
        }
    }

    loseLife() {
        this.lives -= 1;
        this.events.emit('livesChanged', this.lives);

        if(this.lives === 0) {
            this.canUpdateScore = false;
            this.cameras.main.fade(2000);
            this.bgm.destroy();
            this.time.delayedCall(400, () => {
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
        this.sound.rate = 1 / (scale * TIME_SCALE);
        if(this.sound.rate !== 1) {
            this.sound.rate *= 2;
        }
    }

    generateObstacles(scene, depth) {
        for(var y = 1000; y < depth - 500; y += 50) {

            // Insert fake floor
            if(y === 30000) {
                var floorCenter = y + 500;

                var life = this.physics.add.sprite(500, floorCenter - 416, 'main/player', 0);
                life.body.allowGravity = false;
                life.body.setImmovable(true);

                this.physics.add.collider(this.player, life, 
                    (player, life) => {
                        this.blipSound.play();
                        this.lives = 3;
                        this.events.emit('livesChanged', this.lives);
                        life.destroy();
                        this.destroyFakeFloor('midgame');
                });
            
                this.add.text(110, floorCenter + 200, "EVEN DEEPER!", this.basicTextStyle);
                var obstacle = scene.add.rectangle(500, floorCenter, 1000, 800, 0x000000);
                obstacle.setData('specialType', 'FakeFloor');
                scene.objects.obstacles.push(obstacle);
                scene.physics.add.existing(obstacle);
                obstacle.body.allowGravity = false;
                obstacle.body.setImmovable(true);
                this.fakeFloors['midgame'] = obstacle;
                y = floorCenter + 500;
                continue;
            }
            else if(y === 60000) {
                var floorCenter = y + 500;

                var life = this.physics.add.sprite(500, floorCenter - 416, 'main/player', 0);
                life.body.allowGravity = false;
                life.body.setImmovable(true);

                this.physics.add.collider(this.player, life, 
                    (player, life) => {
                        this.blipSound.play();
                        this.lives = 3;
                        this.events.emit('livesChanged', this.lives);
                        life.destroy();
                        this.destroyFakeFloor('endgame');
                });
            
                this.add.text(110, floorCenter + 200, "ALMOST THERE", this.basicTextStyle);
                var obstacle = scene.add.rectangle(500, floorCenter, 1000, 800, 0x000000);
                obstacle.setData('specialType', 'FakeFloor');
                scene.objects.obstacles.push(obstacle);
                scene.physics.add.existing(obstacle);
                obstacle.body.allowGravity = false;
                obstacle.body.setImmovable(true);
                this.fakeFloors['endgame'] = obstacle;
                y = floorCenter + 500;
                continue;
            }


            var difficulty = Math.min((y / depth) * 100, 80);
            var rnd = Phaser.Math.RND.realInRange(0, 200);
            if (rnd < difficulty) {
                var x = Phaser.Math.RND.integerInRange(50, 750);
                
                var width = Phaser.Math.RND.realInRange(0, 100) > difficulty
                    ? Phaser.Math.RND.realInRange(0, 100) > difficulty
                        ? 50 : 100
                    : Phaser.Math.RND.realInRange(0, 100) > difficulty
                        ? 150 : 200;

                var obstacle = scene.add.rectangle(100 + x, y, width, 50, 0x000000);
                // obstacle.createParticles = Phaser.Math.RND.pick([true, false]);
                scene.objects.obstacles.push(obstacle);
                scene.physics.add.existing(obstacle);
                obstacle.body.allowGravity = false;
                obstacle.body.setImmovable(true);
            }
        }
    }
}