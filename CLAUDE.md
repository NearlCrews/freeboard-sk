# Open Binnacle: AI assistant operating rules

Open Binnacle is the rebranded fork of [SignalK/freeboard-sk](https://github.com/SignalK/freeboard-sk). User-facing identity (README, manifest, app title, admin-UI displayName, icon) and the npm package name (`signalk-open-binnacle`) have moved to the new brand. The repo directory and the GitHub repo URL still use the legacy `freeboard-sk` identifier until the coordinated rename lands. After moving the directory to `signalk-open-binnacle`, the user must also update `~/.signalk/package.json` to `"signalk-open-binnacle": "file:../path/to/signalk-open-binnacle"`, `rm -rf ~/.signalk/node_modules/@signalk/freeboard-sk`, run `npm install` in `~/.signalk`, and restart the Signal K server.

This file is the source of truth for project-scoped AI assistant rules. User-global memory does not always load reliably across worktrees or fresh clones; rules that came at the cost of redoing work live here.

## Modernization context

This fork is on a 9-phase modernization track. The authoritative plan is `MODERNIZATION_ROADMAP.md` at the repo root. Phase 0 (CI floor) shipped on 2026-05-25 as commit `3c1060ca`. Phase 1 through Phase 8 follow: strict TypeScript, zoneless signals, Tailwind/CDK, perf budgets, worker isolation, bundle/code-split, a11y/Lighthouse, schema-driven Signal K codegen.

The user explicitly granted autopilot for the full plan: each implementation gate runs a 6-expert team; each gate ends with a 3-expert /simplify pass; every finding gets fixed including low and nit; a SignalK expert is on every gate.

## Pi memory budget: ONE heavy verification at a time

This is a Raspberry Pi 5 (8 GB RAM + 2 GB swap, 4 cores). Concurrent heavy verification commands will OOM-kill the session.

**Heavy commands (1.5 to 2.5 GB peak each, full TS program graph or Angular compiler):**

- `pnpm typecheck` (tsc -p tsconfig.app.json)
- `pnpm typecheck:strict` (tsc via the wrapper)
- `pnpm lint`, `pnpm lint:baseline`, `pnpm lint:baseline:seed` (typed eslint over `src/**/*.ts`)
- `pnpm test` (Vitest 4 + Angular TestBed under jsdom)
- `pnpm build`, `pnpm build:web`, `pnpm build:all` (ng build, esbuild + Angular compiler)

**Light commands (parallel-safe):**

- `pnpm cruise`
- `pnpm size-limit` (file preset, bytes-only)
- `node tools/check-god-components.mjs`
- `pnpm exec eslint <single-file>`
- `wc -l`, `ls`, `git diff`, `grep`, `find`

**Rule:** Never run more than one heavy command at a time, whether by the lead or by spawned agents.

Why: on 2026-05-25 three agents running typecheck plus lint:baseline plus test plus build:all in parallel OOM-killed the session within seconds. Memory pressure went from 3 GB baseline to past the 8 GB ceiling almost immediately.

## Autopilot team policy

For each implementation phase (Phase 1 through Phase 8):

1. Spawn a 6-expert team with at least one SignalK expert.
2. Run agents in a **hybrid 2-parallel + verifier rotation**: spawn 2 edits-only agents at a time, then the lead runs the heavy verification chain once, then the next 2, and so on. Three batches per gate.
3. After the gate's implementation lands, spawn a 3-expert /simplify team (3-parallel edits-only is fine because /simplify agents don't need to run heavy verification).
4. Fix every /simplify finding including low and nit. The only acceptable skip is "factually refuted" or "by design after honest technical scrutiny", with a one-line reason.
5. Commit, then move to the next phase.

**Agent prompts must explicitly forbid the heavy commands above.** Treat this as a non-optional clause. Agents do edits, the lead does verification.

**Belt and suspenders:** prefix individual heavy invocations with `NODE_OPTIONS="--max-old-space-size=2048"` so OOM-killer hits a single runaway process instead of swap-thrashing the whole session.

## Style rules (override defaults)

- **No em dashes (—)** anywhere: prose, file content, comments, commit messages, PR descriptions. Use colons, commas, or two sentences. Brief subagents on the same rule.
- **Always Oxford commas** in lists of three or more items.
- **Default to no comments.** Keep only non-obvious WHY comments. Delete WHAT comments.
- **Fix every review finding, all severities** (high, medium, low, and nit). Only skip factually refuted or by-design items, with a one-line reason.

## Branching

- Local `master` is the test target: the running signalk-server loads the project from `file:../src/freeboard-sk` (will become `file:../src/signalk-open-binnacle` after the coordinated directory rename) so changes must reach `master` to be tested live.
- One narrow branch per upstreamable change so each PR to `SignalK/freeboard-sk` stays single-concern for the upstream maintainer (panaaj).
- The modernization fork is its own branch family rooted at `chore/phase-0-floor` and onward.

## Agent team shutdown (tmux)

When shutting down agent teammates:

1. `shutdown_request` must be sent as a **structured object**, not a JSON string. Sending the string form is a silent no-op and leaves the tmux pane dangling.
2. After shutdown_response, verify the pane closed: `tmux list-panes -a -F '#{pane_id}'` and confirm the agent's `tmuxPaneId` is no longer listed. If a pane lingers, `tmux kill-pane -t %ID`.
3. Then `TeamDelete`. If the team config still marks an agent active, force `isActive: false` and kill the pane in the same step before TeamDelete.
