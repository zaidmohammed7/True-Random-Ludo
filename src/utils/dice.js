/**
 * Fairness Audit – True Randomness via window.crypto.getRandomValues()
 *
 * Uses rejection sampling to guarantee exact 1/6 probability per face.
 * Values >= 252 are discarded because 252 = 42 × 6 (perfectly divisible),
 * ensuring no modulo bias. Every roll is a fully independent event.
 * No rubber-banding, no pity 6s, no game-state conditioning whatsoever.
 */
export function rollDice() {
  const buf = new Uint8Array(1);
  let value;
  do {
    window.crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= 252); // rejection sampling – eliminates modulo bias
  return (value % 6) + 1; // returns 1–6 with exact 1/6 probability each
}

/**
 * Fairness Audit helper – rolls `n` dice and returns face frequency counts.
 * Exposed so the in-app Fairness Audit button can call it directly.
 */
export function auditRolls(n = 6000) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (let i = 0; i < n; i++) {
    counts[rollDice()]++;
  }
  return counts;
}
