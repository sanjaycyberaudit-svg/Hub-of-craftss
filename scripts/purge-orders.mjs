import postgres from "postgres";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const [orderCount] = await sql`SELECT COUNT(*)::int AS c FROM orders`;
  const [lineCount] = await sql`SELECT COUNT(*)::int AS c FROM order_lines`;

  console.log(`Before purge: ${orderCount.c} orders, ${lineCount.c} order lines`);

  if (orderCount.c === 0 && lineCount.c === 0) {
    console.log("Nothing to delete.");
    process.exit(0);
  }

  await sql.begin(async (tx) => {
    const deletedLines = await tx`DELETE FROM order_lines RETURNING id`;
    const deletedOrders = await tx`DELETE FROM orders RETURNING id`;
    console.log(
      `Deleted ${deletedLines.length} order lines and ${deletedOrders.length} orders.`,
    );
  });

  const [afterOrders] = await sql`SELECT COUNT(*)::int AS c FROM orders`;
  const [afterLines] = await sql`SELECT COUNT(*)::int AS c FROM order_lines`;
  console.log(`After purge: ${afterOrders.c} orders, ${afterLines.c} order lines`);
} finally {
  await sql.end();
}
