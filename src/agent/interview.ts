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

export interface InterviewPartialFact {
  question_id: string
  value: string
  evidence_text: string
  missing_detail: string
  clarification_question: string
}

export interface InterviewCandidate {
  question_id: string
  proposed_value: string
  confidence: number
  basis: 'normalized' | 'derived' | 'speech_repair'
  evidence_text: string
  explanation: string
  verification_prompt: string
}

export interface InterviewHistoryTurn {
  question: string
  answer: string
  extracted_question_ids: string[]
  discussed_question_ids: string[]
  chapter: InterviewTurnPlan['next_chapter']
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
  candidates: InterviewCandidate[]
  partial_facts: InterviewPartialFact[]
  confirm_question_ids: string[]
  requested_question_ids: string[]
  question_focus_ids: string[]
  next_chapter: 'trip_story' | 'life_at_home' | 'work_journey' | 'identity_passport' | 'travel_history' | 'final_review' | null
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
  resolved_answers: Array<{
    id: string
    label: string
    value: string
    verification_status: string
  }>
  partial_facts: InterviewPartialFact[]
  conversation_history: InterviewHistoryTurn[]
  previously_asked_question_ids: string[]
  missing_questions: Array<{
    id: string
    label: string
    type: string
    options: string[]
    sensitive: boolean
    evidence_required: boolean
  }>
  pending_review_question_ids: string[]
}

export function buildInterviewRequest(
  state: ApplicationState,
  metrics: ApplicationMetrics,
  locale: Locale,
  turnNumber: number,
  lastQuestion: string,
  latestAnswer: string,
  conversationHistory: InterviewHistoryTurn[] = [],
  partialFacts: InterviewPartialFact[] = [],
): InterviewRequest {
  const applicable = new Set(state.flow?.applicableQuestionIds ?? questions.map((question) => question.id))
  const compactHistory = conversationHistory.slice(-5).map((turn) => ({
    ...turn,
    question: turn.question.slice(0, 320),
    answer: turn.answer.slice(0, 1400),
  }))
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
    resolved_answers: questions
      .filter((question) => applicable.has(question.id) && state.answers[question.id]?.value.trim())
      .map((question) => ({
        id: question.id,
        label: question.label,
        value: state.answers[question.id].value,
        verification_status: state.answers[question.id].verificationStatus,
      })),
    partial_facts: partialFacts
      .filter((fact) => applicable.has(fact.question_id) && !state.answers[fact.question_id]?.value.trim())
      .slice(0, 20),
    conversation_history: compactHistory,
    previously_asked_question_ids: [...new Set(compactHistory.flatMap((turn) => turn.discussed_question_ids))],
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
    pending_review_question_ids: Object.entries(state.answers)
      .filter(([, answer]) => answer.verificationStatus === 'needs_confirmation')
      .map(([questionId]) => questionId),
  }
}

const stopWords = new Set([
  'a', 'about', 'and', 'are', 'as', 'at', 'be', 'could', 'do', 'for', 'from', 'have', 'i', 'in', 'is',
  'it', 'me', 'of', 'on', 'or', 'please', 'tell', 'that', 'the', 'there', 'this', 'to', 'what', 'where',
  'which', 'who', 'will', 'with', 'you', 'your',
])

function questionTokens(value: string) {
  return new Set(
    value.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => token.length > 2 && !stopWords.has(token)) ?? [],
  )
}

export function questionsAreSimilar(left: string, right: string) {
  const leftTokens = questionTokens(left)
  const rightTokens = questionTokens(right)
  if (!leftTokens.size || !rightTokens.size) return false
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length
  return shared / Math.min(leftTokens.size, rightTokens.size) >= 0.55
}

export function mergePartialFacts(
  current: InterviewPartialFact[],
  incoming: InterviewPartialFact[],
  resolvedQuestionIds: Iterable<string>,
) {
  const resolved = new Set(resolvedQuestionIds)
  const merged = new Map(current.map((fact) => [fact.question_id, fact]))
  for (const questionId of resolved) merged.delete(questionId)
  for (const fact of incoming) {
    if (!resolved.has(fact.question_id)) merged.set(fact.question_id, fact)
  }
  return [...merged.values()].slice(0, 20)
}

export function chooseNovelQuestion({
  plan,
  history,
  answeredQuestion,
  answeredChapter,
  answeredQuestionIds,
  partialFacts,
}: {
  plan: InterviewTurnPlan
  history: InterviewHistoryTurn[]
  answeredQuestion: string
  answeredChapter: InterviewTurnPlan['next_chapter']
  answeredQuestionIds: string[]
  partialFacts: InterviewPartialFact[]
}) {
  const candidate = plan.next_question ?? ''
  if (!candidate) return ''
  const priorQuestions = [...history.map((turn) => turn.question), answeredQuestion]
  const priorIds = new Set([
    ...history.flatMap((turn) => turn.discussed_question_ids),
    ...answeredQuestionIds,
  ])
  const candidateIds = plan.question_focus_ids?.length ? plan.question_focus_ids : plan.requested_question_ids
  const repeatedGoal = candidateIds?.find((questionId) => priorIds.has(questionId))
  const matchingPartial = partialFacts.find((fact) =>
    fact.question_id === repeatedGoal || candidateIds?.includes(fact.question_id),
  )
  const repeatsWording = priorQuestions.some((question) => questionsAreSimilar(candidate, question))
  const repeatsChapter = Boolean(
    plan.next_chapter && answeredChapter && plan.next_chapter === answeredChapter && repeatedGoal,
  )
  if ((repeatsWording || repeatsChapter) && matchingPartial) return matchingPartial.clarification_question
  if (repeatsWording || repeatsChapter) {
    const nextId = candidateIds?.find((questionId) => !priorIds.has(questionId))
      ?? candidateIds?.[0]
    const label = questions.find((question) => question.id === nextId)?.label
    if (label) return `I’ve kept what you already told me. What should I enter for ${label.toLowerCase()}?`
  }
  return candidate
}
