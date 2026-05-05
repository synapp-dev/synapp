---
name: grill-me
description: >-
  Interviews the user relentlessly about a plan or design until reaching shared
  understanding, resolving each branch of the decision tree. Use when the user
  wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# grill-me

## Operating mode

Interview the user relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

## Procedure

1. **Anchor the artifact** — Confirm what is being grilled (spec, ADR, feature plan, UI design, migration, etc.). If unclear, ask one clarifying question only.

2. **Build a mental decision tree** — Identify branches (data model, APIs, UX states, failure modes, rollout, ownership, constraints). Order questions so earlier answers do not invalidate later ones.

3. **One question per turn** — Single focused question, then stop and wait for the user. Include a concise **Recommended:** line with your default answer and one-line rationale.

4. **Codebase over questions** — When the answer is knowable from the repo (existing patterns, schema, env flags, similar features), search/read files first; then state what you found and ask only if ambiguity remains.

5. **Close the loop** — After each answer, mark that branch resolved (mentally or briefly in prose) and move to the next dependency. When all branches are covered, summarize shared understanding in a short numbered list.

## Question quality

- Prefer concrete tradeoffs ("A vs B given constraint X") over vague prompts.
- Call out inconsistencies with what the user said earlier or with code you inspected.
- Do not batch multiple questions in one message.
