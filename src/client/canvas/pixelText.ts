import { GB_PALETTE } from "@shared/constants";

// Bitmap font data: 4x5 pixel glyphs for uppercase + digits + punctuation
// Each character is a 4-wide, 5-tall bitmap stored as 5 bytes (each byte = row, lower 4 bits used)
const FONT: Record<string, number[]> = {
  A: [0b0110, 0b1001, 0b1111, 0b1001, 0b1001],
  B: [0b1110, 0b1001, 0b1110, 0b1001, 0b1110],
  C: [0b0111, 0b1000, 0b1000, 0b1000, 0b0111],
  D: [0b1110, 0b1001, 0b1001, 0b1001, 0b1110],
  E: [0b1111, 0b1000, 0b1110, 0b1000, 0b1111],
  F: [0b1111, 0b1000, 0b1110, 0b1000, 0b1000],
  G: [0b0111, 0b1000, 0b1011, 0b1001, 0b0110],
  H: [0b1001, 0b1001, 0b1111, 0b1001, 0b1001],
  I: [0b1110, 0b0100, 0b0100, 0b0100, 0b1110],
  J: [0b0001, 0b0001, 0b0001, 0b1001, 0b0110],
  K: [0b1001, 0b1010, 0b1100, 0b1010, 0b1001],
  L: [0b1000, 0b1000, 0b1000, 0b1000, 0b1111],
  M: [0b1001, 0b1111, 0b1111, 0b1001, 0b1001],
  N: [0b1001, 0b1101, 0b1111, 0b1011, 0b1001],
  O: [0b0110, 0b1001, 0b1001, 0b1001, 0b0110],
  P: [0b1110, 0b1001, 0b1110, 0b1000, 0b1000],
  Q: [0b0110, 0b1001, 0b1001, 0b1010, 0b0101],
  R: [0b1110, 0b1001, 0b1110, 0b1010, 0b1001],
  S: [0b0111, 0b1000, 0b0110, 0b0001, 0b1110],
  T: [0b1110, 0b0100, 0b0100, 0b0100, 0b0100],
  U: [0b1001, 0b1001, 0b1001, 0b1001, 0b0110],
  V: [0b1001, 0b1001, 0b1001, 0b0110, 0b0110],
  W: [0b1001, 0b1001, 0b1111, 0b1111, 0b1001],
  X: [0b1001, 0b1001, 0b0110, 0b1001, 0b1001],
  Y: [0b1001, 0b1001, 0b0110, 0b0100, 0b0100],
  Z: [0b1111, 0b0001, 0b0110, 0b1000, 0b1111],
  "0": [0b0110, 0b1001, 0b1001, 0b1001, 0b0110],
  "1": [0b0100, 0b1100, 0b0100, 0b0100, 0b1110],
  "2": [0b0110, 0b1001, 0b0010, 0b0100, 0b1111],
  "3": [0b1110, 0b0001, 0b0110, 0b0001, 0b1110],
  "4": [0b1001, 0b1001, 0b1111, 0b0001, 0b0001],
  "5": [0b1111, 0b1000, 0b1110, 0b0001, 0b1110],
  "6": [0b0110, 0b1000, 0b1110, 0b1001, 0b0110],
  "7": [0b1111, 0b0001, 0b0010, 0b0100, 0b0100],
  "8": [0b0110, 0b1001, 0b0110, 0b1001, 0b0110],
  "9": [0b0110, 0b1001, 0b0111, 0b0001, 0b0110],
  " ": [0b0000, 0b0000, 0b0000, 0b0000, 0b0000],
  ".": [0b0000, 0b0000, 0b0000, 0b0000, 0b0100],
  ",": [0b0000, 0b0000, 0b0000, 0b0010, 0b0100],
  "!": [0b0100, 0b0100, 0b0100, 0b0000, 0b0100],
  "?": [0b0110, 0b1001, 0b0010, 0b0000, 0b0010],
  "-": [0b0000, 0b0000, 0b1111, 0b0000, 0b0000],
  "+": [0b0000, 0b0100, 0b1110, 0b0100, 0b0000],
  "/": [0b0001, 0b0010, 0b0100, 0b1000, 0b0000],
  ":": [0b0000, 0b0100, 0b0000, 0b0100, 0b0000],
  "%": [0b1001, 0b0010, 0b0100, 0b1001, 0b0000],
  "(": [0b0010, 0b0100, 0b0100, 0b0100, 0b0010],
  ")": [0b0100, 0b0010, 0b0010, 0b0010, 0b0100],
  "'": [0b0100, 0b0100, 0b0000, 0b0000, 0b0000],
  ">": [0b1000, 0b0100, 0b0010, 0b0100, 0b1000],
  "<": [0b0010, 0b0100, 0b1000, 0b0100, 0b0010],
};

const CHAR_W = 4;
const CHAR_H = 5;
const SPACING = 1;

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  colorIndex: number = 0,
  scale: number = 1
) {
  const color = GB_PALETTE[colorIndex];
  ctx.fillStyle = color;
  const upper = text.toUpperCase();
  let cursorX = x;

  for (let i = 0; i < upper.length; i++) {
    const glyph = FONT[upper[i]];
    if (glyph) {
      for (let row = 0; row < CHAR_H; row++) {
        for (let col = 0; col < CHAR_W; col++) {
          if (glyph[row] & (1 << (3 - col))) {
            ctx.fillRect(
              cursorX + col * scale,
              y + row * scale,
              scale,
              scale
            );
          }
        }
      }
    }
    cursorX += (CHAR_W + SPACING) * scale;
  }
}

export function measureText(text: string, scale: number = 1): number {
  return text.length * (CHAR_W + SPACING) * scale - SPACING * scale;
}

export function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  colorIndex: number = 0,
  scale: number = 1
) {
  const width = measureText(text, scale);
  drawText(ctx, text, Math.floor(centerX - width / 2), y, colorIndex, scale);
}
