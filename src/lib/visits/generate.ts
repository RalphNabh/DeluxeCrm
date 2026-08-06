import type { SupabaseClient } from '@supabase/supabase-js'

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'

export type JobRecurrence = {
  id: string
  organization_id: string
  start_time: string
  end_time: string
  recurrence_freq: RecurrenceFreq | null
  recurrence_interval: number | null
  recurrence_byweekday: string[] | null
  recurrence_until: string | null
  recurrence_count: number | null
  timezone?: string | null
}

export const VISIT_HORIZON_DAYS = 90

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

export function weekdayCodeFromDate(date: Date): string {
  return WEEKDAY_CODES[date.getUTCDay()]
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime())
  const day = next.getUTCDate()
  next.setUTCMonth(next.getUTCMonth() + months, 1)
  const daysInMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(day, daysInMonth))
  return next
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function withSeriesTime(day: Date, seriesStart: Date): Date {
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      seriesStart.getUTCHours(),
      seriesStart.getUTCMinutes(),
      seriesStart.getUTCSeconds(),
      seriesStart.getUTCMilliseconds()
    )
  )
}

/**
 * Expand recurrence into occurrence starts within [windowStart, windowEnd].
 * Idempotent callers should upsert by (job_id, scheduled_start).
 */
export function expandRecurrenceOccurrences(
  job: JobRecurrence,
  windowStart: Date,
  windowEnd: Date
): Array<{ scheduled_start: Date; scheduled_end: Date }> {
  const seriesStart = new Date(job.start_time)
  const seriesEnd = new Date(job.end_time)
  if (Number.isNaN(seriesStart.getTime()) || Number.isNaN(seriesEnd.getTime())) {
    return []
  }

  const durationMs = Math.max(0, seriesEnd.getTime() - seriesStart.getTime())
  const interval = Math.max(1, job.recurrence_interval ?? 1)
  const until = job.recurrence_until ? parseDateOnly(job.recurrence_until) : null
  const maxCount = job.recurrence_count ?? null
  const freq = job.recurrence_freq

  const results: Array<{ scheduled_start: Date; scheduled_end: Date }> = []

  const withinSeriesBounds = (start: Date) => {
    if (until && startOfUtcDay(start) > until) return false
    return true
  }

  const pushIfInWindow = (start: Date) => {
    if (!withinSeriesBounds(start)) return false
    if (start < windowStart || start > windowEnd) return false
    results.push({
      scheduled_start: start,
      scheduled_end: new Date(start.getTime() + durationMs),
    })
    return true
  }

  // One-off: materialize the original start if it falls in the window
  if (!freq) {
    pushIfInWindow(seriesStart)
    return results
  }

  if (freq === 'daily') {
    let cursor = new Date(seriesStart.getTime())
    let count = 0
    // Cap walk so ancient daily series cannot burn the request.
    const hardStop = addDays(windowEnd, 1)
    while (cursor <= hardStop && count < 400) {
      if (maxCount !== null && count >= maxCount) break
      if (!withinSeriesBounds(cursor)) break
      pushIfInWindow(cursor)
      count += 1
      cursor = addDays(cursor, interval)
    }
    return results
  }

  if (freq === 'weekly') {
    const byweekday =
      job.recurrence_byweekday && job.recurrence_byweekday.length > 0
        ? new Set(job.recurrence_byweekday.map((d) => d.toUpperCase()))
        : new Set([weekdayCodeFromDate(seriesStart)])

    const seriesWeekStart = startOfUtcDay(addDays(seriesStart, -seriesStart.getUTCDay()))
    let day = startOfUtcDay(seriesStart)
    let count = 0
    const hardLimit = addDays(windowEnd, 1)

    while (day < hardLimit) {
      if (maxCount !== null && count >= maxCount) break
      if (until && day > until) break

      const weekStart = startOfUtcDay(addDays(day, -day.getUTCDay()))
      const weeksSince = Math.round(
        (weekStart.getTime() - seriesWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
      const inIntervalWeek = weeksSince >= 0 && weeksSince % interval === 0
      const code = WEEKDAY_CODES[day.getUTCDay()]

      if (inIntervalWeek && byweekday.has(code)) {
        const occurrence = withSeriesTime(day, seriesStart)
        if (occurrence >= seriesStart) {
          if (maxCount !== null && count >= maxCount) break
          // Count every series occurrence, even outside the window
          count += 1
          pushIfInWindow(occurrence)
        }
      }

      day = addDays(day, 1)
      if (day.getTime() - seriesStart.getTime() > 5 * 365 * 24 * 60 * 60 * 1000) break
    }
    return results
  }

  if (freq === 'monthly') {
    let cursor = new Date(seriesStart.getTime())
    let count = 0
    while (cursor <= windowEnd) {
      if (maxCount !== null && count >= maxCount) break
      if (!withinSeriesBounds(cursor)) break
      pushIfInWindow(cursor)
      count += 1
      cursor = addMonths(cursor, interval)
    }
    return results
  }

  return results
}

/**
 * Materialize visits for a job over a rolling 90-day window.
 * Idempotent: skips rows that already exist for the same scheduled_start.
 */
export async function generateVisitsForJob(
  supabase: SupabaseClient,
  job: JobRecurrence,
  options?: { from?: Date; horizonDays?: number }
): Promise<{ created: number; skipped: number }> {
  const horizonDays = options?.horizonDays ?? VISIT_HORIZON_DAYS
  // Include past occurrences that still fall near "now" so today's visit is covered
  const windowStart = options?.from ?? addDays(new Date(), -1)
  const windowEnd = addDays(new Date(), horizonDays)

  // Always include the job's own start if it is the only occurrence (one-off)
  // and outside the rolling window — handled by expand for null freq when in window.
  // For one-offs just after creation, expand from series start:
  const expandFrom =
    !job.recurrence_freq
      ? new Date(Math.min(windowStart.getTime(), new Date(job.start_time).getTime()))
      : windowStart

  const occurrences = expandRecurrenceOccurrences(job, expandFrom, windowEnd)
  if (occurrences.length === 0) {
    return { created: 0, skipped: 0 }
  }

  const rows = occurrences.map((occ) => ({
    organization_id: job.organization_id,
    job_id: job.id,
    scheduled_start: occ.scheduled_start.toISOString(),
    scheduled_end: occ.scheduled_end.toISOString(),
    status: 'scheduled' as const,
  }))

  const { data, error } = await supabase
    .from('visits')
    .upsert(rows, {
      onConflict: 'job_id,scheduled_start',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) {
    throw new Error(`Failed to generate visits: ${error.message}`)
  }

  const created = data?.length ?? 0
  return { created, skipped: rows.length - created }
}

/**
 * Generate visits for all recurring jobs in an org (rolling window).
 */
export async function generateVisitsForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { from?: Date; horizonDays?: number }
): Promise<{ jobs: number; created: number }> {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(
      'id, organization_id, start_time, end_time, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_until, recurrence_count, timezone'
    )
    .eq('organization_id', organizationId)
    .not('recurrence_freq', 'is', null)

  if (error) {
    throw new Error(`Failed to load jobs for visit generation: ${error.message}`)
  }

  let created = 0
  for (const job of jobs ?? []) {
    const result = await generateVisitsForJob(supabase, job as JobRecurrence, options)
    created += result.created
  }

  return { jobs: jobs?.length ?? 0, created }
}

/**
 * Extend the visit horizon for every org that has recurring jobs.
 * Intended for the daily cron (service-role client).
 */
export async function generateVisitsForAllOrgs(
  supabase: SupabaseClient,
  options?: { from?: Date; horizonDays?: number },
): Promise<{ orgs: number; jobs: number; created: number }> {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(
      'id, organization_id, start_time, end_time, recurrence_freq, recurrence_interval, recurrence_byweekday, recurrence_until, recurrence_count, timezone',
    )
    .not('recurrence_freq', 'is', null)

  if (error) {
    throw new Error(`Failed to load recurring jobs: ${error.message}`)
  }

  const orgIds = new Set<string>()
  let created = 0
  for (const job of jobs ?? []) {
    orgIds.add(job.organization_id as string)
    const result = await generateVisitsForJob(supabase, job as JobRecurrence, options)
    created += result.created
  }

  return { orgs: orgIds.size, jobs: jobs?.length ?? 0, created }
}
