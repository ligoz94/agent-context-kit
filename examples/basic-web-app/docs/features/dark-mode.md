# Spec: Dark Mode Toggle

## Overview
We need to add a "Dark Mode" toggle switch to the main navigation bar.

## Requirements
- Use `next-themes` standard implementation for Next.js App Router.
- The toggle should use the `shadcn/ui` Switch component.
- The state must persist in `localStorage` automatically (handled by `next-themes`).
- It must be a Client Component (`"use client"`) since it interacts with the DOM.
- Place the component in `components/domain/ThemeToggle.tsx`.

## Open Questions
- Do we default to system preference or force dark mode initially? **Decision:** Default to system preference.
