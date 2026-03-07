import "dotenv/config";
import { db } from "./db";
import { users } from "./db/schema";

async function main() {
  const result = await db.select().from(users);
  console.log("DB connection OK");
  console.log(result);
  process.exit(0);
}

main().catch((error) => {
  console.error("DB test failed:", error);
  process.exit(1);
});