import type { DerivedInsight } from '../types'

export type DerivedInsightDraft = Omit<DerivedInsight, 'createdAt'>

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function completeMonthsBetween(start: Date, end: Date) {
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
    + end.getUTCMonth() - start.getUTCMonth()
  if (end.getUTCDate() < start.getUTCDate()) months -= 1
  return Math.max(0, months)
}

function formatTenure(months: number) {
  const years = Math.floor(months / 12)
  const remainder = months % 12
  if (!years) return `${remainder} month${remainder === 1 ? '' : 's'}`
  if (!remainder) return `${years} year${years === 1 ? '' : 's'}`
  return `${years} year${years === 1 ? '' : 's'}, ${remainder} month${remainder === 1 ? '' : 's'}`
}

export function deriveInsightsFromValues(
  values: Record<string, string | undefined>,
  now = new Date(),
): DerivedInsightDraft[] {
  const insights: DerivedInsightDraft[] = []
  const arrival = parseDate(values.arrival_date)
  const departure = parseDate(values.departure_date)
  const passportExpiry = parseDate(values.passport_expiry_date)
  const employmentStart = parseDate(values.employment_start)

  if (arrival && departure && departure > arrival) {
    const days = Math.round((departure.getTime() - arrival.getTime()) / 86_400_000)
    insights.push({
      id: 'trip_duration',
      label: 'Planned length of stay',
      value: `${days} day${days === 1 ? '' : 's'}`,
      explanation: `Calculated from ${values.arrival_date} to ${values.departure_date}.`,
      sourceQuestionIds: ['arrival_date', 'departure_date'],
    })
  }

  if (passportExpiry && departure) {
    const valid = passportExpiry >= departure
    insights.push({
      id: 'passport_validity',
      label: 'Passport validity check',
      value: valid ? 'Valid through planned trip' : 'Expires before planned departure',
      explanation: `Compared passport expiry ${values.passport_expiry_date} with departure ${values.departure_date}.`,
      sourceQuestionIds: ['passport_expiry_date', 'departure_date'],
    })
  }

  if (employmentStart) {
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    if (today >= employmentStart) {
      insights.push({
        id: 'employment_tenure',
        label: 'Current employment tenure',
        value: formatTenure(completeMonthsBetween(employmentStart, today)),
        explanation: `Calculated from employment start ${values.employment_start}; it is not a guessed job-history answer.`,
        sourceQuestionIds: ['employment_start'],
      })
    }
  }

  return insights
}
