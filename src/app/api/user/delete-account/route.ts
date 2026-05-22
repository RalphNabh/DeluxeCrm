import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/api-error';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId);

    const invoiceIds = invoices?.map((inv) => inv.id) || [];

    const { data: estimates } = await supabase
      .from('estimates')
      .select('id')
      .eq('user_id', userId);

    const estimateIds = estimates?.map((est) => est.id) || [];

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', userId);

    const jobIds = jobs?.map((job) => job.id) || [];

    if (invoiceIds.length > 0) {
      await supabase.from('invoice_line_items').delete().in('invoice_id', invoiceIds);
      await supabase.from('payments').delete().in('invoice_id', invoiceIds);
    }

    if (estimateIds.length > 0) {
      await supabase.from('estimate_line_items').delete().in('estimate_id', estimateIds);
    }

    if (jobIds.length > 0) {
      await supabase.from('job_notes').delete().in('job_id', jobIds);
      await supabase.from('job_photos').delete().in('job_id', jobIds);
      await supabase.from('job_equipment').delete().in('job_id', jobIds);
      await supabase.from('job_assignments').delete().in('job_id', jobIds);
    }

    await supabase.from('automation_runs').delete().eq('user_id', userId);
    await supabase.from('automations').delete().eq('user_id', userId);
    await supabase.from('email_templates').delete().eq('user_id', userId);
    await supabase.from('invoices').delete().eq('user_id', userId);
    await supabase.from('estimates').delete().eq('user_id', userId);
    await supabase.from('jobs').delete().eq('user_id', userId);
    await supabase.from('leads').delete().eq('user_id', userId);
    await supabase.from('clients').delete().eq('user_id', userId);
    await supabase.from('subscriptions').delete().eq('user_id', userId);
    await supabase.from('affiliates').delete().eq('user_id', userId);

    try {
      const admin = createServiceRoleClient();
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        captureApiError(authDeleteError, { route: 'delete-account', step: 'auth.admin.deleteUser' });
      }
    } catch (adminError) {
      captureApiError(adminError, { route: 'delete-account', step: 'service-role' });
    }

    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Your account and data have been deleted.',
    });
  } catch (error) {
    captureApiError(error, { route: 'delete-account' });
    return NextResponse.json(
      { error: 'Failed to delete account. Please contact support.' },
      { status: 500 },
    );
  }
}
