<!-- agent-context-kit:engine:start -->
# L1: Context Policy
> **Goal:** High-level boundaries for AI agent autonomy and context scope.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
# Context Policy & Agent Autonomy

1. **You are explicitly forbidden from:**
   - Modifying `db/schema.prisma` without explicit permission. Database migrations must be reviewed by lead engineers.
   - Using \`npm install\` to add new libraries unless asked. We prefer standardizing on our current dependencies.
   - Reconfiguring `next.config.js` or `middleware.ts`.

2. **When suggesting architectural changes:**
   - Always reference the `architecture-primer.md`.
   - Consider the impact on Server Components vs Client Components.

3. **Autonomy Level:**
   - You may freely generate new React components in `components/domain/`.
   - You may freely generate new Server Actions in `actions/`.
   - Ask for confirmation before modifying core `lib/` utilities.
<!-- agent-context-kit:project:end -->
