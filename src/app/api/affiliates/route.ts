import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create affiliate record for the user
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let affiliate = affiliateData;

    // If no affiliate record exists, create one
    // Check for both PGRST116 (no rows) and other table-related errors
    if (!affiliate && (affiliateError?.code === 'PGRST116' || affiliateError?.message?.includes('relation') || affiliateError?.message?.includes('does not exist'))) {
      // If table doesn't exist, return helpful error
      if (affiliateError?.message?.includes('does not exist') || affiliateError?.message?.includes('relation')) {
        return NextResponse.json({ 
          error: 'Affiliate tables not found. Please run the supabase-affiliates-schema.sql migration in your Supabase SQL Editor.',
          code: 'SCHEMA_MISSING'
        }, { status: 503 });
      }

      // Generate referral code (fallback: generate in application)
      const referralCode = `REF${user.id.substring(0, 8).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const { data: newAffiliate, error: createError } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          referral_code: referralCode,
          commission_rate: 30.00
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating affiliate:', createError);
        if (createError.message?.includes('does not exist') || createError.message?.includes('relation')) {
          return NextResponse.json({ 
            error: 'Affiliate tables not found. Please run the supabase-affiliates-schema.sql migration in your Supabase SQL Editor.',
            code: 'SCHEMA_MISSING'
          }, { status: 503 });
        }
        return NextResponse.json({ error: `Failed to create affiliate record: ${createError.message}` }, { status: 500 });
      }

      affiliate = newAffiliate;
    } else if (affiliateError && affiliateError.code !== 'PGRST116') {
      console.error('Error fetching affiliate:', affiliateError);
      if (affiliateError.message?.includes('does not exist') || affiliateError.message?.includes('relation')) {
        return NextResponse.json({ 
          error: 'Affiliate tables not found. Please run the supabase-affiliates-schema.sql migration in your Supabase SQL Editor.',
          code: 'SCHEMA_MISSING'
        }, { status: 503 });
      }
      return NextResponse.json({ error: `Failed to fetch affiliate record: ${affiliateError.message}` }, { status: 500 });
    }

    // Get all referrals made by this user
    let referrals = [];
    const { data: referralsData, error: referralsError } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_user:referred_user_id (
          id,
          email
        )
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (referralsError) {
      console.error('Error fetching referrals:', referralsError);
      // If table doesn't exist, just return empty array
      if (referralsError.message?.includes('does not exist') || referralsError.message?.includes('relation')) {
        referrals = [];
      }
    } else {
      referrals = referralsData || [];
    }

    // Calculate statistics
    interface Referral {
      status: string;
      commission_paid?: boolean;
      commission_earned?: number;
    }
    
    const stats = {
      total_referrals: referrals.length || 0,
      active_referrals: referrals.filter((r: Referral) => r.status === 'Active' || r.status === 'Converted').length || 0,
      total_earnings: affiliate?.total_earnings || 0,
      pending_earnings: referrals.filter((r: Referral) => r.status === 'Active' && !r.commission_paid)
        .reduce((sum: number, r: Referral) => sum + (r.commission_earned || 0), 0) || 0,
      commission_rate: affiliate?.commission_rate || 30.00
    };

    return NextResponse.json({
      affiliate: affiliate || null,
      referrals: referrals,
      stats
    });
  } catch (error) {
    console.error('Error in GET /api/affiliates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { referral_code } = body;

    if (!referral_code) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    // Find the referrer by referral code
    const { data: referrerAffiliate, error: referrerError } = await supabase
      .from('affiliates')
      .select('user_id')
      .eq('referral_code', referral_code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (referrerError || !referrerAffiliate) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Check if user was already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', user.id)
      .single();

    if (existingReferral) {
      return NextResponse.json({ error: 'You have already been referred' }, { status: 400 });
    }

    // Prevent self-referral
    if (referrerAffiliate.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Create referral record
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerAffiliate.user_id,
        referred_user_id: user.id,
        referral_code: referral_code.toUpperCase(),
        status: 'Pending'
      })
      .select()
      .single();

    if (referralError) {
      console.error('Error creating referral:', referralError);
      return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
    }

    // Update referrer's total referrals count
    const { data: currentAffiliate } = await supabase
      .from('affiliates')
      .select('total_referrals')
      .eq('user_id', referrerAffiliate.user_id)
      .single();

    if (currentAffiliate) {
      await supabase
        .from('affiliates')
        .update({ total_referrals: (currentAffiliate.total_referrals || 0) + 1 })
        .eq('user_id', referrerAffiliate.user_id);
    }

    return NextResponse.json({ success: true, referral }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/affiliates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

