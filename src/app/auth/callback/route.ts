import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  // Only allow relative in-app redirects
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : null

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        // Prefer the caller-provided next (e.g. Client Hub invite completion)
        if (next) {
          return NextResponse.redirect(new URL(next, requestUrl.origin))
        }
        return NextResponse.redirect(
          new URL('/account-verified', requestUrl.origin),
        )
      }
    }
  }

  return NextResponse.redirect(
    new URL(next || '/verify-email', requestUrl.origin),
  )
}

