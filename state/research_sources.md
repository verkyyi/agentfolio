# Research Sources
# Managed by evolve.yml. Claude adds, prunes, and annotates freely.
# Seeded from evolve_config.md on first run.
# Last updated: 2026-03-25T09:05:25Z

## Active Sources

### anthropics/claude-code
- **Why:** The runtime we build on — releases, breaking changes, new hooks, CLI flags
- **Look for:** CHANGELOG entries, new hook types, permission changes, SDK updates
- **Added:** 2026-03-20 (seed) | **Last deep:** 2026-03-25T07:41 | **Pattern hits:** 1 | **SHA:** a542f1b
- **Notes:** Protected source — never drop. Check CHANGELOG and releases, not just commits. v2.1.83 fully deep-dived: managed-settings.d/ (modular policy fragments, not needed for single-project), CwdChanged/FileChanged hooks (reactive env mgmt), initialPrompt frontmatter (requires --agent mode, not -p), CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1, sandbox.failIfUnavailable — all security patterns covered by #100. SHA a542f1b is pre-release CHANGELOG for upcoming v2.1.84. Previous: v2.1.81 --bare flag (issue #63), --channels permission relay.

### garrytan/gstack
- **Why:** Harness engineering patterns — skills, slash commands, review protocols, agent orchestration
- **Look for:** New skill files, workflow patterns, agent guardrails, PR review techniques, structured output formats
- **Added:** 2026-03-20 (seed) | **Last deep:** 2026-03-25T07:41 | **Pattern hits:** 9
- **Notes:** Most productive source so far. 9 pattern hits across v0.9.7-v0.11.18.2 (adversarial review, structured tables, anti-sycophancy, pre-merge gate, security, cross-model voice, tiered preamble, plan completion audit, requirement verification). Open PRs scanned: #480 deslop skills (anti-slop quality review from Theta-Tech-AI — premature for 8-skill set), #469/#472/#473 security cluster (JSONL injection, health endpoint info leak, JSON validation — covered by #17/#100), #471 v0.11.19.0 (Codex description limit guard + -C repo targeting). SHA 9870a4e unchanged (last commit: Windows browse fix). Issue #98 tracks requirement verification adoption.

### affaan-m/everything-claude-code
- **Why:** Community harness patterns, skill collections, optimization techniques
- **Look for:** New skills, CLAUDE.md patterns, workflow architectures, instinct files
- **Added:** 2026-03-20 (seed) | **Last deep:** 2026-03-25T07:41 | **Pattern hits:** 1
- **Notes:** Large community repo. 1 pattern hit (safety-guard PreToolUse hooks). SHA c1b47ac→4105a2f: continued ECC2/Rust TUI work. 0 harness patterns across 5+ consecutive observations. Retaining for community skill discoveries but reducing deep-dive priority.

### hesreallyhim/awesome-claude-code
- **Why:** Curated ecosystem catalog — discover new tools, libraries, and patterns
- **Look for:** New entries in Orchestrators/Tools/Skills sections, trending repos referenced
- **Added:** 2026-03-20 (seed) | **Last deep:** 2026-03-25T07:41 | **Pattern hits:** 0 | **SHA:** 4fa8827
- **Notes:** SHA d9780f4→4fa8827: ticker only (9th consecutive, 0 content changes). 0 pattern hits across 8+ observations. Low-value for PATTERN_HUNT; retain for HORIZON_SCAN cross-reference only.

### bytedance/deer-flow
- **Why:** Multi-agent orchestration patterns from a major tech company
- **Look for:** Agent coordination, state management, tool orchestration, LLM provider patterns
- **Added:** 2026-03-21 (seed) | **Last deep:** 2026-03-25T05:13 | **Pattern hits:** 1
- **Notes:** Very active (5+ commits/day). GuardrailMiddleware covered by #67. SHA ec46ae0→b8bc80d: new commits. 0 harness patterns across 5+ consecutive deep-dives. Python/LangGraph-specific — reduced deep-dive priority.

### wshobson/agents
- **Why:** Agent framework patterns — autonomous agent architectures
- **Look for:** Retry patterns, memory management, tool selection, agent lifecycle
- **Added:** 2026-03-20 (seed) | **Last deep:** 2026-03-24 | **Pattern hits:** 0
- **Notes:** 32K stars, 3504 forks. Plugin/skill catalog for Claude Code (OCI awareness, gallery-researcher, deployment engineer). 5 open PRs (Mar 19-22) including block-no-verify hook (already covered by CLAUDE.md). Primarily a plugin catalog, not harness architecture. Last commit Mar 17. Approaching staleness (8 days inactive, 0 hits). Drop candidate if still inactive at 4 weeks (Apr 14).

### actions/runner
- **Why:** CI/CD runtime we depend on — deprecation notices, new features, security fixes
- **Look for:** Node.js version deprecation timelines, runner image changes, new action features
- **Added:** 2026-03-20 (seed) | **Last deep:** 2026-03-24 | **Pattern hits:** 0
- **Notes:** Check releases, not just commits. Dependency bumps are usually noise. v2.333.0 (Mar 18). DAP server added (debugging protocol) — not actionable for our harness. SHA e17e7aa→9728019 (eslint dep bump, noise).

### withastro/astro
- **Why:** Web framework we use — security fixes, breaking changes, new features
- **Look for:** Security advisories, breaking changes in minor/major releases, new content collection features
- **Added:** 2026-03-20 (seed) | **Last deep:** 2026-03-24T20:21 | **Pattern hits:** 0
- **Notes:** Only actionable for security fixes or features that affect our site build. SHA a8a926e→b089b90: new commits, check for security fixes. Previous: React hydration fixes, ARIA role fix, host header validation. 0 harness patterns across 6+ deep-dives.

### verkyyi/tokenman
- **Why:** Self-reference — track forks, adopters, and how the scaffold is used
- **Look for:** New forks, adopter modifications, issues filed by users
- **Added:** 2026-03-20 (seed) | **Last deep:** never | **Pattern hits:** 0
- **Notes:** Used during HORIZON SCAN for adoption tracking.

## Watch List
<!-- Sources under evaluation. Promoted to Active or Dropped after 3+ observations over 7+ days. -->

### thedotmack/claude-mem
- **Why:** Session memory plugin (40K stars) — auto-captures sessions, AI-compresses context, injects relevance-filtered memory into future sessions
- **Look for:** Compression strategies, relevance filtering, context injection patterns, memory lifecycle management
- **Added:** 2026-03-23 (horizon scan) | **Observations:** 16 | **First seen:** 2026-03-23
- **Notes:** v10.6.2 active (Mar 21). SHA e2a2302 unchanged. Their compress-filter-inject pipeline is more sophisticated than our simple state/ read/write. Could improve how we manage project_state.md context.

### BloopAI/vibe-kanban
- **Why:** Agent management platform (24K stars) — PR-issue linking, multi-provider orchestration, kanban-style agent task management
- **Look for:** PR-issue linking automation, relay architecture, agent task queuing, multi-model coordination
- **Added:** 2026-03-23 (horizon scan) | **Observations:** 15 | **First seen:** 2026-03-23
- **Notes:** v0.1.36+, very active. SHA d9a2c4f unchanged. #3252 pins all GitHub Actions to commit SHAs for supply chain security (9 workflow files). #3240 isolates git2 behind GitService wrappers (clean dependency isolation, not adoptable for CLI-based harness). #3199 self-host improvements. Pattern hit: SHA pinning (covered by existing security issue).

### trailofbits/skills
- **Why:** Security-focused Claude Code skills (4K stars) from top security firm — audit workflows, vulnerability detection, semgrep rules
- **Look for:** Security audit skill structure, semgrep rule patterns, skill-improver tooling, SKILL.md format conventions
- **Added:** 2026-03-23 (horizon scan) | **Observations:** 15 | **First seen:** 2026-03-23
- **Notes:** Last commit Mar 17 (SHA 5c15f4f unchanged). 34 plugins with formal SKILL.md standard: YAML frontmatter (name, description, allowed-tools), structured sections (When to Use, When NOT to Use, Rationalizations to Reject, Anti-Patterns, Strictness Level). skill-improver: automated quality loop (Review->Categorize->Fix->Evaluate->Repeat) with Critical/Major/Minor severity. Codex compatibility layer. PR #123: cross-platform sidecar symlink distribution (.codex/skills/ backed by same plugin content, 61 symlinks via installer). Pattern hit: SKILL.md quality standard (issue #68).

### sickn33/antigravity-awesome-skills
- **Why:** Largest skill catalog (27K stars, 1309+ skills) — installable via CLI, bundles, multi-platform (Claude Code, Codex, Gemini CLI, Cursor)
- **Look for:** Skill packaging/distribution model, CLI installer patterns, bundle organization, cross-platform skill format
- **Added:** 2026-03-23 (horizon scan) | **Observations:** 22 | **First seen:** 2026-03-23
- **Notes:** SHA 2e12db8→b2f9600: star history chart update only, no content. NPX installer, bundles by role. Confirms direction of #66.

### volcengine/OpenViking
- **Why:** Self-evolving context database (18.4K stars) — unified context management (memory, resources, skills) via file system paradigm, hierarchical context delivery
- **Look for:** "ov doctor" diagnostic patterns, loop memory optimization, context/memory/loop separation, self-evolving architecture
- **Added:** 2026-03-23 (horizon scan) | **Observations:** 24 | **First seen:** 2026-03-23
- **Notes:** Very active. SHA 55a0c0e→0392e67. Circuit breaker validates #76. All recent: Python-specific (memory templating, security hardening). 0 harness patterns across 5+ observations.

### OthmanAdi/planning-with-files
- **Why:** Persistent markdown planning skill (16.9K stars) — Manus-style file-based planning for Claude Code
- **Look for:** SKILL.md format, planning file structure, state persistence patterns, i18n skill variants
- **Added:** 2026-03-23 (horizon scan) | **Observations:** 13 | **First seen:** 2026-03-23
- **Notes:** v2.29.0. SHA bb3a21a unchanged. Deep-dived: #115 adds analytics workflow templates (analytics_findings.md + analytics_task_plan.md) with phase-gated tasks, WHAT/WHY/WHEN self-documenting comments, and init-session script integration. Validates our markdown-as-memory approach. Uses SKILL.md format with i18n variants (zh-TW). Active community (115+ PRs).

### ruvnet/ruflo
- **Why:** Agent orchestration platform (24.2K stars, v3.5.42) — multi-agent swarms, hive-mind coordination, RAG, native Claude Code integration
- **Look for:** Hive-mind real status reporting, agent coordination patterns, security audit responses, MCP resilience
- **Added:** 2026-03-23 (horizon scan) | **Observations:** 13 | **First seen:** 2026-03-23
- **Notes:** SHA 0590bf2 unchanged. "hive-mind_status reads real agent state instead of hardcoded values" — agents report actual status. Security audit: SQL injection fixes in 9 queries. MCP server self-kill prevention on startup.

### SethGammon/Citadel
- **Why:** Agent orchestration harness (242 stars) — closest architecture to tokenman. Campaign persistence, parallel worktrees, circuit breaker, quality gate hooks
- **Look for:** Circuit breaker implementation, quality gate patterns, campaign persistence, fleet coordination, lifecycle hooks
- **Added:** 2026-03-24 (horizon scan) | **Observations:** 16 | **First seen:** 2026-03-24
- **Notes:** SHA 729f417→867a468. PR #21: install docs update (--plugin-dir method). PR #18: stale skill path fix. PR #17: plugin arch cleanup. Previous: PR #15 install docs, PR #14 unified triage. 26 skills, 3 agents, 10 hooks. PostToolUseFailure circuit breaker (3 failures → suggest alternative, 5 trips → hard stop). PreCompact/Restore-Compact for context preservation. Pattern hit: circuit breaker (issue #76). External-action-gate covered by #67. Recent activity: housekeeping only, 0 new patterns.

### anthropics/claude-plugins-official
- **Why:** Official Anthropic plugin directory (14.3K stars) — distribution channel for Claude Code plugins with standard format
- **Look for:** Plugin format updates, new submission requirements, plugin.json schema changes, new official plugins relevant to harness patterns
- **Added:** 2026-03-24 (horizon scan) | **Observations:** 14 | **First seen:** 2026-03-24
- **Notes:** SHA b10b583. Deep-dived 2026-03-25: iMessage channel plugin — first multi-channel with MCP integration, 808-line server, skills/access and skills/configure sub-skills. Bash-only permission preview UX (input_preview shown only for Bash, others get name+desc — constrained channel optimization). Flint plugin added (#974). Standard format: .claude-plugin/plugin.json + commands/ + agents/ + skills/. Installation via `/plugin install`. 15+ external plugins, 30+ internal. Distribution channel for #66. Pattern hit: 1 (official plugin format).

### vibeeval/vibecosystem
- **Why:** Comprehensive agent team (275 stars) — 119 agents, 208 skills, 49 hooks, 21 rules. Self-learning pattern where errors auto-become rules
- **Look for:** Self-learning implementation, session evaluation patterns, skill gateway for external catalogs, workflow routing
- **Added:** 2026-03-24 (horizon scan) | **Observations:** 12 | **First seen:** 2026-03-24
- **Notes:** SHA 717b2c1→d7e1fc5: new commits. Deep-dived 2026-03-25: v1.3 SaaS Skill Pack (6 new, 2 enriched — payment, auth, email, compliance, analytics, launch). "Security hardened after 3-agent parallel review (18 fixes applied)" — multi-agent quality gate for skill content. UPGRADING.md for version migration. v1.2 had Skill Gateway + Pyxel integration. evaluate-session.sh quantifies session outcomes. Self-learning pattern similar to our feedback-learner. Pattern hit: 1 (multi-agent review quality gate).

### agent-sh/agnix
- **Why:** CLAUDE.md/SKILL.md linter and LSP (103 stars) — validates AI coding assistant config files, autofixes, IDE plugins
- **Look for:** Validation rules for CLAUDE.md, SKILL.md format standards, CI integration patterns, autofix capabilities
- **Added:** 2026-03-24 (horizon scan) | **Observations:** 11 | **First seen:** 2026-03-24
- **Notes:** SHA 55adfcb. Rust. v0.16.5 (Mar 23). Active development (675+ PRs). Could validate our CLAUDE.md and SKILL.md files in CI or pre-commit hooks. Supports multiple formats: CLAUDE.md, AGENTS.md, SKILL.md, hooks, MCP configs.

### intertwine/hive-orchestrator
- **Why:** Markdown-native agent orchestration (14 stars) — closest architecture to tokenman. Git-native, GitHub Actions, markdown shared memory
- **Look for:** Markdown-as-memory patterns, vendor-agnostic coordination, hybrid retrieval, skills directory structure
- **Added:** 2026-03-24 (horizon scan) | **Observations:** 12 | **First seen:** 2026-03-24
- **Notes:** SHA 51494de unchanged. Python. v2.3.1. Very active (5 commits this week). Deep-dived: hybrid dense retrieval with LanceDB + FastEmbed + reciprocal rank fusion (#162) — not adoptable (no retrieval layer). Canonical skills/ dir with symlinks to .agents/.claude/.opencode (#159) — validates our #66 packaging. Corpus fingerprint guard (SHA-256 skip when docs unchanged). Sandbox propagation (#161). Low stars but architecturally most similar to tokenman.

## Dropped Sources
<!-- Removed sources with reason. Kept for history so we don't re-discover them. -->

### VoltAgent/awesome-claude-code-subagents
- **Dropped:** 2026-03-24 | **Reason:** 0 pattern hits over 11+ observation runs and multiple deep-dives. Content is framework-specific experts (Rails, Expo, FastAPI) — not harness patterns.

### godagoo/claude-code-always-on
- **Dropped:** 2026-03-23 | **Reason:** Inactive since 2026-02-03 (7+ weeks), no new patterns found

### humanlayer/humanlayer
- **Dropped:** 2026-03-23 | **Reason:** Inactive since 2026-01-07 (11+ weeks), no relevant patterns
