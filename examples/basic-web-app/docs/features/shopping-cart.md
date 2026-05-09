# Spec: Shopping Cart

## Overview

The shopping cart lets users add products, adjust quantities, and review totals before checkout.

## Requirements

- Perform cart mutations through Server Actions in `actions/`.
- Validate cart payloads with `zod` before database writes.
- Keep cart UI responsive with small client components only where interaction is required.
- Preserve compatibility with guest checkout until payment flow finalization.

## Open Questions

- Should carts persist for anonymous users across devices? **Decision:** No, anonymous carts are session-local in this example.