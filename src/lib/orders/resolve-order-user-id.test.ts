import { resolveOrderUserId } from "./resolve-order-user-id";

describe("resolveOrderUserId", () => {
  it("links orders to the signed-in account", () => {
    expect(resolveOrderUserId("user-123")).toBe("user-123");
  });

  it("leaves guest orders unlinked", () => {
    expect(resolveOrderUserId(undefined)).toBeNull();
    expect(resolveOrderUserId(null)).toBeNull();
  });
});
