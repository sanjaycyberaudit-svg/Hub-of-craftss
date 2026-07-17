import postgres from "postgres";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const eventId = `evt_validate_${Date.now()}`;
const id1 = `whm_${Date.now()}_a`;
const id2 = `whm_${Date.now()}_b`;

try {
  await sql`
    insert into payment_webhook_events (id, provider, event_id, status)
    values (${id1}, 'cashfree', ${eventId}, 'processed')
  `;

  let blocked = false;
  try {
    await sql`
      insert into payment_webhook_events (id, provider, event_id, status)
      values (${id2}, 'cashfree', ${eventId}, 'processing')
    `;
  } catch (error) {
    blocked = error?.code === "23505";
  }

  if (!blocked) {
    throw new Error("Expected unique (provider, event_id) to reject duplicate");
  }

  console.log("OK: unique constraint blocks duplicate webhook event");
} finally {
  await sql`delete from payment_webhook_events where event_id = ${eventId}`;
  await sql.end();
}
