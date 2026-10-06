import { Scene, GameObjects, Math as PhaserMath } from 'phaser';

export class MainMenu extends Scene {
  private background: GameObjects.Graphics | null = null;
  private hexEmblem: GameObjects.Graphics | null = null;
  private titleText: GameObjects.Text | null = null;
  private subtitleText: GameObjects.Text | null = null;
  private playButton: GameObjects.Container | null = null;
  private howToContainer: GameObjects.Container | null = null;
  private emblemRotation = 0;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.background = null;
    this.hexEmblem = null;
    this.titleText = null;
    this.subtitleText = null;
    this.playButton = null;
    this.howToContainer = null;
    this.emblemRotation = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#090d16');

    this.background = this.add.graphics();
    this.hexEmblem = this.add.graphics();

    this.titleText = this.add
      .text(0, 0, 'HEX DOWN', {
        fontFamily: 'Arial Black, system-ui',
        fontSize: '52px',
        color: '#f8fafc',
        stroke: '#0369a1',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(0, 0, '6-Direction Sliding Puzzle', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#38bdf8',
        align: 'center',
      })
      .setOrigin(0.5);

    // Play Button Container
    this.playButton = this.createPlayButton(() => {
      this.scene.start('Game');
    });

    // How-To / Tips
    this.howToContainer = this.createHowToSection();

    this.refreshLayout();
    this.scale.on('resize', () => this.refreshLayout());
  }

  override update(): void {
    if (!this.hexEmblem) return;
    this.emblemRotation += 0.015;
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height * 0.28;

    this.hexEmblem.clear();
    this.drawEmblem(this.hexEmblem, centerX, centerY, this.emblemRotation);
  }

  private drawEmblem(
    g: GameObjects.Graphics,
    cx: number,
    cy: number,
    rot: number
  ): void {
    // Outer Hex
    this.drawHex(g, cx, cy, 58, rot, 0x1e293b, 0.7, 0x38bdf8, 3);
    // Middle Hex
    this.drawHex(g, cx, cy, 42, -rot * 0.8, 0x0284c7, 0.9, 0x7dd3fc, 2);
    // Inner Core Hex
    this.drawHex(g, cx, cy, 24, rot * 1.3, 0x38bdf8, 1, 0xffffff, 2);
  }

  private drawHex(
    g: GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number,
    angle: number,
    fillColor: number,
    fillAlpha: number,
    strokeColor?: number,
    strokeWidth = 2
  ): void {
    const points: PhaserMath.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const a = angle + (Math.PI / 3) * i;
      points.push(
        new PhaserMath.Vector2(
          cx + size * Math.cos(a),
          cy + size * Math.sin(a)
        )
      );
    }
    g.fillStyle(fillColor, fillAlpha);
    g.fillPoints(points, true);
    if (strokeColor) {
      g.lineStyle(strokeWidth, strokeColor, 1);
      g.strokePoints(points, true);
    }
  }

  private createPlayButton(onClick: () => void): GameObjects.Container {
    const container = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillStyle(0x0284c7, 1);
    bg.lineStyle(3, 0x38bdf8, 1);
    bg.fillRoundedRect(-110, -28, 220, 56, 16);
    bg.strokeRoundedRect(-110, -28, 220, 56, 16);

    const txt = this.add
      .text(0, 0, 'PLAY NOW ▶', {
        fontFamily: 'Arial Black, system-ui',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    container.add([bg, txt]);
    container.setSize(220, 56);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x0ea5e9, 1);
      bg.lineStyle(3, 0xffffff, 1);
      bg.fillRoundedRect(-114, -30, 228, 60, 16);
      bg.strokeRoundedRect(-114, -30, 228, 60, 16);
      container.setScale(1.04);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x0284c7, 1);
      bg.lineStyle(3, 0x38bdf8, 1);
      bg.fillRoundedRect(-110, -28, 220, 56, 16);
      bg.strokeRoundedRect(-110, -28, 220, 56, 16);
      container.setScale(1);
    });

    container.on('pointerdown', onClick);
    return container;
  }

  private createHowToSection(): GameObjects.Container {
    const container = this.add.container(0, 0);

    const box = this.add.graphics();
    box.fillStyle(0x1e293b, 0.7);
    box.lineStyle(1, 0x334155, 1);
    box.fillRoundedRect(-180, -45, 360, 90, 12);
    box.strokeRoundedRect(-180, -45, 360, 90, 12);

    const tipHeader = this.add
      .text(0, -24, '💡 HOW TO PLAY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fbbf24',
      })
      .setOrigin(0.5);

    const tipBody = this.add
      .text(0, 8, 'Swipe or use the radial buttons to slide blocks\nin 6 directions onto matching colored targets.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5);

    container.add([box, tipHeader, tipBody]);
    return container;
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    if (this.background) {
      this.background.clear();
      this.background.fillGradientStyle(
        0x090d16,
        0x090d16,
        0x1e293b,
        0x0f172a,
        1
      );
      this.background.fillRect(0, 0, width, height);
    }

    const scaleFactor = Math.min(width / 1024, height / 768, 1);

    if (this.titleText) {
      this.titleText.setPosition(width / 2, height * 0.44);
      this.titleText.setScale(scaleFactor);
    }

    if (this.subtitleText) {
      this.subtitleText.setPosition(width / 2, height * 0.51);
      this.subtitleText.setScale(scaleFactor);
    }

    if (this.playButton) {
      this.playButton.setPosition(width / 2, height * 0.65);
      this.playButton.setScale(scaleFactor);
    }

    if (this.howToContainer) {
      this.howToContainer.setPosition(width / 2, height * 0.82);
      this.howToContainer.setScale(scaleFactor);
    }
  }
}
