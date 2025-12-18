import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { referral_id, status, subscription_value } = body;

    if (!referral_id) {
      return NextResponse.json({ error: 'Referral ID is required' }, { status: 400 });
    }

    // Get the referral
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referral_id)
      .eq('referrer_id', user.id)
      .single();

    if (fetchError || !referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (status !== undefined) {
      updates.status = status;
      if (status === 'Converted' || status === 'Active') {
        updates.converted_at = new Date().toISOString();
      }
    }
    if (subscription_value !== undefined) {
      updates.subscription_value = subscription_value;
      
      // Calculate commission (30% by default, can be customized)
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('commission_rate')
        .eq('user_id', user.id)
        .single();
      
      const commissionRate = affiliate?.commission_rate || 30.00;
      updates.commission_earned = (subscription_value * commissionRate) / 100;
    }

    const { data: updatedReferral, error: updateError } = await supabase
      .from('referrals')
      .update(updates)
      .eq('id', referral_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating referral:', updateError);
      return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 });
    }

    // Update affiliate total earnings if commission was earned
    if (updates.commission_earned && typeof updates.commission_earned === 'number' && (status === 'Active' || status === 'Converted')) {
      const { data: currentAffiliate } = await supabase
        .from('affiliates')
        .select('total_earnings')
        .eq('user_id', user.id)
        .single();

      if (currentAffiliate) {
        const newTotalEarnings = (Number(currentAffiliate.total_earnings) || 0) + (updates.commission_earned as number);
        await supabase
          .from('affiliates')
          .update({ 
            total_earnings: newTotalEarnings
          })
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json(updatedReferral);
  } catch (error) {
    console.error('Error in PUT /api/affiliates/referrals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

