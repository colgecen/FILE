export type FuzzyMatch = {
  readonly score: number;
  readonly endIndex: number;
  readonly indices: readonly number[];
};

function fold(text: string): string {
  return text.replace(/İ/g, 'i').toLowerCase().replace(/ı/g, 'i');
}

export function fuzzyScore(query: string, target: string): FuzzyMatch | null {
  const q = fold(query);
  const raw = fold(target);
  if (q.length === 0) return { score: 0, endIndex: -1, indices: [] };
  let qi = 0;
  let score = 0;
  let run = 0;
  let last = -1;
  const indices: number[] = [];
  for (let i = 0; i < raw.length && qi < q.length; i++) {
    if (raw[i] !== q[qi]) continue;
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
    indices.push(i);
    qi += 1;
  }
  if (qi < q.length) return null;
  return { score, endIndex: last, indices };
}
