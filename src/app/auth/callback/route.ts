import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/verify-email'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if email is verified after exchange
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        // Email is verified, redirect to account verified page
        return NextResponse.redirect(new URL('/account-verified', requestUrl.origin))
      }
    }
  }

  // Redirect to verify-email page where user can see confirmation status
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

