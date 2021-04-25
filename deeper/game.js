var config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 600,
    backgroundColor: "#ffffff",
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 / TIME_SCALE }
        }
    },
    scene: [MainScene, GUIScene]
};

var game = new Phaser.Game(config);
