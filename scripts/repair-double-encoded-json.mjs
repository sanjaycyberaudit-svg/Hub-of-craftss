/**
 * Repair double-encoded JSON columns caused by drizzle 0.29 + postgres.js.
 * Safe to re-run: only touches rows where json_typeof(...) = 'string'.
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function countTypes(table, column) {
  return sql.unsafe(`
    SELECT json_typeof(${column}) AS t, count(*)::int AS c
    FROM ${table}
    WHERE ${column} IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `);
}

try {
  console.log("=== BEFORE ===");
  console.log("orders.payment_meta", await countTypes("orders", "payment_meta"));
  console.log("api_settings.value", await countTypes("api_settings", "value"));
  console.log("products.tags", await countTypes("products", "tags"));
  console.log("products.images", await countTypes("products", "images"));

  await sql.begin(async (tx) => {
    const payment = await tx`
      UPDATE orders
      SET payment_meta = (payment_meta #>> '{}')::json
      WHERE payment_meta IS NOT NULL
        AND json_typeof(payment_meta) = 'string'
        AND (
          (payment_meta #>> '{}') LIKE '{%'
          OR (payment_meta #>> '{}') LIKE '[%'
        )
    `;
    console.log("repaired orders.payment_meta:", payment.count);

    const settings = await tx`
      UPDATE api_settings
      SET value = (value #>> '{}')::json
      WHERE value IS NOT NULL
        AND json_typeof(value) = 'string'
        AND (
          (value #>> '{}') LIKE '{%'
          OR (value #>> '{}') LIKE '[%'
        )
    `;
    console.log("repaired api_settings.value:", settings.count);

    const tags = await tx`
      UPDATE products
      SET tags = (tags #>> '{}')::json
      WHERE tags IS NOT NULL
        AND json_typeof(tags) = 'string'
        AND (
          (tags #>> '{}') LIKE '{%'
          OR (tags #>> '{}') LIKE '[%'
        )
    `;
    console.log("repaired products.tags:", tags.count);

    const images = await tx`
      UPDATE products
      SET images = (images #>> '{}')::json
      WHERE images IS NOT NULL
        AND json_typeof(images) = 'string'
        AND (
          (images #>> '{}') LIKE '{%'
          OR (images #>> '{}') LIKE '[%'
        )
    `;
    console.log("repaired products.images:", images.count);
  });

  console.log("\n=== AFTER ===");
  console.log("orders.payment_meta", await countTypes("orders", "payment_meta"));
  console.log("api_settings.value", await countTypes("api_settings", "value"));
  console.log("products.tags", await countTypes("products", "tags"));
  console.log("products.images", await countTypes("products", "images"));
} catch (e) {
  console.log("ERR", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
