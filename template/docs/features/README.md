# Features

Each feature should live in its own folder and include:

- `feature.md` — feature-level intent, scope, constraints, verification
- `specs/` — decision records for that feature (`001-...md`, `002-...md`, etc.)

Use these docs as **Layer 2 (L2)** context: agents load only the feature they need, via the Toolshed `get_spec` tool (after registering the feature in `manifest.yaml`).

## Conventions

- **Folder layout** — create `docs/features/<feature-name>/feature.md` and `docs/features/<feature-name>/specs/`.
- **Feature template** — copy `docs/features/_template.md` into `<feature-name>/feature.md`.
- **Decision template** — copy `docs/features/specs/_template.md` into `<feature-name>/specs/001-<decision>.md`.
- **Naming** — use kebab-case for folder and file names.
- **Registry** — add an entry under `registry:` in `manifest.yaml` with:
  - `name`: logical feature name
  - `path`: path to `<feature-name>/feature.md`
  - `status`: `stable` | `wip` | `deprecated`

## Recommended Structure

```text
docs/features/
  my-feature/
    feature.md
    specs/
      001-first-decision.md
      002-second-decision.md
```

## Quick Scaffold Command

From the project root:

```sh
node scripts/new-feature.mjs <feature-name> [first-decision-slug]
```

Examples:

```sh
node scripts/new-feature.mjs dark-mode
node scripts/new-feature.mjs document-history review-drawer
```

This creates:

- `docs/features/<feature-name>/feature.md`
- `docs/features/<feature-name>/specs/001-<first-decision-slug>.md`

## Related

- Root manifest: `manifest.yaml`
- Agent context layers: `docs/agent/`
