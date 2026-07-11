import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local", override: true });

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: "require",
});

const contact = {
  addressLines: [
    "No 162, Kasim Residency",
    "Sarojini Nagar",
    "Madurai – 625107, Tamil Nadu",
  ],
  gstin: "",
  email: "",
  contacts: [{ name: "Shaaru", phone: "" }],
};

const social = {
  instagram: "https://www.instagram.com/hub_of_craftss_by_shaaru/",
  youtube: "",
  facebook: "",
  whatsapp: "",
};

const announcements = {
  announcements: [
    {
      id: "line-1",
      text: "Terracotta raw materials & art craft supplies — Make · Craft · Create",
      href: "/shop",
      cta: "Shop now",
    },
    {
      id: "line-2",
      text: "Follow @hub_of_craftss_by_shaaru for new arrivals",
      href: "https://www.instagram.com/hub_of_craftss_by_shaaru/",
      cta: "Instagram",
    },
    {
      id: "line-3",
      text: "Visit us in Madurai · Sarojini Nagar",
      href: "/contact",
      cta: "Contact",
    },
  ],
};

async function upsert(key, value, isEnabled = true) {
  await sql`
    insert into api_settings (key, value, is_enabled, updated_at)
    values (
      ${key},
      ${sql.json(value)},
      ${isEnabled},
      now()
    )
    on conflict (key) do update set
      value = excluded.value,
      is_enabled = excluded.is_enabled,
      updated_at = now()
  `;
  console.log("upserted", key, "enabled=", isEnabled);
}

await upsert("storefront_contact", contact);
await upsert("storefront_social", social);
await upsert("announcement_bar", announcements);
await upsert("home_banner_slides", { slides: [] }, false);

const rows = await sql`select key, is_enabled from api_settings order by key`;
console.log(
  "settings:",
  rows.map((r) => `${r.key}=${r.is_enabled}`).join(", "),
);

await sql.end();
