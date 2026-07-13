import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type SubscriptionBillingRow = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status?: string | null;
};

export type DeleteAccountResult =
  | { ok: true; canceledSubscriptions: number; deletedOrgs: number }
  | { ok: false; status: number; error: string; code?: string };

/** Stripe errors that mean billing is already gone — safe to continue. */
export function isBenignStripeCancelError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; statusCode?: number; message?: string };
  const msg = (e.message || "").toLowerCase();
  return (
    e.code === "resource_missing" ||
    e.statusCode === 404 ||
    msg.includes("no such subscription") ||
    msg.includes("no such customer") ||
    msg.includes("already canceled") ||
    msg.includes("already cancelled")
  );
}

export async function cancelStripeSubscriptions(
  stripe: Stripe,
  rows: SubscriptionBillingRow[],
): Promise<{ canceled: number; errors: string[] }> {
  const errors: string[] = [];
  let canceled = 0;
  const seenSubs = new Set<string>();
  const seenCustomers = new Set<string>();

  for (const row of rows) {
    const subId = row.stripe_subscription_id?.trim();
    if (subId && !seenSubs.has(subId)) {
      seenSubs.add(subId);
      try {
        await stripe.subscriptions.cancel(subId);
        canceled += 1;
      } catch (error) {
        if (!isBenignStripeCancelError(error)) {
          errors.push(
            error instanceof Error
              ? error.message
              : `Failed to cancel subscription ${subId}`,
          );
        }
      }
    }

    const customerId = row.stripe_customer_id?.trim();
    if (customerId && !seenCustomers.has(customerId)) {
      seenCustomers.add(customerId);
      try {
        // Cancels remaining subscriptions and removes the customer
        await stripe.customers.del(customerId);
      } catch (error) {
        if (!isBenignStripeCancelError(error)) {
          errors.push(
            error instanceof Error
              ? error.message
              : `Failed to delete Stripe customer ${customerId}`,
          );
        }
      }
    }
  }

  return { canceled, errors };
}

async function deleteByIds(
  admin: SupabaseClient,
  table: string,
  column: string,
  ids: string[],
) {
  if (ids.length === 0) return;
  // Chunk to stay under PostgREST URL limits
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await admin.from(table).delete().in(column, chunk);
  }
}

async function idsFor(
  admin: SupabaseClient,
  table: string,
  filterColumn: string,
  filterValue: string,
): Promise<string[]> {
  const { data } = await admin
    .from(table)
    .select("id")
    .eq(filterColumn, filterValue);
  return (data ?? []).map((r) => r.id as string);
}

/** Wipe CRM data for one organization (owner account deletion). */
export async function deleteOrganizationData(
  admin: SupabaseClient,
  orgId: string,
): Promise<void> {
  const invoiceIds = await idsFor(admin, "invoices", "organization_id", orgId);
  const estimateIds = await idsFor(admin, "estimates", "organization_id", orgId);
  const jobIds = await idsFor(admin, "jobs", "organization_id", orgId);
  const clientIds = await idsFor(admin, "clients", "organization_id", orgId);
  const conversationIds = await idsFor(
    admin,
    "conversations",
    "organization_id",
    orgId,
  );

  await deleteByIds(admin, "invoice_line_items", "invoice_id", invoiceIds);
  await deleteByIds(admin, "payments", "invoice_id", invoiceIds);
  await deleteByIds(admin, "estimate_line_items", "estimate_id", estimateIds);
  await deleteByIds(admin, "job_notes", "job_id", jobIds);
  await deleteByIds(admin, "job_photos", "job_id", jobIds);
  await deleteByIds(admin, "job_equipment", "job_id", jobIds);
  await deleteByIds(admin, "job_assignments", "job_id", jobIds);
  await deleteByIds(admin, "messages", "conversation_id", conversationIds);

  await admin.from("conversations").delete().eq("organization_id", orgId);
  await admin.from("service_requests").delete().eq("organization_id", orgId);
  await admin.from("client_portal_users").delete().eq("organization_id", orgId);
  await admin
    .from("client_portal_invitations")
    .delete()
    .eq("organization_id", orgId);
  await admin.from("client_assignments").delete().eq("org_id", orgId);

  await admin.from("automation_runs").delete().eq("organization_id", orgId);
  await admin.from("automations").delete().eq("organization_id", orgId);
  await admin.from("email_templates").delete().eq("organization_id", orgId);
  await admin.from("invoices").delete().eq("organization_id", orgId);
  await admin.from("estimates").delete().eq("organization_id", orgId);
  await admin.from("jobs").delete().eq("organization_id", orgId);
  await admin.from("leads").delete().eq("organization_id", orgId);
  await admin.from("tasks").delete().eq("organization_id", orgId);
  await admin.from("materials").delete().eq("organization_id", orgId);
  await admin.from("pipeline_stages").delete().eq("organization_id", orgId);
  await admin.from("team_members").delete().eq("organization_id", orgId);
  await admin.from("client_folders").delete().eq("organization_id", orgId);
  await admin.from("clients").delete().eq("organization_id", orgId);

  await deleteByIds(admin, "clients", "id", clientIds); // no-op if already gone

  await admin.from("organization_invitations").delete().eq("org_id", orgId);
  await admin.from("organization_members").delete().eq("org_id", orgId);
  await admin.from("subscriptions").delete().eq("organization_id", orgId);

  // Clear profile pointers so org delete isn't blocked by FKs
  await admin
    .from("user_profiles")
    .update({ active_org_id: null })
    .eq("active_org_id", orgId);

  const { error: orgDeleteError } = await admin
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (orgDeleteError) {
    throw new Error(
      `Failed to delete organization: ${orgDeleteError.message}`,
    );
  }
}

/** Delete remaining rows keyed only by this user (after org wipe / leave). */
export async function deleteUserScopedData(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const invoiceIds = await idsFor(admin, "invoices", "user_id", userId);
  const estimateIds = await idsFor(admin, "estimates", "user_id", userId);
  const jobIds = await idsFor(admin, "jobs", "user_id", userId);

  await deleteByIds(admin, "invoice_line_items", "invoice_id", invoiceIds);
  await deleteByIds(admin, "payments", "invoice_id", invoiceIds);
  await deleteByIds(admin, "estimate_line_items", "estimate_id", estimateIds);
  await deleteByIds(admin, "job_notes", "job_id", jobIds);
  await deleteByIds(admin, "job_photos", "job_id", jobIds);
  await deleteByIds(admin, "job_equipment", "job_id", jobIds);
  await deleteByIds(admin, "job_assignments", "job_id", jobIds);

  await admin.from("job_assignments").delete().eq("user_id", userId);
  await admin.from("automation_runs").delete().eq("user_id", userId);
  await admin.from("automations").delete().eq("user_id", userId);
  await admin.from("email_templates").delete().eq("user_id", userId);
  await admin.from("invoices").delete().eq("user_id", userId);
  await admin.from("estimates").delete().eq("user_id", userId);
  await admin.from("jobs").delete().eq("user_id", userId);
  await admin.from("leads").delete().eq("user_id", userId);
  await admin.from("tasks").delete().eq("user_id", userId);
  await admin.from("materials").delete().eq("user_id", userId);
  await admin.from("pipeline_stages").delete().eq("user_id", userId);
  await admin.from("team_members").delete().eq("user_id", userId);
  await admin.from("client_folders").delete().eq("user_id", userId);
  await admin.from("clients").delete().eq("user_id", userId);
  await admin.from("affiliates").delete().eq("user_id", userId);
  await admin.from("subscriptions").delete().eq("user_id", userId);
  await admin.from("organization_members").delete().eq("user_id", userId);
  await admin.from("client_portal_users").delete().eq("auth_user_id", userId);

  // Optional AI tables — ignore if missing
  await admin.from("ai_estimate_sessions").delete().eq("user_id", userId);
  await admin.from("ai_estimate_usage").delete().eq("user_id", userId);

  await admin.from("user_profiles").delete().eq("user_id", userId);
  await admin.from("user_profiles").delete().eq("id", userId);
}

export async function cleanupUserStorage(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  // Materials may store an image URL/path depending on schema version
  const { data: materials } = await admin
    .from("materials")
    .select("*")
    .eq("user_id", userId);

  const materialPaths: string[] = [];
  for (const row of materials ?? []) {
    const url =
      (row as { image_url?: string | null }).image_url ||
      (row as { image_path?: string | null }).image_path ||
      null;
    if (!url) continue;
    const marker = "/materials/";
    const idx = url.indexOf(marker);
    if (idx >= 0) {
      materialPaths.push(url.slice(idx + marker.length).split("?")[0]!);
    } else if (!url.startsWith("http")) {
      materialPaths.push(url);
    }
  }
  if (materialPaths.length > 0) {
    await admin.storage.from("materials").remove(materialPaths);
  }

  // AI estimate photos are stored under `{userId}/...`
  try {
    const { data: aiFiles } = await admin.storage
      .from("ai-estimates")
      .list(userId, { limit: 1000 });
    if (aiFiles && aiFiles.length > 0) {
      await admin.storage
        .from("ai-estimates")
        .remove(aiFiles.map((f) => `${userId}/${f.name}`));
    }
  } catch {
    // Bucket may not exist in all environments
  }
}
