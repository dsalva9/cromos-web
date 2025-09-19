# Changelog

All notable changes to the Cromos Web project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with Next.js 15
- TypeScript configuration
- Tailwind CSS v4 with shadcn/ui components
- Basic project structure and documentation

### Changed

- N/A

### Fixed

- N/A

### Removed

- N/A

## [0.1.0] - 2024-XX-XX

### Added

- Initial project setup
- Next.js 15 with App Router
- TypeScript configuration
- Tailwind CSS v4 integration
- shadcn/ui component library setup
- Basic UI components: Button, Card, Input, Dialog, Avatar, Badge, Progress, Textarea
- Modern card component for sports card theme
- Supabase integration preparation
- Development workflow documentation

### Infrastructure

- ESLint and Prettier configuration
- Git workflow and conventional commits setup
- Environment variables template
- Core documentation files

---

## How to Update This File

When making changes to the project:

1. **Add entries under [Unreleased]** as you develop
2. **Use these categories:**
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for bug fixes
   - `Security` for vulnerability fixes

3. **When releasing a version:**
   - Move unreleased items to a new version section
   - Add the release date
   - Create a new empty [Unreleased] section

4. **Commit message format:**
   ```bash
   git add CHANGELOG.md
   git commit -m "docs: update changelog for v0.2.0"
   git push origin main
   ```
