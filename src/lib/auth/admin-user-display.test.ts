import type { User } from "@supabase/supabase-js";

import { resolveAdminUserDisplay } from "@/lib/auth/admin-user-display";

function makeUser(partial: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): User {
  return {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: partial.email,
    user_metadata: partial.user_metadata ?? {},
    app_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
  } as User;
}

describe("resolveAdminUserDisplay", () => {
  it("prefers metadata name and avatar fields", () => {
    const profile = resolveAdminUserDisplay(
      makeUser({
        email: "admin@example.com",
        user_metadata: {
          name: "Sanjay Arun",
          avatar_url: "https://cdn.example.com/avatar.png",
        },
      }),
    );

    expect(profile.name).toBe("Sanjay Arun");
    expect(profile.initials).toBe("SA");
    expect(profile.avatarUrl).toBe("https://cdn.example.com/avatar.png");
    expect(profile.useUserIconFallback).toBe(false);
  });

  it("falls back to email local-part and user icon when name is empty", () => {
    const profile = resolveAdminUserDisplay(
      makeUser({
        email: "shop.owner@example.com",
        user_metadata: {},
      }),
    );

    expect(profile.name).toBe("shop.owner");
    expect(profile.initials).toBe("S");
    expect(profile.useUserIconFallback).toBe(false);
  });
});
