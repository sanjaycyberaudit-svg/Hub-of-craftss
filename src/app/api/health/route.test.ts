/** @jest-environment node */

jest.mock("../../../lib/supabase/db", () => ({
  __esModule: true,
  default: {
    execute: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

jest.mock("../../../lib/cache/redis", () => ({
  isRedisCacheEnabled: jest.fn(() => false),
  redisGet: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

function mockRequest(url: string) {
  return new NextRequest(url);
}

describe("/api/health", () => {
  it("returns shallow ok without hitting the database", async () => {
    const response = await GET(
      mockRequest("https://hubsofcraftss.com/api/health"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      mode: "shallow",
      service: "hub-of-craftss",
    });
    expect(body.checks).toBeUndefined();
  });

  it("requires deep=1 before running database checks", async () => {
    const response = await GET(
      mockRequest("https://hubsofcraftss.com/api/health?deep=1"),
    );
    const body = await response.json();

    expect(body.mode).toBe("deep");
    expect(body.checks).toBeDefined();
    expect(["ok", "degraded"]).toContain(body.status);
    expect([200, 503]).toContain(response.status);
  });
});
