import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import * as seed from "./seedData";
import { exit } from "process";

// import { seedMedias } from "./seedData/medias"
// import { seedCollections } from "./seedData/collections"

dotenv.config({ path: ".env.local" });
dotenv.config();
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}
if (process.env.DATABASE_URL.includes("YOUR_DB_PASSWORD")) {
  throw new Error(
    "Replace YOUR_DB_PASSWORD in .env.local with your Supabase database password (Settings → Database → Connection string → URI).",
  );
}

const queryClient = postgres(process.env.DATABASE_URL);
export const db = drizzle(queryClient, { schema });

const seeddata = async () => {
  await seed.medias();
  await seed.collections();
  await seed.products();
  // await seed.shopOrders()
  // await seed.address()

  exit();
};

seeddata();
