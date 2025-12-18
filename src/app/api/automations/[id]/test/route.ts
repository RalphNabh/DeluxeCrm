import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeAutomation } from '@/lib/automations/executor';

export async function POST(
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

    // Fetch the automation
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (automationError || !automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Create a test event context with all possible variables
    const baseContext = {
      event: automation.trigger_event,
      user_id: user.id,
      client_name: 'Test Client',
      client_email: user.email || 'test@example.com',
      lead_email: user.email || 'test@example.com',
      email: user.email || 'test@example.com'
    };

    // Add trigger-specific context
    const testContext = {
      ...baseContext,
      ...(automation.trigger_event === 'estimate_sent' && {
        estimate_id: 'test-estimate-id',
      }),
      ...(automation.trigger_event === 'estimate_approved' && {
        estimate_id: 'test-estimate-id',
      }),
      ...(automation.trigger_event === 'invoice_overdue' && {
        invoice_id: 'test-invoice-id',
        invoice_number: 'INV-001',
        amount: '$1,000.00'
      }),
      ...(automation.trigger_event === 'client_created' && {
        client_id: 'test-client-id',
      }),
      ...(automation.trigger_event === 'job_completed' && {
        job_id: 'test-job-id',
      }),
      ...(automation.trigger_event === 'lead_estimate_sent' && {
        lead_id: 'test-lead-id',
        lead_name: 'Test Lead',
        lead_email: user.email || 'test@example.com',
        lead_phone: '555-0100',
        lead_address: '123 Test St',
      }),
      ...(automation.trigger_event === 'lead_approved' && {
        lead_id: 'test-lead-id',
        lead_name: 'Test Lead',
        lead_email: user.email || 'test@example.com',
        lead_phone: '555-0100',
        lead_address: '123 Test St',
      }),
      ...(automation.trigger_event === 'lead_job_scheduled' && {
        lead_id: 'test-lead-id',
        lead_name: 'Test Lead',
        lead_email: user.email || 'test@example.com',
        lead_phone: '555-0100',
        lead_address: '123 Test St',
      }),
      ...(automation.trigger_event === 'lead_completed' && {
        lead_id: 'test-lead-id',
        lead_name: 'Test Lead',
        lead_email: user.email || 'test@example.com',
        lead_phone: '555-0100',
        lead_address: '123 Test St',
      })
    };

    // Execute the automation
    const result = await executeAutomation(automation, testContext);

    // Log the run (don't fail if logging fails)
    try {
      await supabase
        .from('automation_runs')
        .insert([{
          user_id: user.id,
          automation_id: id,
          event: automation.trigger_event,
          input: testContext,
          result: result.success ? 'success' : 'error'
        }]);
    } catch (logError) {
      console.error('Error logging automation run:', logError);
      // Continue even if logging fails
    }

    if (!result.success) {
      console.error('Automation test failed:', result.error);
      return NextResponse.json({ 
        error: result.error || 'Failed to execute automation',
        details: result 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message || 'Automation executed successfully'
    });
  } catch (error) {
    console.error('Error testing automation:', error);
    return NextResponse.json(
      { error: 'Failed to test automation' },
      { status: 500 }
    );
  }
}

