---
name: react-node-feature
description: Build or modify React, Next.js, Vite, Express, Node.js, TypeScript, JavaScript, CSS, Tailwind, routing, state, forms, API routes, server actions, and full-stack features. Use for frontend implementation, backend endpoints, UI state, data fetching, component architecture, and Node/React project changes.
---

# React Node Feature

## Workflow

1. Inspect the project stack before editing: package manager, framework, routing style, UI library, lint/test commands, and existing component patterns.
2. Reuse local components, hooks, utilities, validators, API clients, and design tokens before adding new abstractions.
3. Keep the change scoped to the requested workflow. Update both client and server boundaries when data contracts change.
4. Prefer typed inputs and outputs. For forms and APIs, validate at the boundary and normalize errors for the UI.
5. Run the smallest meaningful verification first, then broaden if shared code or public behavior changed.

## React Guidance

- Keep components focused on one responsibility and move reusable logic into hooks only after duplication is real.
- Use controlled inputs for complex forms and preserve accessibility labels, focus states, keyboard behavior, loading states, empty states, and error states.
- Avoid one-off styling that fights the local design system. Match existing spacing, color tokens, icons, and responsive breakpoints.
- For data fetching, handle loading, success, empty, error, and stale/refetch states explicitly.

## Node Guidance

- Keep API handlers thin: parse, authorize, validate, call service logic, return structured responses.
- Never trust client input. Check auth, ownership, rate-sensitive operations, and server-only secrets.
- Prefer existing database and service clients. Avoid duplicating environment parsing or auth helpers.
- Make errors useful to developers without leaking secrets to users.
