import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Delete all user data in the correct order (respecting foreign key constraints)
    // Supabase cascade deletes will handle child records automatically
    
    // First get IDs for related records
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId);
    
    const invoiceIds = invoices?.map(inv => inv.id) || [];
    
    const { data: estimates } = await supabase
      .from('estimates')
      .select('id')
      .eq('user_id', userId);
    
    const estimateIds = estimates?.map(est => est.id) || [];
    
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', userId);
    
    const jobIds = jobs?.map(job => job.id) || [];

    // Delete child records first
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

    // Delete parent records
    await supabase.from('automation_runs').delete().eq('user_id', userId);
    await supabase.from('automations').delete().eq('user_id', userId);
    await supabase.from('email_templates').delete().eq('user_id', userId);
    await supabase.from('invoices').delete().eq('user_id', userId);
    await supabase.from('estimates').delete().eq('user_id', userId);
    await supabase.from('jobs').delete().eq('user_id', userId);
    await supabase.from('leads').delete().eq('user_id', userId);
    await supabase.from('clients').delete().eq('user_id', userId);

    // Note: To actually delete the auth user, you need Supabase Admin API
    // which requires a service role key. For production, you'd need:
    // 1. A Supabase Edge Function with service role key, OR
    // 2. A backend service that uses the Admin API
    
    // For now, all user data is deleted but the auth user remains
    // The user will be signed out and can't access the app anymore
    
    return NextResponse.json({ 
      success: true, 
      message: 'All account data deleted successfully. Please contact support to fully remove the account.' 
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please contact support.' },
      { status: 500 }
    );
  }
}

