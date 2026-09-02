import { describe, expect, it } from 'vitest'
import {
  applicationReducer,
  createInitialState,
  getApplicationMetrics,
} from '../state/applicationState'
import type { ApplicationState } from '../types'
import { createVisaApplicationTools } from './tools'

function createHarness(initialState?: ApplicationState) {
  let state = initialState ?? applicationReducer(createInitialState(), { type: 'START', mode: 'demo' })
  const tools = createVisaApplicationTools({
    getState: () => state,
    commitState: (nextState) => { state = nextState },
  })
  const execute = async (name: string, input: Record<string, unknown> = {}) => {
    const tool = tools.find((candidate) => candidate.name === name)
    if (!tool) throw new Error(`Missing tool ${name}`)
    return tool.execute(input)
  }
  return { tools, execute, getState: () => state }
}

describe('WebMCP semantic tool registry', () => {
  it('exposes 22 semantic tools with typed schemas', () => {
    const { tools } = createHarness()
    expect(tools).toHaveLength(22)
    expect(tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
      'inspect_application_flows',
      'select_application_flow',
      'get_next_best_question',
      'simulate_flow_change',
      'get_application_status',
      'get_approved_profile_facts',
      'provide_identity_information',
      'provide_address_history',
      'provide_employment_history',
      'provide_travel_information',
      'provide_interview_answers',
      'confirm_sensitive_answers',
      'derive_application_insights',
      'request_review',
    ]))
    expect(tools.every((tool) => tool.description && tool.inputSchema)).toBe(true)
  })

  it('selects and simulates conditional application paths semantically', async () => {
    const harness = createHarness()
    const selected = await harness.execute('select_application_flow', {
      purpose: 'tourism', funding: 'self', prior_visit: 'no',
    }) as { structuredContent: { applicable_question_count: number; excluded_question_count: number } }

    expect(harness.getState().flow?.labels).toEqual(['Tourist visitor', 'Self-funded', 'First-time visitor'])
    expect(selected.structuredContent.excluded_question_count).toBeGreaterThan(0)
    expect(selected.structuredContent.applicable_question_count).toBeLessThan(55)

    const simulation = await harness.execute('simulate_flow_change', { funding: 'mixed' }) as {
      structuredContent: { impact: { activated: string[] }; proposed: { funding: string } }
    }
    expect(simulation.structuredContent.proposed.funding).toBe('mixed')
    expect(simulation.structuredContent.impact.activated).toEqual(expect.arrayContaining(['employment_letter', 'supporting_letter']))
    expect(harness.getState().flow?.funding).toBe('self')
  })

  it('derives explainable values only from existing application answers', async () => {
    const harness = createHarness()
    await harness.execute('provide_travel_information', {
      source: 'approved_profile', arrival_date: '2026-10-12', departure_date: '2026-10-21',
    })
    await harness.execute('provide_passport_information', {
      source: 'approved_profile', expiration_date: '2032-02-13',
    })
    await harness.execute('provide_employment_history', {
      source: 'approved_profile', employment_start_date: '2023-04-03',
    })

    await harness.execute('derive_application_insights')

    expect(harness.getState().derivedInsights).toHaveLength(3)
    expect(harness.getState().derivedInsights.map((insight) => insight.id)).toEqual([
      'trip_duration', 'passport_validity', 'employment_tenure',
    ])
    expect(harness.getState().derivedInsights[0]).toMatchObject({
      value: '9 days',
      sourceQuestionIds: ['arrival_date', 'departure_date'],
    })
  })

  it('reproduces the honest 0 to 39 demo through section-level tool calls', async () => {
    const harness = createHarness()

    await harness.execute('provide_identity_information', {
      source: 'approved_profile', given_names: 'Alex Jamie', family_name: 'Morgan',
      other_names: 'None', date_of_birth: '1993-06-18', place_of_birth: 'Pune, India',
      national_id: 'DEMO-4839-2011',
    })
    await harness.execute('provide_passport_information', {
      source: 'approved_profile', passport_number: 'P00048291', issuing_country: 'India',
      issue_date: '2022-02-14', expiration_date: '2032-02-13', holds_second_passport: 'No',
    })
    await harness.execute('provide_contact_information', {
      source: 'approved_profile', email: 'alex.morgan@example.com', phone: '+1 617 555 0142',
      alternate_phone: '+1 617 555 0198', preferred_contact_method: 'Email',
      public_social_profile: 'linkedin.com/in/alex-morgan-demo',
    })
    await harness.execute('provide_address_history', {
      source: 'approved_profile', current_street: '44 Harbor Street, Apt 8', current_city: 'Boston',
      current_region: 'Massachusetts', current_postal_code: '02110', current_country: 'United States',
    })
    await harness.execute('provide_employment_history', {
      source: 'approved_profile', current_employer: 'Northstar Labs', job_title: 'Product Designer',
      employment_start_date: '2023-04-03', employer_address: '125 Summer Street, Boston, MA',
      approximate_monthly_income: 'USD 8,500',
    })
    await harness.execute('provide_education_information', {
      source: 'approved_profile', highest_education_level: 'Master’s degree',
      institution_name: 'Rhode Island School of Design', field_of_study: 'Digital Media',
      graduation_date: '2020-05-30',
    })
    await harness.execute('provide_travel_information', {
      source: 'approved_profile', purpose: 'Business', arrival_date: '2026-10-12',
      departure_date: '2026-10-21', destination_city: 'London',
      address_during_stay: '18 Bloomsbury Square, London',
    })
    await harness.execute('provide_family_information', {
      source: 'approved_profile', marital_status: 'Married', spouse_or_partner_name: 'Taylor Morgan',
      father_full_name: 'Rohan Morgan', mother_full_name: 'Anita Morgan',
    })

    expect(getApplicationMetrics(harness.getState())).toMatchObject({
      completed: 39,
      missing: 16,
      needsConfirmation: 4,
      conflicts: 0,
    })
    expect(harness.getState().activity).toHaveLength(8)
  })

  it('refuses placeholders instead of inventing information', async () => {
    const harness = createHarness()
    const response = await harness.execute('provide_identity_information', {
      source: 'user_statement', given_names: 'Unknown',
    }) as { isError: boolean }

    expect(response.isError).toBe(true)
    expect(getApplicationMetrics(harness.getState()).completed).toBe(0)
  })

  it('preserves an existing human answer and records a conflict', async () => {
    let state = applicationReducer(createInitialState(), { type: 'START', mode: 'personal' })
    state = applicationReducer(state, {
      type: 'SET_ANSWER', questionId: 'email', value: 'human@example.com', sensitivity: 'standard',
    })
    const harness = createHarness(state)

    await harness.execute('provide_contact_information', {
      source: 'user_statement', email: 'different@example.com',
    })

    expect(harness.getState().answers.email.value).toBe('human@example.com')
    expect(harness.getState().conflicts).toHaveLength(1)
  })

  it('validates adaptive interview facts and requires explicit sensitive confirmation', async () => {
    const harness = createHarness()
    await harness.execute('select_application_flow', {
      purpose: 'tourism', funding: 'self', prior_visit: 'no',
    })
    const applied = await harness.execute('provide_interview_answers', {
      source: 'user_statement',
      answers: [
        { question_id: 'destination_city', value: 'New York', confidence: 0.98 },
        { question_id: 'prior_refusal', value: 'No', confidence: 0.99 },
      ],
    }) as { isError?: boolean }

    expect(applied.isError).not.toBe(true)
    expect(harness.getState().answers.destination_city.verificationStatus).toBe('confirmed')
    expect(harness.getState().answers.prior_refusal.verificationStatus).toBe('needs_confirmation')

    await harness.execute('confirm_sensitive_answers', {
      question_ids: ['prior_refusal'], explicit_confirmation: true,
    })
    expect(harness.getState().answers.prior_refusal.verificationStatus).toBe('confirmed')
  })

  it('writes Terra proposals immediately, flags them, and accepts end-review corrections', async () => {
    const harness = createHarness(applicationReducer(createInitialState(), { type: 'START', mode: 'personal' }))
    await harness.execute('select_application_flow', {
      purpose: 'family_visit', funding: 'self', prior_visit: 'yes',
    })
    const proposed = await harness.execute('provide_interview_answers', {
      source: 'agent_proposal',
      answers: [{ question_id: 'job_title', value: 'Software Engineer', confidence: 0.86 }],
    }) as { isError?: boolean }

    expect(proposed.isError).not.toBe(true)
    expect(harness.getState().answers.job_title).toMatchObject({
      value: 'Software Engineer',
      sourceLabel: 'Terra proposal · review at end',
      confidence: 0.86,
      verificationStatus: 'needs_confirmation',
    })

    const confirmed = await harness.execute('provide_interview_answers', {
      source: 'user_confirmation',
      answers: [{ question_id: 'job_title', value: 'Senior Software Engineer', confidence: 1 }],
    }) as { isError?: boolean }

    expect(confirmed.isError).not.toBe(true)
    expect(harness.getState().answers.job_title).toMatchObject({
      value: 'Senior Software Engineer',
      sourceLabel: 'User-confirmed Terra proposal',
      verificationStatus: 'confirmed',
    })
  })

  it('fills document facts immediately but keeps every extracted value in final review', async () => {
    const harness = createHarness(applicationReducer(createInitialState(), { type: 'START', mode: 'personal' }))
    await harness.execute('select_application_flow', {
      purpose: 'family_visit', funding: 'self', prior_visit: 'no',
    })
    const extracted = await harness.execute('provide_interview_answers', {
      source: 'document',
      answers: [{ question_id: 'current_employer', value: 'Northstar Labs', confidence: 0.94 }],
    }) as { isError?: boolean }

    expect(extracted.isError).not.toBe(true)
    expect(harness.getState().answers.current_employer).toMatchObject({
      value: 'Northstar Labs',
      sourceLabel: 'Attached document · review at end',
      verificationStatus: 'needs_confirmation',
    })
  })
})
