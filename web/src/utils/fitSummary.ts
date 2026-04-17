export function extractTargetFromFitted(fittedMd: string, slug: string): string {
  const m = fittedMd.match(/<!--\s*fit-summary:\s*(\{[\s\S]*?\})\s*-->/);
  if (m && m[1]) {
    try {
      const obj = JSON.parse(m[1]) as { target?: string };
      if (obj.target) return obj.target;
    } catch { /* fall through */ }
  }
  return slug;
}
