# Remove slugs.json

Eliminate the slug registry (`slugs.json`) by having `useAdaptation` fetch adapted JSON directly based on the URL slug. If the file exists, render it. If it 404s, show not found.

## Motivation

`slugs.json` is an intermediate lookup table that maps URL slugs to company metadata. But the adapted JSON files already contain this metadata, and the slug-to-filename mapping is just identity (`/foo` → `adapted/foo.json`). The registry adds a fetch roundtrip, a generation step, a file to copy, and code to maintain — all for no user-visible benefit.

## What Gets Deleted

| File | Reason |
|------|--------|
| `web/src/hooks/useVisitorContext.ts` | Fetches and resolves slugs.json — no longer needed |
| `web/src/utils/slugResolver.ts` | Parses slugs and looks up registry — no longer needed |
| `web/src/__tests__/useVisitorContext.test.ts` | Tests for deleted hook |
| `web/src/__tests__/slugResolver.test.ts` | Tests for deleted util |
| `data/slugs.json` | The registry file itself |
| Types: `SlugEntry`, `SlugRegistry`, `VisitorContext` | In `web/src/types.ts` |
| Types: `CompanyAnalytics`, `AnalyticsDoc` | Dead types from removed analytics feature |

## What Gets Modified

### `useAdaptation.ts`

Currently takes a `company` string from `useVisitorContext`. New behavior:

- Takes no arguments (reads `window.location.pathname` directly)
- Parses slug from path using the same logic as the old `parseSlugFromPath` (inline, ~3 lines)
- No slug → fetch `adapted/default.json`
- Has slug → fetch `adapted/{slug}.json`
- Fetch OK → return adapted resume
- Fetch 404 → return error (triggers not-found page)

Signature changes from `useAdaptation(company: string | null)` to `useAdaptation()`.

### `App.tsx`

Simplifies from:
```tsx
const { context, error: ctxError } = useVisitorContext();
const { adapted, error: adaptError } = useAdaptation(context?.company ?? null);
```

To:
```tsx
const { adapted, error } = useAdaptation();
```

Remove the `ctxError` handling (no longer a separate error source). The single `error` covers both "unknown slug" (404 from fetch) and network errors.

### `App.test.tsx`

- Remove `slugRegistry` and the `slugs.json` mock from the fetch stub
- Tests should only mock `adapted/*.json` fetches
- Update imports (remove `SlugRegistry` type)
- Same 3 test cases: default at `/`, known slug, unknown slug → not found

### `useAdaptation.test.ts`

- Update tests to call `useAdaptation()` with no args
- Mock `window.location.pathname` instead of passing company strings
- Same test coverage: null/default, known company, unknown → error, normalization

### `adapt_from_markdown.py`

- Delete `generate_slugs_json()` function (lines 169-182)
- Remove the slugs.json generation block in `adapt_all_from_markdown()` (lines 227-231)

### `adapt_from_markdown` test

- Remove test class `TestGenerateSlugsJson`
- Remove assertion about `slugs.json` if any exist in `TestAdaptAllFromMarkdown`

### `.github/workflows/adapt.yml`

- Line 35: Remove `data/slugs.json` from `git add data/adapted/ data/slugs.json`

### `web/package.json` copy-data script

- Remove `fs.cpSync('../data/slugs.json', 'public/data/slugs.json')` — only copy `adapted/`

### Documentation

- `CLAUDE.md`: Remove slugs.json from project structure and routing description
- `README.md`: Remove slugs.json from personalization table

## No Behavior Change

Same URLs work. Same 404 on unknown slugs. One fewer network request on page load.
