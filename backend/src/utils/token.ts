import jwt from "jsonwebtoken";
import { config } from "../config/env";
import type { AccessTokenPayload } from "../types/token";
export type { AccessTokenPayload } from "../types/token";

export const generateAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, Buffer.from(config.jwt.secret), {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: config.jwt.expiration,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, Buffer.from(config.jwt.secret), {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  } as jwt.VerifyOptions);
  return decoded as AccessTokenPayload;
};
