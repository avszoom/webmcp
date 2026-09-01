import { describe, expect, it } from 'vitest'
import {
  chooseNovelQuestion,
  mergePartialFacts,
  questionsAreSimilar,
  type InterviewPartialFact,
  type InterviewTurnPlan,
} from './interview'

const partialStay: InterviewPartialFact = {
  question_id: 'stay_address',
  value: "Brother's home in New York",
  evidence_text: 'I will stay with my brother in New York',
  missing_detail: 'street address',
  clarification_question: "What is your brother's street address in New York?",
}

const repeatedPlan: InterviewTurnPlan = {
  assistant_message: 'I remembered your family visit.',
  decision_summary: 'The exact address is still missing.',
  route: { purpose: 'family_visit', funding: 'self', prior_visit: null },
  updates: [],
  candidates: [],
  partial_facts: [partialStay],
  confirm_question_ids: [],
  requested_question_ids: ['stay_address'],
  question_focus_ids: ['stay_address'],
  next_chapter: 'trip_story',
  next_question_id: 'stay_address',
  next_question: 'Tell me about the family visit you are planning and where you expect to stay.',
  is_complete: false,
}

describe('adaptive interview memory', () => {
  it('replaces a repeated broad chapter with the remembered narrow clarification', () => {
    expect(chooseNovelQuestion({
      plan: repeatedPlan,
      history: [],
      answeredQuestion: 'Imagine you are telling a friend about this trip. What is the plan and why are you going?',
      answeredChapter: 'trip_story',
      answeredQuestionIds: ['travel_purpose', 'destination_city', 'stay_address'],
      partialFacts: [partialStay],
    })).toBe("What is your brother's street address in New York?")
  })

  it('keeps partial facts until their form field is resolved', () => {
    expect(mergePartialFacts([], [partialStay], [])).toEqual([partialStay])
    expect(mergePartialFacts([partialStay], [], ['stay_address'])).toEqual([])
  })

  it('detects paraphrased questions instead of relying on exact string equality', () => {
    expect(questionsAreSimilar(
      'Tell me about the family visit you are planning and where you expect to stay.',
      'Where will you stay during the family visit you are planning?',
    )).toBe(true)
  })
})
