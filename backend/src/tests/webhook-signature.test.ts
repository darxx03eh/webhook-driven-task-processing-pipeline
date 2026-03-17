import { describe, expect, it } from "vitest";
import {
  generateHmacSignature,
  verifyWebhookSignature,
} from "../utils/webhook-signature";

describe("webhook signature utils", () => {
  const payload = '{"product":"pizza","price":75}';
  const secret = "test-secret";

  it("generates deterministic HMAC signatures", () => {
    const first = generateHmacSignature(payload, secret);
    const second = generateHmacSignature(payload, secret);

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
  });

  it("verifies a valid signature", () => {
    const signature = generateHmacSignature(payload, secret);
    expect(verifyWebhookSignature(payload, secret, signature)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const signature = generateHmacSignature(payload, secret);
    const invalid =
      signature[0] === "a"
        ? `b${signature.slice(1)}`
        : `a${signature.slice(1)}`;

    expect(verifyWebhookSignature(payload, secret, invalid)).toBe(false);
  });
});
