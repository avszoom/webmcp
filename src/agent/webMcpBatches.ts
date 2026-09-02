import type { PrefillToolCall } from '../webmcp/demoCalls'

export const MAX_WEBMCP_FACTS_PER_CALL = 30

export interface WebMcpAnswerFact {
  question_id: string
  value: string
  confidence: number
}

export function createAnswerCalls(
  label: string,
  source: 'user_statement' | 'agent_proposal' | 'user_confirmation' | 'document',
  answers: WebMcpAnswerFact[],
): PrefillToolCall[] {
  const total = Math.ceil(answers.length / MAX_WEBMCP_FACTS_PER_CALL)
  const calls: PrefillToolCall[] = []
  for (let start = 0; start < answers.length; start += MAX_WEBMCP_FACTS_PER_CALL) {
    const index = calls.length + 1
    calls.push({
      toolName: 'provide_interview_answers',
      label: total > 1 ? `${label} (${index} of ${total})` : label,
      input: {
        source,
        answers: answers.slice(start, start + MAX_WEBMCP_FACTS_PER_CALL),
      },
    })
  }
  return calls
}

export function shouldAutoOpenAttentionReview({
  chapter,
  stage,
  missing,
  attentionCount,
}: {
  chapter: string | null
  stage: string
  missing: number
  attentionCount: number
}) {
  return attentionCount > 0
    && missing === 0
    && (chapter === 'final_review' || stage === 'complete')
}
