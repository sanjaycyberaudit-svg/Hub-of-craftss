import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

function maskSecret(secret) {
  if (!secret || secret.length < 12) return "(missing)";
  return `${secret.slice(0, 8)}…${secret.slice(-4)}`;
}

try {
  const [settings] = await sql`
    select value, is_enabled
    from api_settings
    where key = 'velo_order_push'
    limit 1
  `;

  if (!settings?.is_enabled || !settings?.value?.pushSecret) {
    console.log(JSON.stringify({ ok: false, step: "config", error: "velo_order_push not configured" }));
    process.exit(1);
  }

  const pushSecret = String(settings.value.pushSecret).trim();
  const pushUrl = String(settings.value.pushUrl || "").trim().replace(/\/$/, "");
  const shopBaseUrl = String(settings.value.shopBaseUrl || "").trim().replace(/\/$/, "");

  const [latestPaid] = await sql`
    select
      id,
      name,
      payment_status,
      payment_meta,
      created_at
    from orders
    where payment_status = 'paid'
    order by created_at desc
    limit 1
  `;

  const testOrderId = latestPaid?.id ?? `test-${Date.now()}`;
  const payload = {
    shopBaseUrl,
    orderId: testOrderId,
    customerName: String(latestPaid?.name ?? "Test Customer").trim() || "Test Customer",
    quantity: 1,
  };

  const response = await fetch(pushUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-velo-push-secret": pushSecret,
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text().catch(() => "");
  let bodyJson = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = bodyText.slice(0, 300) || null;
  }

  const recentPaid = await sql`
    select
      id,
      payment_meta->>'veloPushNotified' as velo_notified,
      payment_meta->>'veloPushLastError' as velo_error,
      created_at
    from orders
    where payment_status = 'paid'
    order by created_at desc
    limit 3
  `;

  console.log(
    JSON.stringify(
      {
        ok: response.ok,
        step: "velo_push_test",
        shopBaseUrl,
        pushUrl,
        secret: maskSecret(pushSecret),
        testOrderId,
        httpStatus: response.status,
        veloResponse: bodyJson,
        recentPaidOrders: recentPaid.map((row) => ({
          id: row.id,
          veloNotified: row.velo_notified,
          veloError: row.velo_error,
          createdAt: row.created_at,
        })),
      },
      null,
      2,
    ),
  );

  process.exit(response.ok ? 0 : 1);
} finally {
  await sql.end();
}
