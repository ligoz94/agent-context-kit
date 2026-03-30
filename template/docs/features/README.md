# Features

Feature specs are **Layer 2 (L2)** context: agents should load **one** spec per task via Toolshed **`get_spec`** (after the feature is listed under **`registry:`** in `manifest.yaml`).

## Two ways to lay out features

### A. Single file (simplest; CLI-supported)

One markdown file per feature at **`docs/features/<name>.md`**, registered in `manifest.yaml`:

```yaml
registry:
  - name: auth-flow
    path: docs/features/auth-flow.md
    status: wip
```

**Scaffold from the project root:**

```bash
npx @agent-context-kit/cli new-spec auth-flow
```

This copies `docs/features/_template.md`, renames the title, and appends a `registry` entry with status `wip`.

### B. Folder + decision specs (optional)

For larger features, use a folder with a main brief and numbered decision files:

```text
docs/features/
  my-feature/
    feature.md          # copy from _template.md; registry path points here
    specs/
      001-something.md  # copy from specs/_template.md
      002-other.md
```

Add the registry entry with `path: docs/features/my-feature/feature.md`.

The **agent-context-kit** repository includes **`scripts/new-feature.mjs`** (under `template/scripts/`) as a reference for creating this layout; it is **not** copied by `context-kit init`. Copy the script into your repo if you want the same workflow, or create folders manually using `_template.md` and `specs/_template.md`.

## Conventions

- **Naming** — kebab-case for slugs and file names.
- **Registry** — each feature needs `name`, `path`, and `status` (e.g. `stable`, `wip`, `shipped`, `deprecated` — use what your team agrees on).
- **Template** — start from `docs/features/_template.md` (and `docs/features/specs/_template.md` for decision records).

## Related

- Root manifest: `manifest.yaml`
- Agent context layers: `docs/agent/`
- CLI: `context-kit new-spec`, `context-kit list`
