import { useEffect, useMemo, useState } from 'react'
import { questions, questionsBySection, sections } from '../data/questions'
import { sectionName, t, type Locale } from '../i18n'
import { useApplication } from '../state/ApplicationContext'
import { CheckIcon, ChevronRightIcon, FileIcon, LockIcon, RefreshIcon, WarningIcon } from './Icons'
import { QuestionField } from './QuestionField'
import { Sidebar } from './Sidebar'
import { GovernmentHeader } from './GovernmentHeader'
import { AdaptiveAssistant } from './AdaptiveAssistant'

export function ApplicationWorkspace() {
  const { state, dispatch, metrics } = useApplication()
  const [language, setLanguage] = useState<Locale>('en')
  const [assistantSession, setAssistantSession] = useState(0)
  const [submissionReceipt, setSubmissionReceipt] = useState<{ id: string; submittedAt: string } | null>(null)
  const applicableIds = useMemo(
    () => new Set(state.flow?.applicableQuestionIds ?? questions.map((question) => question.id)),
    [state.flow],
  )
  const visibleSections = useMemo(
    () => sections.filter((section) => questionsBySection[section.id].some((question) => applicableIds.has(question.id))),
    [applicableIds],
  )
  const activeSection = visibleSections.find((section) => section.id === state.activeSectionId) ?? visibleSections[0]
  const activeIndex = visibleSections.findIndex((section) => section.id === activeSection.id)
  const activeQuestions = questionsBySection[activeSection.id].filter((question) => applicableIds.has(question.id))
  const canSubmit = metrics.missing === 0 && metrics.needsConfirmation === 0 && metrics.conflicts === 0
  const submissionGuidance = metrics.missing > 0
    ? `Complete ${metrics.missing} unanswered field${metrics.missing === 1 ? '' : 's'} before submitting.`
    : metrics.needsConfirmation > 0
      ? `Review ${metrics.needsConfirmation} filled value${metrics.needsConfirmation === 1 ? '' : 's'} with the guide before submitting.`
      : metrics.conflicts > 0
        ? `Resolve ${metrics.conflicts} conflicting value${metrics.conflicts === 1 ? '' : 's'} before submitting.`
        : 'Every applicable field is complete and reviewed.'

  useEffect(() => {
    if (activeSection.id !== state.activeSectionId) dispatch({ type: 'SET_SECTION', sectionId: activeSection.id })
  }, [activeSection.id, dispatch, state.activeSectionId])

  const goNext = () => {
    if (activeIndex < visibleSections.length - 1) {
      dispatch({ type: 'SET_SECTION', sectionId: visibleSections[activeIndex + 1].id })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const restartApplication = () => {
    const confirmed = window.confirm(
      'Start a fresh application? This will clear every answer, the selected path, and the assistant conversation stored on this device.',
    )
    if (!confirmed) return

    dispatch({ type: 'RESET_APPLICATION' })
    setSubmissionReceipt(null)
    setAssistantSession((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitApplication = () => {
    if (!canSubmit || submissionReceipt) return
    const submittedAt = new Date()
    const id = `AVV-${submittedAt.getUTCFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    setSubmissionReceipt({ id, submittedAt: submittedAt.toISOString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="government-site">
      <GovernmentHeader language={language} onLanguageChange={setLanguage} />
      <main className="workspace-shell">
        <Sidebar locale={language} visibleSections={visibleSections} applicableIds={applicableIds} />

        <div className="workspace-main">
          <header className="workspace-topbar">
            <div>
              <span className="topbar-title">{t(language, 'application')}</span>
              <span className="topbar-id">{t(language, 'subtitle')}</span>
            </div>
            <div className="topbar-actions">
              <span className="saved-state"><CheckIcon /> {t(language, 'saved')}</span>
              <button
                className="restart-application-button"
                onClick={restartApplication}
                aria-label="Start a fresh application"
              ><RefreshIcon /> {t(language, 'reset')}</button>
            </div>
          </header>

          <div className="workspace-content">
            <div className="application-intro">
              <span>U.S. VISITOR VISA · ONLINE APPLICATION</span>
              <h1>Tourist and temporary visitor application</h1>
              <p>Complete all questions that apply to you. Your answers determine which additional sections and supporting evidence are required.</p>
            </div>

            {submissionReceipt && (
              <section className="submission-receipt" aria-label="Submission receipt">
                <span><CheckIcon /></span>
                <div><strong>Application submitted successfully</strong><p>Your completed application has been accepted for review.</p><small>Confirmation {submissionReceipt.id} · {new Date(submissionReceipt.submittedAt).toLocaleString()}</small></div>
              </section>
            )}

            <section className={`flow-summary ${state.flow ? 'flow-summary--selected' : ''}`} aria-label="Application path">
              <div className="flow-summary__icon">{state.flow ? <CheckIcon /> : <span>55</span>}</div>
              <div className="flow-summary__copy">
                <span>YOUR APPLICATION PATH</span>
                {state.flow ? (
                  <>
                    <div className="flow-breadcrumbs">{state.flow.labels.map((label) => <strong key={label}>{label}<em>›</em></strong>)}</div>
                    <p>The application evaluated your answers and excluded {state.flow.excludedQuestionIds.length} questions that do not apply.</p>
                  </>
                ) : (
                  <><strong>Not determined yet</strong><p>The full application begins with 55 questions. The assistant can identify your path from a few natural answers.</p></>
                )}
              </div>
              <div className="flow-summary__count"><strong>{metrics.total}</strong><span>questions apply</span></div>
            </section>

            <section className="status-grid" aria-label="Application status">
              <div className="status-card status-card--primary"><span><CheckIcon /></span><div><strong>{metrics.completed}</strong><small>{t(language, 'completed')}</small></div><em>of {metrics.total}</em></div>
              <div className="status-card"><span><ClockGlyph /></span><div><strong>{metrics.missing}</strong><small>{t(language, 'missing')}</small></div></div>
              <div className="status-card"><span><LockIcon /></span><div><strong>{metrics.needsConfirmation}</strong><small>{t(language, 'confirm')}</small></div><em>{t(language, 'includedFilled')}</em></div>
              <div className="status-card"><span><FileIcon /></span><div><strong>{metrics.evidenceNeeded}</strong><small>{t(language, 'evidence')}</small></div><em>{t(language, 'includedUnanswered')}</em></div>
            </section>

            {state.conflicts.length > 0 && (
              <div className="government-alert"><WarningIcon /><div><strong>Information needs review</strong><span>{state.conflicts.length} proposed answer differs from information already in this application.</span></div></div>
            )}

            <div className="section-heading">
              <div>
                <span className="section-step">{t(language, 'section')} {activeIndex + 1} of {visibleSections.length}</span>
                <h2>{sectionName(language, activeSection.id, activeSection.title)}</h2>
                <p>{activeSection.description}</p>
              </div>
              <span className="section-count">
                {activeQuestions.filter((question) => state.answers[question.id]).length} / {activeQuestions.length} {t(language, 'answered')}
              </span>
            </div>

            <section className="question-card">
              <div className="question-card__notice"><strong>Answer every applicable question.</strong><span>The assistant may complete supported fields, but you remain responsible for reviewing them.</span></div>
              <div className="question-grid">
                {activeQuestions.map((question) => <QuestionField key={question.id} question={question} locale={language} />)}
              </div>
              <div className="question-card__footer">
                <span>{t(language, 'required')}</span>
                {activeIndex < visibleSections.length - 1 && (
                  <button className="primary-button" onClick={goNext}>{t(language, 'saveContinue')} <ChevronRightIcon /></button>
                )}
                {activeIndex === visibleSections.length - 1 && (
                  <div className="submission-actions">
                    <small>{submissionReceipt ? `Submitted · ${submissionReceipt.id}` : submissionGuidance}</small>
                    <button className="submit-application-button" onClick={submitApplication} disabled={!canSubmit || Boolean(submissionReceipt)}>
                      <CheckIcon /> {submissionReceipt ? 'Application submitted' : 'Finish & submit'}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <div className="privacy-footer"><LockIcon /><p><strong>Privacy and security</strong><span>Your draft is stored only in this browser. This service does not transmit information to a government system.</span></p></div>
          </div>
        </div>
      </main>
      <AdaptiveAssistant key={assistantSession} locale={language} onRestart={restartApplication} onSubmit={submitApplication} submitted={Boolean(submissionReceipt)} />
    </div>
  )
}

function ClockGlyph() {
  return <span aria-hidden="true" className="clock-glyph">◷</span>
}
