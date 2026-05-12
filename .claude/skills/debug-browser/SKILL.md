---
name: debug-browser
description: Debug frontend, browser, runtime, build, hydration, routing, network, console, Playwright, visual regression, responsive layout, accessibility, and user interaction issues in React/Next.js apps. Use for broken UI, blank pages, failing tests, browser automation, repro steps, and visual QA.
---

# Debug Browser

## Workflow

1. Reproduce the issue first. Capture exact route, viewport, steps, console errors, network failures, and expected behavior.
2. Use Playwright MCP when the app can run locally or a URL is available. Prefer accessibility snapshots for locating elements.
3. Trace from symptom to source: browser console, network request, component state, API response, server logs, then code.
4. Make the smallest fix that addresses the root cause.
5. Re-run the repro and add focused regression coverage when practical.

## Common Checks

- Hydration mismatch: compare server-rendered data, dates, random values, browser-only APIs, and auth state.
- Blank page: inspect import errors, route errors, uncaught promises, env vars, and bundler output.
- Layout bug: check container widths, overflow, fixed heights, z-index, wrapping, and media queries.
- Slow UI: check duplicate fetches, oversized bundles, unnecessary re-renders, and unbounded lists.
