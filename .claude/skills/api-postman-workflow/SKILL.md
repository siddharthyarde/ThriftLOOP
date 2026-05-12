---
name: api-postman-workflow
description: Design, test, document, and debug REST or HTTP APIs using Postman MCP, OpenAPI, collections, environments, request examples, auth headers, and Node/React API clients. Use for API contracts, endpoint testing, integration debugging, mock requests, and API documentation.
---

# API Postman Workflow

## Workflow

1. Discover the API contract from code, OpenAPI files, Postman collections, or live docs.
2. Use Postman MCP when authenticated to inspect collections, environments, examples, and test runs.
3. Confirm auth style, base URL, headers, request body, query params, and expected response codes.
4. Implement or update the endpoint/client with explicit validation and structured errors.
5. Add or update request examples and tests for success, auth failure, validation failure, and not-found cases.

## API Quality Bar

- Keep response shapes stable and documented.
- Avoid leaking stack traces, tokens, or internal IDs unless they are intended API fields.
- Include pagination, filtering, sorting, and idempotency behavior when relevant.
- For frontend clients, centralize base URL and auth handling instead of spreading fetch calls everywhere.
