import { z } from "zod";
import {
  blockedSignupEmailMessage,
  isBlockedSignupEmail,
} from "@/lib/auth/email-policy";

/** Sign-in / forgot-password: valid email only (no disposable block). */
const signInEmailField = z
  .string()
  .email({ message: "Please enter a valid email address" });

/** Sign-up only: block disposable / policy emails. */
const signupEmailField = signInEmailField.refine(
  (value) => !isBlockedSignupEmail(value),
  {
    message: blockedSignupEmailMessage,
  },
);

/** Create / reset password: min 8, no upper/number/symbol requirement. */
export const passwordMin8 = z
  .string()
  .min(8, {
    message: "Password must be at least 8 characters long",
  })
  .max(100);

/** Sign-in: must not enforce signup complexity — any non-empty password can be submitted. */
export const authSchema = z.object({
  email: signInEmailField,
  password: z.string().min(1, { message: "Password is required" }).max(100),
});

export const signupSchema = z.object({
  email: signupEmailField,
  name: z.string(),
  password: passwordMin8,
});

export const forgotPasswordEmailSchema = z.object({
  email: signInEmailField,
});

export const resetPasswordSchema = z
  .object({
    password: passwordMin8,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
