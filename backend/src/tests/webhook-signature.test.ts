import { describe, expect, it } from "vitest";
import { generateHmacSignature, verifyWebhookSignature } from "../utils/webhook-signature";

describe("webhook signature utils", () => {
    it("generates deterministic SHA-256 HMAC signature", () => {
        const payload = JSON.stringify({ product: "pizza", price: 75 });
        const secret = "super-secret";

        const signatureA = generateHmacSignature(payload, secret);
        const signatureB = generateHmacSignature(payload, secret);

        expect(signatureA).toBe(signatureB);
        expect(signatureA).toMatch(/^[a-f0-9]{64}$/);
    });

    it("validates correct signature", () => {
        const payload = "{\"hello\":\"world\"}";
        const secret = "pipeline-secret";
        const signature = generateHmacSignature(payload, secret);

        expect(verifyWebhookSignature(payload, secret, signature)).toBe(true);
    });

    it("rejects wrong signature with same length", () => {
        const payload = "{\"hello\":\"world\"}";
        const secret = "pipeline-secret";
        const signature = generateHmacSignature(payload, secret);
        const wrongSignature = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`;

        expect(verifyWebhookSignature(payload, secret, wrongSignature)).toBe(false);
    });
});