---
name: payments-logistics
description: Implement and debug ecommerce payments, orders, refunds, webhooks, shipping, courier rates, tracking, Razorpay, Stripe, Shiprocket, checkout flows, payment links, COD/prepaid logic, and fulfillment workflows. Use for marketplace, thrift store, logistics, invoice, order lifecycle, and payment integration tasks.
---

# Payments Logistics

## Workflow

1. Map the order lifecycle before editing: cart, checkout, payment authorization/capture, order creation, shipment, tracking, refunds, and cancellations.
2. Use Razorpay, Stripe, or Shiprocket MCP only after confirming the environment is test/sandbox unless the user explicitly requests production action.
3. Keep money values in integer minor units where the provider expects them. Track currency explicitly.
4. Make webhook handlers idempotent. Verify signatures and store provider event IDs.
5. Separate customer-facing order status from provider-specific raw statuses.

## Payment Safety

- Never trust client-reported payment success. Verify with the provider server-side.
- Do not log full secrets, cards, tokens, or payment credentials.
- Handle duplicate webhooks, retries, partial failures, and refund/cancel edge cases.
- Prefer test keys and test orders while developing.

## Shipping Safety

- Validate pickup and delivery postcodes, dimensions, weight, COD flag, and declared value before rate checks.
- Store AWB/tracking IDs and shipment labels as provider artifacts linked to the internal order.
- Avoid automatically shipping or cancelling real orders without explicit user confirmation.
