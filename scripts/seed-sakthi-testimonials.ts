/**
 * Seed homepage testimonials (text + video) for SRI SAI RAGHAVENDRA TEX.
 * Tamil Nadu customer samples — safe to re-run.
 * Run: npm run db:seed-testimonials
 */
import postgres from "postgres";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const SAKTHI_MEDIA_BASE =
  "https://qhtwwyqlsnckorndmhmt.supabase.co/storage/v1/object/public/media/sakthi/";

const TESTIMONIAL_IMAGES = [
  `${SAKTHI_MEDIA_BASE}saree-R-tapgdDCDppiSQlGdkRl.webp`,
  `${SAKTHI_MEDIA_BASE}saree-pdIkXPnfznIDPsDJ4k4PE.webp`,
  `${SAKTHI_MEDIA_BASE}saree-U0Rtn9BZSywuxw19vrXla.webp`,
  `${SAKTHI_MEDIA_BASE}saree-N2Osq4mnOsiSNYN62fSbu.webp`,
  `${SAKTHI_MEDIA_BASE}upload-yMQI_X4Up0VTMyFXk9ZU7.webp`,
  `${SAKTHI_MEDIA_BASE}upload-RzPrdVNd6zAdsxUqjC0WD.webp`,
] as const;

type MediaRow = {
  id: string;
  key: string;
  alt: string;
};

type TestimonialRow = {
  id: string;
  kind: "text" | "video";
  customer_name: string;
  location: string;
  quote: string | null;
  video_url: string | null;
  rating: number;
  featured_image_id: string | null;
  order: number;
};

const mediaRows: MediaRow[] = TESTIMONIAL_IMAGES.map((imageUrl, index) => ({
  id: `ssrt-tmedia-${index + 1}`,
  key: imageUrl,
  alt: `SRI SAI RAGHAVENDRA TEX customer — Tamil Nadu saree ${index + 1}`,
}));

const testimonialRows: TestimonialRow[] = [
  {
    id: "ssrt-t-v1",
    kind: "video",
    customer_name: "Anitha R.",
    location: "Erode, Tamil Nadu",
    quote:
      "In-store saree shopping at SRI SAI RAGHAVENDRA TEX — beautiful silks and friendly staff.",
    video_url: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
    rating: 5,
    featured_image_id: "ssrt-tmedia-1",
    order: 12,
  },
  {
    id: "ssrt-t1",
    kind: "text",
    customer_name: "Priya S.",
    location: "Salem, Tamil Nadu",
    quote:
      "Kanjivaram and soft silk quality is excellent. Honest Salem pricing — my favourite shop for Pongal and Diwali.",
    video_url: null,
    rating: 5,
    featured_image_id: "ssrt-tmedia-1",
    order: 11,
  },
  {
    id: "ssrt-t2",
    kind: "text",
    customer_name: "Lakshmi R.",
    location: "Coimbatore, Tamil Nadu",
    quote:
      "Ordered cotton sarees online — colours matched the photos and delivery to Coimbatore was quick. Very happy!",
    video_url: null,
    rating: 5,
    featured_image_id: "ssrt-tmedia-2",
    order: 10,
  },
  {
    id: "ssrt-t3",
    kind: "text",
    customer_name: "Meena K.",
    location: "Chennai, Tamil Nadu",
    quote:
      "They helped me pick the perfect wedding saree. Wholesale rates are fair and the collection is huge.",
    video_url: null,
    rating: 5,
    featured_image_id: "ssrt-tmedia-3",
    order: 9,
  },
  {
    id: "ssrt-t4",
    kind: "text",
    customer_name: "Divya M.",
    location: "Madurai, Tamil Nadu",
    quote:
      "Kubera pattu and fancy silk range is outstanding. Saree was packed carefully for courier — reached safely.",
    video_url: null,
    rating: 5,
    featured_image_id: "ssrt-tmedia-4",
    order: 8,
  },
  {
    id: "ssrt-t5",
    kind: "text",
    customer_name: "Revathi N.",
    location: "Tiruchirappalli, Tamil Nadu",
    quote:
      "Visited from Trichy — Elampillai silk cottons are genuine. Staff explained weave and border details clearly.",
    video_url: null,
    rating: 5,
    featured_image_id: "ssrt-tmedia-5",
    order: 7,
  },
  {
    id: "ssrt-t6",
    kind: "text",
    customer_name: "Karpagam V.",
    location: "Namakkal, Tamil Nadu",
    quote:
      "Regular customer for softie sarees. Quality is consistent and WhatsApp ordering is very convenient.",
    video_url: null,
    rating: 5,
    featured_image_id: "ssrt-tmedia-6",
    order: 6,
  },
  {
    id: "ssrt-t-v2",
    kind: "video",
    customer_name: "Kavitha P.",
    location: "Salem, Tamil Nadu",
    quote:
      "Festival saree pick from SRI SAI RAGHAVENDRA TEX — loved the drape and border finish.",
    video_url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    rating: 5,
    featured_image_id: "ssrt-tmedia-2",
    order: 5,
  },
  {
    id: "ssrt-t7",
    kind: "text",
    customer_name: "Shalini T.",
    location: "Tiruppur, Tamil Nadu",
    quote:
      "Silk cotton sarees for office wear — lightweight and elegant. Best value around Salem side.",
    video_url: null,
    rating: 5,
    featured_image_id: "ssrt-tmedia-3",
    order: 4,
  },
];

async function upsertMedia(row: MediaRow) {
  await sql`
    INSERT INTO medias (id, key, alt)
    VALUES (${row.id}, ${row.key}, ${row.alt})
    ON CONFLICT (id) DO UPDATE SET
      key = EXCLUDED.key,
      alt = EXCLUDED.alt
  `;
}

async function upsertTestimonial(row: TestimonialRow) {
  await sql`
    INSERT INTO testimonials (
      id, kind, customer_name, location, quote, video_url,
      rating, featured_image_id, is_published, "order"
    ) VALUES (
      ${row.id},
      ${row.kind},
      ${row.customer_name},
      ${row.location},
      ${row.quote},
      ${row.video_url},
      ${row.rating},
      ${row.featured_image_id},
      true,
      ${row.order}
    )
    ON CONFLICT (id) DO UPDATE SET
      kind = EXCLUDED.kind,
      customer_name = EXCLUDED.customer_name,
      location = EXCLUDED.location,
      quote = EXCLUDED.quote,
      video_url = EXCLUDED.video_url,
      rating = EXCLUDED.rating,
      featured_image_id = EXCLUDED.featured_image_id,
      is_published = EXCLUDED.is_published,
      "order" = EXCLUDED."order"
  `;
}

async function main() {
  try {
    console.log("Seeding testimonial images (Tamil Nadu saree photos)...");
    for (const media of mediaRows) {
      await upsertMedia(media);
      console.log("  media:", media.id);
    }

    console.log("Seeding Tamil Nadu customer testimonials...");
    for (const row of testimonialRows) {
      await upsertTestimonial(row);
      console.log("  OK:", row.kind, row.customer_name, "—", row.location);
    }

    const [{ count }] =
      await sql`SELECT count(*)::int AS count FROM testimonials WHERE is_published = true`;
    console.log("Published testimonials:", count);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
