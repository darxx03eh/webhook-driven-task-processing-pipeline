import dotenv from 'dotenv';

dotenv.config();
export const config = {
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL || "",
    jwt: {
        secret: process.env.JWT_SECRET || "",
        issuer: process.env.JWT_ISSUER || "",
        audience: process.env.JWT_AUDIENCE || "",
        expiration: process.env.JWT_EXPIRATION || "7d"
    }
};
