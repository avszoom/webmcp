import type { ApplicationSection } from '../types'
import { questionsBySection } from '../data/questions'
import { sectionName, t, type Locale } from '../i18n'
import { useApplication } from '../state/ApplicationContext'
import { CheckIcon, LockIcon } from './Icons'

interface SidebarProps {
  locale: Locale
  visibleSections: ApplicationSection[]
  applicableIds: Set<string>
}

export function Sidebar({ locale, visibleSections, applicableIds }: SidebarProps) {
  const { state, dispatch, metrics } = useApplication()

  return (
    <aside className="sidebar">
      <div className="application-mini government-progress">
        <span className="government-progress__value">{metrics.percentage}%</span>
        <div><strong>{t(locale, 'application')}</strong><span>{metrics.completed} of {metrics.total} {t(locale, 'questions')}</span></div>
      </div>
      <div className="progress-track"><span style={{ width: `${metrics.percentage}%` }} /></div>

      <nav className="section-nav" aria-label="Application sections">
        <span className="section-nav__label">{t(locale, 'section')}S</span>
        {visibleSections.map((section, index) => {
          const sectionQuestions = questionsBySection[section.id].filter((question) => applicableIds.has(question.id))
          const completed = sectionQuestions.filter((question) => state.answers[question.id]).length
          const isComplete = completed === sectionQuestions.length
          const isActive = state.activeSectionId === section.id
          return (
            <button key={section.id} className={`section-link ${isActive ? 'section-link--active' : ''}`} onClick={() => dispatch({ type: 'SET_SECTION', sectionId: section.id })}>
              <span className="section-link__number">{isComplete ? <CheckIcon /> : index + 1}</span>
              <span className="section-link__text"><strong>{sectionName(locale, section.id, section.shortTitle)}</strong><small>{completed} / {sectionQuestions.length}</small></span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-note"><LockIcon /><span>Draft stored locally<br /><small>No government submission</small></span></div>
    </aside>
  )
}
