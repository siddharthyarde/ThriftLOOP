---
name: docs-context
description: Fetch and apply current documentation for libraries, frameworks, APIs, SDKs, MCP servers, Node.js, React, Next.js, Supabase, Vercel, Render, Netlify, Razorpay, Shiprocket, Postman, Figma, GitHub, and fast-moving developer tools. Use when APIs may have changed, docs are needed, or Context7/web/MCP documentation should guide implementation.
---

# Docs Context

## Workflow

1. Prefer official docs, local package docs, or Context7 MCP for library/framework APIs.
2. Use web search when the user asks for latest/current information, the API is fast-moving, or official docs are not already available locally.
3. For implementation, pin guidance to the installed package version when the repo has dependencies.
4. Cite or name the source of non-obvious external guidance in the final answer when docs affected the change.
5. Do not copy large doc passages into code comments or responses; summarize and apply.

## Source Preference

- Installed code and local docs for project-specific behavior.
- Official vendor docs for hosted services and APIs.
- Context7 for current library examples.
- Reputable primary repositories for open-source MCP servers.

## Usage Pattern

When a task touches an unfamiliar or version-sensitive API, first resolve the exact package/service version, then fetch the smallest relevant docs before editing.
