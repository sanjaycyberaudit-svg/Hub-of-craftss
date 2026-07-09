import { z } from "zod";

export const AddProductToCartSchema = z.object({
  quantity: z.number().min(1).max(999),
});

export type AddProductCartData = z.infer<typeof AddProductToCartSchema>;
