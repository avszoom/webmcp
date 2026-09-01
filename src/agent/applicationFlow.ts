import { questions } from '../data/questions'
import type {
  ApplicationFlow,
  ApplicationPurpose,
  FundingSource,
  PriorVisitStatus,
} from '../types'

const alwaysOptional = new Set([
  'alternate_phone',
  'social_handle',
  'previous_address',
  'previous_employer',
  'supporting_letter',
])

const education = new Set(['highest_education', 'institution_name', 'field_of_study', 'graduation_date'])
const extendedFamily = new Set(['spouse_name', 'father_name', 'mother_name', 'family_at_destination'])

export function buildApplicationFlow(
  purpose: ApplicationPurpose,
  funding: FundingSource = 'undetermined',
  priorVisit: PriorVisitStatus = 'undetermined',
): ApplicationFlow {
  const excluded = new Set(alwaysOptional)
  const decisions: string[] = []

  if (purpose === 'tourism') {
    education.forEach((id) => excluded.add(id))
    extendedFamily.forEach((id) => excluded.add(id))
    decisions.push('Tourist visitor path selected')
  } else if (purpose === 'business') {
    extendedFamily.forEach((id) => excluded.add(id))
    decisions.push('Business visitor path selected')
  } else if (purpose === 'family_visit') {
    education.forEach((id) => excluded.add(id))
    excluded.delete('supporting_letter')
    decisions.push('Family-visit path selected')
  }

  if (funding === 'self') {
    excluded.add('employment_letter')
    decisions.push('Personal proof of funds required')
  } else if (funding === 'employer') {
    excluded.delete('employment_letter')
    excluded.add('bank_statement')
    decisions.push('Employer sponsorship evidence required')
  } else if (funding === 'host') {
    excluded.add('employment_letter')
    excluded.delete('supporting_letter')
    decisions.push('Host support evidence required')
  } else if (funding === 'mixed') {
    excluded.delete('employment_letter')
    excluded.delete('bank_statement')
    excluded.delete('supporting_letter')
    decisions.push('Mixed funding evidence required')
  }

  if (priorVisit === 'yes') decisions.push('Returning visitor history applies')
  if (priorVisit === 'no') decisions.push('First-time visitor history applies')

  const applicableQuestionIds = questions
    .map((question) => question.id)
    .filter((id) => !excluded.has(id))
  const labels = [
    purpose === 'tourism' ? 'Tourist visitor' : purpose === 'business' ? 'Business visitor' : purpose === 'family_visit' ? 'Family visit' : 'Route pending',
  ]
  if (funding !== 'undetermined') {
    labels.push(funding === 'self' ? 'Self-funded' : funding === 'employer' ? 'Employer-funded' : funding === 'host' ? 'Host-funded' : 'Mixed funding')
  }
  if (priorVisit !== 'undetermined') labels.push(priorVisit === 'yes' ? 'Returning visitor' : 'First-time visitor')

  return {
    purpose,
    funding,
    priorVisit,
    labels,
    applicableQuestionIds,
    excludedQuestionIds: [...excluded],
    decisions,
  }
}

export function normalizePurpose(value: string): ApplicationPurpose {
  const normalized = value.toLowerCase()
  if (/business|conference|work|meeting/.test(normalized)) return 'business'
  if (/family|relative|parents?|sister|brother|cousin/.test(normalized)) return 'family_visit'
  if (/tour|vacation|holiday|sightseeing|visit|travel/.test(normalized)) return 'tourism'
  return 'tourism'
}

export function normalizeFunding(value: string): FundingSource {
  const normalized = value.toLowerCase()
  const mentionsEmployer = /employer|company|work/.test(normalized)
  const mentionsHost = /host|friend|family|relative|conference/.test(normalized)
  const mentionsSelf = /myself|self|personal|i am|i'm|own money/.test(normalized)
  if ([mentionsEmployer, mentionsHost, mentionsSelf].filter(Boolean).length > 1) return 'mixed'
  if (mentionsEmployer) return 'employer'
  if (mentionsHost) return 'host'
  return 'self'
}
