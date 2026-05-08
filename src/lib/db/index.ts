import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

declare global {
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__dbClient ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__dbClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
