# 10 — Game Design: Brand Inputs & Warmup Phase

## Overview

When a player opens a challenge they enter a **warmup phase** before any question is shown. The warmup exists to guarantee a minimum brand-study period so that skill, not reflexes, determines scores.

---

## Warmup Duration

| Constant | Value | Defined in |
|---|---|---|
| `WARMUP_MIN_SECONDS` | **20 s** | `packages/stellar/src/constants.ts` (canonical) |
| Web re-export | 20 s | `apps/web/src/components/game/constants.ts` |

> **Single source of truth**: Both the API server (`apps/api/src/routes/sessions.ts`) and the web client (`apps/web/src/components/game/warmup-phase.tsx`) import `WARMUP_MIN_SECONDS` from their respective package boundaries. The values **must** be kept identical; change the canonical constant in `packages/stellar/src/constants.ts` first, then update the web re-export in `apps/web/src/components/game/constants.ts`.

### Server enforcement

`POST /sessions/:challengeId/warmup-start` stores `unlockAt = Date.now() + WARMUP_MIN_SECONDS * 1000` in Redis with a 5-minute TTL.

`POST /sessions/:challengeId/warmup-complete` reads `unlockAt` and returns **HTTP 400 + `remainingMs`** if the minimum has not elapsed. The client displays the remaining time and prevents the player from retrying early.

### Client unlock

`WarmupPhase` mounts a `setTimeout(WARMUP_MIN_SECONDS * 1000)` that flips `unlocked → true` and enables the **Start Challenge →** button. The `CountdownTimer` component drives the visible countdown from `WARMUP_MIN_SECONDS` to `0`.

---

## Brand Inputs displayed during warmup

The `Challenge` object passed to `WarmupPhase` may contain any combination of the following fields:

| Field | UI element | Required? |
|---|---|---|
| `brand_name` | `<h1>` heading | ✅ always shown |
| `logo_url` | `<Image>` (120 × 120 px) | optional — hidden when absent |
| `tagline` | `<p>` below heading | optional — hidden when absent |
| `primary_color` | gradient start + button background | optional — falls back to `var(--primary)` |
| `secondary_color` | gradient end | optional — falls back to `var(--background)` |
| `pool_amount_usdc` | prize-pool label at bottom | ✅ always shown |

---

## Changing the warmup duration

1. Update `WARMUP_MIN_SECONDS` in `packages/stellar/src/constants.ts`.
2. Update the matching export in `apps/web/src/components/game/constants.ts`.
3. Update the row in the table above.
4. Re-run Vitest (`pnpm test`) and Playwright (`pnpm e2e`) — both suites test the exact constant value.

---

## Test coverage

| Layer | File | What is tested |
|---|---|---|
| Vitest (unit) | `apps/web/src/components/game/warmup-phase.test.tsx` | Counts down from `WARMUP_MIN_SECONDS`; button disabled until zero; unlock enables button |
| Playwright (e2e) | `e2e/tests/game.spec.ts` | Button disabled at page load; enabled within `WARMUP_MIN_SECONDS + 5 s` |
