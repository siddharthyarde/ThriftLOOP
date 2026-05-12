---
name: design-to-code
description: Convert Figma designs, screenshots, mocks, UI references, and design specs into React/Next.js components and polished responsive interfaces. Use when working from Figma MCP, Figma links, visual QA, layout matching, UI rebuilds, design tokens, component mapping, or frontend pixel refinement.
---

# Design To Code

## Workflow

1. Pull design context through Figma MCP when a Figma URL or node is available. Use screenshots as visual truth and generated code only as reference.
2. Map design elements to existing project components, tokens, icons, and layout primitives before writing new UI.
3. Build the real usable screen or component, including interactive states a user would expect.
4. Verify responsive layouts across mobile and desktop. Check text wrapping, overflow, z-index, focus, hover, loading, empty, and error states.
5. Use Playwright MCP or local browser checks for visual behavior when a running app is available.

## Implementation Rules

- Preserve semantic HTML and accessibility; do not sacrifice labels or keyboard navigation for visual similarity.
- Use lucide or the project icon library for common actions instead of hand-drawn SVGs.
- Keep dashboards and operational tools dense, scannable, and restrained. Use cards for repeated items, modals, or framed tools, not for every page section.
- Avoid decorative gradients, blobs, and oversized marketing layout unless the user explicitly asks for a landing page.
- Keep typography stable; do not scale font size with viewport width.

## Handoff

When the design cannot be matched exactly because assets, fonts, or tokens are missing, state the assumption briefly and implement the closest maintainable version.
