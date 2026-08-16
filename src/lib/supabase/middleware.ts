import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isApiRoute, isPublicRoute, isSubscriptionExempt } from '@/lib/route-access'
import {
  isContractorRoute,
  isFieldRoute,
  isPortalRoute,
  resolvePersona,
} from '@/lib/persona'
import { getDefaultRouteForRole } from '@/lib/rbac'

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

  const persona =
    user && !publicRoute ? await resolvePersona(supabase, user.id) : null

  if (persona) {
    // Client Hub routes: portal access only (never CRM via /portal)
    if (isPortalRoute(pathname) && pathname !== '/portal/login' && !pathname.startsWith('/portal/register')) {
      if (!persona.hasPortalAccess) {
        const url = request.nextUrl.clone()
        url.pathname = persona.hasCrmAccess ? '/dashboard' : '/portal/login'
        return NextResponse.redirect(url)
      }
    }

    // CRM / field: org membership only (never Hub via contractor routes)
    if (isContractorRoute(pathname) || isFieldRoute(pathname)) {
      if (!persona.hasCrmAccess) {
        const url = request.nextUrl.clone()
        url.pathname = persona.hasPortalAccess ? '/portal' : '/login'
        return NextResponse.redirect(url)
      }
      if (persona.role === 'worker' && isContractorRoute(pathname) && pathname !== '/profile') {
        const url = request.nextUrl.clone()
        url.pathname = getDefaultRouteForRole('worker')
        return NextResponse.redirect(url)
      }
      if (persona.role && persona.role !== 'worker' && isFieldRoute(pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  if (user && persona && !publicRoute && !subscriptionExempt) {
    if (persona.hasCrmAccess) {
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
