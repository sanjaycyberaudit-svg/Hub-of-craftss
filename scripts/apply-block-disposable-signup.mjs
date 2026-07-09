/**
 * Block disposable/test emails at auth.users INSERT (stops bots even if they bypass the website).
 * Run: node scripts/apply-block-disposable-signup.mjs
 */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const triggerSql = `
CREATE OR REPLACE FUNCTION public.block_disposable_auth_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lower_email text := lower(coalesce(NEW.email, ''));
  domain text;
BEGIN
  IF lower_email = '' THEN
    RETURN NEW;
  END IF;

  domain := split_part(lower_email, '@', 2);

  IF domain IN (
    'yopmail.com', 'yopmail.fr', 'yopmail.net',
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
    '10minutemail.com', 'tempmail.com', 'temp-mail.org',
    'throwaway.email', 'fakeinbox.com', 'trashmail.com',
    'example.com', 'example.org', 'test.com'
  )
  OR lower_email LIKE 'ssrtex.verify.%'
  OR lower_email LIKE 'auth.verify.%'
  OR domain LIKE '%yopmail.%'
  OR domain LIKE '%mailinator.%'
  THEN
    RAISE EXCEPTION 'Disposable or test email addresses are not allowed'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_disposable_auth_signup ON auth.users;

CREATE TRIGGER block_disposable_auth_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.block_disposable_auth_signup();
`;

try {
  await sql.unsafe(triggerSql);
  console.log("Installed block_disposable_auth_signup trigger on auth.users.");
} finally {
  await sql.end();
}
