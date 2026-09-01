import { questions } from '../data/questions'
import type { Locale } from '../i18n'
import type {
  ApplicationMetrics,
  ApplicationPurpose,
  ApplicationState,
  FundingSource,
  PriorVisitStatus,
} from '../types'

export interface InterviewUpdate {
  question_id: string
  value: string
  confidence: number
  source: 'user_statement'
  basis: 'explicit' | 'derived'
  evidence_text: string
  derivation: string | null
}

export interface InterviewTurnPlan {
  assistant_message: string
  decision_summary: string
  route: {
    purpose: Exclude<ApplicationPurpose, 'undetermined'> | null
    funding: Exclude<FundingSource, 'undetermined'> | null
    prior_visit: Exclude<PriorVisitStatus, 'undetermined'> | null
  }
  updates: InterviewUpdate[]
  confirm_question_ids: string[]
  requested_question_ids: string[]
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
}

export function buildInterviewRequest(
  state: ApplicationState,
  metrics: ApplicationMetrics,
  locale: Locale,
  turnNumber: number,
  lastQuestion: string,
  latestAnswer: string,
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
  }
}
