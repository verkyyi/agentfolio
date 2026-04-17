// scripts/fetch-github-activity.mjs
// Node 20 script. No deps. Called from .github/workflows/activity.yml.
// Exports buildActivity for unit tests; runs the fetch when invoked directly.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const QUERY = `
query UserActivity($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
    repositories(first: 100, isFork: false, privacy: PUBLIC, ownerAffiliations: OWNER) {
      totalCount
      nodes {
        name
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    recent: repositories(first: 10, isFork: false, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name url description stargazerCount pushedAt
        primaryLanguage { name color }
      }
    }
  }
}`;

export function buildActivity(login, data, now = new Date()) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.map((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))
  );

  // Sum contributions within the last 30 calendar days of `now`.
  // Uses date-filtering rather than slicing the tail of the grid, because the
  // grid always ends on the current week's Saturday — a tail-slice window
  // drifts by up to 6 days depending on which weekday the cron fires on.
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const contributions30d = weeks
    .flat()
    .filter((d) => new Date(d.date) >= cutoff)
    .reduce((s, d) => s + d.count, 0);

  // Aggregate language bytes across all repos
  const bytes = new Map();
  const colors = new Map();
  for (const repo of data.user.repositories.nodes) {
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      bytes.set(name, (bytes.get(name) ?? 0) + edge.size);
      if (!colors.has(name) && edge.node.color) colors.set(name, edge.node.color);
    }
  }
  const total = Array.from(bytes.values()).reduce((a, b) => a + b, 0) || 1;
  const languages = Array.from(bytes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, size]) => ({
      name,
      color: colors.get(name) ?? '#9ca3af',
      pct: Math.round((size / total) * 1000) / 10,
    }));

  const repos = data.user.recent.nodes.slice(0, 5).map((r) => ({
    name: r.name,
    url: r.url,
    description: r.description ?? '',
    language: r.primaryLanguage?.name ?? null,
    languageColor: r.primaryLanguage?.color ?? null,
    stars: r.stargazerCount,
    pushedAt: r.pushedAt,
  }));

  return {
    user: login,
    fetchedAt: now.toISOString(),
    stats: {
      publicRepos: data.user.repositories.totalCount,
      contributions30d,
      contributionsLastYear: cal.totalContributions,
    },
    contributions: { weeks },
    languages,
    repos,
  };
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const login = process.env.GITHUB_REPOSITORY_OWNER;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  if (!login) throw new Error('GITHUB_REPOSITORY_OWNER is required');

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'agentfolio-activity',
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL errors: ' + JSON.stringify(json.errors));

  const activity = buildActivity(login, json.data);
  const outPath = path.resolve('data/github/activity.json');
  await writeFile(outPath, JSON.stringify(activity, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${outPath}`);
}

// Only run main() when invoked as a script, not when imported for tests.
const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '');
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
