import { unwrapJsonRecord, unwrapJsonValue } from "@/lib/supabase/json-column";

describe("json-column unwrap", () => {
  it("returns objects unchanged", () => {
    expect(unwrapJsonRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it("unwraps JSON string scalars", () => {
    expect(unwrapJsonRecord(JSON.stringify({ stockReserved: true }))).toEqual({
      stockReserved: true,
    });
  });

  it("unwraps double-encoded strings", () => {
    const double = JSON.stringify(JSON.stringify({ ok: true }));
    expect(unwrapJsonRecord(double)).toEqual({ ok: true });
  });

  it("unwraps arrays", () => {
    expect(unwrapJsonValue(JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("returns null for non-objects in unwrapJsonRecord", () => {
    expect(unwrapJsonRecord(JSON.stringify([1, 2]))).toBeNull();
    expect(unwrapJsonRecord(null)).toBeNull();
  });
});
