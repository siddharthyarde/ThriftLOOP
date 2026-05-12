import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken = process.env.SHIPROCKET_TOKEN || "";

const server = new Server(
  {
    name: "shiprocket-api",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "shiprocket_serviceability",
      description: "Check Shiprocket courier serviceability and rates for a shipment.",
      inputSchema: {
        type: "object",
        properties: {
          pickup_postcode: { type: "string" },
          delivery_postcode: { type: "string" },
          weight: { type: "number" },
          cod: {
            type: "integer",
            enum: [0, 1],
            description: "0 for prepaid, 1 for cash on delivery."
          },
          declared_value: { type: "number" }
        },
        required: ["pickup_postcode", "delivery_postcode", "weight", "cod"]
      }
    },
    {
      name: "shiprocket_track_awb",
      description: "Track a Shiprocket shipment by AWB number.",
      inputSchema: {
        type: "object",
        properties: {
          awb: { type: "string" }
        },
        required: ["awb"]
      }
    },
    {
      name: "shiprocket_api_request",
      description: "Call a Shiprocket API endpoint under /v1/external for operations not covered by the focused tools.",
      inputSchema: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            default: "GET"
          },
          path: {
            type: "string",
            description: "Path under /v1/external, for example /orders/create/adhoc."
          },
          query: {
            type: "object",
            additionalProperties: {
              type: ["string", "number", "boolean"]
            }
          },
          body: {
            type: "object",
            additionalProperties: true
          }
        },
        required: ["path"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === "shiprocket_serviceability") {
    return asText(await shiprocketRequest("GET", "/courier/serviceability/", args));
  }

  if (name === "shiprocket_track_awb") {
    return asText(await shiprocketRequest("GET", `/courier/track/awb/${encodeURIComponent(args.awb)}`));
  }

  if (name === "shiprocket_api_request") {
    return asText(
      await shiprocketRequest(
        args.method || "GET",
        args.path,
        args.query || {},
        args.body
      )
    );
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function getToken() {
  if (cachedToken) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("Set SHIPROCKET_TOKEN or both SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD before using Shiprocket MCP tools.");
  }

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await readJson(response);

  if (!response.ok || !payload.token) {
    throw new Error(`Shiprocket login failed: ${JSON.stringify(payload)}`);
  }

  cachedToken = payload.token;
  return cachedToken;
}

async function shiprocketRequest(method, path, query = {}, body) {
  if (!path || typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Shiprocket API path must start with a single slash, for example /orders.");
  }

  const token = await getToken();
  const url = new URL(`${API_BASE}${path}`);

  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Shiprocket API ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function asText(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

await server.connect(new StdioServerTransport());
