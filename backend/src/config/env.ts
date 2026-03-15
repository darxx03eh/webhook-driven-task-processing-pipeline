import dotenv from 'dotenv';

dotenv.config();

const parsePositiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

export const config = {
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL || "",
    jwt: {
        secret: process.env.JWT_SECRET || "",
        issuer: process.env.JWT_ISSUER || "",
        audience: process.env.JWT_AUDIENCE || "",
        expiration: process.env.JWT_EXPIRATION || "7d"
    },
    rateLimit: {
        authWindowMs: parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 120_000),
        authMaxRequests: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS, 5),
        webhookWindowMs: parsePositiveInt(process.env.RATE_LIMIT_WEBHOOK_WINDOW_MS, 120_000),
        webhookMaxRequests: parsePositiveInt(process.env.RATE_LIMIT_WEBHOOK_MAX_REQUESTS, 30)
    }
};
