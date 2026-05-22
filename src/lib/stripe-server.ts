import Stripe from "stripe";
import { STRIPE_API_VERSION } from "@/lib/stripe-subscription";

export function createStripeClient(secretKey?: string): Stripe {
  const key = secretKey ?? process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}
