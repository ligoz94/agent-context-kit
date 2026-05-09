# Spec: User Authentication

## Overview

User authentication is handled by Clerk across sign-up, sign-in, protected routes, and session-aware navigation.

## Requirements

- Use Clerk for authentication and session management.
- Keep auth routes under `app/(auth)/`.
- Gate user-specific pages server-side wherever possible.
- Reflect authenticated state in shared navigation components.

## Open Questions

- Should guest checkout remain available when the cart feature ships? **Decision:** Yes, guest checkout remains available unless business rules change.