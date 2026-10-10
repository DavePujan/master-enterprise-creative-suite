---
description: Discover and document the entire current repository as a complete, evidence-backed Product Requirements Document (PRD), with feature inventory, traceability, assumptions, and open questions. Does not modify application code.
---

# Generate a Full-Project PRD

When the user invokes `/generate-prd`, inspect the current workspace and produce a complete, evidence-backed PRD for the whole project—not just the currently open file, a single feature, or the frontend.

## Mission and hard constraints

1. Treat the repository as the primary source of truth. Inspect documentation, source code, routes, UI, server/API logic, schemas and migrations, tests, configuration, deployment files, integrations, and Git history where available.
2. Do not implement features, refactor code, install packages, run migrations, deploy services, change environment variables, or modify application behavior. This is a read-only discovery/documentation task, except for creating or updating the PRD artifacts listed below.
3. Never copy secrets, access tokens, private keys, credentials, real customer data, or `.env` values into the report. You may record the names of configuration keys and describe their purpose if it can be established safely.
4. Never invent product behavior, users, business goals, metrics, API contracts, security guarantees, SLAs, or feature intent. Every material claim must be labelled as one of: **Verified** (direct repository evidence), **Inferred** (reasonable interpretation of evidence), **Proposed** (a recommendation, not current behavior), or **Unknown** (not established).
5. Separate **current implemented behavior** from **desired/future requirements**. Code proves what appears to be implemented; it does not automatically prove that the behavior is intended, complete, secure, or correct.
6. Use exact file paths and line numbers where available as evidence. When a claim has multiple sources, cite the strongest source and note any contradictory source. Do not claim a file, feature, or test is absent until the relevant scope has been searched.
7. Do not ask the user to explain the project before beginning. Make the best evidence-backed pass first. Record unresolved business decisions in `OPEN_QUESTIONS.md` instead of guessing.
8. If the repository is large, analyze it in bounded areas and maintain a coverage checklist. If subagents are available, delegate independent read-only areas (for example frontend, backend/data, infrastructure/security, and tests/docs) and reconcile their findings. Do not depend on subagents being available.

## Phase 1 — Establish repository boundaries

- Confirm the workspace root, Git root if present, current branch, and `git status` without changing anything.
- Identify workspaces, apps, packages, services, shared libraries, scripts, infrastructure, and generated directories.
- Inspect root documentation and project manifests first: README files, package manifests and lockfiles, `pyproject.toml`, `Cargo.toml`, `go.mod`, solution/project files, Docker/Compose files, CI configuration, and similar manifests as applicable.
- Build a repository map. Exclude dependency caches and generated output such as `node_modules`, `.git` internals, build/dist output, coverage, vendor caches, and compiled assets from routine source inspection; do not mistake these exclusions for unreviewed product modules.
- Inspect `.env.example` or equivalent templates only for key names and documented purposes. Do not print or copy secret values from local environment files.
- Record the repository revision or commit hash if available so the PRD’s evidence basis is clear.

## Phase 2 — Build a complete project inventory

Create a checklist of every first-party application, package, subsystem, and relevant operational area. Inspect each area, rather than assuming a framework or package manifest describes the whole product.

Inspect the applicable areas: frontend routes/layouts/components/forms and UI states; auth/accounts/roles/permissions/tenancy; server entry points, APIs, validation/errors and jobs; data models, relations, indexes, migrations, seeds and lifecycle; external providers (payments, email/SMS, storage, AI, webhooks, analytics, queues); uploads, search, reporting, notifications, admin and exports; deployment, environments, CI/CD, observability, backups and recovery; tests/fixtures/mocks, docs/changelogs, and relevant Git history.

For each discovered feature, capture: stable feature ID; user or system actor; purpose; entry point; expected flow; alternate/error states; inputs and outputs; permissions; data affected; dependencies/integrations; evidence; implementation status; confidence; and notable gaps. Mark a feature as unverified where source evidence is insufficient.

## Phase 3 — Reconstruct product behavior

Trace important flows end-to-end: user entry point → UI/action → client state/API call → server behavior → persistence/external provider → response/error state. Do not infer an entire flow from a button label alone.

- Read relevant files deeply enough to understand behavior; use search for discovery, then open source for context.
- Identify duplicated, legacy, dead-looking, disabled, mocked, scaffolded, or partially implemented areas. Describe the evidence, and avoid declaring code dead solely because it has few references.
- Compare UI, API, schema, tests, and docs for mismatches. Note contradictions explicitly.
- Inspect test coverage and assertions to understand expected behavior, while making clear that passing tests do not prove all production behavior.
- Summarize confirmed user journeys and system workflows, including success, validation, empty, loading, failure, permission-denied, and recovery paths where evidenced.

## Phase 4 — Derive requirements without fabricating intent

Organize requirements by capability and end-to-end user journey. Assign stable IDs:
- `FR-001...` functional requirements
- `NFR-001...` non-functional requirements
- `DATA-001...` data/privacy/retention requirements
- `INT-001...` integration/API requirements
- `SEC-001...` security/permissions requirements
- `OPS-001...` operational/deployment/observability requirements

Every requirement must include a statement, rationale, actor/scope, evidence or origin, classification (Verified / Inferred / Proposed / Unknown), priority, dependencies, and testable acceptance criteria. Use Given/When/Then where practical. Requirements that describe existing behavior must be marked as current-state requirements; proposed product improvements must be separated into a clearly labelled recommendations/backlog section.

Priority rules:
- Use P0/P1/P2/P3 only when priority is supported by explicit product evidence or an obvious release blocker; otherwise use `TBD — stakeholder decision`.
- Do not equate usage in code with business importance.
- If a requirement lacks a measurable performance, availability, accessibility, or capacity target, state what is known and list the missing target as an open question. Do not make up numbers.

## Phase 5 — Write the PRD

Create or update these outputs. Inspect existing files first, merge useful content, preserve unrelated user-authored material, and avoid blind overwrites or duplicate docs.

### A. `docs/product/PRD.md` — primary deliverable

Include these sections, using “Not established from repository evidence” where necessary:

1. Metadata: project/revision/date/status/evidence limitations; executive summary, product purpose, problem and users (label inferences).
2. Vision, business goals, outcomes, non-goals, scope, assumptions and constraints. Never invent KPIs or business intent.
3. Stakeholders/personas, roles and permissions; distinguish evidence from assumptions.
4. System/context architecture, applications/services, boundaries, dependencies and integrations. Use Mermaid only for evidenced relationships.
5. Feature inventory by module and journey, including implementation status, evidence and gaps; key user/system flows plus alternate/error paths.
6. Functional requirements with stable IDs and testable acceptance criteria.
7. Data model, ownership, validation, privacy/retention/deletion and migration requirements.
8. APIs/integrations, contracts, external dependencies, failure/retry behavior.
9. Security, authorization, tenant isolation, privacy and abuse/risk; separate observed controls from unknowns.
10. NFRs (performance, availability, scale, accessibility, usability, maintainability, compatibility, localization, reliability); separate explicit targets from unknowns.
11. Analytics/observability/auditability, backups/recovery, operations, UX/design constraints and UI states.
12. Dependencies, risks, edge cases, known debt, tentative release/readiness checklist, high-impact open decisions, glossary and traceability.

For unsupported sections, state `Not established from repository evidence`; do not silently omit them.

### B. `docs/product/PROJECT_INVENTORY.md`

Include the project map and a coverage matrix of every first-party app/package/service/major subsystem, the evidence inspected, and analysis status (`Reviewed`, `Partial`, `Not applicable`, or `Blocked`). Include important entry points and integration/data boundaries. A full-project PRD cannot be called complete if material areas are silently skipped.

### C. `docs/product/REQUIREMENTS_TRACEABILITY.md`

Create a Markdown table mapping every FR/NFR/DATA/INT/SEC/OPS ID to its module, evidence paths and line references, current implementation status, related tests (if any), acceptance criteria, and confidence/classification. Clearly mark requirements with no supporting test found as `No test evidence found in reviewed test scope`, not as failing.

### D. `docs/product/OPEN_QUESTIONS.md`

Record unknowns, contradictions, assumptions, and stakeholder decisions needed. For each item include impact, why repository evidence cannot resolve it, the best focused question, and a suggested default only when safe. Distinguish product decisions from facts that could be resolved by more repository inspection.

## Phase 6 — Quality audit and completeness gate

Before finishing, validate the deliverables against this checklist:

- [ ] Every first-party app, package, service, and relevant operational subsystem in the inventory has a recorded review status.
- [ ] The PRD covers the product end-to-end, not only the visible UI or root README.
- [ ] Every major feature claim has evidence or an explicit inference/unknown label.
- [ ] Current implementation, intended requirements, and proposed improvements are clearly separated.
- [ ] Requirement IDs are unique and traceability references resolve to the PRD.
- [ ] Acceptance criteria are observable and testable, not vague statements such as “works correctly”.
- [ ] UI, API, schema, test, and documentation conflicts are captured.
- [ ] Security and non-functional sections distinguish verified controls/targets from unknowns.
- [ ] No secrets or private user/customer data have been copied into docs.
- [ ] Existing docs were inspected and merged responsibly; application code was not changed.
- [ ] Coverage limitations, blocked areas, and unresolved business questions are disclosed.

If a check fails, correct the documentation or mark the reason transparently. Do not claim complete repository coverage if any material area remains partial or blocked.

## Final response

After writing the artifacts, provide a concise summary containing:
- Paths to each created/updated document.
- Project areas reviewed and any areas blocked or only partially reviewed.
- The number of requirements by category where countable.
- The most consequential uncertainties or product decisions.
- A clear completion status: `Complete from available evidence`, `Partially complete`, or `Blocked`.

Do not implement or fix any product issues discovered during this workflow; document them as requirements, risks, or open questions.
