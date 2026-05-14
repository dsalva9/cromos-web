# Agent Preferences — cromos-web

## File Editing

ALWAYS use run_command with Node.js or PowerShell for file edits.
NEVER use write_to_file or replace_file_content tools — they time out and stall the session.

### Preferred patterns

**Small targeted edit:** node -e with fs.readFileSync/writeFileSync
**New file:** Set-Content -Encoding UTF8 path\\file.ts + content (avoid backticks in here-strings)
**Multi-line patch:** write a _patch.mjs, run node _patch.mjs, then Remove-Item _patch.mjs

## Communication
- Narrate every step as it happens.
- Use WaitMsBeforeAsync: 5000 on run_command for instant feedback.
