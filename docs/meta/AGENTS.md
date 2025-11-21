# Agents & Roles

## Purpose
This document defines the roles and responsibilities of all agents involved in the Cromos Web project. It ensures consistent collaboration, clear scope boundaries, and a repeatable workflow for building and maintaining the app using modern AI tools.

## Roles

### Project Lead (David)
*   **Strategy & Scope**: Defines the high-level vision, backlog, and milestones.
*   **Review & Approval**: Reviews implementation plans, verifies critical changes, and approves "dangerous" actions (e.g., bulk deletes, deployments).
*   **Final Decision Maker**: Resolves ambiguities in design or logic.

### Primary Agent (Antigravity / Claude)
*   **Unified Execution**: Handles the entire lifecycle of a task: Planning, Implementation, and Verification.
*   **Architect**: Designs system structure, database schemas, and API contracts.
*   **Developer**: Writes production-ready code, following strict patterns and best practices.
*   **Documentation**: Maintains the "living documentation" in `docs/` to ensure it matches the codebase.
*   **Tool User**: Actively uses MCP servers (Supabase) and CLI tools to inspect, debug, and verify the environment.

## Workflow: The Agentic Loop

1.  **Plan**:
    *   Agent analyzes the request and the current codebase state.
    *   Agent creates an `implementation_plan.md` for complex tasks.
    *   User reviews and approves the plan.

2.  **Execute**:
    *   Agent modifies code, runs database migrations, and updates documentation.
    *   Agent uses **Task Mode** to keep the user informed of progress without spamming the chat.

3.  **Verify**:
    *   Agent runs tests (manual or automated) to confirm the fix/feature.
    *   Agent creates a `walkthrough.md` to demonstrate the results.

## Tools & Environment

*   **MCP Servers**:
    *   **Supabase**: Used for all database inspections, SQL execution, and RLS verification.
*   **CLI**:
    *   Agent can propose and execute git commands, file operations, and build scripts.
*   **Documentation**:
    *   The `docs/` directory is the source of truth.
    *   **Critical**: `docs/database-schema.md` and `docs/api-endpoints.md` must be kept in sync with the actual backend.

## Versioning & Git

*   **Semantic Versioning**: Follow SemVer for releases.
*   **Commit Messages**: `type(scope): description` (e.g., `feat(auth): add user login`).
*   **Agent Autonomy**: Agents can stage and commit changes as part of their execution loop, but major pushes may require user confirmation.
