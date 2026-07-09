import postgres from "postgres";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const sql = postgres(connectionString, { prepare: false, max: 1 });

const sandboxOrderFilter = sql`
  lower(
    coalesce(
      CASE
        WHEN jsonb_typeof(payment_meta::jsonb) = 'string'
          THEN (payment_meta::jsonb #>> '{}')::jsonb ->> 'paymentEnvironment'
        ELSE payment_meta::jsonb ->> 'paymentEnvironment'
      END,
      ''
    )
  ) IN ('sandbox', 'test')
  OR lower(
    coalesce(
      CASE
        WHEN jsonb_typeof(payment_meta::jsonb) = 'string'
          THEN (payment_meta::jsonb #>> '{}')::jsonb ->> 'inventorySkippedReason'
        ELSE payment_meta::jsonb ->> 'inventorySkippedReason'
      END,
      ''
    )
  ) = 'test_or_non_production_payment'
`;

try {
  const sandboxOrders = await sql`
    SELECT id, email, amount, payment_status, order_status, payment_provider,
           CASE
             WHEN jsonb_typeof(payment_meta::jsonb) = 'string'
               THEN (payment_meta::jsonb #>> '{}')::jsonb ->> 'paymentEnvironment'
             ELSE payment_meta::jsonb ->> 'paymentEnvironment'
           END AS payment_environment,
           created_at
    FROM orders
    WHERE ${sandboxOrderFilter}
    ORDER BY created_at ASC
  `;

  console.log(`Found ${sandboxOrders.length} sandbox order(s).`);
  for (const order of sandboxOrders) {
    console.log(
      `- ${order.id} | ${order.created_at} | ${order.payment_status} | ₹${order.amount} | ${order.email ?? "no email"}`,
    );
  }

  if (sandboxOrders.length === 0) {
    console.log("Nothing to delete.");
    process.exit(0);
  }

  if (dryRun) {
    console.log("Dry run only — no rows deleted.");
    process.exit(0);
  }

  const orderIds = sandboxOrders.map((order) => order.id);

  await sql.begin(async (tx) => {
    const deletedLines = await tx`
      DELETE FROM order_lines
      WHERE "orderId" IN ${tx(orderIds)}
      RETURNING id
    `;
    const deletedOrders = await tx`
      DELETE FROM orders
      WHERE id IN ${tx(orderIds)}
      RETURNING id
    `;
    console.log(
      `Deleted ${deletedLines.length} order line(s) and ${deletedOrders.length} order(s).`,
    );
  });

  const [afterOrders] = await sql`SELECT COUNT(*)::int AS c FROM orders`;
  console.log(`Remaining orders: ${afterOrders.c}`);
} finally {
  await sql.end();
}
