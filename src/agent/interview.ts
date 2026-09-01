import { questions } from '../data/questions'
import type { Locale } from '../i18n'
import type {
  ApplicationMetrics,
  ApplicationPurpose,
  ApplicationState,
  FundingSource,
  PriorVisitStatus,
} from '../types'

export type ApprovedProfileSection =
  | 'identity'
  | 'passport'
  | 'contact'
  | 'addresses'
  | 'employment'
  | 'education'
  | 'family'

export interface InterviewUpdate {
  question_id: string
  value: string
  confidence: number
  source: 'user_statement' | 'document'
}

export interface InterviewTurnPlan {
  assistant_message: string
  decision_summary: string
  route: {
    purpose: Exclude<ApplicationPurpose, 'undetermined'> | null
    funding: Exclude<FundingSource, 'undetermined'> | null
    prior_visit: Exclude<PriorVisitStatus, 'undetermined'> | null
  }
  approved_profile_sections: ApprovedProfileSection[]
  updates: InterviewUpdate[]
  confirm_question_ids: string[]
  next_question_id: string | null
  next_question: string | null
  is_complete: boolean
}

export interface InterviewRequest {
  locale: Locale
  turn_number: number
  last_question: string
  latest_answer: string
  current_route: {
    purpose: ApplicationPurpose
    funding: FundingSource
    prior_visit: PriorVisitStatus
  }
  application_status: ApplicationMetrics
  missing_questions: Array<{
    id: string
    label: string
    type: string
    options: string[]
    sensitive: boolean
    evidence_required: boolean
  }>
  pending_sensitive_confirmations: string[]
  approved_profile_sections_already_applied: ApprovedProfileSection[]
  available_profile_sections: Array<{
    id: ApprovedProfileSection
    description: string
    time_sensitive: boolean
  }>
  available_fictional_evidence: Array<{ question_id: string; reference: string }>
}

const profileSections: InterviewRequest['available_profile_sections'] = [
  { id: 'identity', description: 'Six approved identity facts', time_sensitive: false },
  { id: 'passport', description: 'Five approved passport facts', time_sensitive: false },
  { id: 'contact', description: 'Five approved contact facts', time_sensitive: false },
  { id: 'addresses', description: 'Five approved current-address facts', time_sensitive: false },
  { id: 'employment', description: 'Five approved résumé facts that should be confirmed as current', time_sensitive: true },
  { id: 'education', description: 'Four approved education facts', time_sensitive: false },
  { id: 'family', description: 'Four approved family facts', time_sensitive: false },
]

export const fictionalEvidence = [
  { question_id: 'passport_scan', reference: 'alex-morgan-passport-demo.pdf' },
  { question_id: 'employment_letter', reference: 'northstar-employment-letter-demo.pdf' },
  { question_id: 'bank_statement', reference: 'alex-morgan-proof-of-funds-demo.pdf' },
  { question_id: 'travel_itinerary', reference: 'new-york-itinerary-demo.pdf' },
  { question_id: 'supporting_letter', reference: 'host-support-letter-demo.pdf' },
]

export function buildInterviewRequest(
  state: ApplicationState,
  metrics: ApplicationMetrics,
  locale: Locale,
  turnNumber: number,
  lastQuestion: string,
  latestAnswer: string,
  appliedProfileSections: ApprovedProfileSection[],
): InterviewRequest {
  const applicable = new Set(state.flow?.applicableQuestionIds ?? questions.map((question) => question.id))
  return {
    locale,
    turn_number: turnNumber,
    last_question: lastQuestion,
    latest_answer: latestAnswer,
    current_route: {
      purpose: state.flow?.purpose ?? 'undetermined',
      funding: state.flow?.funding ?? 'undetermined',
      prior_visit: state.flow?.priorVisit ?? 'undetermined',
    },
    application_status: metrics,
    missing_questions: questions
      .filter((question) => applicable.has(question.id) && !state.answers[question.id]?.value.trim())
      .map((question) => ({
        id: question.id,
        label: question.label,
        type: question.type,
        options: question.options ?? [],
        sensitive: question.sensitivity === 'sensitive',
        evidence_required: Boolean(question.evidenceRequired),
      })),
    pending_sensitive_confirmations: Object.entries(state.answers)
      .filter(([, answer]) => answer.verificationStatus === 'needs_confirmation')
      .map(([questionId]) => questionId),
    approved_profile_sections_already_applied: appliedProfileSections,
    available_profile_sections: profileSections,
    available_fictional_evidence: fictionalEvidence,
  }
}

export function suggestionForQuestion(questionId: string | null) {
  const suggestions: Record<string, string> = {
    travel_purpose: 'Tourism in New York from October 12 to October 21, 2026',
    funding: 'I will pay myself, and my approved employment information is still current',
    current_employer: 'Yes, my approved employment profile is current',
    prior_visits: 'I visited in 2024, I have never had a refusal, and I have no dependants',
    passport_scan: 'Yes, attach the available fictional demo documents',
    review_name_match: 'Yes, I reviewed everything and explicitly confirm all five declarations and sensitive answers',
  }
  return questionId ? suggestions[questionId] ?? '' : ''
}

