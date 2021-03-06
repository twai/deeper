class GUIScene extends Phaser.Scene {
    constructor() {
        super({key: 'GUIScene', active: true});
        this.score = 0;
    }

    preload() {
        this.load.image('gui/player', 'img/player_white_32.png');
    }

    create() {
        // Black sidebars
        this.leftBG = this.add.rectangle(50, 300, 100, 600, 0x000000);
        this.rightBG = this.add.rectangle(950, 300, 100, 600, 0x000000);

        // Lives
        this.lives = []
        this.lives.push(this.add.sprite(50, 50, 'gui/player', 0));
        this.lives.push(this.add.sprite(50, 100, 'gui/player', 0));
        this.lives.push(this.add.sprite(50, 150, 'gui/player', 0));
        this.lives[0].tint = 0xed1c23;
        this.lives[1].tint = 0xed1c23;
        this.lives[2].tint = 0xed1c23;

        // Score
        var tl = this.rightBG.getTopLeft();
        var textStyle = {font: "48px Courier", fill: "#ffffff"};
        this.score = [];
        for(var i = 0; i < 4; i++) {
            this.score.push(this.add.text(tl.x + 10, tl.y + 25 + i * 48, "0", textStyle));
        }

        // Bullet time
        // this.bulletTimeBg = this.add.rectangle(500, 590, 800, 20, 0xbdbdbd);
        // this.bulletTimeBar = this.add.rectangle(100, 590, 800, 20, 0x03c700);
        // this.bulletTimeBar.setOrigin(0, 0.5);

        var mainScene = this.scene.get('MainScene');
        
        mainScene.events.on('scoreChanged', (score) => {
            if(score > 9999) {
                score = 9999;
            }
            var scoreStr = ("000" + score).slice(-4);
            for(var i = 0; i < 4; i++) {
                this.score[i].text = scoreStr.charAt(i);
            }
        });

        mainScene.events.on('livesChanged', (lives) => {
            for(var i = 0; i < 3; i++) {
                var c = lives > i ? 0xed1c23 : 0x737373;
                this.lives[i].tint = c;
            }
        });

        mainScene.events.on('gameOver', () => {
            this.scene.restart()
        });
    }

    update(time, delta) {
        //var mainScene = this.scene.get('MainScene');
        //this.bulletTimeBar.scaleX = mainScene.bulletTime / 100;
        //console.log(mainScene.bulletTime);
    }
} 