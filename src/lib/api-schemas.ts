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

export const jobCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  client_id: z.string().uuid(),
  estimate_id: z.string().uuid().optional().nullable(),
  start_time: z.string().trim().min(1).max(100),
  end_time: z.string().trim().min(1).max(100),
  status: z.string().trim().max(50).optional(),
  location: optionalString,
  description: z.string().max(10000).optional(),
  estimated_duration: z.string().max(100).optional(),
  team_members: z.union([z.array(z.string()), z.string()]).optional(),
  equipment: z.union([z.array(z.string()), z.string()]).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
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
  description: z.string().max(2000).optional(),
  category: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(50).optional(),
  default_price: z.number().min(0).max(10_000_000).optional(),
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

export const signupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(128),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(50).optional(),
  company_name: z.string().trim().max(200).optional(),
  business_type: z.string().trim().max(100).optional(),
});

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
