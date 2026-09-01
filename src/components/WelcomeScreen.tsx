import { fictionalProfile } from '../data/demoProfile'
import { useApplication } from '../state/ApplicationContext'
import {
  ArrowRightIcon,
  BotIcon,
  CheckIcon,
  LockIcon,
  ShieldIcon,
  SparkleIcon,
  UserIcon,
} from './Icons'
import { Brand } from './Brand'

const trustPoints = [
  { icon: ShieldIcon, title: 'Never guesses', body: 'Unknown information stays visibly missing.' },
  { icon: LockIcon, title: 'You stay in control', body: 'Sensitive facts always wait for confirmation.' },
  { icon: CheckIcon, title: 'Every answer has a source', body: 'See where each detail came from.' },
]

export function WelcomeScreen() {
  const { dispatch } = useApplication()

  return (
    <main className="welcome-shell">
      <nav className="welcome-nav">
        <Brand />
        <span className="fictional-badge">Fictional application</span>
      </nav>

      <section className="welcome-hero">
        <div className="welcome-copy">
          <div className="eyebrow"><SparkleIcon /> WebMCP application prototype</div>
          <h1>Less form-filling.<br /><em>More human review.</em></h1>
          <p className="welcome-lede">
            Give an agent one trusted source or one minute of conversation. It completes
            what it can, shows its work, and never guesses.
          </p>

          <div className="start-options" aria-label="Choose how to begin">
            <button
              className="start-card start-card--primary"
              onClick={() => dispatch({ type: 'START', mode: 'demo' })}
            >
              <span className="start-card__icon"><BotIcon /></span>
              <span className="start-card__content">
                <span className="start-card__topline">
                  <strong>Use the fictional profile</strong>
                  <span className="recommended-pill">Recommended</span>
                </span>
                <span>
                  Start blank, enter two fields, then let the concierge find 39 approved facts.
                </span>
              </span>
              <ArrowRightIcon className="start-card__arrow" />
            </button>

            <button
              className="start-card"
              onClick={() => dispatch({ type: 'START', mode: 'personal' })}
            >
              <span className="start-card__icon"><UserIcon /></span>
              <span className="start-card__content">
                <span className="start-card__topline"><strong>Start with my information</strong></span>
                <span>Begin blank and share only the details you choose.</span>
              </span>
              <ArrowRightIcon className="start-card__arrow" />
            </button>
          </div>

          <p className="welcome-footnote">
            No account required. All fictional-profile data is synthetic.
          </p>
        </div>

        <div className="preview-wrap" aria-label="Application readiness preview">
          <div className="preview-glow" />
          <div className="preview-card">
            <div className="preview-card__header">
              <div>
                <span className="preview-label">Agent readiness</span>
                <strong>Application understood</strong>
              </div>
              <span className="ready-dot"><span /> Ready</span>
            </div>
            <div className="preview-progress">
              <div className="preview-progress__top"><span>Application progress</span><strong>39 / 55</strong></div>
              <div className="preview-progress__track"><span /></div>
            </div>
            <div className="preview-stats">
              <div><strong>39</strong><span>Completed</span></div>
              <div><strong>7</strong><span>Missing</span></div>
              <div><strong>4</strong><span>Confirm</span></div>
              <div><strong>3</strong><span>Conflicts</span></div>
              <div><strong>2</strong><span>Evidence</span></div>
            </div>
            <div className="preview-activity">
              <span className="preview-activity__icon"><BotIcon /></span>
              <div>
                <small>Agent activity</small>
                <strong>Added current employment</strong>
                <span>From approved demo résumé · just now</span>
              </div>
              <CheckIcon className="preview-check" />
            </div>
            <div className="preview-activity preview-activity--muted">
              <span className="preview-activity__icon"><LockIcon /></span>
              <div>
                <small>Waiting for you</small>
                <strong>Passport number needs confirmation</strong>
                <span>Sensitive information is never applied silently</span>
              </div>
            </div>
          </div>
          <div className="preview-float">
            <SparkleIcon />
            <div><strong>16 tools discovered</strong><span>55 requirements mapped</span></div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        {trustPoints.map(({ icon: Icon, title, body }) => (
          <div className="trust-point" key={title}>
            <span><Icon /></span>
            <div><strong>{title}</strong><p>{body}</p></div>
          </div>
        ))}
      </section>
    </main>
  )
}
