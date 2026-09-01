import { useEffect, useMemo, useState } from 'react'
import { createPersonalConciergeCalls, emptyConciergeInterview } from '../agent/conciergePlan'
import { deriveInsightsFromValues } from '../agent/derivations'
import { fictionalProfile } from '../data/demoProfile'
import { useApplication } from '../state/ApplicationContext'
import { approvedProfileDemoCalls } from '../webmcp/demoCalls'
import { useWebMcp } from '../webmcp/WebMcpContext'
import { BotIcon, CheckIcon, LockIcon, SparkleIcon, WarningIcon, XIcon } from './Icons'

type ConciergeStage = 'opportunity' | 'questions' | 'plan' | 'running' | 'complete'

const demoCheckLabels = [
  'The saved Boston address is still current',
  'Northstar Labs is still the current employer',
  'The London trip dates are still planned',
]

export function AgentConcierge() {
  const { state, metrics } = useApplication()
  const webMcp = useWebMcp()
  const [stage, setStage] = useState<ConciergeStage>('opportunity')
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [demoChecks, setDemoChecks] = useState([false, false, false])
  const [interview, setInterview] = useState(emptyConciergeInterview)
  const [validationError, setValidationError] = useState<string | null>(null)

  const humanAnswerCount = Object.values(state.answers)
    .filter((answer) => answer.source === 'human' && answer.value.trim()).length
  const hasAgentPrefill = state.activity.some((activity) =>
    activity.toolName.startsWith('provide_') || activity.toolName === 'derive_application_insights')
  const isDemo = state.startMode === 'demo'

  useEffect(() => {
    if (humanAnswerCount < 2) {
      setOpen(false)
      setDismissed(false)
      setStage('opportunity')
      return
    }
    if (!dismissed && !hasAgentPrefill) setOpen(true)
  }, [dismissed, hasAgentPrefill, humanAnswerCount])

  useEffect(() => {
    if (stage === 'running' && webMcp.prefillStatus === 'complete') setStage('complete')
  }, [stage, webMcp.prefillStatus])

  const previewValues = useMemo(() => {
    const values: Record<string, string> = Object.fromEntries(
      Object.entries(state.answers).map(([questionId, answer]) => [questionId, answer.value]),
    )
    if (isDemo) {
      for (const fact of fictionalProfile.facts) {
        if (!values[fact.questionId]) values[fact.questionId] = fact.value
      }
    } else {
      Object.assign(values, {
        travel_purpose: interview.travelPurpose,
        destination_city: interview.destinationCity,
        arrival_date: interview.arrivalDate,
        departure_date: interview.departureDate,
        current_employer: interview.currentEmployer,
        job_title: interview.jobTitle,
        employment_start: interview.employmentStart,
        current_city: interview.currentCity,
        current_country: interview.currentCountry,
      })
    }
    return values
  }, [interview, isDemo, state.answers])

  const previewInsights = useMemo(
    () => deriveInsightsFromValues(previewValues),
    [previewValues],
  )

  if (!open) return null

  const updateInterview = (key: keyof typeof interview, value: string) => {
    setInterview((current) => ({ ...current, [key]: value }))
    setValidationError(null)
  }

  const proceedFromQuestions = () => {
    if (isDemo) {
      if (!demoChecks.every(Boolean)) {
        setValidationError('Confirm all three current details before the agent uses the saved profile.')
        return
      }
    } else {
      const missing = Object.values(interview).some((value) => !value.trim())
      if (missing) {
        setValidationError('Answer each grouped question so the agent never has to guess.')
        return
      }
      if (interview.arrivalDate >= interview.departureDate) {
        setValidationError('Departure must be after arrival.')
        return
      }
    }
    setValidationError(null)
    setStage('plan')
  }

  const applyPlan = () => {
    const calls = isDemo
      ? approvedProfileDemoCalls
      : createPersonalConciergeCalls(interview)
    setStage('running')
    void webMcp.runPrefillPlan(calls).catch(() => {})
  }

  const close = () => {
    setOpen(false)
    setDismissed(true)
  }

  return (
    <section className={`agent-concierge agent-concierge--${stage}`} role="dialog" aria-label="Agent Concierge">
      <header className="concierge-header">
        <span className="concierge-avatar"><BotIcon /></span>
        <div><span>Agent Concierge</span><strong>{stage === 'complete' ? 'Your prefill is ready to review' : 'I noticed a shortcut'}</strong></div>
        <button aria-label="Close Agent Concierge" onClick={close}><XIcon /></button>
      </header>

      {stage === 'opportunity' && (
        <div className="concierge-body">
          <span className="concierge-kicker"><SparkleIcon /> You filled {humanAnswerCount} fields yourself</span>
          <h2>{isDemo ? 'I found a lot more that may belong here.' : 'A few complete answers can unlock much more.'}</h2>
          <p>
            {isDemo
              ? `I found ${fictionalProfile.facts.length} approved facts across your connected fictional profile. I can calculate ${previewInsights.length} more useful checks without guessing.`
              : 'Answer three grouped questions and I can structure up to 9 application fields, then calculate transparent values from your dates.'}
          </p>
          <div className="concierge-impact-grid">
            <div><strong>{isDemo ? fictionalProfile.facts.length : 9}</strong><span>{isDemo ? 'approved facts' : 'fields unlocked'}</span></div>
            <div><strong>{isDemo ? previewInsights.length : 2}</strong><span>derived checks</span></div>
            <div><strong>3</strong><span>quick questions</span></div>
          </div>
          <div className="concierge-actions">
            <button className="concierge-primary" onClick={() => setStage('questions')}>Show me how <span>→</span></button>
            <button className="concierge-secondary" onClick={close}>Not now</button>
          </div>
          <span className="concierge-privacy"><LockIcon /> Nothing is added until you review and approve the plan.</span>
        </div>
      )}

      {stage === 'questions' && (
        <div className="concierge-body concierge-body--scroll">
          <span className="concierge-kicker">Three high-value questions</span>
          <h2>{isDemo ? 'Is the saved context still current?' : 'Tell me complete facts once.'}</h2>
          {isDemo ? (
            <div className="concierge-confirm-list">
              {demoCheckLabels.map((label, index) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={demoChecks[index]}
                    onChange={(event) => setDemoChecks((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}
                  />
                  <span><CheckIcon />{label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="concierge-question-groups">
              <fieldset>
                <legend><span>1</span> What is the trip you are planning?</legend>
                <div className="concierge-form-grid">
                  <select aria-label="Travel purpose" value={interview.travelPurpose} onChange={(event) => updateInterview('travelPurpose', event.target.value)}>
                    <option value="">Purpose</option><option>Tourism</option><option>Business</option><option>Study</option><option>Family visit</option><option>Other</option>
                  </select>
                  <input aria-label="Destination city" placeholder="Destination city" value={interview.destinationCity} onChange={(event) => updateInterview('destinationCity', event.target.value)} />
                  <input aria-label="Arrival date" type="date" value={interview.arrivalDate} onChange={(event) => updateInterview('arrivalDate', event.target.value)} />
                  <input aria-label="Departure date" type="date" value={interview.departureDate} onChange={(event) => updateInterview('departureDate', event.target.value)} />
                </div>
              </fieldset>
              <fieldset>
                <legend><span>2</span> What is your current work situation?</legend>
                <div className="concierge-form-grid concierge-form-grid--three">
                  <input aria-label="Current employer" placeholder="Employer" value={interview.currentEmployer} onChange={(event) => updateInterview('currentEmployer', event.target.value)} />
                  <input aria-label="Job title" placeholder="Job title" value={interview.jobTitle} onChange={(event) => updateInterview('jobTitle', event.target.value)} />
                  <input aria-label="Employment start date" type="date" value={interview.employmentStart} onChange={(event) => updateInterview('employmentStart', event.target.value)} />
                </div>
              </fieldset>
              <fieldset>
                <legend><span>3</span> Where do you currently live?</legend>
                <div className="concierge-form-grid">
                  <input aria-label="Current city" placeholder="City" value={interview.currentCity} onChange={(event) => updateInterview('currentCity', event.target.value)} />
                  <select aria-label="Current country" value={interview.currentCountry} onChange={(event) => updateInterview('currentCountry', event.target.value)}>
                    <option value="">Country</option><option>United States</option><option>India</option><option>United Kingdom</option><option>Canada</option><option>Australia</option><option>Other</option>
                  </select>
                </div>
              </fieldset>
            </div>
          )}
          {validationError && <span className="concierge-error"><WarningIcon />{validationError}</span>}
          <div className="concierge-actions">
            <button className="concierge-primary" onClick={proceedFromQuestions}>Build my prefill plan <span>→</span></button>
            <button className="concierge-secondary" onClick={() => setStage('opportunity')}>Back</button>
          </div>
        </div>
      )}

      {stage === 'plan' && (
        <div className="concierge-body concierge-body--scroll">
          <span className="concierge-kicker"><CheckIcon /> Ready for your approval</span>
          <h2>Here is exactly what I will do.</h2>
          <div className="concierge-plan-summary">
            <div><span className="plan-icon plan-icon--known"><CheckIcon /></span><p><strong>{isDemo ? `${fictionalProfile.facts.length} known facts` : '9 structured answers'}</strong><small>{isDemo ? 'From four approved fictional sources' : 'From the three answers you just provided'}</small></p></div>
            <div><span className="plan-icon plan-icon--derived"><SparkleIcon /></span><p><strong>{previewInsights.length} derived values</strong><small>Calculated from source fields with visible reasoning</small></p></div>
            <div><span className="plan-icon plan-icon--sensitive"><LockIcon /></span><p><strong>{isDemo ? '4 sensitive values' : 'No sensitive values inferred'}</strong><small>Sensitive information stays pending for you</small></p></div>
          </div>
          {previewInsights.length > 0 && (
            <div className="concierge-derived-preview">
              <span>Agent reasoning preview</span>
              {previewInsights.map((insight) => (
                <div key={insight.id}><SparkleIcon /><p><strong>{insight.label}: {insight.value}</strong><small>{insight.explanation}</small></p></div>
              ))}
            </div>
          )}
          {webMcp.status !== 'registered' && <span className="concierge-error"><WarningIcon />Open this page in WebMCP-enabled Chrome to apply the plan.</span>}
          {webMcp.prefillError && <span className="concierge-error"><WarningIcon />{webMcp.prefillError}</span>}
          <div className="concierge-actions">
            <button className="concierge-primary" disabled={webMcp.status !== 'registered'} onClick={applyPlan}><BotIcon /> Approve and prefill</button>
            <button className="concierge-secondary" onClick={() => setStage('questions')}>Change answers</button>
          </div>
        </div>
      )}

      {stage === 'running' && (
        <div className="concierge-body concierge-running">
          <span className="concierge-running-icon"><BotIcon /></span>
          <span className="concierge-kicker">Applying through WebMCP</span>
          <h2>{webMcp.prefillProgress.label}</h2>
          <p>{webMcp.prefillProgress.completed} of {webMcp.prefillProgress.total} semantic tool calls complete</p>
          <span className="concierge-progress"><span style={{ width: `${(webMcp.prefillProgress.completed / webMcp.prefillProgress.total) * 100}%` }} /></span>
          {webMcp.prefillStatus === 'error' && <><span className="concierge-error"><WarningIcon />{webMcp.prefillError}</span><button className="concierge-secondary" onClick={() => setStage('plan')}>Return to plan</button></>}
        </div>
      )}

      {stage === 'complete' && (
        <div className="concierge-body concierge-complete">
          <span className="concierge-complete-icon"><CheckIcon /></span>
          <span className="concierge-kicker">Prefill complete</span>
          <h2>I filled what I could—and showed my work.</h2>
          <p>{metrics.completed} of {metrics.total} fields are now answered. {metrics.needsConfirmation} sensitive values still need you.</p>
          <div className="concierge-impact-grid">
            <div><strong>{metrics.completed}</strong><span>answered</span></div>
            <div><strong>{state.derivedInsights.length}</strong><span>derived checks</span></div>
            <div><strong>{metrics.needsConfirmation}</strong><span>confirm</span></div>
          </div>
          <button className="concierge-primary" onClick={close}>Review the application <span>→</span></button>
        </div>
      )}
    </section>
  )
}
