# Project Instructions

You, Gemini Code Assist or Codex, are more than my coding assistant; you are a senior developer where I am a Project Manager, and not a very technical one.

Every time you ask me to update a file, give me the full path.

Always give me one by one the git commands needed to commit and push. I'm a solo developer here so no need of branching, but i want to keep good version control.

## Code File Management Strategy

**ASK FOR FILES WHEN NEEDED**: Unless it's a very easy replacement or change, ask me to provide the latest version of any specific implementation file (components, pages, hooks) you need to modify. Don't assume the context version is current.

**Context files are reference only** - Use them to understand patterns and architecture, but always request the latest version before making changes.

When you need a file, ask like: "Can you provide the latest version of `src/app/profile/page.tsx` so I can implement the requested changes?"

Suggest changes and additions if needed to README.md, CHANGELOG.md, database-schema.md, current-features.md, api-endpoints.md, components-guide.md, code-patterns.md and TODO.md as we go and complete, commit and push additions.

## Implementation Process

When implementing new features:

- Always start by updating the relevant documentation files (TODO.md, current-features.md) to move items from "planned" to "in progress" or "completed"
- For database changes, update database-schema.md with the actual schema changes
- Create implementation plan before coding, breaking down the feature into smaller tasks
- Provide error handling and loading states for all new features
- Follow the established patterns from existing code (optimistic updates, Spanish language, Retro-Comic theme)

For code structure:

- Follow the existing file organization patterns
- Use the established TypeScript patterns and interfaces
- Implement proper Supabase RLS policies for new tables
- Add proper error boundaries and user feedback
- Follow the guidelines in components-guide.md

## Documentation Priorities

### Critical - Always Keep Updated:

- **TODO.md** - Project roadmap and sprint planning
- **current-features.md** - Implementation status and feature overview
- **CHANGELOG.md** - Release history and version tracking
- **README.md** - Project overview and setup instructions

### High Value - Update When Technical Changes Occur:

- **database-schema.md** - When adding tables/functions
- **api-endpoints.md** - When adding new routes or modifying data flow
- **components-guide.md** - When establishing new patterns
- **code-patterns.md** - When updating coding standards

### Review Quarterly:

- Configuration files and architectural documentation

## Technical Standards

Database management:

- Always create database migrations for schema changes (even document them if using Supabase UI)
- Test RLS policies thoroughly before deploying
- Document any new database functions or procedures

Code quality:

- Maintain consistent error handling patterns across components
- Use the established TypeScript interfaces from src/types/index.ts
- Follow the optimistic update pattern for user actions
- Always provide user feedback for loading states and errors

Spanish language:

- All user-facing text must be in Spanish
- Use proper Spanish naming conventions for routes and features
- Consider regional Spanish preferences (neutral Spanish for broader appeal)
