import { useEffect, useMemo, useRef, useState } from 'react'
import { buildApplicationFlow } from '../agent/applicationFlow'
import { deriveInsightsFromValues } from '../agent/derivations'
import {
  buildInterviewRequest,
  chooseNovelQuestion,
  mergePartialFacts,
  type InterviewDocument,
  type InterviewCandidate,
  type InterviewHistoryTurn,
  type InterviewPartialFact,
  type InterviewTurnPlan,
} from '../agent/interview'
import { questions } from '../data/questions'
import type { PrefillToolCall } from '../webmcp/demoCalls'
import { useApplication } from '../state/ApplicationContext'
import { useWebMcp } from '../webmcp/WebMcpContext'
import type { Locale } from '../i18n'
import { BotIcon, CheckIcon, FileIcon, LockIcon, RefreshIcon, SpeakerIcon, SpeakerOffIcon, SparkleIcon, WarningIcon, XIcon } from './Icons'

type InterviewStage = 'intro' | 'interview' | 'complete'

interface ChatMessage {
  id: string
  role: 'agent' | 'user'
  text: string
  detail?: string
  progress?: TurnProgress
}

type StoryChapter = NonNullable<InterviewTurnPlan['next_chapter']>

interface TurnProgress {
  route: string
  fields: string[]
  documentFields: string[]
  skippedFields: string[]
  inferredFields: Array<{ label: string; value: string; explanation: string }>
  rememberedFacts: Array<{ label: string; value: string; missingDetail: string }>
  candidateFields: Array<{ label: string; value: string; explanation: string }>
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

const storyChapterLabels: Record<Locale, Record<StoryChapter, string>> = {
  en: {
    trip_story: 'STORY CHAPTER · YOUR TRIP',
    life_at_home: 'STORY CHAPTER · LIFE AT HOME',
    work_journey: 'STORY CHAPTER · HOW YOU GOT HERE',
    identity_passport: 'STORY CHAPTER · YOUR TRAVEL DOCUMENT',
    travel_history: 'STORY CHAPTER · LOOKING BACK',
    final_review: 'FINAL CHAPTER · YOUR REVIEW',
  },
  es: {
    trip_story: 'CAPÍTULO · SU VIAJE', life_at_home: 'CAPÍTULO · SU VIDA EN CASA', work_journey: 'CAPÍTULO · CÓMO LLEGÓ HASTA AQUÍ',
    identity_passport: 'CAPÍTULO · SU DOCUMENTO DE VIAJE', travel_history: 'CAPÍTULO · MIRANDO ATRÁS', final_review: 'CAPÍTULO FINAL · SU REVISIÓN',
  },
  fr: {
    trip_story: 'CHAPITRE · VOTRE VOYAGE', life_at_home: 'CHAPITRE · VOTRE VIE CHEZ VOUS', work_journey: 'CHAPITRE · VOTRE PARCOURS',
    identity_passport: 'CHAPITRE · VOTRE DOCUMENT DE VOYAGE', travel_history: 'CHAPITRE · RETOUR EN ARRIÈRE', final_review: 'CHAPITRE FINAL · VOTRE VÉRIFICATION',
  },
  hi: {
    trip_story: 'कहानी · आपकी यात्रा', life_at_home: 'कहानी · घर पर आपका जीवन', work_journey: 'कहानी · आपका सफ़र',
    identity_passport: 'कहानी · आपका यात्रा दस्तावेज़', travel_history: 'कहानी · पीछे मुड़कर', final_review: 'अंतिम अध्याय · आपकी समीक्षा',
  },
}

const initialFastIntakeIds = [
  'travel_purpose', 'arrival_date', 'departure_date', 'destination_city', 'stay_address',
]

const content = {
  en: {
    greeting: 'This application is deliberately long, but we can finish the applicable path together. I’ll fill stated and reasonably derived values now, flag uncertainty for one final review, and show every WebMCP action.',
    privacy: 'Your answer is sent to OpenAI for planning. The API key stays server-side, every value is validated by this website, and nothing is submitted.',
    startVoice: 'Start with voice', type: 'Type instead', later: 'Not now',
    trip: 'Imagine you’re telling a friend about this trip. Take me from home to the United States—what is the plan, and what makes you want to go?',
    placeholder: 'Speak or type naturally…', send: 'Send', listening: 'Listening through pauses…',
    listeningHint: 'Take your time. Click the red square when you are finished, then review and send.',
    activity: 'Agent decisions & WebMCP actions', routePending: 'Route not selected', restart: 'Start over',
  },
  es: {
    greeting: 'Esta solicitud es deliberadamente larga, pero podemos completar juntos la ruta aplicable. Cuénteme su viaje con sus propias palabras; decidiré qué preguntar después y explicaré cada acción WebMCP.',
    privacy: 'Su respuesta se envía a OpenAI para planificar. La clave permanece en el servidor, este sitio valida cada valor y no se envía ninguna solicitud.',
    startVoice: 'Comenzar por voz', type: 'Escribir', later: 'Ahora no',
    trip: 'Imagine que le cuenta este viaje a un amigo. Lléveme desde su casa hasta Estados Unidos: ¿cuál es el plan y por qué quiere ir?',
    placeholder: 'Hable o escriba naturalmente…', send: 'Enviar', listening: 'Escuchando durante las pausas…', listeningHint: 'Tómese su tiempo. Pulse el cuadrado rojo al terminar; luego revise y envíe.', activity: 'Decisiones y acciones WebMCP', routePending: 'Ruta sin seleccionar', restart: 'Empezar de nuevo',
  },
  fr: {
    greeting: 'Cette demande est volontairement longue, mais nous pouvons terminer ensemble le parcours applicable. Décrivez votre voyage librement ; je choisirai la prochaine question et expliquerai chaque action WebMCP.',
    privacy: 'Votre réponse est envoyée à OpenAI pour la planification. La clé reste côté serveur, ce site valide chaque valeur et rien n’est soumis.',
    startVoice: 'Commencer par la voix', type: 'Écrire', later: 'Plus tard',
    trip: 'Imaginez que vous racontez ce voyage à un ami. Emmenez-moi de chez vous aux États-Unis : quel est le projet et pourquoi partir ?',
    placeholder: 'Parlez ou écrivez naturellement…', send: 'Envoyer', listening: 'Écoute maintenue pendant les pauses…', listeningHint: 'Prenez votre temps. Cliquez sur le carré rouge lorsque vous avez terminé, puis relisez et envoyez.', activity: 'Décisions et actions WebMCP', routePending: 'Parcours non sélectionné', restart: 'Recommencer',
  },
  hi: {
    greeting: 'यह आवेदन जानबूझकर लंबा है, लेकिन हम सही रास्ता साथ मिलकर पूरा कर सकते हैं। अपनी यात्रा सामान्य भाषा में बताइए; मैं अगला उपयोगी सवाल चुनूँगा और हर WebMCP कार्रवाई समझाऊँगा।',
    privacy: 'योजना बनाने के लिए आपका उत्तर OpenAI को भेजा जाता है। API कुंजी सर्वर पर रहती है, वेबसाइट हर मान जाँचती है और कुछ भी जमा नहीं होता।',
    startVoice: 'आवाज़ से शुरू करें', type: 'टाइप करें', later: 'अभी नहीं',
    trip: 'मान लीजिए आप किसी दोस्त को यह यात्रा सुना रहे हैं। घर से अमेरिका तक की योजना क्या है, और आप क्यों जाना चाहते हैं?',
    placeholder: 'स्वाभाविक रूप से बोलें या लिखें…', send: 'भेजें', listening: 'रुकने पर भी सुन रहा हूँ…', listeningHint: 'आराम से बोलें। पूरा होने पर लाल चौकोर दबाएँ, फिर जाँचकर भेजें।', activity: 'एजेंट निर्णय और WebMCP कार्रवाई', routePending: 'रास्ता चुना नहीं गया', restart: 'फिर से शुरू करें',
  },
} as const

const questionMap = new Map(questions.map((question) => [question.id, question]))
const demoDocuments = [
  { name: 'demo-passport-aarav-mehta.pdf', label: 'Passport' },
  { name: 'demo-degree-certificate-aarav-mehta.pdf', label: 'Degree' },
  { name: 'demo-utility-bill-aarav-mehta.pdf', label: 'Utility bill' },
  { name: 'demo-issued-flight-ticket-aarav-mehta.pdf', label: 'Flight ticket' },
] as const
const acceptedDocumentTypes = new Set<InterviewDocument['mime_type']>([
  'application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp',
])

function readDocument(file: File): Promise<InterviewDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve({
        name: file.name,
        mime_type: file.type as InterviewDocument['mime_type'],
        size_bytes: file.size,
        data: comma >= 0 ? result.slice(comma + 1) : result,
      })
    }
    reader.readAsDataURL(file)
  })
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
  const [currentQuestion, setCurrentQuestion] = useState<string>(copy.trip)
  const [currentChapter, setCurrentChapter] = useState<StoryChapter>('trip_story')
  const [currentQuestionIds, setCurrentQuestionIds] = useState<string[]>(initialFastIntakeIds)
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryTurn[]>([])
  const [partialFacts, setPartialFacts] = useState<InterviewPartialFact[]>([])
  const [attentionReviewOpen, setAttentionReviewOpen] = useState(false)
  const [attentionEdits, setAttentionEdits] = useState<Record<string, string>>({})
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [turnNumber, setTurnNumber] = useState(0)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const [attachedDocuments, setAttachedDocuments] = useState<InterviewDocument[]>([])
  const [loadingDemoDocuments, setLoadingDemoDocuments] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const keepListeningRef = useRef(false)
  const committedTranscriptRef = useRef('')
  const conversationRef = useRef<HTMLDivElement | null>(null)
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null)
  const documentInputRef = useRef<HTMLInputElement | null>(null)
  const stageRef = useRef<InterviewStage>('intro')
  const voiceEnabledRef = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})
  const processAnswerRef = useRef<(answer: string) => Promise<void>>(async () => {})

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 650)
    return () => {
      window.clearTimeout(timer)
      keepListeningRef.current = false
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
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
  const attentionAnswers = useMemo(() => {
    const applicable = new Set(routePreview.applicableQuestionIds)
    return Object.entries(state.answers)
      .filter(([questionId, answer]) => applicable.has(questionId) && answer.value.trim() && answer.verificationStatus === 'needs_confirmation')
      .map(([questionId, answer]) => ({ questionId, answer, question: questionMap.get(questionId) }))
  }, [routePreview.applicableQuestionIds, state.answers])

  useEffect(() => {
    if (!attentionAnswers.length) {
      setAttentionReviewOpen(false)
      return
    }
    setAttentionEdits((current) => Object.fromEntries(attentionAnswers.map(({ questionId, answer }) => [
      questionId,
      current[questionId] ?? answer.value,
    ])))
    if (currentChapter === 'final_review' || stage === 'complete') setAttentionReviewOpen(true)
  }, [attentionAnswers, currentChapter, stage])

  const addMessage = (
    role: ChatMessage['role'],
    text: string,
    detail?: string,
    progress?: TurnProgress,
  ) => {
    setMessages((current) => [...current, {
      id: `${role}-${Date.now()}-${current.length}`, role, text, detail, progress,
    }])
  }

  const runCalls = async (calls: PrefillToolCall[]) => {
    if (!calls.length) return
    setWorkPhase('executing')
    setWorkingLabel('Validating and applying semantic actions')
    await webMcp.runPrefillPlan(calls)
  }

  const processAnswer = async (rawAnswer: string) => {
    const turnDocuments = attachedDocuments
    const answer = rawAnswer.trim() || (turnDocuments.length ? 'Use the attached documents to complete every supported field you can verify.' : '')
    if (!answer || working || stageRef.current !== 'interview') return
    const answeredQuestion = currentQuestion || lastQuestion
    const answeredChapter = currentChapter
    const answeredQuestionIds = currentQuestionIds
    setDraft('')
    setCurrentQuestion('')
    setPlannerError(null)
    addMessage('user', answer, turnDocuments.length ? `Attached: ${turnDocuments.map((document) => document.name).join(', ')}` : undefined)
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
        interviewHistory,
        partialFacts,
        turnDocuments,
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

      const projectedFlow = purpose === 'undetermined'
        ? (state.flow ?? buildApplicationFlow('undetermined'))
        : buildApplicationFlow(purpose, funding, priorVisit)
      const applicableIds = new Set(projectedFlow.applicableQuestionIds)
      const plannedUpdates = plan.updates
        .filter((update) => update.source === 'user_statement' || update.source === 'document')
        .map((update) => ({
          ...update,
          basis: update.basis ?? 'explicit',
          evidence_text: update.evidence_text ?? answer,
          derivation: update.derivation ?? null,
        }))
      const updates = plannedUpdates.filter((update) => applicableIds.has(update.question_id))
      const skippedUpdates = plannedUpdates.filter((update) => !applicableIds.has(update.question_id))
      const candidateMap = new Map<string, InterviewCandidate>()
      for (const candidate of plan.candidates ?? []) {
        if (!applicableIds.has(candidate.question_id) || updates.some((update) => update.question_id === candidate.question_id)) continue
        if (state.answers[candidate.question_id]?.value.trim()) continue
        const existing = candidateMap.get(candidate.question_id)
        if (!existing || candidate.confidence > existing.confidence) candidateMap.set(candidate.question_id, candidate)
      }
      const candidates = [...candidateMap.values()]
      const incomingPartialFacts = (plan.partial_facts ?? [])
        .filter((fact) => applicableIds.has(fact.question_id))
        .filter((fact) => !updates.some((update) => update.question_id === fact.question_id))
        .filter((fact) => !candidateMap.has(fact.question_id))
      const nextPartialFacts = mergePartialFacts(
        partialFacts,
        incomingPartialFacts,
        [...updates.map((update) => update.question_id), ...candidates.map((candidate) => candidate.question_id)],
      )
      const statementUpdates = updates.filter((update) => update.source === 'user_statement')
      const documentUpdates = updates.filter((update) => update.source === 'document')
      if (statementUpdates.length) {
        calls.push({
          toolName: 'provide_interview_answers',
          label: 'Applying only facts stated in your answer',
          input: {
            source: 'user_statement',
            answers: statementUpdates.map((update) => ({
              question_id: update.question_id,
              value: update.value,
              confidence: update.confidence,
            })),
          },
        })
      }
      if (documentUpdates.length) {
        calls.push({
          toolName: 'provide_interview_answers',
          label: 'Extracting document facts and flagging them for end review',
          input: {
            source: 'document',
            answers: documentUpdates.map((update) => ({
              question_id: update.question_id,
              value: update.value,
              confidence: update.confidence,
            })),
          },
        })
      }
      if (candidates.length) {
        calls.push({
          toolName: 'provide_interview_answers',
          label: 'Filling Terra proposals and flagging them for end review',
          input: {
            source: 'agent_proposal',
            answers: candidates.map((candidate) => ({
              question_id: candidate.question_id,
              value: candidate.proposed_value,
              confidence: candidate.confidence,
            })),
          },
        })
      }

      const applicableConfirmations = plan.confirm_question_ids.filter((questionId) => applicableIds.has(questionId))
      if (applicableConfirmations.length) {
        calls.push({
          toolName: 'confirm_sensitive_answers',
          label: 'Recording your explicit final confirmation',
          input: { question_ids: applicableConfirmations, explicit_confirmation: true },
        })
      }
      if (plan.is_complete) {
        calls.push({ toolName: 'request_review', label: 'Checking readiness for human review', input: {} })
      }

      const projectedAnswerIds = new Set(
        Object.entries(state.answers)
          .filter(([questionId, value]) => applicableIds.has(questionId) && value.value.trim())
          .map(([questionId]) => questionId),
      )
      for (const update of updates) if (applicableIds.has(update.question_id)) projectedAnswerIds.add(update.question_id)
      for (const candidate of candidates) projectedAnswerIds.add(candidate.question_id)
      const projectedValues = Object.fromEntries(
        Object.entries(state.answers).map(([questionId, value]) => [questionId, value.value]),
      )
      for (const update of updates) projectedValues[update.question_id] = update.value
      for (const candidate of candidates) projectedValues[candidate.question_id] = candidate.proposed_value
      const derived = deriveInsightsFromValues(projectedValues).map(({ label, value }) => ({ label, value }))
      const progress: TurnProgress = {
        route: projectedFlow.labels.join(' → '),
        fields: updates
          .filter((update) => update.source === 'user_statement' && update.basis === 'explicit')
          .map((update) => questionMap.get(update.question_id)?.label ?? update.question_id),
        documentFields: documentUpdates.map((update) => questionMap.get(update.question_id)?.label ?? update.question_id),
        skippedFields: skippedUpdates.map((update) => questionMap.get(update.question_id)?.label ?? update.question_id),
        inferredFields: updates
          .filter((update) => update.basis === 'derived')
          .map((update) => ({
            label: questionMap.get(update.question_id)?.label ?? update.question_id,
            value: update.value,
            explanation: update.derivation ?? 'Logically derived from your answer.',
          })),
        rememberedFacts: incomingPartialFacts.map((fact) => ({
          label: questionMap.get(fact.question_id)?.label ?? fact.question_id,
          value: fact.value,
          missingDetail: fact.missing_detail,
        })),
        candidateFields: candidates.map((candidate) => ({
          label: questionMap.get(candidate.question_id)?.label ?? candidate.question_id,
          value: candidate.proposed_value,
          explanation: candidate.explanation,
        })),
        derived,
        completed: projectedAnswerIds.size,
        total: projectedFlow.applicableQuestionIds.length,
        removed: projectedFlow.excludedQuestionIds.length,
        actions: calls.length ? calls.length + 1 : 0,
      }

      await runCalls(calls)
      const completedTurn: InterviewHistoryTurn = {
        question: answeredQuestion,
        answer,
        extracted_question_ids: updates.map((update) => update.question_id),
        discussed_question_ids: answeredQuestionIds,
        chapter: answeredChapter,
      }
      const nextHistory = [...interviewHistory, completedTurn].slice(-5)
      const nextQuestion = chooseNovelQuestion({
        plan,
        history: interviewHistory,
        answeredQuestion,
        answeredChapter,
        answeredQuestionIds,
        partialFacts: nextPartialFacts,
      })
      setTurnNumber((current) => current + 1)
      setInterviewHistory(nextHistory)
      setPartialFacts(nextPartialFacts)
      setAttachedDocuments([])
      addMessage('agent', plan.assistant_message, plan.decision_summary, progress)
      setLastQuestion(nextQuestion)
      setCurrentQuestion(nextQuestion)
      const nextFocusIds = plan.question_focus_ids?.length
        ? plan.question_focus_ids
        : (plan.requested_question_ids ?? []).slice(0, 3)
      setCurrentQuestionIds(nextFocusIds.filter((questionId) =>
        applicableIds.has(questionId) && !projectedAnswerIds.has(questionId),
      ))
      setCurrentChapter(plan.next_chapter ?? currentChapter)
      const spokenTurn = candidates.length
        ? `${plan.assistant_message} I filled ${candidates.length} reasonable interpretation${candidates.length === 1 ? '' : 's'} and flagged ${candidates.length === 1 ? 'it' : 'them'} for your final review. ${nextQuestion}`
        : `${plan.assistant_message} ${nextQuestion}`
      window.setTimeout(() => speakText(spokenTurn, true), 120)
      if (plan.is_complete) {
        stageRef.current = 'complete'
        setStage('complete')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The adaptive planner is temporarily unavailable.'
      setPlannerError(message)
      setCurrentQuestion(answeredQuestion)
      addMessage('agent', `${message} Your answer was not applied. Please try again; I’ll keep the same question.`)
    } finally {
      setWorking(false)
    }
  }
  processAnswerRef.current = processAnswer

  const attachDocuments = async (files: FileList | null) => {
    if (!files?.length) return
    setPlannerError(null)
    const selected = [...files]
    if (attachedDocuments.length + selected.length > 4) {
      setPlannerError('Attach no more than 4 documents at a time.')
      return
    }
    if (selected.some((file) => !acceptedDocumentTypes.has(file.type as InterviewDocument['mime_type']))) {
      setPlannerError('Use PDF, TXT, JPG, PNG, or WebP documents.')
      return
    }
    const totalBytes = attachedDocuments.reduce((total, document) => total + document.size_bytes, 0)
      + selected.reduce((total, file) => total + file.size, 0)
    if (selected.some((file) => file.size > 4 * 1024 * 1024) || totalBytes > 6 * 1024 * 1024) {
      setPlannerError('Each document must be 4 MB or smaller, with a 6 MB total.')
      return
    }
    try {
      setAttachedDocuments([...attachedDocuments, ...await Promise.all(selected.map(readDocument))])
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : 'A document could not be read.')
    } finally {
      if (documentInputRef.current) documentInputRef.current.value = ''
    }
  }

  const loadDemoDocumentPack = async () => {
    if (working || listening || loadingDemoDocuments) return
    setPlannerError(null)
    setLoadingDemoDocuments(true)
    try {
      const documents = await Promise.all(demoDocuments.map(async ({ name }) => {
        const response = await fetch(`/demo-documents/${name}`)
        if (!response.ok) throw new Error('The demo document pack is temporarily unavailable.')
        const blob = await response.blob()
        return readDocument(new File([blob], name, { type: 'application/pdf' }))
      }))
      setAttachedDocuments(documents)
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : 'The demo document pack could not be loaded.')
    } finally {
      setLoadingDemoDocuments(false)
    }
  }

  const speakText = (text: string, listenAfter = false, force = false) => {
    const synthesis = window.speechSynthesis
    if (!text.trim() || (!voiceEnabledRef.current && !force)) return
    if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      if (listenAfter && voiceEnabledRef.current) window.setTimeout(() => startListeningRef.current(), 120)
      return
    }
    keepListeningRef.current = false
    recognitionRef.current?.stop()
    synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = speechLocales[locale]
    utterance.rate = 0.97
    utterance.pitch = 1.02
    const language = speechLocales[locale].split('-')[0].toLowerCase()
    const matchingVoice = synthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith(language))
    if (matchingVoice) utterance.voice = matchingVoice
    utterance.onstart = () => setSpeaking(true)
    utterance.onerror = () => setSpeaking(false)
    utterance.onend = () => {
      setSpeaking(false)
      if (
        listenAfter
        && voiceEnabledRef.current
        && stageRef.current === 'interview'
      ) {
        window.setTimeout(() => startListeningRef.current(), 180)
      }
    }
    synthesis.speak(utterance)
  }

  const toggleVoice = () => {
    const next = !voiceEnabledRef.current
    voiceEnabledRef.current = next
    setVoiceEnabled(next)
    if (!next) {
      window.speechSynthesis?.cancel()
      setSpeaking(false)
    } else if (currentQuestion) {
      speakText(currentQuestion, false, true)
    }
  }

  const closeAssistant = () => {
    keepListeningRef.current = false
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()
    setListening(false)
    setSpeaking(false)
    setOpen(false)
  }

  const replayCurrentQuestion = () => {
    voiceEnabledRef.current = true
    setVoiceEnabled(true)
    speakText(currentQuestion, false, true)
  }

  const confirmAttentionQueue = async () => {
    if (!attentionAnswers.length || working) return
    setWorking(true)
    setWorkPhase('executing')
    setWorkingLabel('Saving your final review')
    setPlannerError(null)
    try {
      const confirmedValues = attentionAnswers.map(({ questionId, answer }) => ({
        question_id: questionId,
        value: (attentionEdits[questionId] ?? answer.value).trim(),
        confidence: 1,
      }))
      const calls: PrefillToolCall[] = [{
        toolName: 'provide_interview_answers',
        label: 'Saving reviewed values with WebMCP',
        input: { source: 'user_confirmation', answers: confirmedValues },
      }]
      const sensitiveIds = attentionAnswers
        .map(({ questionId }) => questionId)
        .filter((questionId) => questionMap.get(questionId)?.sensitivity === 'sensitive')
      if (sensitiveIds.length) {
        calls.push({
          toolName: 'confirm_sensitive_answers',
          label: 'Recording explicit confirmation of sensitive values',
          input: { question_ids: sensitiveIds, explicit_confirmation: true },
        })
      }
      await runCalls(calls)
      setAttentionReviewOpen(false)
      addMessage(
        'agent',
        `${attentionAnswers.length} flagged value${attentionAnswers.length === 1 ? ' is' : 's are'} now reviewed.`,
        'Your corrections and approvals were written through WebMCP.',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The review could not be saved.'
      setPlannerError(message)
      addMessage('agent', `${message} Please check the flagged values and try again.`)
    } finally {
      setWorking(false)
    }
  }

  const begin = (withVoice: boolean) => {
    stageRef.current = 'interview'
    setStage('interview')
    const requestedLabels = initialFastIntakeIds.map((id) => questionMap.get(id)?.label ?? id)
    setLastQuestion(`${copy.trip} Requested fields: ${requestedLabels.join(', ')}`)
    setCurrentQuestion(copy.trip)
    setCurrentChapter('trip_story')
    setCurrentQuestionIds(initialFastIntakeIds)
    setInterviewHistory([])
    setPartialFacts([])
    setAttentionReviewOpen(false)
    setAttentionEdits({})
    voiceEnabledRef.current = withVoice
    setVoiceEnabled(withVoice)
    if (withVoice) window.setTimeout(() => speakText(copy.trip, true, true), 120)
    else window.speechSynthesis?.cancel()
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
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    committedTranscriptRef.current = draft.trim()
    keepListeningRef.current = true
    setListening(true)
    startRecognitionCycle()
  }
  startListeningRef.current = startListening

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
        <div><strong>Voice Application Guide</strong><span><i /> {speaking ? 'Speaking now' : listening ? 'Listening until you stop' : 'Reasoning and filling with WebMCP'}</span></div>
        <button className="assistant-voice-toggle" onClick={toggleVoice} aria-label={voiceEnabled ? 'Mute agent voice' : 'Enable agent voice'} aria-pressed={voiceEnabled} title={voiceEnabled ? 'Mute agent voice' : 'Enable agent voice'}>
          {voiceEnabled ? <SpeakerIcon /> : <SpeakerOffIcon />}
        </button>
        <button onClick={closeAssistant} aria-label="Close assistant"><XIcon /></button>
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
            <button onClick={closeAssistant}>{copy.later}</button>
            <small><LockIcon /> {copy.privacy}</small>
          </div>
        )}

        {stage === 'complete' && (
          <div className="assistant-result">
            <CheckIcon />
            <div><strong>{metrics.completed} of {metrics.total} applicable questions completed</strong><span>{metrics.needsConfirmation} flagged reviews · {metrics.evidenceNeeded} evidence items · {metrics.conflicts} conflicts remain</span></div>
          </div>
        )}
      </div>

      {stage === 'interview' && working && !currentQuestion && <NextQuestionLoading />}

      {attentionReviewOpen && attentionAnswers.length > 0 && (
        <AttentionReviewCard
          answers={attentionAnswers}
          edits={attentionEdits}
          working={working}
          onEdit={(questionId, value) => setAttentionEdits((current) => ({ ...current, [questionId]: value }))}
          onConfirm={() => void confirmAttentionQueue()}
          onClose={() => setAttentionReviewOpen(false)}
        />
      )}

      {stage === 'interview' && !working && currentQuestion && (
        <CurrentQuestionCard locale={locale} question={currentQuestion} chapter={currentChapter} focusCount={currentQuestionIds.length} speaking={speaking} onReplay={replayCurrentQuestion} />
      )}

      {stage === 'interview' && (
        <div className="assistant-composer">
          <div className="assistant-document-row">
            <input
              ref={documentInputRef}
              className="assistant-document-input"
              type="file"
              accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,application/pdf,text/plain,image/jpeg,image/png,image/webp"
              multiple
              aria-label="Choose documents"
              onChange={(event) => void attachDocuments(event.target.files)}
            />
            <button type="button" className="assistant-attach-button" onClick={() => documentInputRef.current?.click()} disabled={working || listening}>
              <FileIcon /> Attach documents
            </button>
            <button type="button" className="assistant-demo-pack-button" onClick={() => void loadDemoDocumentPack()} disabled={working || listening || loadingDemoDocuments}>
              <SparkleIcon /> {loadingDemoDocuments ? 'Loading samples…' : 'Load demo pack'}
            </button>
            <span>Files are not stored by this website</span>
          </div>
          <details className="assistant-sample-links">
            <summary>View or download the 4 fictional sample documents</summary>
            <div>{demoDocuments.map(({ name, label }) => <a key={name} href={`/demo-documents/${name}`} target="_blank" rel="noreferrer" download>{label}</a>)}</div>
          </details>
          {attachedDocuments.length > 0 && (
            <div className="assistant-document-chips" aria-label="Attached documents">
              {attachedDocuments.map((document) => (
                <span key={`${document.name}-${document.size_bytes}`}><FileIcon />{document.name}<button type="button" aria-label={`Remove ${document.name}`} onClick={() => setAttachedDocuments((current) => current.filter((item) => item !== document))}><XIcon /></button></span>
              ))}
            </div>
          )}
          <div className="assistant-input-row">
            <button className={`voice-button ${listening ? 'voice-button--listening' : ''}`} onClick={listening ? stopListening : startListening} aria-label={listening ? 'Stop voice recording' : 'Answer by voice'} aria-pressed={listening}>{listening ? '■' : '●'}</button>
            <textarea ref={transcriptRef} value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} placeholder={listening ? copy.listening : copy.placeholder} rows={5} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (listening) stopListening(); void processAnswerRef.current(draft) }
            }} />
            <button className="send-button" disabled={(!draft.trim() && !attachedDocuments.length) || working || listening} onClick={() => void processAnswerRef.current(draft)}>{copy.send}</button>
          </div>
          <div className="transcript-meta"><span>{draft.trim() ? `${draft.trim().split(/\s+/).length} words captured` : 'Your live transcript will appear here'}</span><strong>{listening ? 'Listening until you stop' : 'Review before sending'}</strong></div>
          {listening && <div className="voice-listening-hint"><span>■</span>{copy.listeningHint}</div>}
        </div>
      )}

      <div className="assistant-footer-actions">
        {attentionAnswers.length > 0 && (
          <button className="assistant-review-toggle" onClick={() => setAttentionReviewOpen((value) => !value)} aria-expanded={attentionReviewOpen}>
            <WarningIcon /> Review {attentionAnswers.length} flagged
          </button>
        )}
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

function NextQuestionLoading() {
  return (
    <section className="assistant-next-question assistant-next-question--loading" aria-live="polite" aria-label="Finding the next question">
      <div className="assistant-next-question__label"><SparkleIcon /><span>BUILDING ON YOUR ANSWER</span></div>
      <p>Finding the smallest useful gap—without asking you to repeat yourself…</p>
    </section>
  )
}

function AttentionReviewCard({
  answers,
  edits,
  working,
  onEdit,
  onConfirm,
  onClose,
}: {
  answers: Array<{
    questionId: string
    answer: { value: string; sourceLabel: string; confidence: number }
    question: ReturnType<typeof questionMap.get>
  }>
  edits: Record<string, string>
  working: boolean
  onEdit: (questionId: string, value: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <section className="attention-review" aria-live="polite" aria-label="Review flagged values">
      <div className="attention-review__heading">
        <SparkleIcon />
        <div><strong>FINAL ATTENTION QUEUE</strong><span>These values are already in the application. Correct anything Terra interpreted imperfectly, then approve once.</span></div>
        <button onClick={onClose} aria-label="Close final attention queue"><XIcon /></button>
      </div>
      <div className="attention-review__list">
        {answers.map(({ questionId, answer, question }) => {
          const options = question?.type === 'yes-no' ? ['Yes', 'No'] : question?.options
          return (
            <label className="attention-review__item" key={questionId}>
              <span className="attention-review__copy">
                <strong>{question?.label ?? questionId}<em>NEEDS REVIEW</em></strong>
                <small>{answer.sourceLabel} · {Math.round(answer.confidence * 100)}% confidence</small>
                {options ? (
                  <select aria-label={`Review ${question?.label ?? questionId}`} value={edits[questionId] ?? answer.value} onChange={(event) => onEdit(questionId, event.target.value)} disabled={working}>
                    {options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input
                    type={question?.type === 'date' ? 'date' : 'text'}
                    aria-label={`Review ${question?.label ?? questionId}`}
                    value={edits[questionId] ?? answer.value}
                    onChange={(event) => onEdit(questionId, event.target.value)}
                    disabled={working}
                  />
                )}
              </span>
            </label>
          )
        })}
      </div>
      <div className="attention-review__actions">
        <button onClick={onConfirm} disabled={working}><CheckIcon /> {working ? 'Saving…' : `Save corrections & approve ${answers.length}`}</button>
      </div>
      <small className="attention-review__trust"><LockIcon /> No proposal is hidden: every flagged value remains editable before review.</small>
    </section>
  )
}

function CurrentQuestionCard({ locale, question, chapter, focusCount, speaking, onReplay }: { locale: Locale; question: string; chapter: StoryChapter; focusCount: number; speaking: boolean; onReplay: () => void }) {
  const visibleFocusCount = Math.max(1, Math.min(focusCount, 5))
  return (
    <section className="assistant-next-question" aria-live="polite" aria-label="Current question">
      <div className="assistant-next-question__label"><SparkleIcon /><span>{storyChapterLabels[locale][chapter]}</span><button onClick={onReplay} aria-label="Replay current question"><SpeakerIcon /> {speaking ? 'SPEAKING' : 'REPLAY'}</button><em>ANSWER THIS NEXT</em></div>
      <p>{question}</p>
      <div className="assistant-next-question__scope"><strong>ONE ANSWER · {visibleFocusCount} RELATED DETAIL{visibleFocusCount === 1 ? '' : 'S'}</strong><span>Tell it naturally—I’ll connect everything and ask only about real gaps.</span></div>
    </section>
  )
}

function TurnProgressCard({ progress }: { progress: TurnProgress }) {
  const percentage = Math.round((progress.completed / progress.total) * 100)
  return (
    <div className="turn-progress">
      <div className="turn-progress__header"><span>LIVE APPLICATION PROGRESS</span><strong>{progress.completed}/{progress.total}</strong></div>
      <div className="turn-progress__bar"><span style={{ width: `${percentage}%` }} /></div>
      <div className="turn-progress__route"><CheckIcon /><span><strong>{progress.route}</strong>{progress.removed} irrelevant questions removed</span></div>
      {progress.skippedFields.length > 0 && <div className="turn-progress__skipped"><CheckIcon /><span><strong>{progress.skippedFields.length} details no longer needed</strong>{progress.skippedFields.slice(0, 3).join(' · ')} were excluded after the route changed</span></div>}
      <div className="turn-progress__route"><CheckIcon /><span><strong>{progress.fields.length ? `${progress.fields.length} verified field${progress.fields.length === 1 ? '' : 's'} filled` : 'No unverified fields added'}</strong>{progress.fields.length ? progress.fields.slice(0, 4).join(' · ') : 'Waiting for an explicit answer'}</span></div>
      {progress.documentFields.length > 0 && <div className="turn-progress__documents"><FileIcon /><span><strong>{`${progress.documentFields.length} document field${progress.documentFields.length === 1 ? '' : 's'} extracted · review at end`}</strong>{progress.documentFields.slice(0, 4).join(' · ')}</span></div>}
      {progress.inferredFields.slice(0, 3).map((field) => <div className="turn-progress__inferred" key={field.label}><SparkleIcon /><span><strong>{field.label}: {field.value}</strong>{field.explanation} · reviewable</span></div>)}
      {progress.candidateFields.length > 0 && <div className="turn-progress__candidates"><SparkleIcon /><span><strong>{`${progress.candidateFields.length} Terra proposal${progress.candidateFields.length === 1 ? '' : 's'} filled · flagged for end review`}</strong>{progress.candidateFields.slice(0, 3).map((field) => `${field.label}: ${field.value}`).join(' · ')}</span></div>}
      {progress.rememberedFacts.length > 0 && <div className="turn-progress__remembered"><SparkleIcon /><span><strong>{`${progress.rememberedFacts.length} incomplete detail${progress.rememberedFacts.length === 1 ? '' : 's'} remembered`}</strong>{progress.rememberedFacts.slice(0, 3).map((fact) => `${fact.label}: ${fact.value} (${fact.missingDetail})`).join(' · ')}</span></div>}
      {progress.derived.slice(0, 2).map((insight) => <div className="turn-progress__derived" key={insight.label}><SparkleIcon /><span><strong>{insight.value}</strong>{insight.label} · derived from stated facts</span></div>)}
      <div className="turn-progress__trust"><LockIcon /> Stated and derived values stay visibly separate · {progress.actions} WebMCP actions</div>
    </div>
  )
}
