import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as relations from "./relations";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const dbSchema = { ...schema, ...relations };
export const db = drizzle(pool, { schema: dbSchema });
