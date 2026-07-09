import { z } from "zod";
import { INDIAN_STATES } from "../constants/indianStates";

export const addressFormSchema = z.object({
  fullName: z
    .string()
    .min(2, "Enter your full name")
    .max(120, "Name is too long"),
  email: z.string().email("Enter a valid email address"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().min(5, "Enter your full address").max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2, "Enter city").max(80),
  state: z
    .string()
    .min(1, "Select a state")
    .refine(
      (value) =>
        INDIAN_STATES.includes(value as (typeof INDIAN_STATES)[number]),
      "Select a state",
    ),
  postal_code: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;

export type SavedShippingAddress = AddressFormValues & {
  addressId: string;
};
