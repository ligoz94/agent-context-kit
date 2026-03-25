<!-- agent-context-kit:engine:start -->
# L2: Key Learnings
> **Goal:** Document past bugs, wrong turns, and hard-won insights so agents don't repeat human mistakes.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
# Key Learnings

## React Server Components & state
* **Issue:** We accidentally leaked a DB connection string because we imported a `lib/db.ts` file directly into a client component.
* **Learning:** Always use `server-only` package in files that read DB credentials.

## Server Actions
* **Issue:** We noticed stale data on the product catalog after a mutation because Server Actions by default don't invalidate the router cache.
* **Learning:** Always call `revalidatePath('/path')` or `revalidateTag('tag')` at the end of a successful Server Action mutation.

## shadcn UI
* **Issue:** `Select` component was rendering under a custom `Modal`.
* **Learning:** Always use `z-50` explicitly on overlay components or rely on the primitive's built in `Portal` wrapper.
<!-- agent-context-kit:project:end -->
