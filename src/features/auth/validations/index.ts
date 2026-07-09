import { z } from "zod";
import {
  blockedSignupEmailMessage,
  isBlockedSignupEmail,
} from "@/lib/auth/email-policy";

const emailField = z
  .string()
  .email({ message: "Please enter a valid email address" })
  .refine((value) => !isBlockedSignupEmail(value), {
    message: blockedSignupEmailMessage,
  });

export const authSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/, {
      message:
        "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character",
    }),
});

export const signupSchema = z.object({
  email: emailField,
  name: z.string(),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/, {
      message:
        "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character",
    }),
});

export const forgotPasswordEmailSchema = z.object({
  email: emailField,
});
