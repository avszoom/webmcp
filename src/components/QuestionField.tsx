import type { ApplicationQuestion } from '../types'
import { useApplication } from '../state/ApplicationContext'
import { LockIcon } from './Icons'
import { questionName, type Locale } from '../i18n'

export function QuestionField({ question, locale = 'en' }: { question: ApplicationQuestion; locale?: Locale }) {
  const { state, dispatch } = useApplication()
  const answer = state.answers[question.id]
  const commonProps = {
    id: question.id,
    value: answer?.value ?? '',
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      dispatch({
        type: 'SET_ANSWER',
        questionId: question.id,
        value: event.target.value,
        sensitivity: question.sensitivity,
      }),
  }

  return (
    <div className={`question-field ${answer ? 'question-field--answered' : ''}`}>
      <label htmlFor={question.id}>
        <span>{questionName(locale, question.id, question.label)}{question.required && <em>*</em>}</span>
        {question.sensitivity === 'sensitive' && <span className="sensitive-label"><LockIcon /> Sensitive</span>}
      </label>

      {question.type === 'textarea' ? (
        <textarea {...commonProps} placeholder={question.placeholder} rows={3} />
      ) : question.type === 'select' || question.type === 'yes-no' ? (
        <select {...commonProps}>
          <option value="">Select an answer</option>
          {(question.type === 'yes-no' ? ['Yes', 'No'] : question.options)?.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input {...commonProps} type={question.type} placeholder={question.placeholder} />
      )}

      <div className="field-meta">
        <span>{question.helper ?? (answer ? answer.sourceLabel : 'Not answered')}</span>
        {answer && (
          <span className={answer.verificationStatus === 'needs_confirmation' ? 'status-pending' : 'status-confirmed'}>
            {answer.verificationStatus === 'needs_confirmation' ? 'Needs confirmation' : 'Confirmed'}
          </span>
        )}
      </div>
    </div>
  )
}
