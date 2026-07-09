import postgres from "postgres";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  await sql.unsafe(`
    WITH users_missing_default AS (
      SELECT DISTINCT "userProfileId"
      FROM address
      WHERE "userProfileId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM address d
          WHERE d."userProfileId" = address."userProfileId"
            AND d.is_default = true
        )
    ),
    pick AS (
      SELECT
        a.id,
        ROW_NUMBER() OVER (
          PARTITION BY a."userProfileId"
          ORDER BY a.created_at DESC NULLS LAST, a.id DESC
        ) AS rn
      FROM address a
      JOIN users_missing_default u ON u."userProfileId" = a."userProfileId"
    )
    UPDATE address a
    SET is_default = true
    FROM pick p
    WHERE a.id = p.id AND p.rn = 1
  `);

  const perUser = await sql`
    SELECT
      "userProfileId",
      count(*)::int AS total,
      count(*) FILTER (WHERE is_default)::int AS defaults
    FROM address
    WHERE "userProfileId" IS NOT NULL
    GROUP BY "userProfileId"
    ORDER BY total DESC
  `;

  const [summary] = await sql`
    SELECT
      count(*)::int AS total,
      count(DISTINCT "userProfileId")::int AS users,
      count(*) FILTER (WHERE is_default)::int AS default_rows
    FROM address
    WHERE "userProfileId" IS NOT NULL
  `;

  console.log("Summary:", summary);
  console.log("Per user:", perUser);
} finally {
  await sql.end();
}
