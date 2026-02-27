import { DOkemonType, StatBlock } from "./types";

export interface PresetDOkemon {
  name: string;
  type: DOkemonType;
  baseStats: StatBlock;
  moveIds: [string, string, string, string];
  sprite: string; // base64-encoded 256 bytes (16x16, values 0-3)
}

// Helper: encode a 16x16 pixel grid (values 0-3) to base64
function encodeSprite(rows: number[][]): string {
  const pixels = new Uint8Array(256);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      pixels[y * 16 + x] = (rows[y]?.[x] ?? 3) & 0x03;
    }
  }
  // Use a lookup table for server-side encoding (no btoa in workers)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < pixels.length; i += 3) {
    const a = pixels[i];
    const b = i + 1 < pixels.length ? pixels[i + 1] : 0;
    const c = i + 2 < pixels.length ? pixels[i + 2] : 0;
    result += chars[(a >> 2) & 0x3f];
    result += chars[((a & 3) << 4) | ((b >> 4) & 0x0f)];
    result += i + 1 < pixels.length ? chars[((b & 0x0f) << 2) | ((c >> 6) & 0x03)] : "=";
    result += i + 2 < pixels.length ? chars[c & 0x3f] : "=";
  }
  return result;
}

// Color indices: 0=darkest, 1=dark, 2=light, 3=lightest (background)
const _ = 3; // transparent / lightest
const D = 0; // darkest
const M = 1; // dark/medium
const L = 2; // light

// ── PYRODON (Fire) ── Flame lizard
const PYRODON_SPRITE = encodeSprite([
  [_,_,_,_,_,D,D,_,_,D,D,_,_,_,_,_],
  [_,_,_,_,D,L,L,D,D,L,L,D,_,_,_,_],
  [_,_,_,_,D,L,M,D,D,M,L,D,_,_,_,_],
  [_,_,_,_,_,D,D,M,M,D,D,_,_,_,_,_],
  [_,_,_,_,_,_,D,M,M,D,_,_,_,_,_,_],
  [_,_,_,D,D,D,M,M,M,M,D,D,D,_,_,_],
  [_,_,D,M,M,M,M,L,L,M,M,M,M,D,_,_],
  [_,_,D,M,L,L,M,M,M,M,L,L,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,D,M,M,D,_,_,_,_,D,M,M,D,_,_],
  [_,_,D,M,D,_,_,_,_,_,_,D,M,D,_,_],
  [_,_,D,D,_,_,_,_,_,_,_,_,D,D,_,_],
  [_,_,_,_,_,_,_,_,_,_,D,L,D,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,D,_,_,_,_],
]);

// ── AQUARIX (Water) ── Sleek sea serpent
const AQUARIX_SPRITE = encodeSprite([
  [_,_,_,_,_,_,D,D,D,_,_,_,_,_,_,_],
  [_,_,_,_,_,D,M,M,M,D,_,_,_,_,_,_],
  [_,_,_,_,D,M,L,L,M,M,D,_,_,_,_,_],
  [_,_,_,_,D,M,D,_,D,M,D,_,_,_,_,_],
  [_,_,_,_,_,D,M,M,M,D,_,_,_,_,_,_],
  [_,_,_,_,_,D,M,M,M,D,_,_,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,D,_,_,_,_,_],
  [_,_,_,D,M,M,L,L,L,M,M,D,_,_,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,D,M,L,M,M,M,M,M,L,M,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,D,_,_,_,_,_],
  [_,_,_,_,D,M,D,_,D,M,D,_,_,_,_,_],
  [_,_,_,_,D,D,_,_,_,D,D,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── THORNYX (Plant) ── Thorny plant creature
const THORNYX_SPRITE = encodeSprite([
  [_,_,_,_,_,D,_,_,_,_,D,_,_,_,_,_],
  [_,_,_,_,D,M,D,_,_,D,M,D,_,_,_,_],
  [_,_,_,D,M,M,M,D,D,M,M,M,D,_,_,_],
  [_,_,_,D,M,L,M,M,M,M,L,M,D,_,_,_],
  [_,_,_,_,D,M,M,L,L,M,M,D,_,_,_,_],
  [_,_,_,_,D,M,D,M,M,D,M,D,_,_,_,_],
  [_,_,_,_,_,D,M,M,M,M,D,_,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,D,D,M,M,L,L,L,L,M,M,D,D,_,_],
  [_,D,M,M,M,M,M,M,M,M,M,M,M,M,D,_],
  [_,_,D,D,M,M,M,M,M,M,M,M,D,D,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,_,D,M,D,_,_,D,M,D,_,_,_,_],
  [_,_,_,_,D,D,_,_,_,_,D,D,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── VOLTAIL (Spark) ── Electric fox
const VOLTAIL_SPRITE = encodeSprite([
  [_,_,D,_,_,_,_,_,_,_,_,_,_,D,_,_],
  [_,D,M,D,_,_,_,_,_,_,_,_,D,M,D,_],
  [_,D,M,M,D,_,_,_,_,_,_,D,M,M,D,_],
  [_,_,D,M,M,D,D,D,D,D,D,M,M,D,_,_],
  [_,_,_,D,M,M,L,L,L,L,M,M,D,_,_,_],
  [_,_,_,D,M,L,D,L,L,D,L,M,D,_,_,_],
  [_,_,_,D,M,L,L,L,L,L,L,M,D,_,_,_],
  [_,_,_,_,D,M,M,D,D,M,M,D,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,D,M,M,L,M,M,L,M,M,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,D,M,D,_,_,_,_,D,M,D,_,_,_],
  [_,_,D,M,D,_,_,_,_,_,_,D,M,D,_,_],
  [_,_,D,D,_,_,_,_,_,_,_,_,D,D,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── GOLEMAW (Stone) ── Hulking rock beast
const GOLEMAW_SPRITE = encodeSprite([
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,D,D,D,D,D,D,D,D,_,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,D,M,M,L,M,M,M,M,L,M,M,D,_,_],
  [_,_,D,M,M,D,M,M,M,M,D,M,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,_,D,M,M,D,D,D,D,D,D,M,M,D,_,_],
  [_,_,_,D,M,M,D,L,L,D,M,M,D,_,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,D,M,M,M,M,M,M,M,M,M,M,M,M,D,_],
  [_,D,M,L,M,M,M,M,M,M,M,M,L,M,D,_],
  [_,D,M,M,M,M,M,M,M,M,M,M,M,M,D,_],
  [_,_,D,M,M,M,D,_,_,D,M,M,M,D,_,_],
  [_,_,D,M,M,D,_,_,_,_,D,M,M,D,_,_],
  [_,_,D,D,D,_,_,_,_,_,_,D,D,D,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── FERROX (Metal) ── Armored construct
const FERROX_SPRITE = encodeSprite([
  [_,_,_,_,_,D,D,D,D,D,D,_,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,D,M,D,D,M,M,D,D,M,D,_,_,_],
  [_,_,_,D,M,L,D,M,M,D,L,M,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,_,D,M,D,D,D,D,M,D,_,_,_,_],
  [_,_,D,D,D,M,M,M,M,M,M,D,D,D,_,_],
  [_,D,M,M,M,M,M,M,M,M,M,M,M,M,D,_],
  [_,D,M,D,D,M,M,M,M,M,M,D,D,M,D,_],
  [_,_,D,_,D,M,M,L,L,M,M,D,_,D,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,_,D,M,D,D,D,D,M,D,_,_,_,_],
  [_,_,_,D,M,D,_,_,_,_,D,M,D,_,_,_],
  [_,_,_,D,D,_,_,_,_,_,_,D,D,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── SPECTRA (Spirit) ── Ghostly wisp
const SPECTRA_SPRITE = encodeSprite([
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,D,D,D,D,D,D,_,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,D,M,L,L,M,M,M,L,L,M,M,D,_,_],
  [_,_,D,M,D,D,M,M,M,D,D,M,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,_,D,M,M,M,D,D,D,M,M,M,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,D,M,D,M,M,D,M,M,D,M,D,_,_,_],
  [_,_,_,D,_,_,D,_,_,D,_,D,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── TOXIDON (Venom) ── Poison toad
const TOXIDON_SPRITE = encodeSprite([
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,D,D,D,_,_,_,_,D,D,D,_,_,_],
  [_,_,D,L,L,L,D,D,D,D,L,L,L,D,_,_],
  [_,_,D,L,D,L,M,M,M,M,L,D,L,D,_,_],
  [_,_,_,D,D,M,M,M,M,M,M,D,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,D,M,L,M,D,D,M,L,M,D,_,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,D,M,M,L,M,M,M,M,M,M,L,M,M,D,_],
  [_,D,M,M,M,M,M,M,M,M,M,M,M,M,D,_],
  [_,_,D,M,M,L,M,M,M,M,L,M,M,D,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,D,M,D,_,_,_,_,D,M,D,_,_,_],
  [_,_,D,M,D,_,_,_,_,_,_,D,M,D,_,_],
  [_,_,D,D,_,_,_,_,_,_,_,_,D,D,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── BLAZEKIT (Fire) ── Fast fire cat
const BLAZEKIT_SPRITE = encodeSprite([
  [_,_,_,D,D,_,_,_,_,_,_,D,D,_,_,_],
  [_,_,D,M,M,D,_,_,_,_,D,M,M,D,_,_],
  [_,_,D,M,L,D,D,D,D,D,D,L,M,D,_,_],
  [_,_,_,D,M,L,L,M,M,L,L,M,D,_,_,_],
  [_,_,_,D,M,D,L,M,M,L,D,M,D,_,_,_],
  [_,_,_,D,M,M,M,D,D,M,M,M,D,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,D,M,M,M,L,M,M,L,M,M,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,_,D,M,D,_,_,D,M,D,_,_,_,_],
  [_,_,_,_,D,D,_,_,_,_,D,D,_,_,_,_],
  [_,_,_,_,_,_,_,_,D,L,D,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,D,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── CRYSTON (Stone/Glass Cannon) ── Crystal golem
const CRYSTON_SPRITE = encodeSprite([
  [_,_,_,_,_,_,D,L,D,_,_,_,_,_,_,_],
  [_,_,_,_,_,D,L,L,L,D,_,_,_,_,_,_],
  [_,_,_,_,D,L,L,D,L,L,D,_,_,_,_,_],
  [_,_,_,_,D,M,D,_,D,M,D,_,_,_,_,_],
  [_,_,_,_,_,D,M,M,M,D,_,_,_,_,_,_],
  [_,_,_,D,D,M,M,M,M,M,D,D,_,_,_,_],
  [_,_,D,L,M,M,M,L,L,M,M,L,D,_,_,_],
  [_,D,L,M,M,M,M,M,M,M,M,M,L,D,_,_],
  [_,D,M,M,M,L,M,M,M,M,L,M,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,D,M,M,D,_,_,_,D,M,M,D,_,_,_],
  [_,_,D,M,D,_,_,_,_,_,D,M,D,_,_,_],
  [_,_,D,D,_,_,_,_,_,_,_,D,D,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── IRONHIDE (Metal Tank) ── Defensive turtle
const IRONHIDE_SPRITE = encodeSprite([
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,D,D,D,D,D,D,D,D,_,_,_,_],
  [_,_,_,D,M,M,D,M,M,D,M,M,D,_,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,D,M,D,D,M,D,D,D,M,D,D,M,M,D,_],
  [_,D,M,M,M,M,M,M,M,M,M,M,M,M,D,_],
  [D,M,M,D,M,D,M,D,M,D,M,D,M,M,M,D],
  [D,M,M,M,M,M,M,M,M,M,M,M,M,M,M,D],
  [_,D,M,M,M,M,M,M,M,M,M,M,M,M,D,_],
  [_,_,D,D,D,D,D,D,D,D,D,D,D,D,_,_],
  [_,D,L,L,D,_,_,_,_,_,_,D,L,L,D,_],
  [_,D,D,D,M,D,_,_,_,_,D,M,D,D,D,_],
  [_,_,D,M,D,_,_,_,_,_,_,D,M,D,_,_],
  [_,_,_,D,_,_,_,_,_,_,_,_,D,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── GLIMMER (Spirit/Special) ── Fast special attacker
const GLIMMER_SPRITE = encodeSprite([
  [_,_,_,_,_,_,_,D,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,D,L,D,_,_,_,_,_,_,_],
  [_,_,_,_,_,D,L,L,L,D,_,_,_,_,_,_],
  [_,_,_,_,D,M,L,L,L,M,D,_,_,_,_,_],
  [_,_,_,D,M,L,D,L,D,L,M,D,_,_,_,_],
  [_,_,D,M,M,L,L,L,L,L,M,M,D,_,_,_],
  [_,D,M,M,M,M,M,D,M,M,M,M,M,D,_,_],
  [_,D,M,M,L,M,M,M,M,M,L,M,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,D,_,_,_,_],
  [_,_,_,_,D,M,M,M,M,M,D,_,_,_,_,_],
  [_,_,_,D,L,D,M,M,M,D,L,D,_,_,_,_],
  [_,_,D,L,_,_,D,M,D,_,_,L,D,_,_,_],
  [_,_,D,_,_,_,D,D,D,_,_,_,D,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── CHOMPER (Neutral) ── Big-mouthed all-rounder
const CHOMPER_SPRITE = encodeSprite([
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,D,D,D,D,D,D,D,D,_,_,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,_,D,M,L,L,M,M,M,L,L,M,M,D,_,_],
  [_,_,D,M,D,D,M,M,M,D,D,M,M,D,_,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,D,D,D,D,D,D,D,D,D,D,D,D,D,D,_],
  [_,D,L,D,L,D,L,D,L,D,L,D,L,D,L,D],
  [_,D,D,D,D,D,D,D,D,D,D,D,D,D,D,_],
  [_,_,D,M,M,M,M,M,M,M,M,M,M,D,_,_],
  [_,_,_,D,M,M,M,M,M,M,M,M,D,_,_,_],
  [_,_,_,D,M,D,_,_,_,_,D,M,D,_,_,_],
  [_,_,_,D,D,_,_,_,_,_,_,D,D,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]);

// ── All 12 Preset DOkemon ──
export const PRESET_DOKEMON: PresetDOkemon[] = [
  {
    name: "PYRODON",
    type: DOkemonType.FIRE,
    baseStats: { hp: 55, atk: 70, def: 50, spc: 65, spd: 60 },
    moveIds: ["ember", "fire_fang", "tackle", "growl"],
    sprite: PYRODON_SPRITE,
  },
  {
    name: "AQUARIX",
    type: DOkemonType.WATER,
    baseStats: { hp: 55, atk: 50, def: 55, spc: 70, spd: 70 },
    moveIds: ["aqua_jet", "water_pulse", "quick_attack", "harden"],
    sprite: AQUARIX_SPRITE,
  },
  {
    name: "THORNYX",
    type: DOkemonType.PLANT,
    baseStats: { hp: 65, atk: 50, def: 60, spc: 75, spd: 50 },
    moveIds: ["vine_lash", "solar_beam", "spore_cloud", "tackle"],
    sprite: THORNYX_SPRITE,
  },
  {
    name: "VOLTAIL",
    type: DOkemonType.SPARK,
    baseStats: { hp: 50, atk: 55, def: 50, spc: 75, spd: 70 },
    moveIds: ["bolt", "spark_fang", "thunder", "quick_attack"],
    sprite: VOLTAIL_SPRITE,
  },
  {
    name: "GOLEMAW",
    type: DOkemonType.STONE,
    baseStats: { hp: 70, atk: 75, def: 80, spc: 50, spd: 25 },
    moveIds: ["earthquake", "stone_edge", "rock_throw", "harden"],
    sprite: GOLEMAW_SPRITE,
  },
  {
    name: "FERROX",
    type: DOkemonType.METAL,
    baseStats: { hp: 65, atk: 70, def: 85, spc: 55, spd: 25 },
    moveIds: ["iron_bash", "steel_lance", "iron_wall", "tackle"],
    sprite: FERROX_SPRITE,
  },
  {
    name: "SPECTRA",
    type: DOkemonType.SPIRIT,
    baseStats: { hp: 60, atk: 50, def: 50, spc: 80, spd: 60 },
    moveIds: ["shadow_bolt", "nightmare", "hex", "quick_attack"],
    sprite: SPECTRA_SPRITE,
  },
  {
    name: "TOXIDON",
    type: DOkemonType.VENOM,
    baseStats: { hp: 65, atk: 65, def: 55, spc: 70, spd: 45 },
    moveIds: ["poison_fang", "sludge_bomb", "toxic", "acid_spray"],
    sprite: TOXIDON_SPRITE,
  },
  {
    name: "BLAZEKIT",
    type: DOkemonType.FIRE,
    baseStats: { hp: 45, atk: 55, def: 40, spc: 80, spd: 80 },
    moveIds: ["inferno", "ember", "quick_attack", "growl"],
    sprite: BLAZEKIT_SPRITE,
  },
  {
    name: "CRYSTON",
    type: DOkemonType.STONE,
    baseStats: { hp: 50, atk: 50, def: 40, spc: 80, spd: 80 },
    moveIds: ["stone_edge", "earthquake", "slam", "harden"],
    sprite: CRYSTON_SPRITE,
  },
  {
    name: "IRONHIDE",
    type: DOkemonType.METAL,
    baseStats: { hp: 90, atk: 55, def: 75, spc: 50, spd: 30 },
    moveIds: ["iron_bash", "iron_wall", "slam", "rest"],
    sprite: IRONHIDE_SPRITE,
  },
  {
    name: "GLIMMER",
    type: DOkemonType.SPIRIT,
    baseStats: { hp: 45, atk: 40, def: 45, spc: 85, spd: 85 },
    moveIds: ["nightmare", "shadow_bolt", "hex", "growl"],
    sprite: GLIMMER_SPRITE,
  },
  {
    name: "CHOMPER",
    type: DOkemonType.VENOM,
    baseStats: { hp: 60, atk: 60, def: 60, spc: 60, spd: 60 },
    moveIds: ["poison_fang", "slam", "harden", "growl"],
    sprite: CHOMPER_SPRITE,
  },
];
