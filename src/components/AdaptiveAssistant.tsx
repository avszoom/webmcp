import { useEffect, useMemo, useRef, useState } from 'react'
import { buildApplicationFlow } from '../agent/applicationFlow'
import {
  buildInterviewRequest,
  suggestionForQuestion,
  type ApprovedProfileSection,
  type InterviewTurnPlan,
} from '../agent/interview'
import { approvedProfileDemoCalls, type PrefillToolCall } from '../webmcp/demoCalls'
import { useApplication } from '../state/ApplicationContext'
import { useWebMcp } from '../webmcp/WebMcpContext'
import type { Locale } from '../i18n'
import { BotIcon, CheckIcon, LockIcon, RefreshIcon, SparkleIcon, WarningIcon, XIcon } from './Icons'

type InterviewStage = 'intro' | 'interview' | 'complete'

interface ChatMessage {
  id: string
  role: 'agent' | 'user'
  text: string
  detail?: string
}

const speechLocales: Record<Locale, string> = {
  en: 'en-US', es: 'es-US', fr: 'fr-FR', hi: 'hi-IN',
}

const content = {
  en: {
    greeting: 'This application is deliberately long, but we can finish the applicable path together. Tell me about your trip in your own words; I’ll decide what matters next, use approved profile facts, and explain every WebMCP action.',
    privacy: 'Your answer is sent to OpenAI for planning. The API key stays server-side, every value is validated by this website, and nothing is submitted.',
    startVoice: 'Start with voice', type: 'Type instead', later: 'Not now',
    trip: 'Start anywhere: why are you visiting the United States, where will you stay, and what dates are you considering?',
    placeholder: 'Speak or type naturally…', send: 'Send', listening: 'Listening…',
    activity: 'Agent decisions & WebMCP actions', routePending: 'Route not selected', restart: 'Start over',
  },
  es: {
    greeting: 'Esta solicitud es deliberadamente larga, pero podemos completar juntos la ruta aplicable. Cuénteme su viaje con sus propias palabras; decidiré qué preguntar después y explicaré cada acción WebMCP.',
    privacy: 'Su respuesta se envía a OpenAI para planificar. La clave permanece en el servidor, este sitio valida cada valor y no se envía ninguna solicitud.',
    startVoice: 'Comenzar por voz', type: 'Escribir', later: 'Ahora no',
    trip: 'Empiece donde quiera: ¿por qué visita Estados Unidos, dónde se alojará y qué fechas considera?',
    placeholder: 'Hable o escriba naturalmente…', send: 'Enviar', listening: 'Escuchando…', activity: 'Decisiones y acciones WebMCP', routePending: 'Ruta sin seleccionar', restart: 'Empezar de nuevo',
  },
  fr: {
    greeting: 'Cette demande est volontairement longue, mais nous pouvons terminer ensemble le parcours applicable. Décrivez votre voyage librement ; je choisirai la prochaine question et expliquerai chaque action WebMCP.',
    privacy: 'Votre réponse est envoyée à OpenAI pour la planification. La clé reste côté serveur, ce site valide chaque valeur et rien n’est soumis.',
    startVoice: 'Commencer par la voix', type: 'Écrire', later: 'Plus tard',
    trip: 'Commencez librement : pourquoi allez-vous aux États-Unis, où séjournerez-vous et à quelles dates ?',
    placeholder: 'Parlez ou écrivez naturellement…', send: 'Envoyer', listening: 'Écoute…', activity: 'Décisions et actions WebMCP', routePending: 'Parcours non sélectionné', restart: 'Recommencer',
  },
  hi: {
    greeting: 'यह आवेदन जानबूझकर लंबा है, लेकिन हम सही रास्ता साथ मिलकर पूरा कर सकते हैं। अपनी यात्रा सामान्य भाषा में बताइए; मैं अगला उपयोगी सवाल चुनूँगा और हर WebMCP कार्रवाई समझाऊँगा।',
    privacy: 'योजना बनाने के लिए आपका उत्तर OpenAI को भेजा जाता है। API कुंजी सर्वर पर रहती है, वेबसाइट हर मान जाँचती है और कुछ भी जमा नहीं होता।',
    startVoice: 'आवाज़ से शुरू करें', type: 'टाइप करें', later: 'अभी नहीं',
    trip: 'कहीं से भी शुरू करें: आप अमेरिका क्यों जा रहे हैं, कहाँ रहेंगे और कौन-सी तारीखें सोच रहे हैं?',
    placeholder: 'स्वाभाविक रूप से बोलें या लिखें…', send: 'भेजें', listening: 'सुन रहा हूँ…', activity: 'एजेंट निर्णय और WebMCP कार्रवाई', routePending: 'रास्ता चुना नहीं गया', restart: 'फिर से शुरू करें',
  },
} as const

const profileCallBySection: Record<ApprovedProfileSection, PrefillToolCall> = {
  identity: approvedProfileDemoCalls[0],
  passport: approvedProfileDemoCalls[1],
  contact: approvedProfileDemoCalls[2],
  addresses: approvedProfileDemoCalls[3],
  employment: approvedProfileDemoCalls[4],
  education: approvedProfileDemoCalls[5],
  family: approvedProfileDemoCalls[7],
}

function assistantText(plan: InterviewTurnPlan) {
  if (!plan.next_question) return plan.assistant_message
  return plan.assistant_message.toLowerCase().includes(plan.next_question.toLowerCase())
    ? plan.assistant_message
    : `${plan.assistant_message} ${plan.next_question}`
}

export function AdaptiveAssistant({ locale, onRestart }: { locale: Locale; onRestart: () => void }) {
  const { state, metrics } = useApplication()
  const webMcp = useWebMcp()
  const copy = content[locale]
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<InterviewStage>('intro')
  const [draft, setDraft] = useState('')
  const [working, setWorking] = useState(false)
  const [workingLabel, setWorkingLabel] = useState('Understanding your answer')
  const [listening, setListening] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastQuestion, setLastQuestion] = useState<string>(copy.trip)
  const [nextQuestionId, setNextQuestionId] = useState<string | null>('travel_purpose')
  const [turnNumber, setTurnNumber] = useState(0)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const conversationRef = useRef<HTMLDivElement | null>(null)
  const appliedProfileSectionsRef = useRef<ApprovedProfileSection[]>([])
  const stageRef = useRef<InterviewStage>('intro')
  const processAnswerRef = useRef<(answer: string) => Promise<void>>(async () => {})

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

  const addMessage = (role: ChatMessage['role'], text: string, detail?: string) => {
    setMessages((current) => [...current, { id: `${role}-${Date.now()}-${current.length}`, role, text, detail }])
  }

  const runCalls = async (calls: PrefillToolCall[]) => {
    if (!calls.length) return
    setWorkingLabel('Validating and applying semantic actions')
    await webMcp.runPrefillPlan(calls)
  }

  const processAnswer = async (rawAnswer: string) => {
    const answer = rawAnswer.trim()
    if (!answer || working || stageRef.current !== 'interview') return
    setDraft('')
    setPlannerError(null)
    addMessage('user', answer)
    setWorking(true)
    setWorkingLabel('Understanding your answer and choosing what matters next')

    try {
      const request = buildInterviewRequest(
        state,
        metrics,
        locale,
        turnNumber + 1,
        lastQuestion,
        answer,
        appliedProfileSectionsRef.current,
      )
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      })
      const body = await response.json() as { plan?: InterviewTurnPlan; error?: string }
      if (!response.ok || !body.plan) throw new Error(body.error || 'The adaptive planner could not respond.')
      const plan = body.plan
      const calls: PrefillToolCall[] = []

      const purpose = plan.route.purpose ?? state.flow?.purpose ?? 'undetermined'
      const funding = plan.route.funding ?? state.flow?.funding ?? 'undetermined'
      const priorVisit = plan.route.prior_visit ?? state.flow?.priorVisit ?? 'undetermined'
      if (purpose !== 'undetermined') {
        calls.push({
          toolName: 'select_application_flow',
          label: 'Recalculating the applicable path',
          input: { purpose, funding, prior_visit: priorVisit },
        })
      }

      const proposedProfileSections = new Set(plan.approved_profile_sections)
      if (turnNumber === 0) {
        ;(['identity', 'passport', 'contact', 'addresses', 'family'] as ApprovedProfileSection[])
          .forEach((section) => proposedProfileSections.add(section))
        if (purpose === 'business') proposedProfileSections.add('education')
      }
      for (const section of proposedProfileSections) {
        if (appliedProfileSectionsRef.current.includes(section)) continue
        if (section === 'employment' && !plan.approved_profile_sections.includes('employment')) continue
        calls.push(profileCallBySection[section])
        appliedProfileSectionsRef.current.push(section)
      }

      for (const source of ['user_statement', 'document'] as const) {
        const updates = plan.updates.filter((update) => update.source === source)
        if (!updates.length) continue
        calls.push({
          toolName: 'provide_interview_answers',
          label: source === 'document' ? 'Attaching approved fictional evidence' : 'Applying facts extracted from your answer',
          input: {
            source,
            answers: updates.map((update) => ({
              question_id: update.question_id,
              value: update.value,
              confidence: update.confidence,
            })),
          },
        })
      }

      if (plan.confirm_question_ids.length) {
        calls.push({
          toolName: 'confirm_sensitive_answers',
          label: 'Recording your explicit final confirmation',
          input: { question_ids: plan.confirm_question_ids, explicit_confirmation: true },
        })
      }
      if (plan.is_complete) {
        calls.push({ toolName: 'request_review', label: 'Checking readiness for human review', input: {} })
      }

      await runCalls(calls)
      setTurnNumber((current) => current + 1)
      addMessage('agent', assistantText(plan), plan.decision_summary)
      setLastQuestion(plan.next_question ?? '')
      setNextQuestionId(plan.next_question_id)
      if (plan.is_complete) {
        stageRef.current = 'complete'
        setStage('complete')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The adaptive planner is temporarily unavailable.'
      setPlannerError(message)
      addMessage('agent', `${message} Your answer was not applied. Please try again; I’ll keep the same question.`)
    } finally {
      setWorking(false)
    }
  }
  processAnswerRef.current = processAnswer

  const begin = (withVoice: boolean) => {
    stageRef.current = 'interview'
    setStage('interview')
    setLastQuestion(copy.trip)
    setNextQuestionId('travel_purpose')
    addMessage('agent', copy.trip)
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
      if (event.results[event.results.length - 1].isFinal) void processAnswerRef.current(transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  const suggestion = suggestionForQuestion(nextQuestionId)

  if (!open) {
    return <button className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Open application assistant"><BotIcon /><span>Get help</span></button>
  }

  return (
    <section className="adaptive-assistant" role="dialog" aria-label="Application assistant">
      <header className="assistant-header">
        <span className="assistant-avatar"><BotIcon /></span>
        <div><strong>Adaptive Application Agent</strong><span><i /> GPT-5.6 Luna planning · WebMCP execution</span></div>
        <button onClick={() => setOpen(false)} aria-label="Close assistant"><XIcon /></button>
      </header>

      {route && (
        <div className="route-strip">
          <span>LIVE APPLICATION PATH</span>
          <div>{route.labels.map((label) => <strong key={label}>{label}<em>›</em></strong>)}</div>
          <small>{route.applicableQuestionIds.length} applicable · {route.excludedQuestionIds.length} removed without page navigation</small>
        </div>
      )}

      <div className="assistant-conversation" ref={conversationRef}>
        {messages.map((message) => (
          <div className={`chat-message chat-message--${message.role}`} key={message.id}>
            {message.role === 'agent' && <span><BotIcon /></span>}
            <div className="chat-message__body"><p>{message.text}</p>{message.detail && <small><SparkleIcon /> {message.detail}</small>}</div>
          </div>
        ))}
        {working && (
          <div className="assistant-working"><SparkleIcon /><div><strong>{webMcp.prefillStatus === 'running' ? webMcp.prefillProgress.label : workingLabel}</strong><span>{webMcp.prefillStatus === 'running' ? `${webMcp.prefillProgress.completed} of ${webMcp.prefillProgress.total} semantic actions` : 'The model plans; the website validates and writes'}</span></div></div>
        )}
        {(plannerError || webMcp.prefillError) && <div className="assistant-error"><WarningIcon />{plannerError ?? webMcp.prefillError}</div>}

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
            <div><strong>{metrics.completed} of {metrics.total} applicable questions completed</strong><span>{metrics.needsConfirmation} confirmations · {metrics.evidenceNeeded} evidence items · {metrics.conflicts} conflicts remain</span></div>
          </div>
        )}
      </div>

      {stage === 'interview' && (
        <div className="assistant-composer">
          {suggestion && <button className="answer-suggestion" onClick={() => void processAnswerRef.current(suggestion)}>Try: “{suggestion}”</button>}
          <div>
            <button className={`voice-button ${listening ? 'voice-button--listening' : ''}`} onClick={startListening} aria-label="Answer by voice">{listening ? '■' : '●'}</button>
            <textarea value={draft} maxLength={1500} onChange={(event) => setDraft(event.target.value)} placeholder={listening ? copy.listening : copy.placeholder} rows={2} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void processAnswerRef.current(draft) }
            }} />
            <button className="send-button" disabled={!draft.trim() || working} onClick={() => void processAnswerRef.current(draft)}>{copy.send}</button>
          </div>
        </div>
      )}

      <div className="assistant-footer-actions">
        <button className="assistant-activity-toggle" onClick={() => setActivityOpen((value) => !value)}>
          <span><SparkleIcon /> {copy.activity}</span><strong>{state.activity.length}</strong>
        </button>
        <button className="assistant-restart-button" onClick={onRestart}>
          <RefreshIcon /> {copy.restart}
        </button>
      </div>
      {activityOpen && (
        <div className="assistant-activity">
          <div className="activity-route"><strong>{route?.labels.join(' → ') ?? copy.routePending}</strong><span>{routePreview.applicableQuestionIds.length} semantic requirements visible to the agent</span></div>
          {state.activity.slice(0, 8).map((activity) => (
            <div key={activity.id}><CheckIcon /><p><strong>{activity.title}</strong><span>{activity.toolName} · {activity.detail}</span></p></div>
          ))}
        </div>
      )}
    </section>
  )
}
