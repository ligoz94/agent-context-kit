<!-- agent-context-kit:engine:start -->
# L0: Glossary
> **Goal:** Standardize domain language. Map business concepts to codebase concepts.
> **Target:** 50-100 terms. Alphabetical order.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
# Glossary

When discussing features or naming variables, use these canonical terms:

- **Cart**: The user's pending `Order` that has not yet been paid for. (Avoid using `Basket`).
- **Catalog Item**: Represents a distinct product or variant we sell. Mapped to `ProductVariant` in code.
- **Checkout Session**: A Stripe Checkout object linked to a completed `Cart`.
- **Customer**: A registered or guest user making a purchase. Mapped to `User` table.
- **Fulfillment**: The process of boxing and shipping an order. Managed via the external `ShipStation` API.
<!-- agent-context-kit:project:end -->
