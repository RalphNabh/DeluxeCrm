import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/api-auth';
import { taskCreateSchema } from '@/lib/api-schemas';
import { captureApiError } from '@/lib/api-error';
import { parseJsonBody } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const jobId = searchParams.get('job_id');

    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        ),
        jobs (
          id,
          title,
          start_time,
          end_time,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json(tasks || []);
  } catch (error) {
    captureApiError(error, { route: 'tasks/GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const parsed = await parseJsonBody(request, taskCreateSchema);
    if (!parsed.ok) return parsed.response;

    const {
      title,
      description,
      status = 'To Do',
      priority = 'Medium',
      due_date,
      tags,
      client_id,
      job_id,
      assigned_to,
    } = parsed.data;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        status,
        priority,
        due_date: due_date || null,
        tags: tags && Array.isArray(tags) ? tags.filter(t => t && t.trim().length > 0) : null,
        client_id: client_id || null,
        job_id: job_id || null,
        assigned_to: assigned_to?.trim() || null
      })
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        ),
        jobs (
          id,
          title,
          start_time,
          end_time,
          status
        )
      `)
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: `Failed to create task: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    captureApiError(error, { route: 'tasks/POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


