const TIME_SCALE = 10;

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 / TIME_SCALE }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var player;
var mainCamera;
var canShake = false;
var WORLD_HEIGHT = 8000;

function setTimeScale(ctx, scale) {
    ctx.tweens.timeScale = scale;
    ctx.physics.world.timeScale = scale;
    // ctx.time.timeScale = scale;
}


function preload() {
    this.objects = {}
    // this.load.setBaseURL('http://labs.phaser.io');
    // this.load.image('sky', 'assets/skies/space3.png');
    // this.load.image('logo', 'assets/sprites/phaser3-logo.png');
    // this.load.image('red', 'assets/particles/red.png');
    this.load.image('player', 'img/player_32.png');
}

function create() {

    // Set bounds for world and camera
    this.physics.world.setBounds(0, 0, 800, WORLD_HEIGHT);
    this.cameras.main.setBounds(0,0,800, WORLD_HEIGHT);

    mainCamera = this.cameras.main;

    // Create input
    this.cursor = this.input.keyboard.createCursorKeys();
    this.cursor.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Create player
    this.player = this.physics.add.sprite(200, 0, 'player', 0);
    this.player.body.setMaxSpeed(800 / TIME_SCALE);
    this.player.setCollideWorldBounds(true);
    player = this.player; // Expose globally

    // Create floor
    this.objects.floor = this.add.rectangle(400, WORLD_HEIGHT - 50, 700, 100, 0x000000);
    this.physics.add.existing(this.objects.floor);
    this.objects.floor.body.allowGravity = false;
    this.objects.floor.body.setImmovable(true);

    // Create test obstacles
    this.objects.obstacles  = []
    // TODO: Better spread pattern
    for(var i = 0; i < 10; i++) {
        y = Phaser.Math.RND.integerInRange(100, WORLD_HEIGHT - 100);
        x = Phaser.Math.RND.integerInRange(50, 750);
        var r = this.add.rectangle(x, y, 200, 50, 0x000000);
        this.objects.obstacles.push(r);
        this.physics.add.existing(r); 
        r.body.allowGravity = false;
        r.body.setImmovable(true);
    }

    // var r = this.add.rectangle(250, 1000, 200, 50, 0x000000);
    // this.objects.obstacles.push(r);
    // this.physics.add.existing(r);
    // r.body.allowGravity = false;
    // r.body.setImmovable(true);

    // Add collision between player and floor
    this.physics.add.collider(this.player, this.objects.floor, playerImpact);

    // Add collision between player and obstacles
    this.objects.obstacles.forEach(element => {
        this.physics.add.collider(this.player, element, playerImpact);
    });

    // Set camera to follow player
    this.cameras.main.startFollow(this.player);
    this.cameras.main.followOffset.set(0, -200);

    console.log('Done creating!');
}

function playerImpact(player, floor) {
    if(player.body.blocked.down && canShake) {
        mainCamera.shake(250, 0.025);
        canShake = false;
    }
}

function update(time, delta) {
    var c = this.cursor;
    var blocked = this.player.body.blocked.down;
    canShake = !blocked;

    // Reset before calculating new status
    this.player.body.setVelocityX(0);
    this.player.setAngle(0);

    if(c.left.isDown) {
        this.player.body.setVelocityX(-200 / TIME_SCALE);
        if(!blocked)
            this.player.setAngle(-15);
    }
    else if(c.right.isDown) {
        this.player.body.setVelocityX(200 / TIME_SCALE);
        if(!blocked)
        this.player.setAngle(15);
    }

    // Bullet time test
    if(c.space.isDown) {
        setTimeScale(this, 10 / TIME_SCALE);
    }
    else {
        setTimeScale(this, 1 / TIME_SCALE);
    }
}