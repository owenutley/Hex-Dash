import {
  Scene,
  GameObjects,
  Math as PhaserMath,
  Input as PhaserInput,
  Geom,
  Types,
} from 'phaser';
import {
  HEX_DIRECTIONS,
  HEX_DIRECTION_ARROWS,
  hexToPixel,
  vectorToHexDirection,
} from '../../shared/hex.ts';
import {
  applyHexMove,
  initHexGameState,
  undoHexMove,
} from '../../shared/hexEngine.ts';
import { HEX_LEVELS } from '../../shared/hexLevels.ts';
import type {
  HexBlock,
  HexCoord,
  HexDirection,
  HexGameState,
  HexSlideResult,
} from '../../shared/hexTypes.ts';

type BlockRenderContainer = {
  container: GameObjects.Container;
  block: HexBlock;
  selectionRing: GameObjects.Graphics;
};

type HudButton = {
  container: GameObjects.Container;
  bg: GameObjects.Graphics;
  txt: GameObjects.Text;
  colorNum: number;
  label: string;
};

export class Game extends Scene {
  private currentLevelIndex = 0;
  private gameState: HexGameState | null = null;
  private isAnimating = false;
  private selectedBlockId: string | null = null;

  // Board layout
  private boardCenterX = 512;
  private boardCenterY = 400;
  private hexRadius = 40;

  // Visual layers
  private boardContainer!: GameObjects.Container;
  private gridGraphics!: GameObjects.Graphics;
  private targetsGraphics!: GameObjects.Graphics;
  private wallsGraphics!: GameObjects.Graphics;
  private guideGraphics!: GameObjects.Graphics;
  private blockObjects = new Map<string, BlockRenderContainer>();
  private dpadButtons: GameObjects.Container[] = [];

  // HUD
  private hudContainer!: GameObjects.Container;
  private levelTitleText!: GameObjects.Text;
  private levelBadgeText!: GameObjects.Text;
  private movesText!: GameObjects.Text;
  private parText!: GameObjects.Text;
  private undoBtn!: HudButton;
  private resetBtn!: HudButton;
  private prevBtn!: HudButton;
  private nextBtn!: HudButton;

  // Victory Overlay
  private victoryModal!: GameObjects.Container;
  private winStatsText!: GameObjects.Text;
  private winStarsText!: GameObjects.Text;

  // Drag interaction
  private dragStartX = 0;
  private dragStartY = 0;
  private activeDragBlockId: string | null = null;
  private isPointerDown = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#090d16');

    this.boardContainer = this.add.container(0, 0);
    this.gridGraphics = this.add.graphics();
    this.targetsGraphics = this.add.graphics();
    this.wallsGraphics = this.add.graphics();
    this.guideGraphics = this.add.graphics();

    this.boardContainer.add([
      this.gridGraphics,
      this.targetsGraphics,
      this.wallsGraphics,
      this.guideGraphics,
    ]);

    this.createHud();
    this.createVictoryModal();
    this.setupInputListeners();

    this.loadLevel(this.currentLevelIndex);

    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Types.Core.GameConfig) => {
      const width = typeof gameSize.width === 'number' ? gameSize.width : this.scale.width;
      const height = typeof gameSize.height === 'number' ? gameSize.height : this.scale.height;
      this.updateLayout(width, height);
    });
  }

  private loadLevel(index: number): void {
    this.tweens.killAll();
    this.isAnimating = false;
    this.activeDragBlockId = null;
    this.isPointerDown = false;
    this.guideGraphics?.clear();

    this.currentLevelIndex = Math.max(0, Math.min(index, HEX_LEVELS.length - 1));
    const puzzle = HEX_LEVELS[this.currentLevelIndex] ?? HEX_LEVELS[0];
    if (!puzzle) return;

    this.gameState = initHexGameState(puzzle);
    this.selectedBlockId = null;

    if (this.victoryModal) {
      this.victoryModal.setVisible(false);
    }

    this.computeResponsiveHexRadius(this.scale.width, this.scale.height);
    this.renderBoard();
    this.updateHud();
  }

  private computeResponsiveHexRadius(width: number, height: number): void {
    const puzzle = this.gameState?.puzzle ?? HEX_LEVELS[this.currentLevelIndex] ?? HEX_LEVELS[0];
    const R = puzzle?.radius ?? 2;

    const topHudHeight = width < 480 ? 76 : 88;
    const bottomBarHeight = width < 480 ? 50 : 60;
    const availableHeight = height - topHudHeight - bottomBarHeight - 16;
    const availableWidth = width - 24;

    const widthRatio = 3 * R + 2;
    const heightRatio = (2 * R + 1) * Math.sqrt(3);

    const maxRadiusX = availableWidth / widthRatio;
    const maxRadiusY = availableHeight / heightRatio;

    this.hexRadius = Math.max(22, Math.min(46, Math.floor(Math.min(maxRadiusX, maxRadiusY))));
    this.boardCenterX = width / 2;
    this.boardCenterY = topHudHeight + availableHeight / 2;
  }

  private renderBoard(): void {
    if (!this.gameState) return;
    const { puzzle, blocks } = this.gameState;

    this.gridGraphics.clear();
    this.targetsGraphics.clear();
    this.wallsGraphics.clear();
    this.guideGraphics.clear();

    // Clear old block objects
    for (const [, item] of this.blockObjects) {
      this.tweens.killTweensOf(item.container);
      this.tweens.killTweensOf(item.selectionRing);
      item.container.destroy();
    }
    this.blockObjects.clear();
    this.clearDpad();

    // Draw base hex grid floor
    const allCoords = this.getBoardCoords(puzzle.radius);
    for (const coord of allCoords) {
      const pos = hexToPixel(coord, this.hexRadius);
      const cx = this.boardCenterX + pos.x;
      const cy = this.boardCenterY + pos.y;

      // Dark glass floor tile
      this.drawHexagon(
        this.gridGraphics,
        cx,
        cy,
        this.hexRadius - 2,
        0x131d31,
        0.95,
        0x1e293b,
        2
      );

      // Subtle center dot for alignment
      this.gridGraphics.fillStyle(0x334155, 0.45);
      this.gridGraphics.fillCircle(cx, cy, 2);
    }

    // Draw Target Zones
    for (const target of puzzle.targets) {
      const pos = hexToPixel(target.coord, this.hexRadius);
      const cx = this.boardCenterX + pos.x;
      const cy = this.boardCenterY + pos.y;
      const colorNum = Number.parseInt(target.color.replace('#', '0x'), 16);

      // Outer target glow ring
      this.drawHexagon(
        this.targetsGraphics,
        cx,
        cy,
        this.hexRadius - 3,
        colorNum,
        0.2,
        colorNum,
        2.5
      );

      // Inner target circle marker
      this.targetsGraphics.fillStyle(colorNum, 0.85);
      this.targetsGraphics.fillCircle(cx, cy, this.hexRadius * 0.35);

      // Target ring icon
      this.targetsGraphics.lineStyle(2, 0xffffff, 0.9);
      this.targetsGraphics.strokeCircle(cx, cy, this.hexRadius * 0.2);
    }

    // Draw Obstacle Walls
    for (const wall of puzzle.walls) {
      const pos = hexToPixel(wall, this.hexRadius);
      const cx = this.boardCenterX + pos.x;
      const cy = this.boardCenterY + pos.y;

      // Drop shadow
      this.drawHexagon(
        this.wallsGraphics,
        cx,
        cy + 4,
        this.hexRadius - 2,
        0x020617,
        0.6
      );

      // Main obstacle base
      this.drawHexagon(
        this.wallsGraphics,
        cx,
        cy,
        this.hexRadius - 2,
        0x334155,
        1,
        0x64748b,
        2
      );

      // Top beveled cap
      this.drawHexagon(
        this.wallsGraphics,
        cx,
        cy - 2,
        this.hexRadius - 7,
        0x475569,
        1,
        0x94a3b8,
        1
      );
    }

    // Create Movable Block GameObjects
    for (const block of blocks) {
      this.createBlockObject(block);
    }
  }

  private createBlockObject(block: HexBlock): void {
    const pos = hexToPixel(block.coord, this.hexRadius);
    const colorNum = Number.parseInt(block.color.replace('#', '0x'), 16);

    const container = this.add.container(
      this.boardCenterX + pos.x,
      this.boardCenterY + pos.y
    );

    // Selection pulse ring (hidden by default)
    const selectionRing = this.add.graphics();
    this.drawHexagon(
      selectionRing,
      0,
      0,
      this.hexRadius + 4,
      0x000000,
      0,
      0x38bdf8,
      3
    );
    selectionRing.setVisible(false);

    const blockGfx = this.add.graphics();

    // Drop shadow
    this.drawHexagon(blockGfx, 0, 4, this.hexRadius - 5, 0x000000, 0.5);

    // Main jewel body
    this.drawHexagon(
      blockGfx,
      0,
      0,
      this.hexRadius - 5,
      colorNum,
      1,
      0xffffff,
      2
    );

    // Top shine highlight
    this.drawHexagon(blockGfx, 0, -2, this.hexRadius - 12, 0xffffff, 0.35);

    // Center jewel core
    blockGfx.fillStyle(0xffffff, 0.7);
    blockGfx.fillCircle(0, 0, this.hexRadius * 0.18);

    container.add([selectionRing, blockGfx]);

    // Use centered circular hit area so taps anywhere on the block register accurately
    container.setInteractive(
      new Geom.Circle(0, 0, this.hexRadius),
      Geom.Circle.Contains
    );

    container.on('pointerdown', (pointer: PhaserInput.Pointer) => {
      if (this.isAnimating || this.gameState?.isSolved) return;
      this.selectBlock(block.id);
      this.activeDragBlockId = block.id;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.isPointerDown = true;
      this.showDpad(block);
    });

    this.boardContainer.add(container);
    this.blockObjects.set(block.id, { container, block, selectionRing });
  }

  private selectBlock(blockId: string): void {
    this.selectedBlockId = blockId;
    for (const [id, item] of this.blockObjects) {
      this.tweens.killTweensOf(item.selectionRing);
      const isSelected = id === blockId;
      item.selectionRing.setVisible(isSelected);
      item.selectionRing.setAlpha(1);
      if (isSelected) {
        this.tweens.add({
          targets: item.selectionRing,
          alpha: { from: 0.3, to: 1 },
          duration: 400,
          yoyo: true,
          repeat: -1,
        });
      }
    }
  }

  private drawHexagon(
    graphics: GameObjects.Graphics,
    centerX: number,
    centerY: number,
    size: number,
    fillColor: number,
    fillAlpha = 1,
    strokeColor?: number,
    strokeWidth = 2
  ): void {
    const points: PhaserMath.Vector2[] = [];
    // Flat-topped hexagon angles: 0, 60, 120, 180, 240, 300 degrees
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      points.push(
        new PhaserMath.Vector2(
          centerX + size * Math.cos(angle),
          centerY + size * Math.sin(angle)
        )
      );
    }

    if (fillColor !== undefined) {
      graphics.fillStyle(fillColor, fillAlpha);
      graphics.fillPoints(points, true);
    }

    if (strokeColor !== undefined && strokeWidth > 0) {
      graphics.lineStyle(strokeWidth, strokeColor, 1);
      graphics.strokePoints(points, true);
    }
  }

  private getBoardCoords(radius: number): readonly HexCoord[] {
    const coords: HexCoord[] = [];
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        coords.push({ q, r, s: -q - r });
      }
    }
    return coords;
  }

  private setupInputListeners(): void {
    this.input.on('pointermove', (pointer: PhaserInput.Pointer) => {
      if (!this.isPointerDown || !this.activeDragBlockId || this.isAnimating) return;

      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const dist = Math.hypot(dx, dy);

      this.guideGraphics.clear();
      if (dist > 12) {
        const dir = vectorToHexDirection(dx, dy);
        this.drawDirectionGuide(this.activeDragBlockId, dir);
      }
    });

    this.input.on('pointerup', (pointer: PhaserInput.Pointer) => {
      if (!this.isPointerDown || !this.activeDragBlockId || this.isAnimating) {
        this.isPointerDown = false;
        this.activeDragBlockId = null;
        this.guideGraphics.clear();
        return;
      }

      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const dist = Math.hypot(dx, dy);

      this.guideGraphics.clear();

      if (dist >= 14) {
        const dir = vectorToHexDirection(dx, dy);
        this.triggerMove(this.activeDragBlockId, dir);
      }

      this.isPointerDown = false;
      this.activeDragBlockId = null;
    });

    // Keyboard support: Arrow keys, W/A/S/D, Q/E/Z/D, Numpad
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isAnimating || !this.selectedBlockId || this.gameState?.isSolved) return;
      const key = event.key.toUpperCase();
      let dir: HexDirection | null = null;

      if (key === 'ARROWUP' || key === 'W' || key === '8') {
        dir = 'UP';
      } else if (key === 'ARROWDOWN' || key === 'S' || key === '2') {
        dir = 'DOWN';
      } else if (key === 'E' || key === '9') {
        dir = 'UP_RIGHT';
      } else if (key === 'D' || key === '3' || key === 'ARROWRIGHT') {
        dir = 'DOWN_RIGHT';
      } else if (key === 'Z' || key === 'X' || key === '1') {
        dir = 'DOWN_LEFT';
      } else if (key === 'Q' || key === 'A' || key === '7' || key === 'ARROWLEFT') {
        dir = 'UP_LEFT';
      }

      if (dir) {
        this.triggerMove(this.selectedBlockId, dir);
      }
    });
  }

  private drawDirectionGuide(blockId: string, dir: HexDirection): void {
    const item = this.blockObjects.get(blockId);
    if (!item) return;

    const blockX = item.container.x;
    const blockY = item.container.y;
    const arrowDist = this.hexRadius * 1.6;

    const angles: Record<HexDirection, number> = {
      UP: -Math.PI / 2,
      UP_RIGHT: -Math.PI / 6,
      DOWN_RIGHT: Math.PI / 6,
      DOWN: Math.PI / 2,
      DOWN_LEFT: (5 * Math.PI) / 6,
      UP_LEFT: (-5 * Math.PI) / 6,
    };

    const targetAngle = angles[dir];
    const endX = blockX + Math.cos(targetAngle) * arrowDist;
    const endY = blockY + Math.sin(targetAngle) * arrowDist;

    this.guideGraphics.lineStyle(5, 0x38bdf8, 0.95);
    this.guideGraphics.lineBetween(blockX, blockY, endX, endY);
    this.guideGraphics.fillStyle(0x38bdf8, 1);
    this.guideGraphics.fillCircle(endX, endY, 6);
  }

  private showDpad(block: HexBlock): void {
    this.clearDpad();
    const item = this.blockObjects.get(block.id);
    if (!item) return;

    const dpadDist = this.hexRadius * 1.45;
    const btnRadius = Math.max(13, Math.min(18, Math.floor(this.hexRadius * 0.42)));
    const fontSize = `${Math.max(12, Math.min(17, Math.floor(this.hexRadius * 0.38)))}px`;

    const angles: Record<HexDirection, number> = {
      UP: -Math.PI / 2,
      UP_RIGHT: -Math.PI / 6,
      DOWN_RIGHT: Math.PI / 6,
      DOWN: Math.PI / 2,
      DOWN_LEFT: (5 * Math.PI) / 6,
      UP_LEFT: (-5 * Math.PI) / 6,
    };

    for (const dir of HEX_DIRECTIONS) {
      const angle = angles[dir];
      const btnX = item.container.x + Math.cos(angle) * dpadDist;
      const btnY = item.container.y + Math.sin(angle) * dpadDist;

      const btnContainer = this.add.container(btnX, btnY);

      // Button background with glass glow
      const bg = this.add.graphics();
      bg.fillStyle(0x0f172a, 0.92);
      bg.lineStyle(2, 0x38bdf8, 1);
      bg.fillCircle(0, 0, btnRadius);
      bg.strokeCircle(0, 0, btnRadius);

      // Arrow text symbol
      const arrowSymbol = HEX_DIRECTION_ARROWS[dir];
      const arrowText = this.add
        .text(0, 0, arrowSymbol, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: fontSize,
          fontStyle: 'bold',
          color: '#38bdf8',
        })
        .setOrigin(0.5);

      btnContainer.add([bg, arrowText]);

      // Centered hit area for the D-pad button
      btnContainer.setInteractive(
        new Geom.Circle(0, 0, btnRadius + 4),
        Geom.Circle.Contains
      );

      btnContainer.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x0284c7, 1);
        bg.lineStyle(2, 0xffffff, 1);
        bg.fillCircle(0, 0, btnRadius + 2);
        bg.strokeCircle(0, 0, btnRadius + 2);
        arrowText.setColor('#ffffff');
        btnContainer.setScale(1.1);
      });

      btnContainer.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x0f172a, 0.92);
        bg.lineStyle(2, 0x38bdf8, 1);
        bg.fillCircle(0, 0, btnRadius);
        bg.strokeCircle(0, 0, btnRadius);
        arrowText.setColor('#38bdf8');
        btnContainer.setScale(1);
      });

      btnContainer.on('pointerdown', (pointer: PhaserInput.Pointer) => {
        pointer.event.stopPropagation();
        this.triggerMove(block.id, dir);
      });

      this.dpadButtons.push(btnContainer);
      this.boardContainer.add(btnContainer);
    }
  }

  private clearDpad(): void {
    for (const btn of this.dpadButtons) {
      btn.destroy();
    }
    this.dpadButtons = [];
  }

  private triggerMove(blockId: string, dir: HexDirection): void {
    if (this.isAnimating || !this.gameState || this.gameState.isSolved) return;

    this.clearDpad();
    const { nextState, slideResult } = applyHexMove(this.gameState, blockId, dir);

    if (!slideResult.moved) {
      // Impact bump shake
      const item = this.blockObjects.get(blockId);
      if (item && item.container) {
        this.tweens.add({
          targets: item.container,
          scaleX: 1.08,
          scaleY: 1.08,
          yoyo: true,
          duration: 90,
        });
      }
      return;
    }

    this.gameState = nextState;
    this.animateSlide(slideResult, () => {
      this.updateHud();
      if (this.gameState?.isSolved) {
        this.onLevelComplete();
      }
    });
  }

  private animateSlide(result: HexSlideResult, onComplete: () => void): void {
    const item = this.blockObjects.get(result.blockId);
    if (!item || !item.container || !item.container.active) {
      this.isAnimating = false;
      onComplete();
      return;
    }

    this.isAnimating = true;
    const finalPos = hexToPixel(result.finalCoord, this.hexRadius);
    const targetX = this.boardCenterX + finalPos.x;
    const targetY = this.boardCenterY + finalPos.y;

    this.tweens.killTweensOf(item.container);

    this.tweens.add({
      targets: item.container,
      x: targetX,
      y: targetY,
      duration: 200,
      ease: PhaserMath.Easing.Cubic.Out,
      onComplete: () => {
        if (!item.container || !item.container.active) {
          this.isAnimating = false;
          onComplete();
          return;
        }

        // Squash & stretch on impact
        this.tweens.add({
          targets: item.container,
          scaleX: 1.12,
          scaleY: 0.88,
          duration: 65,
          yoyo: true,
          onComplete: () => {
            this.isAnimating = false;
            onComplete();
          },
        });
      },
    });
  }

  private createHud(): void {
    this.hudContainer = this.add.container(0, 0);

    // Title & Badges
    this.levelTitleText = this.add
      .text(512, 24, 'Level 1: First Slide', {
        fontFamily: 'Arial Black, system-ui',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    this.levelBadgeText = this.add
      .text(512, 48, 'TUTORIAL • 6 DIRECTIONS', {
        fontFamily: 'system-ui',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#38bdf8',
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    // Moves & Par Badges
    this.movesText = this.add
      .text(440, 72, 'Moves: 0', {
        fontFamily: 'Arial Black, system-ui',
        fontSize: '15px',
        color: '#38bdf8',
      })
      .setOrigin(0.5);

    this.parText = this.add
      .text(584, 72, 'Par: 1', {
        fontFamily: 'Arial Black, system-ui',
        fontSize: '15px',
        color: '#fbbf24',
      })
      .setOrigin(0.5);

    // Bottom Action Buttons
    this.undoBtn = this.createHudButton('↩ Undo', '#38bdf8', () => this.handleUndo());
    this.resetBtn = this.createHudButton('↺ Reset', '#f87171', () => this.handleReset());
    this.prevBtn = this.createHudButton('◀ Prev', '#94a3b8', () =>
      this.loadLevel(this.currentLevelIndex - 1)
    );
    this.nextBtn = this.createHudButton('Next ▶', '#4ade80', () =>
      this.loadLevel(this.currentLevelIndex + 1)
    );

    this.hudContainer.add([
      this.levelTitleText,
      this.levelBadgeText,
      this.movesText,
      this.parText,
      this.undoBtn.container,
      this.resetBtn.container,
      this.prevBtn.container,
      this.nextBtn.container,
    ]);
  }

  private createHudButton(
    label: string,
    color: string,
    onClick: () => void
  ): HudButton {
    const container = this.add.container(0, 0);
    const colorNum = Number.parseInt(color.replace('#', '0x'), 16);

    const bg = this.add.graphics();
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: color,
      })
      .setOrigin(0.5);

    container.add([bg, txt]);

    const hudBtn: HudButton = {
      container,
      bg,
      txt,
      colorNum,
      label,
    };

    container.on('pointerover', () => {
      container.setScale(1.05);
    });

    container.on('pointerout', () => {
      container.setScale(1);
    });

    container.on('pointerdown', onClick);
    return hudBtn;
  }

  private layoutHudButton(
    btn: HudButton,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    btn.container.setPosition(x, y);

    btn.bg.clear();
    btn.bg.fillStyle(0x1e293b, 0.95);
    btn.bg.lineStyle(2, btn.colorNum, 1);
    btn.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    btn.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    btn.container.setInteractive(
      new Geom.Rectangle(-w / 2, -h / 2, w, h),
      Geom.Rectangle.Contains
    );
  }

  private handleUndo(): void {
    if (this.isAnimating || !this.gameState || this.gameState.moveHistory.length === 0) return;
    this.gameState = undoHexMove(this.gameState);
    this.renderBoard();
    this.updateHud();
  }

  private handleReset(): void {
    this.loadLevel(this.currentLevelIndex);
  }

  private updateHud(): void {
    if (!this.gameState) return;
    const { puzzle, moveCount } = this.gameState;

    this.levelTitleText.setText(`Level ${this.currentLevelIndex + 1}: ${puzzle.name}`);
    this.levelBadgeText.setText(`${puzzle.difficulty.toUpperCase()} • 6 DIRECTIONS`);
    this.movesText.setText(`Moves: ${moveCount}`);
    this.parText.setText(`Par: ${puzzle.par ?? '-'}`);
  }

  private createVictoryModal(): void {
    this.victoryModal = this.add.container(512, 400);
    this.victoryModal.setDepth(100);

    const overlayBg = this.add.graphics();
    overlayBg.fillStyle(0x020617, 0.88);
    overlayBg.fillRect(-1000, -1000, 2000, 2000);

    const panel = this.add.graphics();
    panel.fillStyle(0x0f172a, 1);
    panel.lineStyle(3, 0x38bdf8, 1);
    panel.fillRoundedRect(-160, -120, 320, 240, 16);
    panel.strokeRoundedRect(-160, -120, 320, 240, 16);

    const winTitle = this.add
      .text(0, -78, '🎉 SOLVED!', {
        fontFamily: 'Arial Black, system-ui',
        fontSize: '26px',
        color: '#fbbf24',
      })
      .setOrigin(0.5);

    this.winStarsText = this.add
      .text(0, -38, '⭐⭐⭐', {
        fontSize: '24px',
      })
      .setOrigin(0.5);

    this.winStatsText = this.add
      .text(0, 2, 'Moves: 0 / Par: 1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const nextBtnModal = this.createHudButton('Next Level ▶', '#4ade80', () => {
      this.victoryModal.setVisible(false);
      this.loadLevel(this.currentLevelIndex + 1);
    });
    this.layoutHudButton(nextBtnModal, 0, 52, 140, 38);

    this.victoryModal.add([
      overlayBg,
      panel,
      winTitle,
      this.winStarsText,
      this.winStatsText,
      nextBtnModal.container,
    ]);
    this.victoryModal.setVisible(false);
  }

  private onLevelComplete(): void {
    if (!this.victoryModal || !this.gameState) return;
    const { moveCount, puzzle } = this.gameState;
    const par = puzzle.par ?? moveCount;

    let stars = '⭐⭐⭐';
    if (moveCount > par + 2) stars = '★☆☆';
    else if (moveCount > par) stars = '⭐⭐☆';

    this.winStarsText.setText(stars);
    this.winStatsText.setText(`Moves: ${moveCount}  •  Par: ${par}`);

    this.victoryModal.setVisible(true);
    this.victoryModal.setScale(0.7);
    this.tweens.add({
      targets: this.victoryModal,
      scale: 1,
      duration: 260,
      ease: PhaserMath.Easing.Back.Out,
    });
  }

  private updateLayout(width: number, height: number): void {
    this.cameras.main.setViewport(0, 0, width, height);

    // Compute optimal hex radius for board and center position
    this.computeResponsiveHexRadius(width, height);
    this.renderBoard();

    const isMobile = width < 480;

    if (this.hudContainer) {
      // Top HUD
      const titleY = isMobile ? 22 : 28;
      const badgeY = isMobile ? 42 : 52;
      const statsY = isMobile ? 62 : 76;

      this.levelTitleText.setPosition(width / 2, titleY);
      this.levelTitleText.setFontSize(isMobile ? '19px' : '24px');

      this.levelBadgeText.setPosition(width / 2, badgeY);

      this.movesText.setPosition(width / 2 - 65, statsY);
      this.parText.setPosition(width / 2 + 65, statsY);

      // Bottom Buttons
      const bottomY = isMobile ? height - 28 : height - 36;
      const btnHeight = isMobile ? 36 : 40;

      if (isMobile) {
        // Mobile 4-column responsive toolbar
        const sidePad = 12;
        const gap = 8;
        const btnWidth = Math.floor((width - 2 * sidePad - 3 * gap) / 4);

        const buttons = [this.undoBtn, this.resetBtn, this.prevBtn, this.nextBtn];
        buttons.forEach((btn, i) => {
          const btnX = sidePad + btnWidth / 2 + i * (btnWidth + gap);
          this.layoutHudButton(btn, btnX, bottomY, btnWidth, btnHeight);
          btn.txt.setFontSize(btnWidth < 74 ? '11px' : '12px');
        });
      } else {
        // Desktop / Tablet centered button bar
        const btnWidth = 96;
        const gap = 14;
        const totalW = 4 * btnWidth + 3 * gap;
        const startX = width / 2 - totalW / 2 + btnWidth / 2;

        const buttons = [this.undoBtn, this.resetBtn, this.prevBtn, this.nextBtn];
        buttons.forEach((btn, i) => {
          const btnX = startX + i * (btnWidth + gap);
          this.layoutHudButton(btn, btnX, bottomY, btnWidth, btnHeight);
          btn.txt.setFontSize('13px');
        });
      }
    }

    if (this.victoryModal) {
      this.victoryModal.setPosition(width / 2, height / 2);
    }
  }
}
