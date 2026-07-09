import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isApiRoute, isPublicRoute, isSubscriptionExempt } from '@/lib/route-access'
import {
  isContractorRoute,
  isFieldRoute,
  isPortalRoute,
} from '@/lib/persona'
import { getDefaultRouteForRole } from '@/lib/rbac'
import type { OrgRole } from '@/lib/org'

async function getPersonaContext(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('persona')
    .eq('user_id', userId)
    .maybeSingle()

  if (profile?.persona === 'client') {
    const { data: portalUser } = await supabase
      .from('client_portal_users')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    if (portalUser) return { type: 'client' as const }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membership) {
    return {
      type: 'contractor' as const,
      orgId: membership.org_id as string,
      role: membership.role as OrgRole,
    }
  }

  return { type: 'contractor' as const, orgId: null, role: null }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const publicRoute = isPublicRoute(pathname)
  const subscriptionExempt = isSubscriptionExempt(pathname)

  if (!user && !publicRoute && !isApiRoute(pathname)) {
    const url = request.nextUrl.clone()
    if (isPortalRoute(pathname)) {
      url.pathname = '/portal/login'
    } else {
      url.pathname = '/login'
    }
    return NextResponse.redirect(url)
  }

  if (
    user &&
    !user.email_confirmed_at &&
    pathname !== '/verify-email' &&
    !pathname.startsWith('/signup/confirm') &&
    !publicRoute
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-email'
    return NextResponse.redirect(url)
  }

  if (user && !publicRoute) {
    const persona = await getPersonaContext(supabase, user.id)

    if (persona.type === 'client') {
      if (isContractorRoute(pathname) || isFieldRoute(pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/portal'
        return NextResponse.redirect(url)
      }
    } else if (persona.role === 'worker') {
      if (isContractorRoute(pathname) && pathname !== '/profile') {
        const url = request.nextUrl.clone()
        url.pathname = getDefaultRouteForRole('worker')
        return NextResponse.redirect(url)
      }
    } else if (persona.role) {
      if (isFieldRoute(pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
      if (isPortalRoute(pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  if (user && !publicRoute && !subscriptionExempt) {
    const persona = await getPersonaContext(supabase, user.id)

    if (persona.type !== 'client') {
      let subscription = null

      if (persona.orgId) {
        const { data } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('organization_id', persona.orgId)
          .maybeSingle()
        subscription = data
      }

      if (!subscription) {
        const { data } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle()
        subscription = data
      }

      const isActive = subscription &&
        subscription.status === 'active' &&
        (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())

      if (!isActive) {
        const url = request.nextUrl.clone()
        url.pathname = '/subscription'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
