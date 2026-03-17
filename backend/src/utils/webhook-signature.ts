import crypto from "crypto";

export const generateHmacSignature = (payload: string, secret: string) => {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

export const verifyWebhookSignature = (
  payload: string,
  secret: string,
  signature: string,
) => {
  const expectedSignature = generateHmacSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "utf-8"),
    Buffer.from(signature, "utf-8"),
  );
};
