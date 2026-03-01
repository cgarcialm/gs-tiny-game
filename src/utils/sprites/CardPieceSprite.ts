import Phaser from "phaser";

/**
 * Creates a card piece sprite - fragment from the broken anniversary card
 */
export function createCardPieceSprite(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const pieceSize = 8;
  
  // Set position first
  graphics.setPosition(x, y);
  
  // Draw at local coordinates (0, 0) relative to the graphics position
  // Orange/golden card fragment (matching the anniversary card color from title)
  graphics.fillStyle(0xffaa00, 1.0); // CARD_COLOR from title scene
  graphics.fillRect(-pieceSize / 2, -pieceSize / 2, pieceSize, pieceSize);
  
  // Golden border/stroke
  graphics.lineStyle(1, 0xffdd88, 1.0); // CARD_STROKE from title scene
  graphics.strokeRect(-pieceSize / 2, -pieceSize / 2, pieceSize, pieceSize);
  
  // Add a small red heart detail (fragment of the heart from the card)
  graphics.fillStyle(0xff0000, 0.8);
  graphics.fillCircle(-1, -1, 2);
  
  return graphics;
}

/**
 * Creates sparkle effect around a card piece
 */
export function spawnCardPieceSparkles(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Text[] {
  const sparkles: Phaser.GameObjects.Text[] = [];
  const sparklePositions = [
    { x: x - 10, y: y - 10 },
    { x: x + 10, y: y - 10 },
    { x: x - 10, y: y + 10 },
    { x: x + 10, y: y + 10 },
  ];
  
  sparklePositions.forEach((pos, i) => {
    const sparkle = scene.add.text(pos.x, pos.y, "✨", {
      fontSize: "16px",
      resolution: 2,
    }).setOrigin(0.5);
    
    sparkles.push(sparkle);
    
    // Animate sparkle floating up and fading out
    scene.tweens.add({
      targets: sparkle,
      y: pos.y - 20,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      delay: i * 200, // Stagger the sparkles
      ease: "Power2",
      onComplete: () => {
        sparkle.destroy();
      }
    });
  });
  
  return sparkles;
}

