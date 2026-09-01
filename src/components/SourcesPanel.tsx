import { approvedSourceGroups, fictionalProfile } from '../data/demoProfile'
import { useApplication } from '../state/ApplicationContext'
import { useWebMcp } from '../webmcp/WebMcpContext'
import { BotIcon, CheckIcon, FileIcon, LockIcon, SparkleIcon, UserIcon, WarningIcon } from './Icons'

export function SourcesPanel() {
  const { state } = useApplication()
  const webMcp = useWebMcp()
  const isDemo = state.startMode === 'demo'

  return (
    <aside className="sources-panel">
      <div className="sources-panel__header">
        <div><span className="panel-kicker">Trusted context</span><h2>Approved sources</h2></div>
        <span className="source-count">{isDemo ? 4 : 0}</span>
      </div>

      <div className={`webmcp-status webmcp-status--${webMcp.status}`}>
        <span className="webmcp-status__icon">
          {webMcp.status === 'registered' ? <BotIcon /> : webMcp.status === 'error' ? <WarningIcon /> : <SparkleIcon />}
        </span>
        <div>
          <span>{webMcp.status === 'registered' ? 'WebMCP live' : webMcp.status === 'checking' ? 'Checking WebMCP' : 'WebMCP unavailable'}</span>
          <strong>
            {webMcp.status === 'registered'
              ? `${webMcp.toolCount} semantic tools registered`
              : webMcp.status === 'checking'
                ? 'Registering application tools…'
                : webMcp.status === 'unsupported'
                  ? 'Open in a WebMCP-capable browser'
                  : webMcp.error ?? 'Tool registration failed'}
          </strong>
        </div>
        {webMcp.status === 'registered' && <span className="webmcp-live-dot" />}
      </div>

      {isDemo ? (
        <>
          <div className="profile-card">
            <div className="avatar">AM</div>
            <div><strong>{fictionalProfile.name}</strong><span>Fictional demo person</span></div>
            <span className="connected-pill"><CheckIcon /> Connected</span>
          </div>

          <div className="source-list">
            {approvedSourceGroups.map((source, index) => (
              <div className="source-row" key={source.name}>
                <span className="source-row__icon">{index === 0 ? <UserIcon /> : <FileIcon />}</span>
                <div><strong>{source.name}</strong><span>{source.count} approved facts</span></div>
                <CheckIcon className="source-row__check" />
              </div>
            ))}
          </div>

          <div className="ready-card">
            <SparkleIcon />
            <div className="ready-card__copy"><strong>Agent-ready context</strong><p>Fill two fields and the concierge will offer a transparent prefill plan.</p></div>
          </div>
        </>
      ) : (
        <div className="empty-sources">
          <span><UserIcon /></span>
          <h3>No sources connected</h3>
          <p>Fill two fields yourself. The concierge will ask three grouped questions and structure the answers for you.</p>
          <div className="coming-soon"><SparkleIcon /> Three answers can unlock up to nine fields</div>
        </div>
      )}

      {state.derivedInsights.length > 0 && (
        <section className="derived-panel" aria-label="Agent-derived values">
          <div className="activity-panel__heading"><span>Derived with reasoning</span><strong>{state.derivedInsights.length}</strong></div>
          <div className="derived-list">
            {state.derivedInsights.map((insight) => (
              <div className="derived-row" key={insight.id}>
                <SparkleIcon />
                <div><strong>{insight.label}</strong><span>{insight.value}</span><small>{insight.explanation}</small></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {state.activity.length > 0 && (
        <section className="activity-panel" aria-label="Agent activity">
          <div className="activity-panel__heading">
            <span>Agent activity</span>
            <strong>{state.activity.length}</strong>
          </div>
          <div className="activity-list">
            {state.activity.slice(0, 5).map((activity) => (
              <div className={`activity-row activity-row--${activity.status}`} key={activity.id}>
                <span className="activity-row__icon">
                  {activity.status === 'conflict' || activity.status === 'blocked' ? <WarningIcon /> : activity.status === 'pending' ? <LockIcon /> : <CheckIcon />}
                </span>
                <div>
                  <strong>{activity.title}</strong>
                  <span>{activity.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="privacy-note"><LockIcon /><p><strong>Your approval matters.</strong><br />Sources are visible before any information is used.</p></div>
    </aside>
  )
}
