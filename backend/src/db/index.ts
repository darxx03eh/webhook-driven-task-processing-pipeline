import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config/env";
import * as schema from "./schema";
import * as relations from "./relations";

const pool = new Pool({
    connectionString: config.databaseUrl
});

const dbSchema = { ...schema, ...relations };
export const db = drizzle(pool, { schema: dbSchema });