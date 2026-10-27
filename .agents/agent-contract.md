# School OS agent working contract

This contract applies to every coding, review, planning, and integration agent working on
School OS. Role charters in `.agents/roles/` add domain-specific requirements; they do not
override this contract.

The standard is senior engineering behavior: understand the system before changing it, make
small and reversible decisions, protect existing contracts, prove the result with evidence, and
communicate risk early. A fast diff is not a successful delivery.

## Identity and authority

Every agent session must have all of the following before work begins:

- one role from `.agents/roles/`;
- one board card with an assignee, scope, acceptance criteria, and validation plan;
- one branch and worktree for implementation work;
- one named reviewer who is not the implementation agent.

Existing cards created before this contract are grandfathered while another agent is actively
working on them. Add the new metadata when claiming or materially changing one; do not rewrite an
active agent's card just to normalize its format.

The role defines the agent's mission, owned paths, non-owned paths, decisions it may make, and
the checks it must run. The board card defines the specific change. The card's scope is the
write boundary for that task, even when the role owns a broader area.

Agents may read broadly to understand dependencies. They may write only to the card scope and
explicitly approved shared paths. Git worktrees isolate branches; they do not grant permission to
edit every file in the repository.

New implementation work uses WTP as described in `.agents/worktrees.md`. The shared `main`
worktree is integration-only. Existing work that began on `main` may finish there during the
migration window, but it must not be mixed with a newly claimed card.

## Non-negotiable rules

1. Read the root `AGENTS.md`, `.agents/README.md`, this contract, the assigned role, and the
   relevant board card before editing.
2. Read the current source of truth before making a decision. This includes
   `apps/docs/content/docs/backend-api.mdx` before consuming or changing a NestJS API.
3. Claim the card before coding. Do not start untracked implementation work.
4. Make the smallest complete change that satisfies the card. Do not include drive-by cleanup,
   unrelated refactors, or speculative features.
5. Do not change another team's scope. Raise a card or request explicit owner approval when a
   dependency is discovered.
6. Never report a check as passed unless it was actually run. Report environment failures and
   blockers plainly.
7. Handle errors explicitly. Do not leave silent catches, placeholder behavior, fake success
   states, or untracked `TODO`/`FIXME` work in the delivered path.
8. Stage explicit paths only. Never use `git add -A` or `git add .` in a shared repository.
9. Do not commit secrets, `.env` files, build output, generated caches, or another agent's
   changes.
10. Implementation agents and reviewers must not merge or push another agent's work. The PM is a
    controlled exception only when the human product owner explicitly approves the integration
    and every PM integration gate is satisfied: independent review of the exact commits, required
    CI and validation evidence, a clean target worktree, a recorded merge order, and no unresolved
    conflicts. The PM must not waive those gates, force-push, reset or delete unmerged work, or
    resolve unrelated conflicts silently.

## Senior engineering bar

The implementation must demonstrate the following where relevant:

- **System understanding:** explain the affected boundary, data flow, and compatibility impact.
- **Scope discipline:** the diff contains only the card's work and approved shared changes.
- **Correctness:** invariants, edge cases, failure paths, and concurrency behavior are handled.
- **Security and privacy:** auth, authorization, input validation, secrets, logging, and user
  isolation are considered rather than assumed.
- **Maintainability:** names, module boundaries, interfaces, and tests make the next change
  safer.
- **Operational readiness:** configuration, migrations, timeouts, observability, and rollback
  implications are addressed for production-facing work.
- **Proof:** tests, type checks, lint, builds, screenshots, or other relevant verification are
  attached to the card.
- **Communication:** decisions, assumptions, blockers, and follow-up work are explicit.

When a requirement is unclear, the senior response is to state the ambiguity, choose the safest
reasonable interpretation, and record the decision. Quiet guessing is not acceptable.

## Work protocol

### Before implementation

1. Read the required instructions and role charter.
2. Read the card, linked docs, related cards, and relevant notes.
3. Inspect the current implementation and tests before proposing a fix.
4. Confirm the card's allowed paths, dependencies, and definition of done.
5. If the scope is wrong or the contract is missing, stop and raise a clarification card.

For a new implementation card, create the role worktree before editing:

```bash
wtp add -b agent/<role>/<card-slug> main
```

### During implementation

1. Keep changes inside the declared scope.
2. Prefer existing patterns and shared primitives over new parallel abstractions.
3. Preserve public contracts unless the card explicitly changes them.
4. Add or update tests for changed behavior and failure paths.
5. Update the source of truth in the same change when the implementation changes it. Backend API
   changes must update `apps/docs/content/docs/backend-api.mdx` and its changelog.
6. Keep local service ports unique and record them on the card.
7. Report blockers as soon as they affect the delivery plan.

### Before completion

1. Inspect the changed-file list against the card scope.
2. Run the role's required checks and the card's validation commands.
3. Review the final diff for unrelated changes, dead code, secrets, and missing error paths.
4. Record evidence in the card and request independent review.
5. Move the card to `done/` only after the resolution, commit, and review state are recorded.

## Completion evidence

Every implementation card must record:

```text
Changed:
- exact files, modules, or paths

Validation:
- command: result

Contract impact:
- none, or the linked API/schema/design update

Review:
- reviewer and outcome

Commit:
- commit hash
```

An honest blocked report is valid progress. A card is not complete merely because code exists,
the agent ran out of time, or the happy path works locally.

## Violation taxonomy

Use observable evidence and link the violation to a card or commit. Do not label an agent
"lazy"; record the behavior that failed.

### V0 — expected delivery issue

The agent encounters a genuine blocker, environment failure, unclear requirement, or valid
technical dead end and reports it with evidence. This is not misconduct. Reassign, clarify, or
split the work as appropriate.

### V1 — correctable process defect

Examples:

- missing card resolution details;
- missing validation evidence;
- formatting, lint, or type errors caught before merge;
- documentation or changelog omission caught in review.

Action: correct before merge and record the follow-up.

### V2 — serious scope or quality violation

Examples:

- editing outside the card scope without approval;
- ignoring an existing contract or role boundary;
- adding unrelated changes or speculative refactors;
- repeating a V1 defect after explicit feedback;
- marking work done while required checks are missing;
- introducing a regression that reasonable tests should have caught.

Action: return for rework, require mandatory review, and record the evidence.

### V3 — critical trust or safety violation

Examples:

- claiming tests or implementation were completed when they were not;
- committing secrets or sensitive data;
- destructive changes without authorization;
- bypassing required review or merging directly to `main`;
- repeated V2 behavior after remediation.

Action: remove coding or merge authority, move the agent to review-only or planning-only mode,
and require a human decision before reactivation.

## Remediation and performance review

One mistake does not define an agent. Review trends across several cards using evidence:

- scope violations per completed card;
- percentage of cards with complete validation evidence;
- review rework and regression rate;
- repeated defects after feedback;
- honest blocker and escalation quality;
- documentation and contract compliance;
- unrelated changes or duplicate work.

Recommended response:

1. First occurrence: fix the work and explain the cause.
2. Repeated similar occurrence: narrow the scope and require a named reviewer before coding.
3. Continued occurrence: suspend implementation authority and use the agent for analysis or
   review until the role instructions or assignment are changed.

The goal is reliable delivery, not a speed leaderboard. Agents are rewarded for sound decisions,
clear proof, and safe handoffs.

## Cross-scope handoff

When work crosses ownership boundaries:

1. Keep the current branch within its declared scope.
2. Raise a card addressed to the owning role with the required interface, evidence, and urgency.
3. For a coordinated slice, create one parent slice and separate child cards per owner.
4. If an atomic change truly requires multiple owners, list every path and required reviewer on
   the card before implementation begins.
5. Do not use a broad role such as "lead" or "PM" as permission to bypass ownership.

## Contract maintenance

Changes to this contract, role charters, or ownership rules are coordination changes. They
require human approval and should be reviewed separately from product implementation. The future
AI-native PM tool should consume these files rather than replace them as the only source of
project policy.
