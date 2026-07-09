import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const profiles = await sql`
    select id, name, is_admin, email, created_at
    from profiles
    order by created_at desc
  `;
  console.log("profiles:", profiles.length);
  for (const p of profiles) {
    console.log(`  ${p.email ?? "(no email)"} | ${p.name} | admin=${p.is_admin}`);
  }

  const auth = await sql`
    select id, email, raw_user_meta_data->>'name' as name, created_at, last_sign_in_at
    from auth.users
    order by created_at desc
  `;
  console.log("\nauth.users:", auth.length);
  for (const u of auth) {
    console.log(`  ${u.email} | ${u.name} | last_sign_in=${u.last_sign_in_at ?? "never"}`);
  }
} finally {
  await sql.end();
}
