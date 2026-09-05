import { z } from "zod";

const optionalString = z.string().trim().max(500).optional().nullable();
const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .nullable()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Invalid email",
  });

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: optionalEmail,
  phone: optionalString,
  address: optionalString,
  notes: z.string().trim().max(5000).optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  folder_id: z.string().uuid().optional().nullable(),
  /** Skip duplicate warning after the user confirms Create anyway. */
  allowDuplicate: z.boolean().optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

export const leadCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: optionalString,
  phone: optionalString,
  email: optionalEmail,
  value: z.number().min(0).max(100_000_000).optional(),
  status: z.string().trim().max(100).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  folder_id: z.string().uuid().optional().nullable(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().min(0).max(1_000_000),
  unit: z.string().trim().max(50).optional(),
  unit_price: z.number().min(0).max(10_000_000),
  total: z.number().min(0).max(10_000_000).optional(),
});

export const estimateCreateSchema = z.object({
  client_id: z.string().uuid(),
  lead_id: z.string().uuid().optional().nullable(),
  lineItems: z.array(lineItemSchema).max(200).default([]),
  contract_message: z.string().max(20000).optional().nullable(),
  send: z.boolean().optional(),
  schedule: z.boolean().optional(),
  complete: z.boolean().optional(),
});

export const sendEstimateEmailSchema = z.object({
  estimateId: z.string().uuid(),
  clientEmail: z.string().email(),
  clientName: z.string().trim().min(1).max(200),
});

export const sendInvoiceEmailSchema = z.object({
  invoiceId: z.string().uuid(),
  clientEmail: z.string().email(),
  clientName: z.string().trim().min(1).max(200),
});

// Field names match the payments table exactly. They previously did not: the
// schema wanted `method`, the UI sent `payment_method`, and the insert wrote
// `method`/`paid_at` to columns named `payment_method`/`payment_date`.
export const paymentCreateSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive().max(10_000_000),
  payment_method: z.string().trim().min(1).max(100),
  payment_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const checkoutBodySchema = z.object({
  priceId: z.string().startsWith("price_"),
});

// The Team page lists accepted members alongside pending invitations, so an
// update has to say which it is addressing.
export const teamMemberUpdateSchema = z.object({
  kind: z.enum(["member", "invitation"]).default("member"),
  role: z.enum(["Owner", "Admin", "Manager", "Worker"]).optional(),
  status: z.enum(["Active", "Disabled"]).optional(),
  receives_lead_alerts: z.boolean().optional(),
  calendar_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const teamInviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "worker"]).default("worker"),
  name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  receives_lead_alerts: z.boolean().optional(),
});

export const jobCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  client_id: z.string().uuid(),
  estimate_id: z.string().uuid().optional().nullable(),
  start_time: z.string().trim().min(1).max(100),
  end_time: z.string().trim().min(1).max(100),
  status: z.string().trim().max(50).optional(),
  location: optionalString,
  description: z.string().max(10000).optional(),
  estimated_duration: z.union([z.string().max(100), z.number()]).optional(),
  team_members: z.union([z.array(z.string()), z.string()]).optional(),
  equipment: z.union([z.array(z.string()), z.string()]).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  // Recurrence (null / omitted = one-time job)
  recurrence_freq: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
  recurrence_interval: z.number().int().min(1).max(365).optional(),
  recurrence_byweekday: z.array(z.enum(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'])).optional().nullable(),
  recurrence_until: z.string().trim().max(20).optional().nullable(),
  recurrence_count: z.number().int().min(1).max(1000).optional().nullable(),
  timezone: z.string().trim().max(100).optional().nullable(),
  is_anytime: z.boolean().optional(),
  line_items: z.array(lineItemSchema).max(50).optional(),
});

/** Partial update — same fields as create, all optional except we ignore unknown keys. */
export const jobUpdateSchema = jobCreateSchema.partial().extend({
  status: z.string().trim().max(50).optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(10000).optional(),
  status: z.string().trim().max(50).optional(),
  priority: z.string().trim().max(50).optional(),
  due_date: z.string().optional().nullable(),
  tags: z.array(z.string().trim().max(100)).max(50).optional(),
  client_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().trim().max(200).optional().nullable(),
});

export const materialCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  unit: z.string().trim().max(50).optional().nullable(),
  default_price: z.number().min(0).max(10_000_000).optional().nullable(),
  is_active: z.boolean().optional(),
  image_url: z.string().max(2000).optional().nullable(),
});

export const invoiceCreateSchema = z.object({
  client_id: z.string().uuid(),
  estimate_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  lineItems: z.array(lineItemSchema).max(200).default([]),
  due_date: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional(),
  send: z.boolean().optional(),
  payment_method: z.string().trim().max(100).optional(),
  payment_email: optionalEmail,
});

export const automationCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  trigger_event: z.string().trim().min(1).max(100),
  trigger_filter: z.record(z.string(), z.unknown()).optional().nullable(),
  action_type: z.string().trim().min(1).max(100),
  action_config: z.record(z.string(), z.unknown()).optional(),
  action_payload: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export const automationUpdateSchema = automationCreateSchema.partial();

export const pipelineStageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().trim().max(50).optional(),
  position: z.number().int().min(0).max(1000).optional(),
});

export const clientFolderSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().trim().max(50).optional(),
  description: z.string().max(500).optional(),
});

const signupTeamSizeSchema = z.enum(["solo", "2-5", "6-10", "11-15", "16+"]);
const signupYearsSchema = z.enum(["lt1", "1-3", "3-5", "5-10", "10+"]);
const signupGoalSchema = z.enum([
  "scheduling",
  "quoting",
  "invoicing",
  "payments",
  "team",
  "marketing",
  "other",
]);
const signupReferralSchema = z.enum([
  "google_search",
  "social_media",
  "friend_referral",
  "trade_show",
  "youtube",
  "podcast",
  "other",
]);
const signupRevenueSchema = z.enum([
  "under_100k",
  "100k-500k",
  "500k-1m",
  "1m-5m",
  "5m+",
  "prefer_not_to_say",
]);

export const signupOnboardingFieldsSchema = z.object({
  marketing_opt_in: z.boolean().optional(),
  team_size: signupTeamSizeSchema.optional(),
  years_in_business: signupYearsSchema.optional(),
  primary_goals: z.array(signupGoalSchema).max(5).optional(),
  referral_source: signupReferralSchema.optional(),
  estimated_revenue: signupRevenueSchema.optional(),
  referral_code: z.string().trim().max(50).optional(),
});

export const signupSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(6).max(128),
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(50).optional(),
    company_name: z.string().trim().min(1).max(200),
    business_type: z.string().trim().min(1).max(100),
    captchaToken: z.string().optional(),
  })
  .merge(signupOnboardingFieldsSchema);

export const completeSignupSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(50).optional(),
    company_name: z.string().trim().min(1).max(200),
    business_type: z.string().trim().min(1).max(100),
  })
  .merge(signupOnboardingFieldsSchema);

export const userProfileUpdateSchema = z.object({
  first_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  full_name: z.string().trim().max(200).optional(),
  date_of_birth: z.string().max(30).optional().nullable(),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  zip_code: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  company_name: z.string().trim().max(200).optional(),
  job_title: z.string().trim().max(200).optional(),
  business_type: z.string().trim().max(100).optional(),
  avatar_url: z.string().max(2000).optional().nullable(),
});

export const clientsListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  client_id: z.string().uuid().optional(),
});
