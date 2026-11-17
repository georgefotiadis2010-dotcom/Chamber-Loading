import * as THREE from 'three';
import { AimChoice, CardDef, CardId } from '../types/game';
import { CARD_DEFINITIONS } from '../data/cardsAndOpponents';

const frontTextureCache = new Map<CardId, THREE.CanvasTexture>();
let backTextureCache: THREE.CanvasTexture | null = null;
const lockInSlotCache = new Map<string, THREE.CanvasTexture>();
const midSlotCache = new Map<string, THREE.CanvasTexture>();
const aimChipCache = new Map<AimChoice, THREE.CanvasTexture>();
let lockInLabelCache: THREE.CanvasTexture | null = null;

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

function drawShellCylinder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  scale: number,
  isBrass: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  drawRoundedRect(ctx, -30, -56, 68, 128, 16);
  ctx.fill();

  // Main cylindrical body with 3D metallic gradient
  const grad = ctx.createLinearGradient(-32, 0, 32, 0);
  if (isBrass) {
    grad.addColorStop(0, '#854d0e');
    grad.addColorStop(0.28, '#eab308');
    grad.addColorStop(0.55, '#fef08a');
    grad.addColorStop(0.82, '#ca8a04');
    grad.addColorStop(1, '#713f12');
  } else {
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.28, '#cbd5e1');
    grad.addColorStop(0.55, '#f8fafc');
    grad.addColorStop(0.82, '#94a3b8');
    grad.addColorStop(1, '#334155');
  }

  ctx.fillStyle = grad;
  drawRoundedRect(ctx, -32, -62, 64, 120, 14);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = isBrass ? '#422006' : '#1e293b';
  drawRoundedRect(ctx, -32, -62, 64, 120, 14);
  ctx.stroke();

  // Top Elliptical Rim / Hollow Bore
  ctx.fillStyle = isBrass ? '#fde047' : '#e2e8f0';
  ctx.beginPath();
  ctx.ellipse(0, -54, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isBrass ? '#78350f' : '#334155';
  ctx.beginPath();
  ctx.ellipse(0, -54, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRevolverIllustration(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.32);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  drawRoundedRect(ctx, -145, -42, 290, 92, 22);
  ctx.fill();

  // Wooden Grip (bottom-left of gun)
  const woodGrad = ctx.createLinearGradient(-155, 10, -70, 145);
  woodGrad.addColorStop(0, '#c25929');
  woodGrad.addColorStop(0.5, '#9a3b15');
  woodGrad.addColorStop(1, '#5c1f08');
  ctx.fillStyle = woodGrad;
  ctx.strokeStyle = '#1e130c';
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(-85, 8);
  ctx.quadraticCurveTo(-155, 35, -148, 125);
  ctx.quadraticCurveTo(-125, 152, -88, 138);
  ctx.quadraticCurveTo(-55, 85, -45, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Trigger guard
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(-22, 42, 34, 22, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Revolver Frame + Snub Barrel (Metallic Silver)
  const steelGrad = ctx.createLinearGradient(0, -58, 0, 32);
  steelGrad.addColorStop(0, '#f1f5f9');
  steelGrad.addColorStop(0.45, '#94a3b8');
  steelGrad.addColorStop(1, '#475569');
  ctx.fillStyle = steelGrad;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 5;

  // Frame block
  drawRoundedRect(ctx, -98, -42, 142, 74, 18);
  ctx.fill();
  ctx.stroke();

  // Snub Barrel extending right
  drawRoundedRect(ctx, 25, -40, 125, 48, 14);
  ctx.fill();
  ctx.stroke();

  // Underbarrel lug
  drawRoundedRect(ctx, 28, -2, 102, 22, 8);
  ctx.fill();
  ctx.stroke();

  // Muzzle bore shadow
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(146, -16, 6, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // 6-Chamber Cylinder Drum with Flutes
  const cylGrad = ctx.createLinearGradient(0, -34, 0, 26);
  cylGrad.addColorStop(0, '#e2e8f0');
  cylGrad.addColorStop(0.5, '#cbd5e1');
  cylGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = cylGrad;
  drawRoundedRect(ctx, -56, -32, 84, 58, 12);
  ctx.fill();
  ctx.stroke();

  // Cylinder flute indentations
  ctx.fillStyle = '#475569';
  drawRoundedRect(ctx, -42, -22, 56, 14, 7);
  ctx.fill();
  drawRoundedRect(ctx, -42, 2, 56, 14, 7);
  ctx.fill();

  ctx.restore();
}

function drawCylinderIllustration(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy + 8);
  ctx.rotate(0.18);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 138, 86, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cylinder Side Body (3/4 perspective drum)
  const bodyGrad = ctx.createLinearGradient(-120, -75, 80, 75);
  bodyGrad.addColorStop(0, '#f8fafc');
  bodyGrad.addColorStop(0.45, '#94a3b8');
  bodyGrad.addColorStop(1, '#475569');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 5;

  drawRoundedRect(ctx, -125, -68, 210, 136, 42);
  ctx.fill();
  ctx.stroke();

  // Side flutes on cylinder drum
  ctx.fillStyle = '#64748b';
  drawRoundedRect(ctx, -105, -42, 110, 26, 12);
  ctx.fill();
  drawRoundedRect(ctx, -105, 4, 110, 26, 12);
  ctx.fill();

  // Front circular face of the 6-chamber cylinder
  const faceGrad = ctx.createRadialGradient(52, -10, 8, 52, 0, 76);
  faceGrad.addColorStop(0, '#e2e8f0');
  faceGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(52, 0, 56, 68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 6 Dark Chamber Bores around the front face
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const bx = 52 + Math.cos(a) * 30;
    const by = Math.sin(a) * 38;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(bx, by, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center spindle hole
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(52, 0, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCardIllustration(ctx: CanvasRenderingContext2D, card: CardDef, cx: number, cy: number) {
  if (card.id === 'red_crimsonslug') {
    // LOAD LIVE: Chunky silver & wood snub-nose revolver
    drawRevolverIllustration(ctx, cx, cy);
  } else if (card.id === 'blue_silverblank') {
    // STRIP SHELL: Brass & Silver 3D shells scattered & upright (matches image_0.png)
    drawShellCylinder(ctx, cx - 22, cy - 34, 0.02, 0.88, true);
    drawShellCylinder(ctx, cx + 68, cy - 22, 0.04, 0.86, false);
    drawShellCylinder(ctx, cx - 64, cy + 44, -0.92, 0.85, false);
    drawShellCylinder(ctx, cx + 28, cy + 48, 0.96, 0.88, true);
  } else if (card.id === 'purple_jinxpin') {
    // PAD CYLINDER: 3D fluted silver 6-chamber cylinder (matches image_0.png)
    drawCylinderIllustration(ctx, cx, cy);
  } else if (card.id === 'red_hollowpoint') {
    // HEAVY SLUG: Two gleaming brass live shells + revolver
    drawShellCylinder(ctx, cx - 48, cy, -0.18, 1.05, true);
    drawShellCylinder(ctx, cx + 48, cy + 6, 0.18, 1.05, true);
  } else if (card.id === 'blue_hairtrigger') {
    // HAIR TRIGGER: Two gleaming silver blank shells
    drawShellCylinder(ctx, cx - 45, cy, -0.15, 1.02, false);
    drawShellCylinder(ctx, cx + 45, cy + 6, 0.15, 1.02, false);
  } else {
    // SPIN & RECOIL: Cylinder + Brass shell
    drawCylinderIllustration(ctx, cx - 12, cy);
    drawShellCylinder(ctx, cx + 78, cy + 28, 0.45, 0.78, true);
  }
}

export function getCardFrontTexture(cardId: CardId): THREE.CanvasTexture {
  const existing = frontTextureCache.get(cardId);
  if (existing) return existing;

  const card = CARD_DEFINITIONS[cardId];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 740;
  const ctx = canvas.getContext('2d')!;

  // 1. Warm Cream / Parchment Card Base (Matches image_0.png, image_1.png, image_2.png)
  const parchmentGrad = ctx.createLinearGradient(0, 0, 0, 740);
  parchmentGrad.addColorStop(0, '#f5e6cc');
  parchmentGrad.addColorStop(0.5, '#ebd6b5');
  parchmentGrad.addColorStop(1, '#dcc29c');
  ctx.fillStyle = parchmentGrad;
  drawRoundedRect(ctx, 0, 0, 512, 740, 34);
  ctx.fill();

  // Subtle outer bevel border
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#b9996e';
  drawRoundedRect(ctx, 4, 4, 504, 732, 32);
  ctx.stroke();

  // 2. Top Color-Coded Header Banner (Blue for LOAD LIVE, Orange for STRIP SHELL, Green for PAD CYLINDER)
  ctx.fillStyle = card.headerBgColor;
  drawRoundedRect(ctx, 22, 22, 468, 86, 20);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  drawRoundedRect(ctx, 22, 22, 468, 86, 20);
  ctx.stroke();

  // Bold Chunky Cartoon Header Title with Dark Outline
  ctx.font = '900 42px "Space Grotesk", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1c120c';
  ctx.strokeText(card.name, 256, 66);
  ctx.fillStyle = '#fffbeb';
  ctx.fillText(card.name, 256, 66);

  // 3. Large Central Illustration Frame
  const artGrad = ctx.createRadialGradient(256, 305, 30, 256, 305, 240);
  artGrad.addColorStop(0, card.artBgColor);
  artGrad.addColorStop(1, '#16110e');
  ctx.fillStyle = artGrad;
  drawRoundedRect(ctx, 24, 114, 464, 386, 18);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2b1c12';
  drawRoundedRect(ctx, 24, 114, 464, 386, 18);
  ctx.stroke();

  // Draw the custom 3D-style icon illustration
  drawCardIllustration(ctx, card, 256, 308);

  // 4. Bottom Parchment Description Box (Matches image_0.png bottom text area)
  ctx.fillStyle = '#e8d4b4';
  drawRoundedRect(ctx, 24, 512, 464, 202, 18);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#bda078';
  drawRoundedRect(ctx, 24, 512, 464, 202, 18);
  ctx.stroke();

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

  ctx.textAlign = 'center';
  ctx.fillStyle = '#29170d';
  ctx.font = '800 27px "Space Grotesk", system-ui, sans-serif';
  drawWrapped(card.chamberEffectText, 558, 424, 34);

  ctx.fillStyle = '#5c3a21';
  ctx.font = '800 22px "Space Grotesk", system-ui, sans-serif';
  drawWrapped(card.shortTag, 648, 424, 28);

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

  // Cream outer border + dark brown card back
  ctx.fillStyle = '#dfd0b8';
  drawRoundedRect(ctx, 0, 0, 512, 740, 34);
  ctx.fill();

  ctx.fillStyle = '#2b1b12';
  drawRoundedRect(ctx, 18, 18, 476, 704, 26);
  ctx.fill();

  ctx.strokeStyle = '#c8aa7e';
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, 36, 36, 440, 668, 20);
  ctx.stroke();

  // Central 6-chamber cylinder emblem
  ctx.save();
  ctx.translate(256, 370);
  ctx.strokeStyle = '#d4b483';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.fillStyle = i === 0 ? '#eab308' : '#1c120c';
    ctx.strokeStyle = '#d4b483';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 62, Math.sin(a) * 62, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  backTextureCache = texture;
  return texture;
}

/**
 * Generates the texture for the centered `LOCK IN SLOT` base block on the near plank
 * (matches `LOCK IN SLOT` in image_0.png/image_1.png and `LOCK IN!` in image_2.png).
 */
export function getLockInSlotTexture(hasLockedCard: boolean): THREE.CanvasTexture {
  const key = hasLockedCard ? 'locked' : 'idle';
  const existing = lockInSlotCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  // Cream-tan outer deck block frame
  ctx.fillStyle = '#ddd0bc';
  drawRoundedRect(ctx, 0, 0, 512, 720, 36);
  ctx.fill();

  // Dark walnut inner surface
  const bgGrad = ctx.createRadialGradient(256, 360, 20, 256, 360, 340);
  bgGrad.addColorStop(0, hasLockedCard ? '#4d3319' : '#322015');
  bgGrad.addColorStop(1, '#1e130c');
  ctx.fillStyle = bgGrad;
  drawRoundedRect(ctx, 18, 18, 476, 684, 28);
  ctx.fill();

  // Double gold/cream inner border
  ctx.strokeStyle = hasLockedCard ? '#fbbf24' : '#cbb28c';
  ctx.lineWidth = 10;
  drawRoundedRect(ctx, 36, 36, 440, 648, 22);
  ctx.stroke();

  ctx.strokeStyle = hasLockedCard ? '#fde68a88' : '#cbb28c66';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 54, 54, 404, 612, 16);
  ctx.stroke();

  // Center Typography: "LOCK IN" / "SLOT"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hasLockedCard ? '#fef08a' : '#e7d3b0';
  ctx.font = '900 66px "Space Grotesk", system-ui, sans-serif';
  ctx.fillText('LOCK IN', 256, 315);
  ctx.fillText(hasLockedCard ? 'READY!' : 'SLOT', 256, 398);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  lockInSlotCache.set(key, texture);
  return texture;
}

/**
 * Generates the painted wood-table slot markers ("SLOT 1", "SLOT 2", upside-down "SLOT")
 * in the Mid-Table Resolution Area.
 */
export function getMidTableSlotTexture(
  line1: string,
  line2 = '',
  upsideDown = false
): THREE.CanvasTexture {
  const key = `${line1}_${line2}_${upsideDown}`;
  const existing = midSlotCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (upsideDown) {
    ctx.translate(384, 512);
    ctx.rotate(Math.PI);
  }

  // Subtle recessed dark wood fill
  ctx.fillStyle = '#3d2417';
  drawRoundedRect(ctx, 8, 8, 368, 496, 26);
  ctx.fill();

  // Cream/tan stencil border on wood
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#bda080';
  drawRoundedRect(ctx, 14, 14, 356, 484, 24);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dec6a8';
  ctx.font = '900 50px "Space Grotesk", system-ui, sans-serif';

  if (line2) {
    ctx.fillText(line1, 192, 224);
    ctx.fillText(line2, 192, 286);
  } else {
    ctx.fillText(line1, 192, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  midSlotCache.set(key, texture);
  return texture;
}

/**
 * Generates the top-face texture for the two 3D weighted poker-chip Aim Tokens:
 * - 'opponent': Red chip, white edge stripes, Skull icon, "AIM" / "AIM OPPONENT"
 * - 'self': Blue chip, dark navy edge stripes, Shield icon, "AIM" / "AIM SELF"
 */
export function getAimChipTexture(mode: AimChoice): THREE.CanvasTexture {
  const existing = aimChipCache.get(mode);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  const isOpponent = mode === 'opponent';
  const mainColor = isOpponent ? '#b82925' : '#3b5c8f';
  const stripeColor = isOpponent ? '#efe4d6' : '#172236';

  // Base circle
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 250, 0, Math.PI * 2);
  ctx.fill();

  // 8 Poker-Chip Edge Stripes around the outer rim
  for (let i = 0; i < 8; i++) {
    const startAngle = i * (Math.PI / 4) - 0.14;
    const endAngle = startAngle + 0.28;
    ctx.fillStyle = stripeColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 250, startAngle, endAngle);
    ctx.arc(cx, cy, 186, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();
  }

  // Inner dark ring
  ctx.fillStyle = '#261e1b';
  ctx.beginPath();
  ctx.arc(cx, cy, 188, 0, Math.PI * 2);
  ctx.fill();

  // Colored inner medallion ring
  ctx.lineWidth = 8;
  ctx.strokeStyle = isOpponent ? '#d9483b' : '#5b82b8';
  ctx.beginPath();
  ctx.arc(cx, cy, 178, 0, Math.PI * 2);
  ctx.stroke();

  // Center Dark Medallion
  ctx.fillStyle = isOpponent ? '#3b1f1c' : '#1f2d42';
  ctx.beginPath();
  ctx.arc(cx, cy, 124, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#d6c5b3';
  ctx.beginPath();
  ctx.arc(cx, cy, 124, 0, Math.PI * 2);
  ctx.stroke();

  // Center Icon: Skull (for AIM OPPONENT) or Shield (for AIM SELF)
  if (isOpponent) {
    // Stylized Cream Skull Icon (matches image_0.png)
    ctx.fillStyle = '#efe5d8';
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 54, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(cx + 32, cy + 44);
    ctx.lineTo(cx - 32, cy + 44);
    ctx.closePath();
    ctx.fill();

    // Skull eye sockets
    ctx.fillStyle = '#261e1b';
    ctx.beginPath();
    ctx.arc(cx - 20, cy - 12, 13, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy - 12, 13, 0, Math.PI * 2);
    ctx.fill();

    // Nose cavity
    ctx.beginPath();
    ctx.moveTo(cx, cy + 2);
    ctx.lineTo(cx - 8, cy + 16);
    ctx.lineTo(cx + 8, cy + 16);
    ctx.closePath();
    ctx.fill();

    // Skull teeth slits
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#261e1b';
    for (const tx of [-14, 0, 14]) {
      ctx.beginPath();
      ctx.moveTo(cx + tx, cy + 26);
      ctx.lineTo(cx + tx, cy + 44);
      ctx.stroke();
    }
  } else {
    // Stylized Silver/Cream Shield Icon (matches image_0.png)
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 64);
    ctx.lineTo(cx + 52, cy - 42);
    ctx.quadraticCurveTo(cx + 48, cy + 28, cx, cy + 66);
    ctx.quadraticCurveTo(cx - 48, cy + 28, cx - 52, cy - 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shield left/right shading split
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 56);
    ctx.lineTo(cx + 44, cy - 36);
    ctx.quadraticCurveTo(cx + 40, cy + 22, cx, cy + 56);
    ctx.closePath();
    ctx.fill();
  }

  // Labels on the inner ring: "AIM" at top, "AIM OPPONENT" / "AIM SELF" at bottom
  ctx.fillStyle = '#f5ebe1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 32px "Space Grotesk", system-ui, sans-serif';
  ctx.fillText('AIM', cx, 98);

  ctx.font = '900 28px "Space Grotesk", system-ui, sans-serif';
  ctx.fillText(isOpponent ? 'AIM OPPONENT' : 'AIM SELF', cx, 414);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  aimChipCache.set(mode, texture);
  return texture;
}

export function getLockInLabelTexture(): THREE.CanvasTexture {
  if (lockInLabelCache) return lockInLabelCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 68px "Space Grotesk", system-ui, sans-serif';
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#231309';
  ctx.strokeText('LOCK IN', 256, 68);
  ctx.fillStyle = '#efe2cc';
  ctx.fillText('LOCK IN', 256, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  lockInLabelCache = texture;
  return texture;
}
