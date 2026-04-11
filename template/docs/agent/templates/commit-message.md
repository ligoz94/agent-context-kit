# Commit Message Template

Canonical format for git commit messages produced by agents.

## Git Commit

**Subject line** (first line):

- One concrete sentence, ≤72 chars
- Distill the *what* from the Summary — name the component/module/area changed
- Use conventional commit prefix if the project uses it (e.g. `feat:`, `fix:`, `refactor:`)

**Body** (separated from subject by a blank line):

- Remaining sections from [pr-body.md](pr-body.md), adapted as plain text (no markdown headings in git log)
- Omit sections that are empty or not applicable
- `Closes #…` on its own line if applicable

## GitHub PR Description

Use the full [pr-body.md](pr-body.md) layout as-is — headings, bullets, all sections.

## Chat-Only Summary

Same sections as pr-body.md; omit `Closes #…` if no issue numbers are given.

## Style

- **Concrete** over vague: name endpoints, components, file paths the reviewer can open
- **No filler** — skip sections only if truly empty (then one line `None.` where allowed)
- Align **Risk** and **Agent Report** with what actually changed — do not copy a previous PR verbatim
