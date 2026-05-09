# Spec: Product Catalog

## Overview

The storefront catalog covers collection pages, product detail pages, and server-rendered product data retrieval.

## Requirements

- Render catalog and product detail pages with React Server Components.
- Keep catalog UI in `components/domain/` and generic primitives in `components/ui/`.
- Validate any filter or search inputs before using them in database queries.
- Reuse Prisma client from `db/client.ts` for all product reads.

## Open Questions

- Do we need faceted filtering in the first release? **Decision:** Not yet; ship basic category and search support first.