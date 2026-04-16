# Remove Self-ID and Live Generation from Frontend

## Summary

Remove the self-id form gate and all live-generation UI. Visitors landing on the root path see the default resume immediately. Custom adaptations are only available via pre-built URL slugs. The GitHub Actions adapt pipeline stays untouched for backend/CLI-triggered adaptations.

## Motivation

The self-id form adds friction without clear value. Visitors arriving from LinkedIn or direct links just want to see the portfolio. Custom adaptations are better triggered via pre-built slugs distributed to specific companies.

## Updated User Flow

```
/agentfolio/          → load default.json → render resume
/agentfolio/c/cohere  → lookup slug → load cohere.json → render resume
/agentfolio/c/unknown → slug not in registry → load default.json → render resume
```

No form, no prompts, no live generation in the browser.

## Files to Delete

| File | Reason |
|------|--------|
| `web/src/components/SelfIdPrompt.tsx` | Self-id form component |
| `web/src/__tests__/SelfIdPrompt.test.tsx` | Tests for deleted component |
| `web/src/hooks/useAdaptationProgress.ts` | Progress polling hook |
| `web/src/__tests__/useAdaptationProgress.test.ts` | Tests for deleted hook |
| `web/src/components/AdaptationProgress.tsx` | Progress UI component |
| `web/src/__tests__/AdaptationProgress.test.tsx` | Tests for deleted component |

## Files to Modify

### `App.tsx`

Remove all self-id and live-generation logic:
- `SelfId` interface, `selfId`/`issueNumber`/`requestError`/`liveAdapted` state
- `effectiveContext` memo → use `urlContext` directly
- `needsSelfIdForm` check
- Live-generation `useEffect` (issue creation)
- `useAdaptationProgress` call and progress fetch effect
- `shownAdapted` → use `adapted` directly
- SelfIdPrompt and AdaptationProgress render blocks
- Related imports

### `githubApi.ts`

Delete `createAdaptRequest()` and `findOpenRequestForCompany()`. Keep `getApiConfig()`, `headers()`, `fetchIssueComments()` (used by chat/analytics).

### `types.ts`

Remove `'self-id'` from `VisitorContext.source` union. Remove `ProgressStep` and `ProgressComment` types.

### `useAdaptation.ts`

Remove `needsLiveGeneration` state. On 404, silently serve `default.json` without flagging.

### `slugs.json`

Remove the `"general"` entry.

### `PipelineDiagram.tsx`

Update descriptive blurb to remove "self-identification" mention.

### `global.css`

Remove self-id form styles.

### Test Files

- `App.test.tsx` — remove self-id and live-generation test cases
- `githubApi.test.ts` — remove tests for deleted functions
- `useAdaptation.test.ts` — remove `needsLiveGeneration` assertions

## What Stays

- GitHub Actions adapt workflow (backend/CLI triggered)
- `GH_ISSUES_PAT` in frontend (used by chat widget and analytics)
- `useAdaptation` hook (loads cached adaptations)
- `useVisitorContext` hook (slug resolution)
- `fetchIssueComments` in `githubApi.ts` (used by chat)
