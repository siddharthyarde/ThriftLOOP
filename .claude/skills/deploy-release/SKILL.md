---
name: deploy-release
description: Prepare, deploy, and troubleshoot releases on Vercel, Render, Netlify, GitHub, Sentry, and environment-based Node/React hosting. Use for deployment setup, build failures, preview deployments, environment variables, logs, domains, release checks, rollback planning, and production readiness.
---

# Deploy Release

## Workflow

1. Identify the target platform: Vercel, Render, Netlify, or another host. Use MCP tools when authenticated.
2. Inspect build scripts, framework settings, runtime versions, environment variables, and deployment config files.
3. Reproduce build failures locally when possible before changing platform settings.
4. Keep secret values out of committed files. Document required variable names only.
5. After deploy-related changes, run the local build and summarize platform actions still requiring user auth.

## Release Checklist

- Build passes with the same package manager and Node version expected by the host.
- Required env vars are named in docs or templates.
- Public client env vars are intentionally public.
- Server-only secrets stay server-side.
- Error monitoring, logs, and rollback path are known for user-facing changes.

## Platform Notes

- Vercel: watch framework preset, output directory, serverless limits, and preview env vars.
- Render: check service type, build command, start command, health checks, and runtime env.
- Netlify: check publish directory, functions directory, redirects, and build plugins.
