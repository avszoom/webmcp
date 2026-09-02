import { describe, expect, it } from 'vitest'
import { createAnswerCalls, shouldAutoOpenAttentionReview } from './webMcpBatches'

const facts = (count: number) => Array.from({ length: count }, (_, index) => ({
  question_id: `field_${index + 1}`,
  value: `Value ${index + 1}`,
  confidence: 1,
}))

describe('WebMCP answer batching', () => {
  it('splits a 34-value approval into valid 30 and 4 fact calls', () => {
    const calls = createAnswerCalls('Saving reviewed values', 'user_confirmation', facts(34))

    expect(calls).toHaveLength(2)
    expect(calls.map((call) => (call.input.answers as unknown[]).length)).toEqual([30, 4])
    expect(calls.map((call) => call.label)).toEqual([
      'Saving reviewed values (1 of 2)',
      'Saving reviewed values (2 of 2)',
    ])
  })

  it('keeps a normal answer set in one call', () => {
    const calls = createAnswerCalls('Applying stated facts', 'user_statement', facts(5))

    expect(calls).toHaveLength(1)
    expect(calls[0].label).toBe('Applying stated facts')
  })
})

describe('attention review timing', () => {
  it('does not auto-open final review while applicable fields remain', () => {
    expect(shouldAutoOpenAttentionReview({
      chapter: 'final_review', stage: 'interview', missing: 7, attentionCount: 34,
    })).toBe(false)
  })

  it('auto-opens once every applicable field is filled', () => {
    expect(shouldAutoOpenAttentionReview({
      chapter: 'final_review', stage: 'interview', missing: 0, attentionCount: 34,
    })).toBe(true)
  })
})
