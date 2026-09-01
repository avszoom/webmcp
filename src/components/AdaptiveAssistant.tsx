import { useEffect, useMemo, useRef, useState } from 'react'
import { buildApplicationFlow, normalizeFunding, normalizePurpose } from '../agent/applicationFlow'
import { approvedProfileDemoCalls, type PrefillToolCall } from '../webmcp/demoCalls'
import { useApplication } from '../state/ApplicationContext'
import { useWebMcp } from '../webmcp/WebMcpContext'
import type { ApplicationPurpose, FundingSource, PriorVisitStatus } from '../types'
import type { Locale } from '../i18n'
import { BotIcon, CheckIcon, LockIcon, SparkleIcon, WarningIcon, XIcon } from './Icons'

type InterviewStage = 'intro' | 'trip' | 'funding' | 'employment' | 'prior_visit' | 'refusal' | 'complete'

interface ChatMessage {
  id: string
  role: 'agent' | 'user'
  text: string
}

const speechLocales: Record<Locale, string> = {
  en: 'en-US', es: 'es-US', fr: 'fr-FR', hi: 'hi-IN',
}

const content = {
  en: {
    greeting: 'This application is long, but I can help. Answer a few questions by voice or text. I’ll select the right path, fill what your approved profile already knows, and explain anything I derive.',
    privacy: 'You can review every answer. Sensitive information is never submitted.',
    startVoice: 'Start with voice', type: 'Type instead', later: 'Not now',
    trip: 'First, tell me why you are visiting the United States, where you plan to go, and your travel dates.',
    fundingTourism: 'Who will pay for this trip—you, an employer, or a host in the United States?',
    fundingBusiness: 'Who will cover the trip costs—your employer, the event host, you, or a combination?',
    fundingFamily: 'Will you pay for the trip yourself, or will your host or family member support you?',
    employment: 'Your approved profile says you are a Product Designer at Northstar Labs. Is that still current?',
    prior: 'Have you visited the United States before?',
    refusal: 'One sensitive question remains: have you ever been refused a U.S. visa?',
    complete: 'That was enough to shape the application. I filled the supported fields, derived the trip length, and left uncertain or sensitive items for your review.',
    placeholder: 'Speak or type your answer…', send: 'Send', listening: 'Listening…',
    activity: 'How this was completed', routePending: 'Route not selected',
  },
  es: {
    greeting: 'Esta solicitud es larga, pero puedo ayudarle. Responda algunas preguntas por voz o texto. Seleccionaré la ruta correcta y completaré lo que ya conoce su perfil aprobado.',
    privacy: 'Puede revisar cada respuesta. La información confidencial nunca se envía.',
    startVoice: 'Comenzar por voz', type: 'Escribir', later: 'Ahora no',
    trip: 'Primero, dígame por qué visita Estados Unidos, adónde irá y las fechas de viaje.',
    fundingTourism: '¿Quién pagará el viaje: usted, un empleador o un anfitrión?',
    fundingBusiness: '¿Quién cubrirá los gastos: su empleador, el evento, usted o una combinación?',
    fundingFamily: '¿Pagará usted o le ayudará su anfitrión o familiar?',
    employment: 'Su perfil aprobado indica que trabaja como diseñador en Northstar Labs. ¿Sigue siendo correcto?',
    prior: '¿Ha visitado Estados Unidos antes?', refusal: '¿Alguna vez le han negado una visa estadounidense?',
    complete: 'Eso fue suficiente para adaptar la solicitud. Completé los campos respaldados y dejé lo incierto para su revisión.',
    placeholder: 'Hable o escriba su respuesta…', send: 'Enviar', listening: 'Escuchando…', activity: 'Cómo se completó', routePending: 'Ruta sin seleccionar',
  },
  fr: {
    greeting: 'Cette demande est longue, mais je peux vous aider. Répondez à quelques questions oralement ou par écrit. Je choisirai le bon parcours et remplirai les informations approuvées.',
    privacy: 'Vous pouvez vérifier chaque réponse. Aucune donnée sensible n’est envoyée.',
    startVoice: 'Commencer par la voix', type: 'Écrire', later: 'Plus tard',
    trip: 'Pourquoi allez-vous aux États-Unis, où irez-vous et à quelles dates ?',
    fundingTourism: 'Qui paiera le voyage : vous, un employeur ou un hôte ?',
    fundingBusiness: 'Qui couvrira les frais : votre employeur, l’événement, vous ou plusieurs parties ?',
    fundingFamily: 'Paierez-vous le voyage ou votre famille d’accueil vous aidera-t-elle ?',
    employment: 'Votre profil indique que vous êtes designer chez Northstar Labs. Est-ce toujours exact ?',
    prior: 'Avez-vous déjà visité les États-Unis ?', refusal: 'Un visa américain vous a-t-il déjà été refusé ?',
    complete: 'Cela suffit pour adapter la demande. J’ai rempli les champs justifiés et laissé les éléments incertains à vérifier.',
    placeholder: 'Parlez ou écrivez votre réponse…', send: 'Envoyer', listening: 'Écoute…', activity: 'Comment cela a été rempli', routePending: 'Parcours non sélectionné',
  },
  hi: {
    greeting: 'यह आवेदन लंबा है, लेकिन मैं मदद कर सकता हूँ। आवाज़ या टेक्स्ट से कुछ सवालों के जवाब दें। मैं सही रास्ता चुनूँगा और स्वीकृत जानकारी भरूँगा।',
    privacy: 'आप हर उत्तर की समीक्षा कर सकते हैं। संवेदनशील जानकारी जमा नहीं की जाती।',
    startVoice: 'आवाज़ से शुरू करें', type: 'टाइप करें', later: 'अभी नहीं',
    trip: 'आप अमेरिका क्यों जा रहे हैं, कहाँ जाएंगे और यात्रा की तारीखें क्या हैं?',
    fundingTourism: 'यात्रा का भुगतान कौन करेगा—आप, नियोक्ता या मेज़बान?',
    fundingBusiness: 'यात्रा का खर्च कौन देगा—नियोक्ता, कार्यक्रम, आप या सभी?',
    fundingFamily: 'आप भुगतान करेंगे या आपका मेज़बान अथवा परिवार मदद करेगा?',
    employment: 'स्वीकृत प्रोफ़ाइल के अनुसार आप Northstar Labs में Product Designer हैं। क्या यह सही है?',
    prior: 'क्या आप पहले अमेरिका गए हैं?', refusal: 'क्या आपका अमेरिकी वीज़ा कभी अस्वीकार हुआ है?',
    complete: 'इतनी जानकारी आवेदन को अनुकूल बनाने के लिए पर्याप्त थी। समर्थित फ़ील्ड भर दिए गए हैं और अनिश्चित जानकारी समीक्षा के लिए रखी गई है।',
    placeholder: 'बोलें या उत्तर लिखें…', send: 'भेजें', listening: 'सुन रहा हूँ…', activity: 'यह कैसे पूरा हुआ', routePending: 'रास्ता चुना नहीं गया',
  },
} as const

function parseTripAnswer(answer: string) {
  const purpose = normalizePurpose(answer)
  const cityCandidates = ['New York', 'Los Angeles', 'Miami', 'San Francisco', 'Orlando', 'Chicago', 'Washington']
  const destination = cityCandidates.find((city) => answer.toLowerCase().includes(city.toLowerCase())) ?? 'New York'
  const monthMatches = answer.match(/(?:october|oct)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:to|through|until|-)\s*(?:(?:october|oct)\s*)?(\d{1,2}))?/i)
  const year = answer.match(/20\d{2}/)?.[0] ?? '2026'
  const arrival = monthMatches?.[1] ? `${year}-10-${monthMatches[1].padStart(2, '0')}` : undefined
  const departure = monthMatches?.[2] ? `${year}-10-${monthMatches[2].padStart(2, '0')}` : undefined
  return { purpose, destination, arrival, departure }
}

function yesNo(answer: string): 'Yes' | 'No' {
  return /\b(no|never|not|nope)\b/i.test(answer) ? 'No' : 'Yes'
}

function purposeLabel(purpose: ApplicationPurpose) {
  return purpose === 'business' ? 'Business' : purpose === 'family_visit' ? 'Family visit' : 'Tourism'
}

export function AdaptiveAssistant({ locale }: { locale: Locale }) {
  const { state, metrics, dispatch } = useApplication()
  const webMcp = useWebMcp()
  const copy = content[locale]
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<InterviewStage>('intro')
  const [draft, setDraft] = useState('')
  const [working, setWorking] = useState(false)
  const [listening, setListening] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const conversationRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 650)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!messages.length) setMessages([{ id: 'greeting', role: 'agent', text: copy.greeting }])
  }, [copy.greeting, messages.length])

  useEffect(() => {
    if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight
  }, [messages, working])

  const route = state.flow
  const routePreview = useMemo(() => route ?? buildApplicationFlow('undetermined'), [route])

  const addMessage = (role: ChatMessage['role'], text: string) => {
    setMessages((current) => [...current, { id: `${role}-${Date.now()}-${current.length}`, role, text }])
  }

  const runCalls = async (calls: PrefillToolCall[]) => {
    setWorking(true)
    await webMcp.runPrefillPlan(calls)
    setWorking(false)
  }

  const ask = (nextStage: InterviewStage, text: string) => {
    setStage(nextStage)
    window.setTimeout(() => addMessage('agent', text), 220)
  }

  const processAnswer = async (rawAnswer: string) => {
    const answer = rawAnswer.trim()
    if (!answer || working || stage === 'intro' || stage === 'complete') return
    setDraft('')
    addMessage('user', answer)

    if (stage === 'trip') {
      const trip = parseTripAnswer(answer)
      const travelInput: Record<string, unknown> = {
        source: 'user_statement', purpose: purposeLabel(trip.purpose), destination_city: trip.destination,
      }
      if (trip.arrival) travelInput.arrival_date = trip.arrival
      if (trip.departure) travelInput.departure_date = trip.departure
      await runCalls([
        { toolName: 'select_application_flow', label: 'Selecting the visitor path', input: { purpose: trip.purpose } },
        { toolName: 'provide_travel_information', label: 'Applying trip details without page navigation', input: travelInput },
      ])
      const preview = buildApplicationFlow(trip.purpose)
      addMessage('agent', `I selected the ${preview.labels[0]} path. ${preview.applicableQuestionIds.length} of 55 questions currently apply; ${preview.excludedQuestionIds.length} unrelated questions were removed.`)
      ask('funding', trip.purpose === 'business' ? copy.fundingBusiness : trip.purpose === 'family_visit' ? copy.fundingFamily : copy.fundingTourism)
      return
    }

    if (stage === 'funding') {
      const funding = normalizeFunding(answer)
      const purpose = state.flow?.purpose ?? 'tourism'
      await runCalls([
        { toolName: 'select_application_flow', label: 'Recalculating evidence requirements', input: { purpose, funding } },
        ...approvedProfileDemoCalls.slice(0, 4),
      ])
      const preview = buildApplicationFlow(purpose, funding)
      addMessage('agent', `${preview.labels.join(' · ')} is now selected. I used four semantic actions to add approved identity, passport, contact, and address facts—without opening those sections.`)
      ask('employment', copy.employment)
      return
    }

    if (stage === 'employment') {
      if (yesNo(answer) === 'Yes') {
        await runCalls([approvedProfileDemoCalls[4]])
        addMessage('agent', 'Employment confirmed. Five related fields were applied from the approved résumé, and income remains marked for your review.')
      } else {
        addMessage('agent', 'I left employment unanswered rather than using stale information.')
      }
      ask('prior_visit', copy.prior)
      return
    }

    if (stage === 'prior_visit') {
      const visited = yesNo(answer)
      const purpose = state.flow?.purpose ?? 'tourism'
      const funding = state.flow?.funding ?? 'undetermined'
      const priorVisit: PriorVisitStatus = visited === 'Yes' ? 'yes' : 'no'
      await runCalls([
        { toolName: 'select_application_flow', label: 'Selecting travel-history path', input: { purpose, funding, prior_visit: priorVisit } },
        { toolName: 'provide_travel_information', label: 'Applying travel history', input: { source: 'user_statement', visited_before: visited } },
      ])
      addMessage('agent', visited === 'Yes' ? 'Returning visitor path selected. I preserved your existing answers and activated only the relevant travel-history checks.' : 'First-time visitor path selected. Prior-trip follow-ups are no longer applicable.')
      ask('refusal', copy.refusal)
      return
    }

    if (stage === 'refusal') {
      const refused = yesNo(answer)
      await runCalls([
        { toolName: 'provide_travel_information', label: 'Recording the sensitive declaration', input: { source: 'user_statement', prior_visa_refusal: refused } },
      ])
      setStage('complete')
      addMessage('agent', copy.complete)
    }
  }

  const begin = (withVoice: boolean) => {
    addMessage('agent', copy.trip)
    setStage('trip')
    if (withVoice) window.setTimeout(startListening, 300)
  }

  const startListening = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      addMessage('agent', 'Voice input is unavailable in this browser. You can type the same answer below.')
      return
    }
    recognitionRef.current?.abort()
    const recognition = new Recognition()
    recognition.lang = speechLocales[locale]
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onstart = () => setListening(true)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ')
      setDraft(transcript)
      if (event.results[event.results.length - 1].isFinal) void processAnswer(transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  const suggestion = stage === 'trip'
    ? 'Tourism in New York, October 12 to October 21, 2026'
    : stage === 'funding'
      ? 'I am paying for the trip myself'
      : stage === 'employment'
        ? 'Yes, that is still current'
        : stage === 'prior_visit'
          ? 'Yes, I visited in 2024'
          : stage === 'refusal'
            ? 'No, I have never been refused'
            : ''

  if (!open) {
    return <button className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Open application assistant"><BotIcon /><span>Get help</span></button>
  }

  return (
    <section className="adaptive-assistant" role="dialog" aria-label="Application assistant">
      <header className="assistant-header">
        <span className="assistant-avatar"><BotIcon /></span>
        <div><strong>Application Assistant</strong><span><i /> {webMcp.status === 'registered' ? 'Connected through WebMCP' : 'Semantic tools ready'}</span></div>
        <button onClick={() => setOpen(false)} aria-label="Close assistant"><XIcon /></button>
      </header>

      {route && (
        <div className="route-strip">
          <span>YOUR APPLICATION PATH</span>
          <div>{route.labels.map((label) => <strong key={label}>{label}<em>›</em></strong>)}</div>
          <small>{route.applicableQuestionIds.length} applicable · {route.excludedQuestionIds.length} excluded</small>
        </div>
      )}

      <div className="assistant-conversation" ref={conversationRef}>
        {messages.map((message) => (
          <div className={`chat-message chat-message--${message.role}`} key={message.id}>
            {message.role === 'agent' && <span><BotIcon /></span>}
            <p>{message.text}</p>
          </div>
        ))}
        {working && (
          <div className="assistant-working"><SparkleIcon /><div><strong>{webMcp.prefillProgress.label}</strong><span>{webMcp.prefillProgress.completed} of {webMcp.prefillProgress.total} semantic actions</span></div></div>
        )}
        {webMcp.prefillError && <div className="assistant-error"><WarningIcon />{webMcp.prefillError}</div>}

        {stage === 'intro' && (
          <div className="assistant-intro-actions">
            <button className="assistant-primary" onClick={() => begin(true)}>● {copy.startVoice}</button>
            <button onClick={() => begin(false)}>{copy.type}</button>
            <button onClick={() => setOpen(false)}>{copy.later}</button>
            <small><LockIcon /> {copy.privacy}</small>
          </div>
        )}

        {stage === 'complete' && (
          <div className="assistant-result">
            <CheckIcon />
            <div><strong>{metrics.completed} of {metrics.total} applicable questions completed</strong><span>{metrics.needsConfirmation} sensitive answers need review · {metrics.evidenceNeeded} evidence items remain</span></div>
          </div>
        )}
      </div>

      {stage !== 'intro' && stage !== 'complete' && (
        <div className="assistant-composer">
          {suggestion && <button className="answer-suggestion" onClick={() => void processAnswer(suggestion)}>Try: “{suggestion}”</button>}
          <div>
            <button className={`voice-button ${listening ? 'voice-button--listening' : ''}`} onClick={startListening} aria-label="Answer by voice">{listening ? '■' : '●'}</button>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={listening ? copy.listening : copy.placeholder} rows={2} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void processAnswer(draft) }
            }} />
            <button className="send-button" disabled={!draft.trim() || working} onClick={() => void processAnswer(draft)}>{copy.send}</button>
          </div>
        </div>
      )}

      <button className="assistant-activity-toggle" onClick={() => setActivityOpen((value) => !value)}>
        <span><SparkleIcon /> {copy.activity}</span><strong>{state.activity.length}</strong>
      </button>
      {activityOpen && (
        <div className="assistant-activity">
          <div className="activity-route"><strong>{route?.labels.join(' → ') ?? copy.routePending}</strong><span>{routePreview.applicableQuestionIds.length} semantic requirements visible to the agent</span></div>
          {state.activity.slice(0, 6).map((activity) => (
            <div key={activity.id}><CheckIcon /><p><strong>{activity.title}</strong><span>{activity.toolName} · {activity.detail}</span></p></div>
          ))}
        </div>
      )}
    </section>
  )
}
