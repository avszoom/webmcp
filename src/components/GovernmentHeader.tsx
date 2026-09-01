import { t, type Locale } from '../i18n'

interface GovernmentHeaderProps {
  language: Locale
  onLanguageChange: (language: Locale) => void
}

export function GovernmentHeader({ language, onLanguageChange }: GovernmentHeaderProps) {
  return (
    <>
      <div className="demo-warning">
        <span className="mini-flag" aria-hidden="true">★</span>
        <strong>Official-style demonstration</strong>
        <span>This is not a U.S. government website and does not submit a real visa application.</span>
      </div>
      <header className="government-header">
        <div className="government-header__inner">
          <div className="government-wordmark">
            <span className="government-seal" aria-hidden="true">US</span>
            <div><strong>United States Visa Services</strong><span>Electronic Visitor Visa Application</span></div>
          </div>
          <div className="government-header__actions">
            <label htmlFor="site-language">{t(language, 'language')}</label>
            <select id="site-language" value={language} onChange={(event) => onLanguageChange(event.target.value as Locale)}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="hi">हिन्दी</option>
            </select>
            <button type="button">{t(language, 'help')}</button>
          </div>
        </div>
      </header>
      <div className="government-subnav"><span>B-2 Visitor Visa</span><span>Application ID: AA00-DEMO</span></div>
    </>
  )
}
