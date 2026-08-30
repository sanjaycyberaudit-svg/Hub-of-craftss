import {
  TRANSACTION_POOLER_PORT,
  SESSION_POOLER_PORT,
  buildSupabasePoolerUrl,
  normalizePoolerDatabaseUrl,
  resolveDatabaseUrl,
  describeDatabaseUrl,
} from "./resolve-database-url";

const SESSION_URL =
  "postgresql://postgres.xytdexahcdyhykvuwpys:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
const TRANSACTION_URL =
  "postgresql://postgres.xytdexahcdyhykvuwpys:secret@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";
const AWS0_URL =
  "postgresql://postgres.xytdexahcdyhykvuwpys:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

describe("resolve-database-url (Hub)", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SUPABASE_DB_SESSION_POOLER;
    delete process.env.SUPABASE_DB_POOLER_URL;
    delete process.env.SUPABASE_DB_FORCE_TRANSACTION_POOLER;
    delete process.env.VERCEL;
  });

  afterAll(() => {
    process.env = env;
  });

  it("builds transaction pooler URL on aws-1 by default", () => {
    const url = buildSupabasePoolerUrl({
      projectRef: "xytdexahcdyhykvuwpys",
      password: "p@ss",
    });
    expect(url).toContain(`:${TRANSACTION_POOLER_PORT}/postgres`);
    expect(url).toContain("aws-1-ap-south-1.pooler.supabase.com");
  });

  it("builds session pooler when explicitly requested", () => {
    process.env.SUPABASE_DB_SESSION_POOLER = "true";
    const url = buildSupabasePoolerUrl({
      projectRef: "xytdexahcdyhykvuwpys",
      password: "p@ss",
    });
    expect(url).toContain(`:${SESSION_POOLER_PORT}/postgres`);
  });

  it("rewrites session pooler to transaction by default", () => {
    const result = normalizePoolerDatabaseUrl(SESSION_URL);
    expect(result.url).toContain(`:${TRANSACTION_POOLER_PORT}/`);
    expect(result.rewrites).toContain(
      `:${SESSION_POOLER_PORT} session → :${TRANSACTION_POOLER_PORT} transaction`,
    );
  });

  it("keeps session pooler when SUPABASE_DB_SESSION_POOLER=true", () => {
    process.env.SUPABASE_DB_SESSION_POOLER = "true";
    const result = normalizePoolerDatabaseUrl(SESSION_URL);
    expect(result.url).toContain(`:${SESSION_POOLER_PORT}/`);
    expect(result.rewrites).toHaveLength(0);
  });

  it("keeps transaction pooler unchanged", () => {
    const result = normalizePoolerDatabaseUrl(TRANSACTION_URL);
    expect(result.url).toBe(TRANSACTION_URL);
    expect(result.rewrites).toHaveLength(0);
  });

  it("rewrites aws-0 host to aws-1 for Hub", () => {
    const result = normalizePoolerDatabaseUrl(AWS0_URL);
    expect(result.url).toContain("aws-1-ap-south-1.pooler.supabase.com");
    expect(result.url).toContain(`:${TRANSACTION_POOLER_PORT}/`);
    expect(result.rewrites).toEqual(
      expect.arrayContaining([
        "aws-0 host → aws-1",
        `:${SESSION_POOLER_PORT} session → :${TRANSACTION_POOLER_PORT} transaction`,
      ]),
    );
  });

  it("rewrites legacy db.<ref>.supabase.co to aws-1 transaction pooler", () => {
    const legacy =
      "postgresql://postgres:xxx@db.xytdexahcdyhykvuwpys.supabase.co:5432/postgres";
    const url = resolveDatabaseUrl(legacy);
    expect(url).toContain("aws-1-ap-south-1.pooler.supabase.com");
    expect(url).toContain(`:${TRANSACTION_POOLER_PORT}/postgres`);
  });

  it("describes resolved host and port", () => {
    const info = describeDatabaseUrl(SESSION_URL);
    expect(info.pooler).toBe(true);
    expect(info.port).toBe(String(TRANSACTION_POOLER_PORT));
    expect(info.host).toContain("aws-1-ap-south-1.pooler.supabase.com");
  });
});
