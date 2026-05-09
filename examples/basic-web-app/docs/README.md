# Project Documentation

Project docs for the `basic-web-app` example.

## Reading Order

1. [values.md](agent/values.md)
2. [context-policy.md](agent/context-policy.md)
3. [architecture-primer.md](agent/architecture-primer.md)
4. [glossary.md](agent/glossary.md)
5. [key-learnings.md](agent/key-learnings.md) when fixing bugs or regressions
6. The relevant feature doc from the register below

## Feature Register

Status: `stable` | `wip` | `deprecated`

| Feature | Status | Description | Spec |
| ------- | ------ | ----------- | ---- |
| `user-authentication` | `stable` | Clerk-based authentication flow covering sign-in, sign-up, and session handling. | [user-authentication.md](features/user-authentication.md) |
| `product-catalog` | `wip` | Storefront catalog browsing, product listing, and server-rendered product detail flow. | [product-catalog.md](features/product-catalog.md) |
| `shopping-cart` | `wip` | Cart state mutations via Server Actions with shared UI components for cart summary and checkout entry. | [shopping-cart.md](features/shopping-cart.md) |
| `dark-mode` | `wip` | Theme toggle in the main navigation using `next-themes` and a client-side switch component. | [dark-mode.md](features/dark-mode.md) |