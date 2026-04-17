export function firstSentence(s: string): string {
  const m = s.match(/^(.+?[.!?])\s+(?=[A-Z])/);
  return m ? m[1] : s;
}
