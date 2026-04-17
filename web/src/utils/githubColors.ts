// web/src/utils/githubColors.ts
// Subset of GitHub's linguist color map for languages likely to appear
// in a developer portfolio. Fallback color used when a language is missing.
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  Kotlin: '#a97bff',
  Swift: '#f05138',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4f5d95',
  HTML: '#e34c26',
  CSS: '#663399',
  Shell: '#89e051',
  Dockerfile: '#384d54',
};

export const FALLBACK_COLOR = '#9ca3af';

export function colorFor(name: string): string {
  return LANGUAGE_COLORS[name] ?? FALLBACK_COLOR;
}
