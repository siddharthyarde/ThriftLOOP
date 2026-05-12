---
name: code-review
description: Review code changes, pull requests, diffs, GitHub MCP context, TypeScript/React/Node implementations, tests, migrations, and release risk. Use when asked to review, audit, inspect, compare branches, find bugs, assess PRs, or identify missing tests and regressions.
---

# Code Review

## Review Stance

Lead with findings, ordered by severity. Focus on bugs, behavioral regressions, security/privacy risks, data loss, broken contracts, and missing tests. Keep style preferences secondary unless they hide real risk.

## Workflow

1. Inspect the diff and relevant surrounding code, not just changed lines.
2. Check data flow, auth, validation, error handling, async behavior, and edge cases.
3. Verify tests cover the changed behavior and likely failure modes.
4. Reference exact files and lines when reporting issues.
5. If no issues are found, say so and call out residual test or runtime risks.

## Finding Format

Use this shape:

```text
Severity - File:line - Problem
Why it matters and the concrete failure mode.
Suggested fix or direction.
```

Avoid praise-heavy summaries before findings.
