
const WORLD_HEIGHT = 8000;
const TIME_SCALE = 10;

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('player', 'img/player_32.png');
    }

    create() {
        // Set bounds for world and camera
        this.physics.world.setBounds(0, 0, 800, WORLD_HEIGHT);
        this.cameras.main.setBounds(0,0,800, WORLD_HEIGHT);

        this.mainCamera = this.cameras.main;
    
        // Create input
        this.cursor = this.input.keyboard.createCursorKeys();
        this.cursor.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
        // Create player
        this.player = this.physics.add.sprite(200, 0, 'player', 0);
        this.player.body.setMaxSpeed(800 / TIME_SCALE);
        this.player.setCollideWorldBounds(true);
        // player = this.player; // Expose globally
        this.player.moveLeft = function() {
            var blocked = player.body.blocked.down;
            this.body.setVelocityX(-200 / TIME_SCALE);
            if(!blocked)
                this.setAngle(-15);
        }
    
        this.player.moveRight = function() {
            var blocked = player.body.blocked.down;
            this.body.setVelocityX(200 / TIME_SCALE);
            if(!blocked)
            this.setAngle(15);
        }
    
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
        
        // Add collision between player and floor
        this.physics.add.collider(this.player, this.objects.floor, this.playerImpact);
    
        // Add collision between player and obstacles
        this.objects.obstacles.forEach(element => {
            this.physics.add.collider(this.player, element, this.playerImpact);
        });
    
        // Set camera to follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.followOffset.set(0, -200);
        
        console.log('Done creating!');
    }

    update(time, delta) {
        var c = this.cursor;
        var blocked = this.player.body.blocked.down;
        this.canShake = !blocked;
    
        // Reset before calculating new status
        this.player.body.setVelocityX(0);
        this.player.setAngle(0);
    
        if(c.left.isDown) {
            this.player.moveLeft();
        }
        else if(c.right.isDown) {
            this.player.moveRight();
        }
    
        var pointer = this.input.activePointer;
        if(pointer.isDown) {
            if(pointer.x < this.player.body.x) {
                this.player.moveLeft();
            }
            else {
                this.player.moveRight();
            }
        }
    
        // Bullet time test
        if(c.space.isDown) {
            this.setTimeScale(this, 10 / TIME_SCALE);
        }
        else {
            this.setTimeScale(this, 1 / TIME_SCALE);
        }
    }

    playerImpact(player, floor) {
        if(player.body.blocked.down && canShake) {
            mainCamera.shake(250, 0.025);
            canShake = false;
        }
    }

    setTimeScale(ctx, scale) {
        ctx.tweens.timeScale = scale;
        ctx.physics.world.timeScale = scale;
        // ctx.time.timeScale = scale;
    }
}


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
    scene: [MainScene]
};

var game = new Phaser.Game(config);
