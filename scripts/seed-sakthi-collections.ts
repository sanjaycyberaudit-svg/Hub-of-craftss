/**
 * Add Sakthi Textiles saree categories to Supabase (safe upsert — does not delete products).
 *
 * Usage:
 *   npm run db:seed-collections
 *   npm run db:seed-collections -- --remove-demo
 */
import seedSakthiCollections from "../src/lib/supabase/seedData/sakthiCollections";

const removeDemo = process.argv.includes("--remove-demo");

seedSakthiCollections({ removeDemo })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
