export type FuzzyMatch = {
  readonly score: number;
  readonly endIndex: number;
};

export function fuzzyScore(query: string, target: string): FuzzyMatch | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return { score: 0, endIndex: -1 };
  let qi = 0;
  let score = 0;
  let run = 0;
  let last = -1;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] !== q[qi]) continue;
    if (last < 0) {
      run = 1;
      score += 2 + (i === 0 ? 2 : 0);
    } else {
      const gap = i - last - 1;
      if (gap === 0) {
        run += 1;
        score += 2 + run;
      } else {
        run = 0;
        score += 1 - gap;
      }
    }
    last = i;
    qi += 1;
  }
  if (qi < q.length) return null;
  return { score, endIndex: last };
}