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

function ageOnDate(birth: Date, target: Date) {
  let age = target.getUTCFullYear() - birth.getUTCFullYear()
  const birthdayHasPassed = target.getUTCMonth() > birth.getUTCMonth()
    || (target.getUTCMonth() === birth.getUTCMonth() && target.getUTCDate() >= birth.getUTCDate())
  if (!birthdayHasPassed) age -= 1
  return age >= 0 && age < 130 ? age : null
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
  const dateOfBirth = parseDate(values.date_of_birth)

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
    const remainingMonths = valid ? completeMonthsBetween(departure, passportExpiry) : 0
    insights.push({
      id: 'passport_validity',
      label: 'Passport validity check',
      value: valid
        ? `Valid through trip${remainingMonths ? ` + ${formatTenure(remainingMonths)} remaining` : ''}`
        : 'Expires before planned departure',
      explanation: `Compared passport expiry ${values.passport_expiry_date} with departure ${values.departure_date}.`,
      sourceQuestionIds: ['passport_expiry_date', 'departure_date'],
    })
  }

  if (dateOfBirth) {
    const target = arrival ?? new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const age = ageOnDate(dateOfBirth, target)
    if (age !== null) {
      insights.push({
        id: 'age_at_travel',
        label: arrival ? 'Age on planned arrival' : 'Current age check',
        value: `${age} years`,
        explanation: arrival
          ? `Calculated from date of birth ${values.date_of_birth} and arrival ${values.arrival_date}.`
          : `Calculated from date of birth ${values.date_of_birth}.`,
        sourceQuestionIds: arrival ? ['date_of_birth', 'arrival_date'] : ['date_of_birth'],
      })
    }
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
