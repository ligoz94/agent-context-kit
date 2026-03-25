<!-- agent-context-kit:engine:start -->
# L0: Architecture Primer
> **Goal:** Outline the project boundaries, technology stack, and high-level structure.
> **Target:** < 600 tokens. Broad impact.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
# Architecture Primer

## Component Layers

1.  **Frontend (Next.js App Router)**
    - All routes live in `app/`. UI components live in `components/ui/` (shadcn) or `components/domain/`.
    - We use React Server Components (RSC) to render pages and fetch initial data on the server.
    - Client components (`"use client"`) are used sparingly for interactive features (e.g. cart toggles).

2.  **Server Actions (`actions/`)**
    - Mutations (e.g., adding to cart, logging in) are handled via Next.js Server Actions rather than traditional API routes.
    - Actions must validate input using `zod` before interacting with the database.

3.  **Database Layer (`db/`)**
    - **ORMs:** We use Prisma client to interact with our scalable PostgreSQL database.
    - Exported `db` instance from `db/client.ts` should be reused to prevent connection exhaustion.

4.  **External Services**
    - **Stripe:** Exclusively handles payments. We never store credit cards.
    - **Clerk:** Handles user authentication and session management.

## Project Structure
\`\`\`
├── app/                  # Next.js App Router
│   ├── (auth)/           # Clerk Auth routes
│   ├── (shop)/           # Storefront routes
│   └── api/webhooks/     # Stripe/Clerk Webhooks
├── components/
│   ├── ui/               # Generic shadcn components
│   └── domain/           # Business-specific components (e.g., ProductCard)
├── lib/                  # Shared utilities (e.g., utils.ts for Tailwind clsx)
├── actions/              # Server Actions for mutations
└── db/                   # Prisma schema and client
\`\`\`
<!-- agent-context-kit:project:end -->
