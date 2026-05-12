---
name: supabase-workflow
description: Work with Supabase databases, Auth, RLS, migrations, Edge Functions, storage, realtime, SQL policies, generated types, and Supabase MCP. Use for schema changes, row-level security, user data, database debugging, and React/Node integrations with Supabase.
---

# Supabase Workflow

## Workflow

1. Use Supabase MCP when authenticated and the task needs live project context. Treat production data as sensitive.
2. Inspect existing migrations, generated types, database clients, auth helpers, and RLS patterns before changing schema or queries.
3. For schema changes, create migrations instead of manual dashboard-only changes. Keep backward compatibility in mind.
4. For user-scoped data, design RLS first, then write app code against those rules.
5. Regenerate or update types when schema changes affect application code.

## RLS Checklist

- Enable RLS on user-owned tables.
- Add explicit select, insert, update, and delete policies as needed.
- Check ownership with `auth.uid()` or project-specific tenant/team membership tables.
- Avoid broad service-role access in client code.
- Test both allowed and denied access paths.

## App Integration

- Keep Supabase server clients on the server and browser clients in browser-only code.
- Never expose service-role keys to the frontend.
- Normalize Supabase errors into user-safe messages while logging useful developer context.
