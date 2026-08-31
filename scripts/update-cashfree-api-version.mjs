import postgres from "postgres";

const TARGET_API_VERSION = "2026-01-01";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { prepare: false, max: 1, connect_timeout: 15 });

  try {
    const [row] = await sql`
      select key, is_enabled, value
      from api_settings
      where key = 'cashfree'
      limit 1
    `;

    if (!row) {
      console.log("No cashfree row found in api_settings.");
      return;
    }

    const value = row.value ?? {};
    const currentVersion = value.apiVersion ?? "(not set)";
    console.log(`Current apiVersion: ${currentVersion}`);

    if (currentVersion === TARGET_API_VERSION) {
      console.log("Already up to date.");
      return;
    }

    const updated = { ...value, apiVersion: TARGET_API_VERSION };

    await sql`
      update api_settings
      set value = ${sql.json(updated)},
          updated_at = now()
      where key = 'cashfree'
    `;

    console.log(`Updated apiVersion from ${currentVersion} to ${TARGET_API_VERSION}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message ?? err);
  process.exit(1);
});
