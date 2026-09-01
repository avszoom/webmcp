import { describe, expect, it } from 'vitest'
import { fictionalProfile } from '../data/demoProfile'
import { questions } from '../data/questions'
import {
  applicationReducer,
  createInitialState,
  getApplicationMetrics,
} from './applicationState'

describe('Stage 1 application model', () => {
  it('defines exactly 55 questions and a 39-fact fictional profile', () => {
    expect(questions).toHaveLength(55)
    expect(fictionalProfile.facts).toHaveLength(39)
    expect(new Set(questions.map((question) => question.id)).size).toBe(55)
    expect(new Set(fictionalProfile.facts.map((fact) => fact.questionId)).size).toBe(39)
    const questionIds = new Set(questions.map((question) => question.id))
    expect(fictionalProfile.facts.every((fact) => questionIds.has(fact.questionId))).toBe(true)
  })

  it('starts the fictional demo at zero answers', () => {
    const state = applicationReducer(createInitialState(), { type: 'START', mode: 'demo' })
    expect(state.hasStarted).toBe(true)
    expect(state.startMode).toBe('demo')
    expect(getApplicationMetrics(state)).toMatchObject({ completed: 0, missing: 55 })
  })

  it('tracks manual values with provenance and confirmation status', () => {
    const started = applicationReducer(createInitialState(), { type: 'START', mode: 'personal' })
    const answered = applicationReducer(started, {
      type: 'SET_ANSWER',
      questionId: 'passport_number',
      value: 'DEMO-1234',
      sensitivity: 'sensitive',
    })

    expect(answered.answers.passport_number).toMatchObject({
      source: 'human',
      sourceLabel: 'Entered by you',
      verificationStatus: 'needs_confirmation',
    })
    expect(getApplicationMetrics(answered)).toMatchObject({
      completed: 1,
      missing: 54,
      needsConfirmation: 1,
    })
  })

  it('resets answers while preserving the chosen first-run mode', () => {
    const started = applicationReducer(createInitialState(), { type: 'START', mode: 'demo' })
    const answered = applicationReducer(started, {
      type: 'SET_ANSWER',
      questionId: 'email',
      value: 'alex@example.com',
      sensitivity: 'standard',
    })
    const reset = applicationReducer(answered, { type: 'RESET_APPLICATION' })

    expect(reset.startMode).toBe('demo')
    expect(reset.answers).toEqual({})
    expect(getApplicationMetrics(reset).completed).toBe(0)
  })
})
