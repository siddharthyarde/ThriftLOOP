---
name: security-hardening
description: Harden authentication, authorization, secrets, API security, webhook verification, RLS, dependency risk, MCP safety, environment variables, payments, user data, and production configuration. Use for security reviews, threat modeling, auth bugs, secret handling, and risky integrations.
---

# Security Hardening

## Workflow

1. Identify assets: user data, payment data, credentials, admin actions, provider APIs, and production infrastructure.
2. Trace trust boundaries: browser to server, server to database, server to third-party APIs, webhook sender to handler.
3. Check authentication, authorization, validation, rate limits, logging, and secret exposure.
4. Prefer low-risk mitigations that fit the existing stack.
5. Verify with tests, policy checks, or focused manual repros where possible.

## Checklist

- Secrets only live in environment variables or secret stores, never committed files or client bundles.
- Server actions and API routes validate both auth and ownership.
- Webhooks verify signatures and are idempotent.
- Database access is constrained with RLS or server-side checks.
- Error messages do not leak sensitive internals.
- MCP servers that can mutate external systems are used with explicit confirmation for destructive or production actions.
