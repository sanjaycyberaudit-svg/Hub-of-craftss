import {
  authSchema,
  signupSchema,
  resetPasswordSchema,
  forgotPasswordEmailSchema,
} from "./index";

describe("auth password rules", () => {
  it("allows sign-in with a simple password (no complexity)", () => {
    const result = authSchema.safeParse({
      email: "buyer@example.com",
      password: "simplepw",
    });
    expect(result.success).toBe(true);
  });

  it("does not require uppercase/number/symbol on sign-in", () => {
    const result = authSchema.safeParse({
      email: "buyer@example.com",
      password: "abcdefgh",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty sign-in password", () => {
    const result = authSchema.safeParse({
      email: "buyer@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows signup with min 8 chars and no symbol/upper/number", () => {
    const result = signupSchema.safeParse({
      email: "buyer@gmail.com",
      name: "Buyer",
      password: "simplepw",
    });
    expect(result.success).toBe(true);
  });

  it("rejects signup passwords shorter than 8", () => {
    const result = signupSchema.safeParse({
      email: "buyer@gmail.com",
      name: "Buyer",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("allows reset with min 8 and no complexity", () => {
    const result = resetPasswordSchema.safeParse({
      password: "newpass1",
      confirmPassword: "newpass1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched reset passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "newpass12",
      confirmPassword: "newpass99",
    });
    expect(result.success).toBe(false);
  });

  it("accepts any valid email on forgot-password (no disposable gate)", () => {
    const result = forgotPasswordEmailSchema.safeParse({
      email: "someone@mailinator.com",
    });
    expect(result.success).toBe(true);
  });
});
