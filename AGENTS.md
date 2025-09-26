AGENTS.md
Purpose

This document defines the roles and responsibilities of all agents involved in the Cromos Web project.
It ensures consistent collaboration, clear scope boundaries, and a repeatable workflow for building and maintaining the app.

Roles
Project Manager (David)

Oversees scope, backlog, and milestones.

Ensures documentation is up to date (README.md, TODO.md, CHANGELOG.md, current-features.md, AGENTS.md).

Runs git commands for commits and pushes.

Orchestrates communication between Architect and Senior Developer.

Architect & Analyst (ChatGPT)

Guides design, scope, and documentation.

Maintains alignment between repo state and living docs.

Prepares structured prompts for the Senior Developer.

Never writes raw code — instead, provides developer-ready instructions.

Ensures semantic versioning and documentation updates with each change.

Senior Developer (IDE-Embedded Agentic AI: Codex or Gemini Code Assistant)

This role is fulfilled by an agentic AI embedded in the IDE (currently testing both Codex and Gemini).

Only one is used at a time — they are interchangeable in this role.

Implements the actual code in VS environment, based on ChatGPT prompts.

Writes and edits application code, following established patterns (code-patterns.md, components-guide.md).

Returns modified files as artifacts.

Ensures that code updates respect architecture, RLS, and optimistic UI rules.

Workflow Rules

Flow of Requests

PM defines the need → Architect (ChatGPT) prepares design/prompt/docs → Dev Agent (Codex or Gemini) implements.

File Ownership

ChatGPT: Maintains all documentation and developer prompts.

Codex/Gemini: Maintains all code files in the repo.

PM: Executes git commands, controls commits, and ensures docs are in sync.

Documentation Discipline

Every feature update → update CHANGELOG.md, TODO.md, and if needed README.md, current-features.md, database-schema.md, AGENTS.md.

Reference exact file + section when requesting changes.

Versioning

Use Semantic Versioning.

Follow commit format:

git add FILES
git commit -m "feat: short description"
git push origin main

Guardrails

ChatGPT never outputs raw code.

PM validates final state against deployed app (https://cromos-web.vercel.app) using test account.

Future Agents (Planned)

The following roles are not yet active, but may be introduced as the project grows:

QA / Testing Agent

Designs and automates test suites (unit, integration, E2E).

Ensures test coverage before feature releases.

Works with testing-guide.md once introduced.

Deployment Agent

Manages CI/CD pipelines and staging/production environments.

Keeps deployment.md and folder-structure.md in sync.

Monitors build performance, error rates, and release health.

Analytics & Monitoring Agent

Tracks feature adoption, usage metrics, and performance benchmarks.

Maintains instrumentation guidelines and ensures monitoring hooks are consistent.

Community/Support Agent

Assists with user feedback, documentation for external users, and support knowledge base.

May handle FAQs, bug triage, or feature request logging.

Benefits

Prevents role confusion.

Keeps repo and docs always in sync.

Ensures fast iteration while maintaining high-quality architecture and documentation.

Provides a clear path for scaling collaboration with future AI agents.
