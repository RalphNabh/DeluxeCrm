import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { captureApiError } from "@/lib/api-error";
import { createStripeClient } from "@/lib/stripe-server";
import {
  cancelStripeSubscriptions,
  cleanupUserStorage,
  deleteOrganizationData,
  deleteUserScopedData,
  type SubscriptionBillingRow,
} from "@/lib/account-deletion";

/**
 * DELETE /api/user/delete-account
 *
 * Production account deletion for App Store / GDPR:
 * 1. Cancel Stripe subscription(s) + delete Stripe customer
 * 2. If org owner with no other members → wipe org CRM data + org row
 * 3. If worker/member → leave org only
 * 4. Delete remaining user-scoped rows + storage
 * 5. Delete auth user (fail closed if this fails)
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Account deletion is temporarily unavailable. Please contact support.",
          code: "misconfigured",
        },
        { status: 503 },
      );
    }

    const admin = createServiceRoleClient();
    const userId = user.id;

    // --- Memberships & owned orgs ---
    const { data: memberships } = await admin
      .from("organization_members")
      .select("id, org_id, role, status")
      .eq("user_id", userId);

    const activeMemberships = (memberships ?? []).filter(
      (m) => m.status === "active",
    );
    const ownedOrgIds = activeMemberships
      .filter((m) => m.role === "owner")
      .map((m) => m.org_id as string);

    // Also catch orgs owned via organizations.owner_user_id
    const { data: ownedOrgs } = await admin
      .from("organizations")
      .select("id")
      .eq("owner_user_id", userId);
    for (const org of ownedOrgs ?? []) {
      if (!ownedOrgIds.includes(org.id)) ownedOrgIds.push(org.id);
    }

    for (const orgId of ownedOrgIds) {
      const { count: otherMembers } = await admin
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active")
        .neq("user_id", userId);

      if ((otherMembers ?? 0) > 0) {
        return NextResponse.json(
          {
            error:
              "You still have team members in your company. Remove them (or transfer ownership) before deleting your owner account.",
            code: "org_has_members",
          },
          { status: 409 },
        );
      }
    }

    // --- Collect Stripe billing rows (user + owned orgs) ---
    const billingRows: SubscriptionBillingRow[] = [];

    const { data: userSubs } = await admin
      .from("subscriptions")
      .select(
        "id, user_id, organization_id, stripe_customer_id, stripe_subscription_id, status",
      )
      .eq("user_id", userId);
    billingRows.push(...((userSubs ?? []) as SubscriptionBillingRow[]));

    for (const orgId of ownedOrgIds) {
      const { data: orgSubs } = await admin
        .from("subscriptions")
        .select(
          "id, user_id, organization_id, stripe_customer_id, stripe_subscription_id, status",
        )
        .eq("organization_id", orgId);
      for (const row of (orgSubs ?? []) as SubscriptionBillingRow[]) {
        if (!billingRows.some((b) => b.id === row.id)) billingRows.push(row);
      }
    }

    let canceledSubscriptions = 0;
    if (billingRows.some((r) => r.stripe_subscription_id || r.stripe_customer_id)) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          {
            error:
              "Cannot cancel your membership right now (billing is not configured). Please contact support before deleting your account.",
            code: "stripe_misconfigured",
          },
          { status: 503 },
        );
      }

      try {
        const stripe = createStripeClient();
        const result = await cancelStripeSubscriptions(stripe, billingRows);
        canceledSubscriptions = result.canceled;
        if (result.errors.length > 0) {
          captureApiError(new Error(result.errors.join("; ")), {
            route: "delete-account",
            step: "stripe-cancel",
          });
          return NextResponse.json(
            {
              error:
                "We couldn't cancel your Stripe subscription. Please try again or contact support. Your account was not deleted.",
              code: "stripe_cancel_failed",
              details: result.errors,
            },
            { status: 502 },
          );
        }
      } catch (stripeErr) {
        captureApiError(stripeErr, {
          route: "delete-account",
          step: "stripe-init",
        });
        return NextResponse.json(
          {
            error:
              "We couldn't reach Stripe to cancel your membership. Your account was not deleted.",
            code: "stripe_unreachable",
          },
          { status: 502 },
        );
      }
    }

    // --- Storage (best-effort before rows go away) ---
    try {
      await cleanupUserStorage(admin, userId);
    } catch (storageErr) {
      captureApiError(storageErr, {
        route: "delete-account",
        step: "storage",
      });
    }

    // --- Wipe owned organizations ---
    let deletedOrgs = 0;
    for (const orgId of ownedOrgIds) {
      await deleteOrganizationData(admin, orgId);
      deletedOrgs += 1;
    }

    // --- Leave any remaining orgs as a member ---
    await admin.from("organization_members").delete().eq("user_id", userId);

    // --- Remaining user-scoped CRM data ---
    await deleteUserScopedData(admin, userId);

    // --- Auth user (must succeed) ---
    const { error: authDeleteError } =
      await admin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      captureApiError(authDeleteError, {
        route: "delete-account",
        step: "auth.admin.deleteUser",
      });
      return NextResponse.json(
        {
          error:
            "Your billing and data were removed, but we could not finish deleting your login. Please contact support.",
          code: "auth_delete_failed",
          debug: authDeleteError.message,
        },
        { status: 500 },
      );
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Session may already be invalid after auth delete
    }

    return NextResponse.json({
      success: true,
      message:
        "Your account, company data, and membership have been deleted.",
      canceledSubscriptions,
      deletedOrgs,
    });
  } catch (error) {
    captureApiError(error, { route: "delete-account" });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete account. Please contact support.",
        code: "delete_failed",
      },
      { status: 500 },
    );
  }
}
