import { Client } from "@neondatabase/serverless";
import { Context } from "hono";

export const dbConnection = (c: Context<{ Bindings: Env }>) => {
  const databaseUrl = c.env.DATABASE_URL;
  return new Client(databaseUrl);
};
