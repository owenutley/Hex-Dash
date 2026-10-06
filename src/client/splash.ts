import { requestExpandedMode, navigateTo } from '@devvit/web/client';

const startButton = document.getElementById('start-button') as HTMLButtonElement | null;
const docsLink = document.getElementById('docs-link') as HTMLDivElement | null;
const playtestLink = document.getElementById('playtest-link') as HTMLDivElement | null;

if (startButton) {
  startButton.addEventListener('click', (e) => {
    requestExpandedMode(e, 'game');
  });
}

if (docsLink) {
  docsLink.addEventListener('click', () => {
    navigateTo('https://developers.reddit.com/docs');
  });
}

if (playtestLink) {
  playtestLink.addEventListener('click', () => {
    navigateTo('https://www.reddit.com/r/Devvit');
  });
}

// Draw rotating / pulsating hexagonal emblem on canvas
const canvas = document.getElementById('hex-canvas') as HTMLCanvasElement | null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    let angle = 0;

    const drawHexagon = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      rot: number,
      fill: string,
      stroke?: string,
      strokeWidth = 2
    ) => {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = rot + (Math.PI / 3) * i;
        const hx = x + radius * Math.cos(a);
        const hy = y + radius * Math.sin(a);
        if (i === 0) c.moveTo(hx, hy);
        else c.lineTo(hx, hy);
      }
      c.closePath();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = strokeWidth;
        c.stroke();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Outer glowing hex ring
      drawHexagon(
        ctx,
        centerX,
        centerY,
        64,
        angle,
        'rgba(30, 41, 59, 0.6)',
        'rgba(56, 189, 248, 0.5)',
        3
      );

      // Mid vibrant hex
      drawHexagon(
        ctx,
        centerX,
        centerY,
        48,
        -angle * 0.8,
        'rgba(2, 132, 199, 0.85)',
        '#38bdf8',
        2.5
      );

      // Inner jewel hex
      drawHexagon(
        ctx,
        centerX,
        centerY,
        28,
        angle * 1.2,
        '#38bdf8',
        '#ffffff',
        2
      );

      angle += 0.018;
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }
}
