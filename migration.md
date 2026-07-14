# Chief of Staff → Agentic Rebuild: Migration Brief

**Purpose:** This document is the working brief for migrating `chief-of-staff-dashboard` from a batch pipeline with agent-themed UI into a genuinely agentic architecture — one that will later extend into a content operating system with additional agents (competitive intelligence, SERP monitoring, performance analysis, ideation).

**Audience:** Claude Code session driving the rebuild, plus future contributors.

---

## 1. Current-State Assessment

### What the system actually is today

A linear batch pipeline triggered by Vercel Cron at 7:00 AM UTC:

```
fetch (Adzuna + JSearch, parallel)
  → dedupe (by sourceId and company|role)
  → keyword score (hardcoded weights)
  → filter (min score, dealbreakers)
  → generate cover letters (sequential, sleep(2000) between calls)
  → upsert to MongoDB
```

### Known issues (in priority order)

1. **The four "agents" in `lib/cos-data.ts` are UI decoration.** Their system prompts are never sent to any LLM. Activity metrics ("214 listings scanned today", "accuracy: 96%") are hardcoded display data. The dashboard shows fiction.

2. **No LLM evaluates job fit.** The "Resume Scorer Agent" is `scoreJobKeywords()` in `pipeline.ts` — pure keyword matching (title 40pts, location 20, seniority 20, salary 20). The resume is never read during scoring.

3. **Only one LLM call exists** — cover letter generation in `generateCoverLetter()`, using `openai/gpt-4.1-nano`. The resume is truncated to 400 characters and the job description to 800–1000 characters in the prompt. Letters are written from stubs.

4. **The entire run lives inside one serverless function** (`maxDuration = 300`). Sequential letter generation with 2-second sleeps burns the budget. No retries, no partial recovery — a failure mid-run loses the remaining work.

5. **Cron is the only trigger.** No event triggers, no on-demand dispatch with orchestration. `POST /api/jobs/run` exists but calls the same fixed pipeline.

### What's worth keeping (do not rewrite these)

- **Data model** (`lib/actions.ts`): `DirectivesDoc`, `MatchDoc`, `CoverLetterEntry`, the status lifecycle (`New → Reviewing → Applied → Interviewing → Offer / Rejected / Not a Fit`), multi-resume support with `isDefault`, and the `breakdown[]` structure. This survives nearly untouched.
- **Job fetcher adapters** (`lib/job-fetcher.ts`): clean per-source functions, parallel fetch, source tagging. Keep the adapter pattern — it extends naturally to content sources later.
- **Dedup and actioned-status logic** in `pipeline.ts`: skipping only explicitly actioned jobs while re-scoring unactioned ones keeps the feed fresh. Keep this behavior exactly.
- **Auth** (better-auth) and the **UI shell**. The dashboard components can stay; they will simply start displaying real activity.

---

## 2. Target Architecture

### Core principle

Separate **triggers**, **orchestration**, and **execution**. Cron remains as one trigger among several; the fixed pipeline is replaced by an orchestrator that dispatches discrete tasks to real agents.

```
TRIGGERS                ORCHESTRATOR                 AGENTS (execution)
────────                ────────────                 ──────────────────
cron (daily digest)  →                            →  fetcher      (tool-based, no LLM)
webhook (future)     →   reads state,             →  evaluator    (LLM: full resume × full JD)
user action (UI)     →   decides what to enqueue, →  writer       (LLM: cover letters, TL posts)
agent follow-up      →   monitors task queue      →  [future content-OS agents]
```

### Components to build

**Task queue (DB-backed, no new infra).** A `tasks` collection in the existing MongoDB:

```typescript
type TaskDoc = {
  taskId: string
  userId: string
  type: "fetch_jobs" | "evaluate_job" | "write_cover_letter" | "generate_tl_post"
  payload: Record<string, unknown>
  status: "queued" | "running" | "done" | "failed"
  attempts: number
  maxAttempts: number        // default 3
  result?: Record<string, unknown>
  error?: string
  createdAt: Date
  updatedAt: Date
}
```

A worker endpoint claims queued tasks (findOneAndUpdate with status transition — atomic claim), executes, records results. Vercel Cron can tick the worker every minute; each tick processes a small batch, which sidesteps the 300-second ceiling entirely.

**Orchestrator.** Replaces `runJobPipeline()`. On the daily trigger: enqueue one `fetch_jobs` task per user. When fetch completes, the orchestrator enqueues `evaluate_job` tasks for each new job (parallelizable). Evaluations above threshold trigger `write_cover_letter` tasks. This is where agentic behavior lives: the orchestrator can enqueue follow-up work based on results rather than following a fixed script.

**Evaluator agent (the big quality win).** Two-stage scoring:

- *Stage 1 — keyword pre-filter:* the existing `scoreJobKeywords()` logic, kept as a cheap gate. Anything scoring below a floor never reaches the LLM. This is the right cost architecture.
- *Stage 2 — LLM evaluation:* full job description × full default resume × directives (dealbreakers, dream companies, salary floor). Returns structured JSON: `{ score: 0-100, verdict, reasoning, breakdown: [{label, met, note}] }`. Reuses the existing `breakdown` shape so the UI needs no changes.
- Use a capable model here (Claude Sonnet class, not nano-class). Evaluation quality is the product.

**Writer agent.** Cover letters get the full resume (not 400 chars) and full job description (not 800 chars). Add the thought-leadership post generation as a second task type on the same agent — it currently has no backend implementation at all.

**Agent registry.** Replace the static `agents[]` array in `cos-data.ts` with a DB-backed registry where each agent has: config, an actually-used system prompt, tool access, and real activity counters incremented by task completion. The dashboard reads live data.

---

## 3. Migration Plan (phased, each phase shippable)

**Phase 1 — Task queue + worker.** Add `tasks` collection, worker endpoint, atomic claim logic, retry with backoff. Wrap the existing pipeline stages as task types without changing their internals. *Outcome: same behavior, resilient execution, no more 300-second ceiling.*

**Phase 2 — Real evaluator.** Build the two-stage scorer. Run keyword filter and LLM evaluation side by side for a week (log both scores) to calibrate the threshold before cutting over. *Outcome: match quality transformed; scores mean something.*

**Phase 3 — Writer upgrades.** Full-context cover letters. Implement thought-leadership generation (currently UI-only). Model upgrade. *Outcome: output quality worth shipping.*

**Phase 4 — Orchestrator + live registry.** Replace fixed pipeline order with orchestrator dispatch. Wire agent registry to real counters. Add on-demand triggers from the UI ("re-evaluate this job", "write me a post about X"). *Outcome: genuinely agentic — system decides its own follow-up work.*

**Phase 5 — Content OS extension.** New agent types on the same framework: competitive intel (keyword-based content search), SERP monitor (event trigger source), performance analyst (report ingestion), ideation (works from the analyst's "working" list). Messaging docs, style guides, and banned-words list become a retrieval layer for the writer agent — same pattern as ServiceNow Content Studio. PM tool integration (Asana/Linear/Notion via API or MCP) lands here.

---

## 4. Decisions Needed Before Phase 1

1. **Product identity:** Is the content OS a Skribil feature, a separate product, or a personal tool? Affects multi-tenancy, auth scope, and where messaging docs live.
2. **LLM provider strategy:** Standardize on Anthropic API, keep the Vercel AI SDK abstraction (recommended — it already supports provider swapping), or mix by task type?
3. **Deploy target:** Stay on Vercel (fine with the queue design) or move the worker to something with longer-lived compute?
4. **JSearch/RapidAPI plan:** Pipeline comments note JSearch needs a Pro plan. Decide whether to upgrade or drop the source.

---

## 5. Ground Rules for the Rebuild

- Preserve the data model and status lifecycle. UI components should keep working against the same document shapes.
- Every phase ships independently. No big-bang rewrite.
- No mock data, no placeholder metrics. If an agent displays a number, a real task incremented it.
- Evaluation prompts and writer prompts live in versioned files, not inline strings — they are product surface area and will be iterated on.
- Log both scoring systems during Phase 2 before trusting the new one.