/**
 * Seeded PRNG using xoshiro128** algorithm.
 * Deterministic given the same seed — enables replays and predictable tests.
 */
export class SeededRNG {
  private s: Uint32Array;

  constructor(seed: number) {
    // SplitMix32 to initialize state from a single seed
    this.s = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      seed += 0x9e3779b9;
      let z = seed;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      z ^= z >>> 16;
      this.s[i] = z >>> 0;
    }
  }

  /** Serialize internal state for storage */
  getState(): number[] {
    return [this.s[0], this.s[1], this.s[2], this.s[3]];
  }

  /** Restore from serialized state */
  static fromState(state: number[]): SeededRNG {
    const rng = new SeededRNG(0);
    rng.s[0] = state[0];
    rng.s[1] = state[1];
    rng.s[2] = state[2];
    rng.s[3] = state[3];
    return rng;
  }

  /** Returns a random 32-bit unsigned integer */
  private nextU32(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 1) << 7 | Math.imul(s[1] * 5, 1) >>> 25;
    const t = s[1] << 9;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);

    return (result * 9) >>> 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    return this.nextU32() / 0x100000000;
  }

  /** Returns an integer in [min, max] inclusive */
  range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Returns true with the given probability (0 to 1) */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}
