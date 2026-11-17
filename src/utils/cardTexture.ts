import * as THREE from 'three';
import { CardDef, CardId } from '../types/game';
import { CARD_DEFINITIONS } from '../data/cardsAndOpponents';

const frontTextureCache = new Map<CardId, THREE.CanvasTexture>();
let backTextureCache: THREE.CanvasTexture | null = null;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCardIcon(ctx: CanvasRenderingContext2D, card: CardDef, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Subtle radial glow behind icon
  const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 115);
  grad.addColorStop(0, `${card.accentColor}55`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 115, 0, Math.PI * 2);
  ctx.fill();

  // Outer 6-chamber cylinder emblem ring on every card
  ctx.strokeStyle = card.accentColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 82, 0, Math.PI * 2);
  ctx.stroke();

  if (card.id === 'red_crimsonslug' || card.id === 'red_hollowpoint') {
    const isHollow = card.id === 'red_hollowpoint';
    // Brass base
    ctx.fillStyle = '#fbbf24';
    drawRoundedRect(ctx, -20, 22, 40, 24, 5);
    ctx.fill();
    // Red/Orange casing
    ctx.fillStyle = isHollow ? '#f97316' : '#ef4444';
    drawRoundedRect(ctx, -18, -26, 36, 50, 5);
    ctx.fill();
    // Bullet nose
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -28, 18, Math.PI, 0);
    ctx.fill();
  } else if (card.id === 'blue_silverblank' || card.id === 'blue_hairtrigger') {
    const isHair = card.id === 'blue_hairtrigger';
    // Silver blank shell
    ctx.fillStyle = '#cbd5e1';
    drawRoundedRect(ctx, -18, -32, 36, 68, 7);
    ctx.fill();
    ctx.fillStyle = isHair ? '#3b82f6' : '#38bdf8';
    drawRoundedRect(ctx, -14, -18, 28, 40, 5);
    ctx.fill();
  } else if (card.id === 'purple_jinxpin') {
    // Purple X / Jinx Pin
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-36, -36);
    ctx.lineTo(36, 36);
    ctx.moveTo(36, -36);
    ctx.lineTo(-36, 36);
    ctx.stroke();
  } else if (card.id === 'purple_recoilcurse') {
    // Recoil loop arrow
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0.35, Math.PI * 1.85);
    ctx.stroke();
  }

  ctx.restore();
}

export function getCardFrontTexture(cardId: CardId): THREE.CanvasTexture {
  const existing = frontTextureCache.get(cardId);
  if (existing) return existing;

  const card = CARD_DEFINITIONS[cardId];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 740;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Parchment / Dark Saloon Card Base
  ctx.fillStyle = '#121016';
  drawRoundedRect(ctx, 0, 0, 512, 740, 36);
  ctx.fill();

  // 2. Thick Color-Coded Outer Border (Red = Loader, Blue = Stripper, Gold/Violet = Tactical)
  ctx.lineWidth = 18;
  ctx.strokeStyle = card.borderColor;
  drawRoundedRect(ctx, 14, 14, 484, 712, 28);
  ctx.stroke();

  // 3. Inner Brass Pinstripe
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#d4af3799';
  drawRoundedRect(ctx, 30, 30, 452, 680, 20);
  ctx.stroke();

  // 4. Top Category Banner
  ctx.fillStyle = card.borderColor;
  drawRoundedRect(ctx, 44, 44, 424, 54, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(card.badgeText, 64, 79);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fef3c7';
  ctx.font = '800 22px "JetBrains Mono", monospace';
  ctx.fillText(card.shortTag, 448, 79);

  // 5. Card Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fffbeb';
  ctx.font = '900 40px "Cinzel", Georgia, serif';
  ctx.fillText(card.name, 256, 152);

  // 6. Central Illustration Medallion Window
  ctx.fillStyle = '#1b1822';
  drawRoundedRect(ctx, 56, 174, 400, 224, 20);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = card.accentColor;
  drawRoundedRect(ctx, 56, 174, 400, 224, 20);
  ctx.stroke();

  drawCardIcon(ctx, card, 256, 286);

  // 7. Simplified Two-Box Effect Layout (IN GUN / AS TRAP)
  const drawWrapped = (text: string, startY: number, maxW: number, lineH: number) => {
    const words = text.split(' ');
    let line = '';
    let y = startY;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, 256, y);
        line = w;
        y += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 256, y);
  };

  // IN GUN box
  ctx.fillStyle = '#1d1926';
  drawRoundedRect(ctx, 56, 420, 400, 124, 14);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b66';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 56, 420, 400, 124, 14);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 20px "JetBrains Mono", monospace';
  ctx.fillText('IN GUN', 256, 450);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 25px "Space Grotesk", sans-serif';
  drawWrapped(card.chamberEffectText, 486, 368, 32);

  // AS TRAP box
  ctx.fillStyle = '#1d1926';
  drawRoundedRect(ctx, 56, 562, 400, 124, 14);
  ctx.fill();
  ctx.strokeStyle = '#c084fc66';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 56, 562, 400, 124, 14);
  ctx.stroke();

  ctx.fillStyle = '#c084fc';
  ctx.font = '900 20px "JetBrains Mono", monospace';
  ctx.fillText('AS TRAP', 256, 592);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 25px "Space Grotesk", sans-serif';
  drawWrapped(card.tableTrapText, 628, 368, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  frontTextureCache.set(cardId, texture);
  return texture;
}

export function getCardBackTexture(): THREE.CanvasTexture {
  if (backTextureCache) return backTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 740;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181112';
  drawRoundedRect(ctx, 0, 0, 512, 740, 36);
  ctx.fill();

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 16;
  drawRoundedRect(ctx, 18, 18, 476, 704, 26);
  ctx.stroke();

  ctx.strokeStyle = '#fbbf2488';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 38, 38, 436, 664, 18);
  ctx.stroke();

  // Central 6-chamber revolver cylinder emblem
  ctx.save();
  ctx.translate(256, 370);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 125, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.fillStyle = i === 0 ? '#ef4444' : '#292524';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 72, Math.sin(a) * 72, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#fde68a';
  ctx.font = '900 30px "Cinzel", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHAMBER', 256, 145);
  ctx.fillText('LOADING', 256, 625);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  backTextureCache = texture;
  return texture;
}
