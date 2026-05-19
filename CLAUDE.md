# Claude Code MCP Setup

This project has a project-scoped `.mcp.json` for Claude Code. Start Claude from this folder:

```powershell
claude
```

Claude will ask you to trust the project MCP configuration the first time it sees it. Inside Claude, run:

```text
/mcp
```

Use that panel to authenticate OAuth-backed servers such as Supabase, Vercel, Figma, Postman, Sentry, and Stripe.

## Environment Variables

Copy the variable names from `.env.mcp.example` into your shell/user environment before starting Claude. Keep real secrets out of `.mcp.json`.

PowerShell example for the current terminal:

```powershell
$env:GITHUB_TOKEN = "github_pat_..."
$env:RENDER_API_KEY = "rnd_..."
$env:SHIPROCKET_EMAIL = "you@example.com"
$env:SHIPROCKET_PASSWORD = "..."
claude
```

Razorpay expects `RAZORPAY_MERCHANT_TOKEN` to be base64 of `key_id:key_secret`.

## Included Servers

Core product/platform MCPs: Supabase, Vercel, Render, Razorpay, Shiprocket API, Stytch, Stitch, Figma, GitHub, Postman, and Netlify.

Useful Node.js/React.js development MCPs: Context7 for fresh library docs, Playwright for browser automation, filesystem for project-scoped file operations, sequential-thinking, memory, Sentry, and Stripe.

## Notes

Figma also ships an official Claude plugin with extra skills. It has been installed at user scope on this machine:

```powershell
claude plugin install figma@claude-plugins-official
```

Use `/plugin` inside Claude Code to authenticate it.

The Shiprocket entry uses this repo's local MCP bridge at `mcp/shiprocket-server.mjs`, so it needs dependencies installed with `npm install`.

GitHub uses a PAT header. If `GITHUB_TOKEN` is empty, `claude mcp list` will show GitHub as failed until you set it and restart Claude.

Google Stitch uses the `stitch-mcp` package. Set `GOOGLE_CLOUD_PROJECT`, install/authenticate the Google Cloud CLI, enable the Stitch API for that project, then restart Claude.

## Project Skills

Project-scoped Claude skills are available in `.claude/skills/` and can be invoked directly with `/skill-name`:

- `/react-node-feature` for React, Node.js, TypeScript, APIs, forms, and full-stack feature work.
- `/design-to-code` for Figma, screenshots, visual QA, and responsive UI implementation.
- `/supabase-workflow` for Supabase Auth, SQL, RLS, migrations, storage, and Edge Functions.
- `/deploy-release` for Vercel, Render, Netlify, env vars, build failures, and release checks.
- `/api-postman-workflow` for API contracts, Postman collections, request examples, and endpoint testing.
- `/payments-logistics` for Razorpay, Stripe, Shiprocket, checkout, shipping, refunds, and fulfillment.
- `/debug-browser` for Playwright-driven browser debugging, console/network issues, and visual QA.
- `/code-review` for PR review, diff auditing, regression risk, and missing tests.
- `/security-hardening` for auth, secrets, RLS, webhook verification, and production safety.
- `/docs-context` for current docs via official sources, Context7, and fast-moving SDK/API checks.

## VS Code Workflow

The official Claude Code VS Code extension is installed on this machine. This workspace recommends it in `.vscode/extensions.json` and sets Claude defaults in `.vscode/settings.json`.

Start work in one of these ways:

```powershell
code .
```

Then use the Claude sparkle icon in VS Code, or run the `Claude: Start` task. For full CLI behavior, open the VS Code integrated terminal and run:

```powershell
claude
```

Use `Ctrl+Esc` to focus Claude in VS Code, `Alt+K` to insert an @-mention for the selected file/lines, and `/mcp` to authenticate or inspect MCP servers.

## Project Agents

Project agents are available in `.claude/agents/` and can be used automatically or explicitly:

- `project-planner`: use before building a new project, feature, or architecture.
- `frontend-implementer`: use for React, Next.js, UI, forms, accessibility, and visual polish.
- `backend-data-engineer`: use for Node APIs, Supabase, SQL, RLS, auth, and integrations.
- `qa-debugger`: use for browser debugging, Playwright, repro steps, and regression checks.
- `security-reviewer`: use for auth, secrets, payments, webhooks, RLS, and production safety.
- `code-reviewer`: use after changes or before committing/PRs.

Example prompts:

```text
Use the project-planner agent to design the first version of a thrift marketplace.
Use the frontend-implementer agent to build the product grid from this Figma frame.
Use the backend-data-engineer agent to add Supabase tables and RLS for listings.
Use the qa-debugger agent to reproduce and fix the checkout page blank screen.
Use the security-reviewer agent to audit payment and webhook handling.
Use the code-reviewer agent to review my uncommitted changes.
```
