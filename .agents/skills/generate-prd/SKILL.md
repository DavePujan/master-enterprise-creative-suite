---
name: generate-prd
description: Generate a complete, evidence-backed Product Requirements Document for the entire current repository. Analyze frontend, backend, data, integrations, security, operations, tests, and docs; create a feature inventory, requirements traceability, and open questions. Use when documenting an existing project or preparing it for planning, handover, audit, or redevelopment.
---

# Generate a Full-Project PRD

Inspect the current workspace and produce a complete PRD for the whole project—not just the currently open file, a single feature, or the frontend.

## Non-negotiable rules

- Repository evidence is the primary source of truth. Inspect project docs, source, manifests, routes, APIs, schemas/migrations, tests, configuration, integrations, deployment, and Git history where available.
- This is a read-only product-discovery task, aside from creating/updating the documentation outputs below. Do not implement features, refactor code, install dependencies, run migrations, deploy, modify configuration, or change product behavior.
- Never copy secrets, tokens, keys, credentials, `.env` values, or private customer data into documents. Environment templates may be used to identify key names only.
- Do not invent product behavior, business goals, personas, metrics, API contracts, SLAs, security claims, or feature intent. Tag material claims as **Verified**, **Inferred**, **Proposed**, or **Unknown**.
- Keep current implemented behavior separate from future requirements and recommendations. Code evidence does not by itself prove intended behavior or correctness.
- Cite evidence with exact file paths and line numbers when available. Search broadly before claiming something is missing. Record conflicts and unresolved questions rather than silently resolving them.
- Begin immediately; do not block on an interview. Record questions that require stakeholder input.
- If useful subagents are available, assign independent read-only areas (frontend, backend/data, security/infrastructure, tests/docs) and reconcile their reports. Otherwise perform the same coverage systematically yourself.

## 1. Map the repository

Confirm workspace/Git root, branch and `git status` without altering anything. Identify monorepo boundaries, every first-party app/package/service, shared libraries, scripts and infrastructure. Start with README files, manifests, lockfiles, architecture/docs, Docker/Compose, CI, environment templates, and deployment configuration. Exclude generated output/dependency caches from routine source review, but keep an explicit list of excluded directories. Never read or reproduce actual secret values. Record a revision/commit hash when available.

## 2. Review every product area

Create a coverage checklist and inspect all material areas. Discover applicable items from this list rather than assuming all projects share one stack:

- UI routes/pages, navigation, layouts, major components, forms, responsive behavior and UI states.
- Personas/roles, sign-in, account lifecycle, authorization, permissions and tenant boundaries.
- Server entry points, endpoints, payload schemas, middleware, validation, errors and background jobs.
- Tables/collections, relations, indexes, migrations, seeds, data lifecycle, retention/deletion and ownership.
- External providers, payment, email/SMS, storage, AI/models, webhooks, analytics, queues and integrations.
- Uploads/downloads, search, reports, notifications, admin, audit logs and exports.
- Deployment, environments, CI/CD, runtime configuration, monitoring, backups and recovery.
- Tests, fixtures, mocks, docs, changelogs and relevant Git history.

For every feature, record its stable ID, actor, purpose, entry point, flow, edge/error states, inputs/outputs, permissions, data affected, integrations/dependencies, evidence, status, confidence and gaps.

## 3. Trace end-to-end behavior

Follow key journeys from entry point through UI/client action, API request, server logic, persistence or external provider, response and failure handling. A button label or route name alone is not proof of an implemented flow. Identify mock/scaffold/partial/legacy or potentially unused code carefully; do not label code dead without strong evidence. Compare UI, API, schema, tests, and docs for mismatches. Tests are evidence of expectations, not proof of complete production correctness.

## 4. Derive traceable requirements

Use stable unique IDs: `FR-001...` functional; `NFR-001...` non-functional; `DATA-001...` data/privacy/retention; `INT-001...` integrations/APIs; `SEC-001...` security/permissions; `OPS-001...` operational/deployment/observability.

Each requirement needs a statement, rationale, actor/scope, evidence/origin, Verified/Inferred/Proposed/Unknown classification, priority, dependencies and observable acceptance criteria (prefer Given/When/Then). Mark whether it describes current behavior or a proposed future state. Use P0/P1/P2/P3 only where evidence supports priority; otherwise use `TBD — stakeholder decision`. Do not invent performance, availability, capacity or accessibility targets; record missing thresholds as open questions.

## 5. Create or responsibly update these files

Inspect any existing target files first. Merge useful existing content instead of blindly overwriting it, preserve unrelated user-authored documentation, and do not duplicate documents unnecessarily.

### `docs/product/PRD.md` — primary document

Include:
1. Metadata: project/revision/date/status/evidence limitations.
2. Executive summary, product purpose, users and problem; label inferred claims.
3. Vision, goals, outcomes and non-goals; never invent missing KPIs.
4. Stakeholders, personas, roles, permissions, assumptions and confidence.
5. Scope: evidenced capabilities, not-evidenced scope, non-goals and proposed future work.
6. System/context architecture and boundaries; use Mermaid only for evidenced relationships.
7. Feature inventory by module and journey, implementation status, evidence and gaps.
8. User journeys and system workflows, including alternate and error paths.
9. Functional requirements with IDs and testable acceptance criteria.
10. Data entities/relationships, ownership, validation, lifecycle, privacy, retention and migrations.
11. External APIs/integrations, contracts, provider dependencies, retries and failure behavior.
12. Security, permissions, tenant isolation, privacy and abuse/risk; separate observed controls from unknowns.
13. NFRs: performance, availability, scalability, accessibility, usability, maintainability, compatibility, localization and reliability. Clearly separate explicit targets from unknown targets.
14. Analytics, observability, auditability, backups, recovery and operational needs.
15. UX/design constraints: screens, routes, navigation, responsive behavior, validation, empty/loading/error states and accessibility evidence.
16. Dependencies, constraints, risks, edge cases and known product/technical debt.
17. Release/readiness checklist; roadmap sequencing only where supported.
18. Open decisions/questions, ordered by impact.
19. Glossary and traceability references.

For unsupported sections, state `Not established from repository evidence`; do not silently omit them.

### `docs/product/PROJECT_INVENTORY.md`

Show the repository/project map, important entry points and integration/data boundaries, plus a coverage matrix for every first-party app/package/service/major subsystem with evidence inspected and status: `Reviewed`, `Partial`, `Not applicable`, or `Blocked`. Do not claim full coverage if material areas remain partial or blocked.

### `docs/product/REQUIREMENTS_TRACEABILITY.md`

Map each requirement ID to module, evidence paths/line references, implementation status, related tests (if any), acceptance criteria and classification/confidence. If no related test was located in the reviewed scope, say `No test evidence found in reviewed test scope`; do not call it a failing test.

### `docs/product/OPEN_QUESTIONS.md`

Record unknowns, contradictions, assumptions and stakeholder decisions. For each include impact, why repository evidence cannot settle it, one focused question, and a safe suggested default only when appropriate. Separate product decisions from questions resolvable through more inspection.

## 6. Audit before finishing

Verify: every material repository area has a review status; the PRD spans the whole product; claims have evidence or labels; current implementation is separate from proposed scope; IDs are unique and traceable; acceptance criteria are testable; UI/API/schema/test/doc conflicts are captured; security/NFR statements distinguish known from unknown; no secrets/private data are included; existing docs were merged responsibly; no application code changed; limitations are disclosed. Fix documentation gaps or explain them explicitly.

## Final response

Summarize output paths, reviewed and partially reviewed areas, requirement counts if countable, important unresolved decisions, and one overall status: `Complete from available evidence`, `Partially complete`, or `Blocked`. Do not fix product issues in code; record them as requirements, risks or questions.
