import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch team members
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate jobs_completed and total_hours from jobs table
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, status, estimated_duration, actual_duration')
      .eq('user_id', user.id);

    // Update stats for each team member (based on job assignments if we had that, for now just basic)
    interface TeamMember {
      id: string;
      [key: string]: unknown;
    }
    const membersWithStats = (teamMembers || []).map((member: TeamMember) => {
      // In a real app, you'd match jobs to team members via job_assignments
      // For now, we'll keep the stats from the database
      return member;
    });

    return NextResponse.json(membersWithStats);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { name: string; email: string; phone?: string; role?: string; status?: string; notes?: string };
    const { name, email, phone, role = 'Worker', status = 'Pending', notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: string[] = ['Owner', 'Manager', 'Worker', 'Admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: string[] = ['Active', 'Inactive', 'Pending'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Create team member
    const { data: teamMember, error } = await supabase
      .from('team_members')
      .insert([{
        user_id: user.id,
        name,
        email,
        phone,
        role,
        status,
        notes,
        joined_at: new Date().toISOString(),
        last_active: status === 'Active' ? new Date().toISOString() : null
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(teamMember, { status: 201 });
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json(
      { error: 'Failed to create team member' },
      { status: 500 }
    );
  }
}

