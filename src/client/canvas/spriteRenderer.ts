import { GB_PALETTE, SPRITE_SIZE } from "@shared/constants";

/**
 * Decode base64 sprite data to a Uint8Array of 256 color indices (0-3)
 */
export function decodeSpriteData(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode a Uint8Array of 256 color indices to base64
 */
export function encodeSpriteData(pixels: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < pixels.length; i++) {
    binary += String.fromCharCode(pixels[i]);
  }
  return btoa(binary);
}

/**
 * Draw a 16x16 sprite at the given position, scaled to pixelSize per pixel
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8Array,
  x: number,
  y: number,
  pixelSize: number = 1
) {
  for (let py = 0; py < SPRITE_SIZE; py++) {
    for (let px = 0; px < SPRITE_SIZE; px++) {
      const colorIdx = pixels[py * SPRITE_SIZE + px] & 0x03;
      ctx.fillStyle = GB_PALETTE[colorIdx];
      ctx.fillRect(
        x + px * pixelSize,
        y + py * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  }
}

/**
 * Create a blank (all lightest color) sprite
 */
export function createBlankSprite(): Uint8Array {
  const pixels = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE);
  pixels.fill(3); // lightest color
  return pixels;
}
