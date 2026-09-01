import { questions } from '../data/questions'
import type {
  AnswerRecord,
  ApplicationMetrics,
  ApplicationState,
  SectionId,
  Sensitivity,
  StartMode,
  ToolActivity,
} from '../types'

export const STORAGE_KEY = 'webmcp-visa-application-v1'

export const createInitialState = (): ApplicationState => ({
  hasStarted: true,
  startMode: 'personal',
  activeSectionId: 'travel',
  answers: {},
  conflicts: [],
  activity: [],
  derivedInsights: [],
  flow: null,
  reviewStatus: 'not_started',
  welcomeNoticeVisible: false,
})

export type ApplicationAction =
  | { type: 'START'; mode: StartMode }
  | { type: 'SET_SECTION'; sectionId: SectionId }
  | {
      type: 'SET_ANSWER'
      questionId: string
      value: string
      sensitivity: Sensitivity
    }
  | { type: 'DISMISS_WELCOME_NOTICE' }
  | { type: 'REPLACE_STATE_FROM_TOOL'; state: ApplicationState }
  | { type: 'RESET_APPLICATION' }
  | { type: 'RETURN_TO_WELCOME' }

export function applicationReducer(
  state: ApplicationState,
  action: ApplicationAction,
): ApplicationState {
  switch (action.type) {
    case 'START':
      return {
        ...createInitialState(),
        hasStarted: true,
        startMode: action.mode,
        welcomeNoticeVisible: true,
      }
    case 'SET_SECTION':
      return { ...state, activeSectionId: action.sectionId }
    case 'SET_ANSWER': {
      const trimmedValue = action.value.trim()
      if (!trimmedValue) {
        const nextAnswers = { ...state.answers }
        delete nextAnswers[action.questionId]
        return { ...state, answers: nextAnswers }
      }

      const answer: AnswerRecord = {
        value: action.value,
        source: 'human',
        sourceLabel: 'Entered by you',
        confidence: 1,
        verificationStatus:
          action.sensitivity === 'sensitive' ? 'needs_confirmation' : 'confirmed',
        sensitivity: action.sensitivity,
        lastUpdated: new Date().toISOString(),
      }

      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: answer },
        reviewStatus: 'in_progress',
      }
    }
    case 'DISMISS_WELCOME_NOTICE':
      return { ...state, welcomeNoticeVisible: false }
    case 'REPLACE_STATE_FROM_TOOL':
      return action.state
    case 'RESET_APPLICATION':
      return {
        ...createInitialState(),
        hasStarted: true,
        welcomeNoticeVisible: true,
      }
    case 'RETURN_TO_WELCOME':
      return createInitialState()
    default:
      return state
  }
}

export interface AgentAnswerInput {
  questionId: string
  value: string
  sourceLabel: string
  confidence: number
  requiresConfirmation?: boolean
  overwritePending?: boolean
}

export interface AgentWriteResult {
  applied: string[]
  pendingConfirmation: string[]
  conflicts: string[]
  skipped: string[]
}

const questionMap = new Map(questions.map((question) => [question.id, question]))

export function createToolActivity(
  toolName: string,
  title: string,
  detail: string,
  status: ToolActivity['status'],
): ToolActivity {
  return {
    id: `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    toolName,
    title,
    detail,
    status,
    timestamp: new Date().toISOString(),
  }
}

export function appendToolActivity(
  state: ApplicationState,
  activity: ToolActivity,
): ApplicationState {
  return { ...state, activity: [activity, ...state.activity].slice(0, 12) }
}

export function applyAgentAnswersToState(
  state: ApplicationState,
  entries: AgentAnswerInput[],
  toolName: string,
  activityTitle: string,
): { state: ApplicationState; result: AgentWriteResult } {
  const answers = { ...state.answers }
  const conflicts = [...state.conflicts]
  const result: AgentWriteResult = {
    applied: [],
    pendingConfirmation: [],
    conflicts: [],
    skipped: [],
  }

  for (const entry of entries) {
    const question = questionMap.get(entry.questionId)
    const value = entry.value.trim()
    if (!question || !value) {
      result.skipped.push(entry.questionId)
      continue
    }

    const existing = answers[entry.questionId]
    const sameValue = existing?.value.trim().toLocaleLowerCase() === value.toLocaleLowerCase()
    const canReplacePending = entry.overwritePending && existing?.verificationStatus === 'needs_confirmation'
    if (sameValue && !canReplacePending) {
      result.skipped.push(entry.questionId)
      continue
    }

    if (existing?.value.trim() && !sameValue && !canReplacePending) {
      const conflictId = `conflict-${entry.questionId}`
      if (!conflicts.some((conflict) => conflict.id === conflictId)) {
        conflicts.push({
          id: conflictId,
          questionId: entry.questionId,
          message: `${question.label} differs from the value already in the application.`,
          sources: [existing.sourceLabel, entry.sourceLabel],
        })
      }
      result.conflicts.push(entry.questionId)
      continue
    }

    const needsConfirmation = question.sensitivity === 'sensitive' || entry.requiresConfirmation === true
    answers[entry.questionId] = {
      value,
      source: 'agent',
      sourceLabel: entry.sourceLabel,
      confidence: entry.confidence,
      verificationStatus: needsConfirmation ? 'needs_confirmation' : 'confirmed',
      sensitivity: question.sensitivity,
      lastUpdated: new Date().toISOString(),
    }
    result.applied.push(entry.questionId)
    if (needsConfirmation) result.pendingConfirmation.push(entry.questionId)
  }

  const detailParts = [`${result.applied.length} answer${result.applied.length === 1 ? '' : 's'} added`]
  if (result.pendingConfirmation.length) {
    detailParts.push(`${result.pendingConfirmation.length} flagged for review`)
  }
  if (result.conflicts.length) detailParts.push(`${result.conflicts.length} conflict detected`)

  const status: ToolActivity['status'] = result.conflicts.length
    ? 'conflict'
    : result.pendingConfirmation.length
      ? 'pending'
      : 'success'

  const nextState: ApplicationState = {
    ...state,
    answers,
    conflicts,
    reviewStatus: 'in_progress',
  }

  return {
    state: appendToolActivity(
      nextState,
      createToolActivity(toolName, activityTitle, detailParts.join(' · '), status),
    ),
    result,
  }
}

export function getApplicationMetrics(state: ApplicationState): ApplicationMetrics {
  const applicableIds = new Set(state.flow?.applicableQuestionIds ?? questions.map((question) => question.id))
  const answerValues = Object.entries(state.answers)
    .filter(([questionId, answer]) => applicableIds.has(questionId) && answer.value.trim())
    .map(([, answer]) => answer)
  const completed = answerValues.length
  const needsConfirmation = answerValues.filter(
    (answer) => answer.verificationStatus === 'needs_confirmation',
  ).length
  const applicableQuestions = questions.filter((question) => applicableIds.has(question.id))
  const evidenceNeeded = applicableQuestions.filter(
    (question) => question.evidenceRequired && !state.answers[question.id]?.value.trim(),
  ).length

  return {
    total: applicableQuestions.length,
    completed,
    missing: applicableQuestions.length - completed,
    needsConfirmation,
    conflicts: state.conflicts.length,
    evidenceNeeded,
    percentage: Math.round((completed / applicableQuestions.length) * 100),
  }
}
