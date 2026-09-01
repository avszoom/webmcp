import { useEffect, useMemo, useRef, useState } from 'react'
import { buildApplicationFlow } from '../agent/applicationFlow'
import { deriveInsightsFromValues } from '../agent/derivations'
import {
  buildInterviewRequest,
  type InterviewTurnPlan,
} from '../agent/interview'
import { questions } from '../data/questions'
import type { PrefillToolCall } from '../webmcp/demoCalls'
import { useApplication } from '../state/ApplicationContext'
import { useWebMcp } from '../webmcp/WebMcpContext'
import { questionName, sectionName, type Locale } from '../i18n'
import type { SectionId } from '../types'
import { BotIcon, CheckIcon, LockIcon, RefreshIcon, SparkleIcon, WarningIcon, XIcon } from './Icons'

type InterviewStage = 'intro' | 'interview' | 'complete'

interface ChatMessage {
  id: string
  role: 'agent' | 'user'
  text: string
  detail?: string
  progress?: TurnProgress
  requestedQuestionIds?: string[]
}

interface TurnProgress {
  route: string
  fields: string[]
  derived: Array<{ label: string; value: string }>
  completed: number
  total: number
  removed: number
  actions: number
}

type WorkPhase = 'understanding' | 'executing'

const speechLocales: Record<Locale, string> = {
  en: 'en-US', es: 'es-US', fr: 'fr-FR', hi: 'hi-IN',
}

const initialFastIntakeIds = [
  'travel_purpose', 'arrival_date', 'departure_date', 'destination_city', 'stay_address', 'prior_visits', 'prior_refusal',
  'legal_given_names', 'legal_family_name', 'date_of_birth', 'place_of_birth',
  'passport_number', 'passport_country', 'passport_issue_date', 'passport_expiry_date',
  'email', 'phone', 'current_street', 'current_city', 'current_region', 'current_postal_code', 'current_country',
  'current_employer', 'job_title', 'marital_status', 'dependants',
]

const content = {
  en: {
    greeting: 'This application is deliberately long, but we can finish the applicable path together. I only use facts you state, remove questions that do not apply, and show every WebMCP action.',
    privacy: 'Your answer is sent to OpenAI for planning. The API key stays server-side, every value is validated by this website, and nothing is submitted.',
    startVoice: 'Start with voice', type: 'Type instead', later: 'Not now',
    trip: 'Take one minute and share anything you know from these groups—in any order. Skip anything unknown.',
    placeholder: 'Speak or type naturally…', send: 'Send', listening: 'Listening through pauses…',
    listeningHint: 'Take your time. Click the red square when you are finished, then review and send.',
    activity: 'Agent decisions & WebMCP actions', routePending: 'Route not selected', restart: 'Start over',
  },
  es: {
    greeting: 'Esta solicitud es deliberadamente larga, pero podemos completar juntos la ruta aplicable. Cuénteme su viaje con sus propias palabras; decidiré qué preguntar después y explicaré cada acción WebMCP.',
    privacy: 'Su respuesta se envía a OpenAI para planificar. La clave permanece en el servidor, este sitio valida cada valor y no se envía ninguna solicitud.',
    startVoice: 'Comenzar por voz', type: 'Escribir', later: 'Ahora no',
    trip: 'Empiece donde quiera: ¿por qué visita Estados Unidos, dónde se alojará y qué fechas considera?',
    placeholder: 'Hable o escriba naturalmente…', send: 'Enviar', listening: 'Escuchando durante las pausas…', listeningHint: 'Tómese su tiempo. Pulse el cuadrado rojo al terminar; luego revise y envíe.', activity: 'Decisiones y acciones WebMCP', routePending: 'Ruta sin seleccionar', restart: 'Empezar de nuevo',
  },
  fr: {
    greeting: 'Cette demande est volontairement longue, mais nous pouvons terminer ensemble le parcours applicable. Décrivez votre voyage librement ; je choisirai la prochaine question et expliquerai chaque action WebMCP.',
    privacy: 'Votre réponse est envoyée à OpenAI pour la planification. La clé reste côté serveur, ce site valide chaque valeur et rien n’est soumis.',
    startVoice: 'Commencer par la voix', type: 'Écrire', later: 'Plus tard',
    trip: 'Commencez librement : pourquoi allez-vous aux États-Unis, où séjournerez-vous et à quelles dates ?',
    placeholder: 'Parlez ou écrivez naturellement…', send: 'Envoyer', listening: 'Écoute maintenue pendant les pauses…', listeningHint: 'Prenez votre temps. Cliquez sur le carré rouge lorsque vous avez terminé, puis relisez et envoyez.', activity: 'Décisions et actions WebMCP', routePending: 'Parcours non sélectionné', restart: 'Recommencer',
  },
  hi: {
    greeting: 'यह आवेदन जानबूझकर लंबा है, लेकिन हम सही रास्ता साथ मिलकर पूरा कर सकते हैं। अपनी यात्रा सामान्य भाषा में बताइए; मैं अगला उपयोगी सवाल चुनूँगा और हर WebMCP कार्रवाई समझाऊँगा।',
    privacy: 'योजना बनाने के लिए आपका उत्तर OpenAI को भेजा जाता है। API कुंजी सर्वर पर रहती है, वेबसाइट हर मान जाँचती है और कुछ भी जमा नहीं होता।',
    startVoice: 'आवाज़ से शुरू करें', type: 'टाइप करें', later: 'अभी नहीं',
    trip: 'कहीं से भी शुरू करें: आप अमेरिका क्यों जा रहे हैं, कहाँ रहेंगे और कौन-सी तारीखें सोच रहे हैं?',
    placeholder: 'स्वाभाविक रूप से बोलें या लिखें…', send: 'भेजें', listening: 'रुकने पर भी सुन रहा हूँ…', listeningHint: 'आराम से बोलें। पूरा होने पर लाल चौकोर दबाएँ, फिर जाँचकर भेजें।', activity: 'एजेंट निर्णय और WebMCP कार्रवाई', routePending: 'रास्ता चुना नहीं गया', restart: 'फिर से शुरू करें',
  },
} as const

const questionMap = new Map(questions.map((question) => [question.id, question]))

function assistantText(plan: InterviewTurnPlan) {
  return plan.next_question ?? plan.assistant_message
}

export function AdaptiveAssistant({ locale, onRestart }: { locale: Locale; onRestart: () => void }) {
  const { state, metrics } = useApplication()
  const webMcp = useWebMcp()
  const copy = content[locale]
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<InterviewStage>('intro')
  const [draft, setDraft] = useState('')
  const [working, setWorking] = useState(false)
  const [workPhase, setWorkPhase] = useState<WorkPhase>('understanding')
  const [workingLabel, setWorkingLabel] = useState('Understanding your answer')
  const [listening, setListening] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastQuestion, setLastQuestion] = useState<string>(copy.trip)
  const [turnNumber, setTurnNumber] = useState(0)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const keepListeningRef = useRef(false)
  const committedTranscriptRef = useRef('')
  const conversationRef = useRef<HTMLDivElement | null>(null)
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null)
  const stageRef = useRef<InterviewStage>('intro')
  const processAnswerRef = useRef<(answer: string) => Promise<void>>(async () => {})

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 650)
    return () => {
      window.clearTimeout(timer)
      keepListeningRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!messages.length) setMessages([{ id: 'greeting', role: 'agent', text: copy.greeting }])
  }, [copy.greeting, messages.length])

  useEffect(() => {
    if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight
  }, [messages, working])

  useEffect(() => {
    const transcript = transcriptRef.current
    if (!transcript) return
    transcript.style.height = 'auto'
    transcript.style.height = `${Math.min(Math.max(transcript.scrollHeight, 132), 260)}px`
    transcript.scrollTop = transcript.scrollHeight
  }, [draft, listening])

  const route = state.flow
  const routePreview = useMemo(() => route ?? buildApplicationFlow('undetermined'), [route])

  const addMessage = (
    role: ChatMessage['role'],
    text: string,
    detail?: string,
    progress?: TurnProgress,
    requestedQuestionIds?: string[],
  ) => {
    setMessages((current) => [...current, {
      id: `${role}-${Date.now()}-${current.length}`, role, text, detail, progress, requestedQuestionIds,
    }])
  }

  const runCalls = async (calls: PrefillToolCall[]) => {
    if (!calls.length) return
    setWorkPhase('executing')
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
    setWorkPhase('understanding')
    setWorkingLabel('Understanding your answer and choosing what matters next')

    try {
      const request = buildInterviewRequest(
        state,
        metrics,
        locale,
        turnNumber + 1,
        lastQuestion,
        answer,
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

      const updates = plan.updates.filter((update) => update.source === 'user_statement')
      if (updates.length) {
        calls.push({
          toolName: 'provide_interview_answers',
          label: 'Applying only facts stated in your answer',
          input: {
            source: 'user_statement',
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

      const projectedFlow = purpose === 'undetermined'
        ? (state.flow ?? buildApplicationFlow('undetermined'))
        : buildApplicationFlow(purpose, funding, priorVisit)
      const applicableIds = new Set(projectedFlow.applicableQuestionIds)
      const projectedAnswerIds = new Set(
        Object.entries(state.answers)
          .filter(([questionId, value]) => applicableIds.has(questionId) && value.value.trim())
          .map(([questionId]) => questionId),
      )
      for (const update of updates) if (applicableIds.has(update.question_id)) projectedAnswerIds.add(update.question_id)
      const projectedValues = Object.fromEntries(
        Object.entries(state.answers).map(([questionId, value]) => [questionId, value.value]),
      )
      for (const update of updates) projectedValues[update.question_id] = update.value
      const derived = deriveInsightsFromValues(projectedValues).map(({ label, value }) => ({ label, value }))
      const progress: TurnProgress = {
        route: projectedFlow.labels.join(' → '),
        fields: updates.map((update) => questionMap.get(update.question_id)?.label ?? update.question_id),
        derived,
        completed: projectedAnswerIds.size,
        total: projectedFlow.applicableQuestionIds.length,
        removed: projectedFlow.excludedQuestionIds.length,
        actions: calls.length ? calls.length + 1 : 0,
      }

      await runCalls(calls)
      setTurnNumber((current) => current + 1)
      addMessage('agent', assistantText(plan), plan.decision_summary, progress, plan.requested_question_ids)
      setLastQuestion(plan.next_question ?? '')
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
    const requestedLabels = initialFastIntakeIds.map((id) => questionMap.get(id)?.label ?? id)
    setLastQuestion(`${copy.trip} Requested fields: ${requestedLabels.join(', ')}`)
    addMessage('agent', copy.trip, undefined, undefined, initialFastIntakeIds)
    if (withVoice) window.setTimeout(startListening, 300)
  }

  const startRecognitionCycle = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition || !keepListeningRef.current) return
    const recognition = new Recognition()
    recognition.lang = speechLocales[locale]
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onstart = () => setListening(true)
    recognition.onresult = (event) => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0].transcript.trim()
        if (!text) continue
        if (result.isFinal) {
          committedTranscriptRef.current = `${committedTranscriptRef.current} ${text}`.trim()
        } else {
          interim = `${interim} ${text}`.trim()
        }
      }
      setDraft(`${committedTranscriptRef.current} ${interim}`.trim())
    }
    recognition.onerror = (event) => {
      if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
        keepListeningRef.current = false
        setListening(false)
        addMessage('agent', 'Microphone access was blocked. You can type your answer instead.')
      }
    }
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null
      if (keepListeningRef.current) {
        window.setTimeout(startRecognitionCycle, 150)
      } else {
        setListening(false)
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  const startListening = () => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      addMessage('agent', 'Voice input is unavailable in this browser. You can type the same answer below.')
      return
    }
    if (keepListeningRef.current) return
    committedTranscriptRef.current = draft.trim()
    keepListeningRef.current = true
    setListening(true)
    startRecognitionCycle()
  }

  const stopListening = () => {
    keepListeningRef.current = false
    committedTranscriptRef.current = draft.trim()
    recognitionRef.current?.stop()
    setListening(false)
  }

  if (!open) {
    return <button className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Open application assistant"><BotIcon /><span>Get help</span></button>
  }

  return (
    <aside className="adaptive-assistant" role="dialog" aria-label="Application assistant">
      <div className="assistant-glass-panel">
      <header className="assistant-header">
        <span className="assistant-avatar assistant-orb"><BotIcon /></span>
        <div><strong>Voice Application Guide</strong><span><i /> Listening, reasoning and filling with WebMCP</span></div>
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
            <div className="chat-message__body">
              <p>{message.text}</p>
              {message.requestedQuestionIds && message.requestedQuestionIds.length > 0 && (
                <RequestedFactsCard locale={locale} questionIds={message.requestedQuestionIds} />
              )}
              {message.detail && <small><SparkleIcon /> {message.detail}</small>}
              {message.progress && <TurnProgressCard progress={message.progress} />}
            </div>
          </div>
        ))}
        {working && (
          <div className="assistant-working">
            <div className="assistant-working__status"><SparkleIcon /><div><strong>{webMcp.prefillStatus === 'running' ? webMcp.prefillProgress.label : workingLabel}</strong><span>{webMcp.prefillStatus === 'running' ? `${webMcp.prefillProgress.completed} of ${webMcp.prefillProgress.total} semantic actions` : 'The model plans; the website validates and writes'}</span></div></div>
            <div className="assistant-work-steps">
              <span className={workPhase === 'understanding' ? 'is-active' : 'is-done'}><i>1</i> Understand</span>
              <span className={workPhase === 'executing' ? 'is-active' : ''}><i>2</i> Validate</span>
              <span className={webMcp.prefillStatus === 'running' ? 'is-active' : ''}><i>3</i> Fill with WebMCP</span>
            </div>
          </div>
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
          <div>
            <button className={`voice-button ${listening ? 'voice-button--listening' : ''}`} onClick={listening ? stopListening : startListening} aria-label={listening ? 'Stop voice recording' : 'Answer by voice'} aria-pressed={listening}>{listening ? '■' : '●'}</button>
            <textarea ref={transcriptRef} value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} placeholder={listening ? copy.listening : copy.placeholder} rows={5} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (listening) stopListening(); void processAnswerRef.current(draft) }
            }} />
            <button className="send-button" disabled={!draft.trim() || working || listening} onClick={() => void processAnswerRef.current(draft)}>{copy.send}</button>
          </div>
          <div className="transcript-meta"><span>{draft.trim() ? `${draft.trim().split(/\s+/).length} words captured` : 'Your live transcript will appear here'}</span><strong>{listening ? 'Listening until you stop' : 'Review before sending'}</strong></div>
          {listening && <div className="voice-listening-hint"><span>■</span>{copy.listeningHint}</div>}
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
      </div>
    </aside>
  )
}

function RequestedFactsCard({ locale, questionIds }: { locale: Locale; questionIds: string[] }) {
  const groups = new Map<string, typeof questions>()
  for (const questionId of questionIds) {
    const question = questionMap.get(questionId)
    if (!question) continue
    const group = groups.get(question.sectionId) ?? []
    group.push(question)
    groups.set(question.sectionId, group)
  }

  return (
    <div className="requested-facts">
      <div className="requested-facts__top"><SparkleIcon /><span><strong>FAST INTAKE</strong>{questionIds.length} fields can be completed from this answer</span></div>
      <div className="requested-facts__groups">
        {[...groups.entries()].map(([sectionId, sectionQuestions]) => (
          <div key={sectionId}>
            <strong>{sectionName(locale, sectionId as SectionId, sectionId)}</strong>
            <span>{sectionQuestions.map((question) => questionName(locale, question.id, question.label)).join(' · ')}</span>
          </div>
        ))}
      </div>
      <small>Say only what you know. The agent will ask for remaining gaps later.</small>
    </div>
  )
}

function TurnProgressCard({ progress }: { progress: TurnProgress }) {
  const percentage = Math.round((progress.completed / progress.total) * 100)
  return (
    <div className="turn-progress">
      <div className="turn-progress__header"><span>LIVE APPLICATION PROGRESS</span><strong>{progress.completed}/{progress.total}</strong></div>
      <div className="turn-progress__bar"><span style={{ width: `${percentage}%` }} /></div>
      <div className="turn-progress__route"><CheckIcon /><span><strong>{progress.route}</strong>{progress.removed} irrelevant questions removed</span></div>
      <div className="turn-progress__route"><CheckIcon /><span><strong>{progress.fields.length ? `${progress.fields.length} verified field${progress.fields.length === 1 ? '' : 's'} filled` : 'No unverified fields added'}</strong>{progress.fields.length ? progress.fields.slice(0, 4).join(' · ') : 'Waiting for an explicit answer'}</span></div>
      {progress.derived.slice(0, 2).map((insight) => <div className="turn-progress__derived" key={insight.label}><SparkleIcon /><span><strong>{insight.value}</strong>{insight.label} · derived from stated facts</span></div>)}
      <div className="turn-progress__trust"><LockIcon /> Only facts from your last answer were written · {progress.actions} WebMCP actions</div>
    </div>
  )
}
