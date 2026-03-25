<!-- agent-context-kit:engine:start -->
# L0: Identity & Values
> **Goal:** Align AI output with team non-negotiables. Define *how* we build things here.
> **Target:** < 400 tokens. Broad impact across all interactions.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
# Acme Web App — Non-Negotiables

Welcome! When generating code or suggesting solutions for this project, you must strictly adhere to these core values:

## 1. Zero Client-Side Data Fetching by Default
We use **React Server Components (RSC)** for all data fetching. Do not use `useEffect` or `useQuery` to load data unless it depends on real-time browser state (like window width or scroll position). **Everything starts as a Server Component.**

## 2. Type Safety Everywhere
We rely entirely on TypeScript and `zod` for safety.
- **Never** use `any`. Use `unknown` with a type-guard if necessary.
- **Never** trust external inputs (API params, form data). Always validate with a Zod schema before processing.

## 3. Tailwind for Styling — No Custom CSS
All styling must be done via Tailwind utility classes or `shadcn/ui` components. Do not write custom CSS or add `.css`/`.module.css` files unless absolutely required for complex animations.

## 4. Fail Defensively
If a database query fails, the application should return a clear `Result<Data, Error>` object or throw an error caught by Next.js `error.tsx` boundaries. Do not swallow errors silently.
<!-- agent-context-kit:project:end -->
