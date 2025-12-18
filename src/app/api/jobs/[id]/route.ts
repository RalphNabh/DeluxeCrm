import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAndExecuteAutomations } from '@/lib/automations/executor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    // Try to fetch estimate if estimate_id column exists
    let jobWithEstimate = job
    if (job && (job as Record<string, unknown>).estimate_id) {
      try {
        const { data: estimate } = await supabase
          .from('estimates')
          .select('id, status, total, created_at')
          .eq('id', (job as Record<string, unknown>).estimate_id)
          .single()
        jobWithEstimate = { ...job, estimates: estimate }
      } catch (e) {
        // Column doesn't exist or estimate not found, continue without estimate
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Transform the data to include client_name
    const transformedJob = {
      ...jobWithEstimate,
      client_name: ((jobWithEstimate?.clients as { name?: string })?.name) || 'Unknown Client',
      client_email: ((jobWithEstimate?.clients as { email?: string })?.email) || '',
      client_phone: ((jobWithEstimate?.clients as { phone?: string })?.phone) || ''
    };

    return NextResponse.json(transformedJob);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, ...updates } = body;

    // Get the current job to check if status changed to "Completed"
    const { data: currentJob } = await supabase
      .from('jobs')
      .select('*, clients(id, name, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    // Update the job
    const { data: job, error } = await supabase
      .from('jobs')
      .update({
        ...updates,
        ...(status && { status }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, clients(id, name, email)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Trigger automation if job was just completed
    if (status === 'Completed' && currentJob?.status !== 'Completed') {
      const client = job.clients as { name?: string; email?: string } | null;
      
      await checkAndExecuteAutomations('job_completed', {
        event: 'job_completed',
        user_id: user.id,
        job_id: id,
        client_name: client?.name || 'Client',
        client_email: client?.email || undefined,
        user_email: user.email || undefined
      });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}

