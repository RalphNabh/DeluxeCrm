import { z } from "zod";

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const paymentCreateSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive().max(10_000_000),
  method: z.string().trim().min(1).max(100),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const checkoutBodySchema = z.object({
  priceId: z.string().startsWith("price_"),
});
